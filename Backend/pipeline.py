"""
Face detection, clustering and registration pipeline based on new_pipeline.ipynb.
Flow: video -> extract faces (Haar/DeepFace) -> embeddings (DeepFace) -> DBSCAN cluster -> return clusters.
"""
import os
import json
import base64
import cv2
import numpy as np
from pathlib import Path
from sklearn.cluster import DBSCAN

# Optional: DeepFace for embeddings (notebook uses VGG-Face)
# DeepFace is disabled due to compatibility issues
DEEPFACE_AVAILABLE = False
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("DEBUG: DeepFace import failed")

# Same as notebook
METRIC = "cosine" # Changing to cosine as it is standard for VGG-Face
EPS = 0.4 # Slightly looser for cosine
MIN_SAMPLES = 5
FRAME_SAMPLE_INTERVAL = 15 # Sample more frequently
MAX_FACES = 2000
ATTENDANCE_COSINE_THRESHOLD = 0.40  # Reverted to 0.40 since 0.30 didn't stop false pos (0.27)
ATTENDANCE_MIN_VOTES = 1
ATTENDANCE_MIN_SHARPNESS = 40.0
FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"



import logging

# Configure logging
logging.basicConfig(filename='backend_debug.log', level=logging.DEBUG, 
                    format='%(asctime)s %(levelname)s:%(message)s')

def extract_faces_from_video(video_path, faces_dir, max_faces=MAX_FACES, strict_quality=False, min_track_frames=1):
    """Extract face crops from video using MediaPipe with Haar Cascade fallback + Simple Tracking."""
    Path(faces_dir).mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    frame_idx = 0
    
    # Tracking state: {track_id: {'center': (cx, cy), 'best_score': float, 'best_file': str, 'frames': int, 'last_seen': int, 'face_w': int}}
    tracks = {}
    next_track_id = 0
    # Tracking parameters
    MIN_TRACK_FRAMES = min_track_frames # Uses argument now
    STALE_THRESHOLD = 45 # Close tracks unseen for this many sampled frames

    logging.info(f"Starting face extraction for {video_path}")
    
    # Try initializing MediaPipe
    # Check if we are on Render (Free Tier) which is memory constrained
    IS_RENDER = os.environ.get("RENDER") or os.environ.get("DYNO")
    
    # Force Haar Cascade on Render to save RAM (MediaPipe is ~100MB overhead)
    if IS_RENDER:
        print("DEBUG: Production environment detected. Forcing Haar Cascade to save memory.")
        face_detection = None
    else:
        try:
            import mediapipe as mp
            mp_face_detection = mp.solutions.face_detection
            confidence = 0.5 if strict_quality else 0.2
            face_detection = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=confidence)
            print(f"DEBUG: Using MediaPipe for face detection (strict={strict_quality}, conf={confidence})")
        except Exception as e:
            print(f"DEBUG: MediaPipe init failed ({e}), falling back to Haar Cascade")
            face_detection = None

    # Load Haar Cascade if MediaPipe failed
    face_cascade = None
    if not face_detection:
        face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
        if face_cascade.empty():
            print("ERROR: Could not load Haar Cascade XML")
            return {} # Return empty dict on error
    
    detected_faces_metadata = {} # track_id -> best_file

    while cap.isOpened() and len(detected_faces_metadata) < max_faces:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Sample every 2nd frame for speed while maintaining good coverage
        if frame_idx % 2 != 0:
            frame_idx += 1
            continue

        try:
            ih, iw, _ = frame.shape
            current_faces_rects = [] # (x, y, w, h)

            if face_detection:
                # MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_detection.process(rgb_frame)
                
                if results.detections:
                    for detection in results.detections:
                        bboxC = detection.location_data.relative_bounding_box
                        x = int(bboxC.xmin * iw)
                        y = int(bboxC.ymin * ih)
                        w = int(bboxC.width * iw)
                        h = int(bboxC.height * ih)
                        current_faces_rects.append((x, y, w, h))
            else:
                # Haar Cascade
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                # Relaxed parameters
                min_size = (40, 40) if strict_quality else (30, 30)
                faces = face_cascade.detectMultiScale(
                    gray, 
                    scaleFactor=1.1, 
                    minNeighbors=4, # Lowered from 8
                    minSize=min_size, # Lowered from 50
                    flags=cv2.CASCADE_SCALE_IMAGE
                )
                for (x, y, w, h) in faces:
                     current_faces_rects.append((x, y, w, h))
            
            # --- Tracking Updating Logic ---
            used_track_ids = set()
            
            for (x, y, w, h) in current_faces_rects:
                cx, cy = x + w//2, y + h//2
                
                # Check aspect ratio
                aspect_ratio = w / float(h)
                if aspect_ratio < 0.5 or aspect_ratio > 2.0: # Relaxed from 0.6-1.5
                     continue

                # Calculate sharpness
                x_s, y_s = max(0, x), max(0, y)
                x_e, y_e = min(iw, x+w), min(ih, y+h)
                face_img = frame[y_s:y_e, x_s:x_e]
                
                if face_img.size == 0: continue
                
                gray_face = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
                sharpness = cv2.Laplacian(gray_face, cv2.CV_64F).var()
                
                # Removed strict sharpness filter (was < 50.0)
                # if sharpness < 50.0: continue
                
                # STRICT MODE SHARPNESS CHECK
                if strict_quality and sharpness < 60.0:
                     continue

                # Score: prefer sharpest image
                face_score = sharpness
                
                # Match to existing tracks — use adaptive distance based on face size
                matched_id = None
                # Adaptive threshold: ~1.5x face width prevents merging adjacent people
                adaptive_max_dist = max(50, int(w * 1.5))
                min_d = adaptive_max_dist
                
                for tid, tdata in tracks.items():
                    if tid in used_track_ids: continue
                    tcx, tcy = tdata['center']
                    dist = ((cx - tcx)**2 + (cy - tcy)**2)**0.5
                    if dist < min_d:
                        min_d = dist
                        matched_id = tid
                
                if matched_id is not None:
                    # Update track
                    tracks[matched_id]['center'] = (cx, cy)
                    tracks[matched_id]['frames'] += 1
                    tracks[matched_id]['last_seen'] = frame_idx
                    used_track_ids.add(matched_id)
                    
                    # Is this face better?
                    if face_score > tracks[matched_id]['best_score']:
                        # Save new best
                        name = f"track{matched_id}_best.jpg"
                        
                        # Process and save
                        saved, _ = process_face_crop(frame, x, y, w, h, faces_dir, name)
                        if saved:
                             tracks[matched_id]['best_score'] = face_score
                             tracks[matched_id]['best_file'] = name
                else:
                    # New track
                    new_id = next_track_id
                    next_track_id += 1
                    
                    name = f"track{new_id}_best.jpg"
                    
                    saved, _ = process_face_crop(frame, x, y, w, h, faces_dir, name)
                    if saved:
                        tracks[new_id] = {
                            'center': (cx, cy),
                            'best_score': face_score,
                            'best_file': name,
                            'frames': 1,
                            'last_seen': frame_idx,
                            'face_w': w
                        }
                        used_track_ids.add(new_id)

            # Also check if an existing track should NOT match — 
            # if >1 detection matched same track, keep closest and spawn new tracks for others
            stale_ids = [tid for tid, tdata in tracks.items() 
                         if (frame_idx - tdata['last_seen']) > STALE_THRESHOLD 
                         and tid not in used_track_ids]
            for tid in stale_ids:
                # Finalize stale track into results if it has enough frames
                if tracks[tid]['frames'] >= MIN_TRACK_FRAMES:
                    detected_faces_metadata[tid] = tracks[tid]['best_file']
                del tracks[tid]
                    
        except Exception as e:
            logging.error(f"Frame {frame_idx}: {e}")
            pass

        frame_idx += 1

    if face_detection:
        face_detection.close()
        
    cap.release()
    
    # Collect results — include ALL tracks (even single-frame ones for registration)
    final_dict = {}
    for tid, tdata in tracks.items():
        if tdata['frames'] >= MIN_TRACK_FRAMES:
             final_dict[tid] = tdata['best_file']
             
    logging.info(f"Finished extraction. Found {len(final_dict)} unique tracks (from {next_track_id} total created, {len(tracks)} still active at end).")
    print(f"DEBUG: Extracted {len(final_dict)} unique tracks (created {next_track_id} total)")
    return final_dict

def process_face_crop(frame, x, y, w, h, faces_dir, filename):
    ih, iw, _ = frame.shape
    margin = 20
    x_start = max(0, x - margin)
    y_start = max(0, y - margin)
    x_end = min(iw, x + w + margin)
    y_end = min(ih, y + h + margin)
    
    face_crop = frame[y_start:y_end, x_start:x_end]
    if face_crop.size == 0: return False, 0.0

    # Check minimum size
    if face_crop.shape[0] < 30 or face_crop.shape[1] < 30:
        return False, 0.0
        
    # Calculate sharpness
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()

    path = os.path.join(faces_dir, filename)
    cv2.imwrite(path, face_crop)
    return True, sharpness



def get_embedding_for_face(image_path):
    """Notebook: DeepFace.represent with model VGG-Face."""
    if not DEEPFACE_AVAILABLE:
        return None
    try:
        objs = DeepFace.represent(
            img_path=image_path,
            detector_backend="skip", # We already detected/cropped
            align=True,
            model_name="SFace", # Much lighter model for Free Tier
            enforce_detection=False,
        )
        if objs and len(objs) > 0:
            return objs[0]["embedding"]
    except Exception as e:
        # print(f"Error embedding {image_path}: {e}")
        pass
    return None


def get_embeddings_dict(faces_dir, max_faces=1500):
    """Build dict face_filename -> embedding for all faces in faces_dir."""
    files = [f for f in os.listdir(faces_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    result = {}
    # sort by frame/face index if possible to keep order
    files.sort()
    
    for i, f in enumerate(files[:max_faces]):
        path = os.path.join(faces_dir, f)
        emb = get_embedding_for_face(path)
        if emb:
            result[f] = emb
    return result


def get_embedding_2D_array(dictionary_frame_to_embedding):
    X = []
    new_frame_list = []
    for frame, emb in dictionary_frame_to_embedding.items():
        if emb is not None:
             X.append(emb)
             new_frame_list.append(frame)
    return X, new_frame_list


def get_dict_label_to_file(labels, frame_list):
    """Notebook: cluster_id -> list of face filenames."""
    labels = np.array(labels)
    dict_label_to_file = {}
    for uid in np.unique(labels):
        dict_label_to_file[int(uid)] = [
            frame_list[i] for i in range(len(labels)) if labels[i] == uid
        ]
    return dict_label_to_file


def run_pipeline(video_path, output_base_dir, use_deepface=True):
    """
    Run full pipeline for REGISTRATION: 
    extract faces -> embeddings -> DBSCAN -> return clusters with representative face base64.
    Now returns multiple embeddings per cluster for better attendance matching.
    """
    video_name = os.path.basename(video_path)
    video_stem = Path(video_name).stem
    data_dir = os.path.join(output_base_dir, video_stem)
    faces_dir = os.path.join(data_dir, "faces")
    if os.path.exists(faces_dir):
        pass
    os.makedirs(faces_dir, exist_ok=True)

    # 1) Extract faces
    tracks_dict = extract_faces_from_video(video_path, faces_dir, strict_quality=True, min_track_frames=3)
    n_faces = len(tracks_dict)
    
    if n_faces == 0:
        return {"faces_detected": 0, "clusters": [], "message": "No faces detected"}

    # 2) Embeddings
    dict_embedding = {}
    X = []
    frame_list = []
    
    if use_deepface and DEEPFACE_AVAILABLE:
        frame_list = list(tracks_dict.values())
        frame_list.sort()
        
        for f in frame_list:
             path = os.path.join(faces_dir, f)
             emb = get_embedding_for_face(path)
             if emb:
                 dict_embedding[f] = emb
        
        X, frame_list = get_embedding_2D_array(dict_embedding)
        
        metric = METRIC
        eps = 0.25  # Tight eps for Facenet512 cosine — prevents merging different people
        min_samples = 1  # Allow single-track clusters (each person might only appear once)
    else:
        print("DEBUG: DeepFace not available, using Tracks as clusters")
        frame_list = list(tracks_dict.values())
        frame_list.sort()
        X = []

    # 3) DBSCAN
    if len(X) > 0:
        db = DBSCAN(eps=eps, min_samples=min_samples, metric=metric).fit(X)
        labels = db.labels_.tolist()
    else:
        labels = list(range(len(frame_list)))

    # 4) Build cluster_id -> list of filenames
    if len(X) > 0:
         dict_label_to_file = get_dict_label_to_file(labels, frame_list)
         unique_labels = sorted(k for k in dict_label_to_file if k != -1)
         
         # IMPORTANT: Include noise faces (-1) as individual clusters
         # With tight eps, many valid faces end up as noise — we must not lose them
         noise_faces = dict_label_to_file.get(-1, [])
         if noise_faces:
             max_existing = max(unique_labels) if unique_labels else -1
             for i, nf in enumerate(noise_faces):
                 noise_cid = max_existing + 1 + i
                 dict_label_to_file[noise_cid] = [nf]
                 unique_labels.append(noise_cid)
             unique_labels = sorted(unique_labels)
    else:
         dict_label_to_file = {i: [frame_list[i]] for i in range(len(frame_list))}
         unique_labels = sorted(dict_label_to_file.keys())

    # 5) For each cluster: representative face + multiple embeddings
    clusters_out = []

    logging.info(f"DBSCAN produced {len([l for l in labels if l != -1])} clustered faces in {len(set(l for l in labels if l != -1))} clusters + {labels.count(-1)} noise faces (included as individual clusters)")
    print(f"DEBUG: {len(unique_labels)} total clusters (incl. noise-as-individual) from {len(frame_list)} face embeddings")
    
    for cid in unique_labels:
        files = dict_label_to_file[cid]
        if not files:
            continue
        rep_file = files[len(files)//2]
        rep_path = os.path.join(faces_dir, rep_file)
        
        # Calculate centroid embedding (backward compatible)
        centroid = []
        embeddings_list = []  # NEW: multiple embeddings for better matching
        if dict_embedding:
             try:
                 cluster_embeddings = [dict_embedding[f] for f in files if f in dict_embedding]
                 if cluster_embeddings:
                     centroid = np.mean(cluster_embeddings, axis=0).tolist()
                     # Store top embeddings (up to 5) sorted by distance from centroid
                     # This gives diverse reference points for matching
                     centroid_np = np.array(centroid)
                     scored = []
                     for emb in cluster_embeddings:
                         emb_np = np.array(emb)
                         dist = 1 - np.dot(centroid_np, emb_np) / (np.linalg.norm(centroid_np) * np.linalg.norm(emb_np) + 1e-10)
                         scored.append((dist, emb))
                     # Sort by distance to centroid, pick diverse set
                     scored.sort(key=lambda x: x[0])
                     # Take closest + some spread
                     top_n = min(5, len(scored))
                     embeddings_list = [s[1] for s in scored[:top_n]]
             except Exception as e:
                 logging.error(f"Embedding error for cluster {cid}: {e}")
        
        face_base64 = None
        if os.path.isfile(rep_path):
            with open(rep_path, "rb") as f:
                face_base64 = base64.b64encode(f.read()).decode("utf-8")
        
        clusters_out.append({
            "cluster_id": str(cid),
            "count": len(files),
            "face_base64": face_base64,
            "embedding": centroid,  # Backward compatible centroid
            "embeddings_list": embeddings_list  # NEW: multiple reference embeddings
        })

    # Fallback: If no clusters found but faces exist
    if len(clusters_out) == 0 and len(frame_list) > 0:
        for i, fname in enumerate(frame_list[:20]):
            path = os.path.join(faces_dir, fname)
            with open(path, "rb") as f:
                face_base64 = base64.b64encode(f.read()).decode("utf-8")
            single_emb = dict_embedding.get(fname, [])
            clusters_out.append({
                "cluster_id": f"single_{i}",
                "count": 1,
                "face_base64": face_base64,
                "embedding": single_emb,
                "embeddings_list": [single_emb] if single_emb else []
            })

    return {
        "faces_detected": n_faces,
        "unique_faces_registered": len(clusters_out),
        "clusters": clusters_out,
    }


def _cosine_distance(emb1, emb2):
    """Compute cosine distance between two embedding vectors."""
    emb1 = np.array(emb1)
    emb2 = np.array(emb2)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 < 1e-10 or norm2 < 1e-10:
        return 1.0
    return 1 - np.dot(emb1, emb2) / (norm1 * norm2)


def _match_embedding_to_student(emb, known_students):
    """
    Match a single face embedding against all known students.
    Uses multi-embedding matching: checks embeddings_list first (multiple reference points),
    falls back to single centroid embedding.
    Returns (best_student, min_distance) or (None, 999).
    """
    best_match = None
    min_dist = 999.0
    
    for student in known_students:
        # Try multi-embedding matching first (more accurate)
        embeddings_list = student.get("embeddings_list", [])
        if embeddings_list:
            for known_emb in embeddings_list:
                if not known_emb:
                    continue
                dist = _cosine_distance(emb, known_emb)
                if dist < min_dist:
                    min_dist = dist
                    best_match = student
        else:
            # Fallback to single centroid embedding (backward compatible)
            known_emb = student.get("embedding")
            if not known_emb:
                continue
            dist = _cosine_distance(emb, known_emb)
            if dist < min_dist:
                min_dist = dist
                best_match = student
    
    return best_match, min_dist


def recognize_faces_in_video(video_path, known_students, output_base_dir):
    """
    Attendance Mode:
    1. Extract faces from video.
    2. Get embeddings (skip blurry crops).
    3. Match against known_students using multi-embedding + majority voting.
    4. Return list of present student IDs.
    """
    if not DEEPFACE_AVAILABLE:
        return {"error": "DeepFace not available"}

    video_name = os.path.basename(video_path)
    video_stem = Path(video_name).stem
    data_dir = os.path.join(output_base_dir, "attendance_" + video_stem)
    faces_dir = os.path.join(data_dir, "faces")
    os.makedirs(faces_dir, exist_ok=True)
    
    # Extract faces
    extract_faces_from_video(video_path, faces_dir, max_faces=500, strict_quality=False, min_track_frames=1)
    
    # Get embeddings — with sharpness filter for quality
    dict_embedding = {}
    files = [f for f in os.listdir(faces_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    files.sort()
    
    for f in files:
        path = os.path.join(faces_dir, f)
        # Check sharpness before computing expensive embedding
        try:
            img = cv2.imread(path)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
            if sharpness < ATTENDANCE_MIN_SHARPNESS:
                logging.debug(f"Skipping blurry face {f} (sharpness={sharpness:.1f})")
                continue
        except Exception:
            continue
        
        emb = get_embedding_for_face(path)
        if emb:
            dict_embedding[f] = emb
    
    # --- Majority Voting ---
    # Count how many face crops match each student
    vote_counts = {}  # student_id -> count of matching crops
    vote_dists = {}   # student_id -> list of distances
    usage_log = []
    
    for fname, emb in dict_embedding.items():
        best_match, min_dist = _match_embedding_to_student(emb, known_students)
        
        if best_match and min_dist < ATTENDANCE_COSINE_THRESHOLD:
            sid = best_match["id"]
            vote_counts[sid] = vote_counts.get(sid, 0) + 1
            vote_dists.setdefault(sid, []).append(min_dist)
            usage_log.append({
                "face": fname,
                "match": best_match["name"],
                "dist": float(min_dist)
            })
        
        # DEBUG: Log all close matches to understand false positives
        if best_match and min_dist < 0.60:
             logging.info(f"DEBUG MATCH: Face {fname} matched {best_match['name']} ({best_match['id']}) with dist {min_dist:.4f}")
    
    # Only mark present if student has >= ATTENDANCE_MIN_VOTES matching crops
    present_students = set()
    for sid, count in vote_counts.items():
        if count >= ATTENDANCE_MIN_VOTES:
            present_students.add(sid)
            avg_dist = sum(vote_dists[sid]) / len(vote_dists[sid])
            logging.info(f"Student {sid} marked present: {count} votes, avg_dist={avg_dist:.4f}")
        else:
            logging.info(f"Student {sid} NOT marked present: only {count} vote(s), needs {ATTENDANCE_MIN_VOTES}")
            
    return {
        "present_student_ids": list(present_students),
        "total_faces_processed": len(dict_embedding),
        "vote_counts": {sid: cnt for sid, cnt in vote_counts.items()},
        "logs": usage_log
    }
