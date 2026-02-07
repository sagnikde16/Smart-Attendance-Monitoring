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
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False

# Same as notebook
METRIC = "cosine" # Changing to cosine as it is standard for VGG-Face
EPS = 0.4 # Slightly looser for cosine
MIN_SAMPLES = 5
FRAME_SAMPLE_INTERVAL = 15 # Sample more frequently
MAX_FACES = 2000
FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


def extract_faces_from_video(video_path, faces_dir, max_faces=MAX_FACES):
    """Extract face crops from video using Haar (fast) or DeepFace (accurate)."""
    Path(faces_dir).mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(video_path)
    face_cascade = cv2.CascadeClassifier(FACE_CASCADE_PATH)
    frame_idx = 0
    face_count = 0

    while cap.isOpened() and face_count < max_faces:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % FRAME_SAMPLE_INTERVAL != 0:
            frame_idx += 1
            continue

        # Use Haar for speed in extraction phase, or could use DeepFace.extract_faces
        # For this implementation, stick to Haar for speed, but filter small faces
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        
        for (x, y, w, h) in faces:
            if face_count >= max_faces:
                break
            # Add some margin
            margin = 20
            x_start = max(0, x - margin)
            y_start = max(0, y - margin)
            x_end = min(frame.shape[1], x + w + margin)
            y_end = min(frame.shape[0], y + h + margin)
            
            face_crop = frame[y_start:y_end, x_start:x_end]
            if face_crop.size == 0:
                continue
            name = f"frame{frame_idx}_face{face_count}.jpg"
            path = os.path.join(faces_dir, name)
            cv2.imwrite(path, face_crop)
            face_count += 1
        frame_idx += 1

    cap.release()
    return face_count


def get_embedding_for_face(image_path):
    """Notebook: DeepFace.represent with model VGG-Face."""
    if not DEEPFACE_AVAILABLE:
        return None
    try:
        objs = DeepFace.represent(
            img_path=image_path,
            detector_backend="skip", # We already detected/cropped
            align=True,
            model_name="VGG-Face",
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
    """
    video_name = os.path.basename(video_path)
    video_stem = Path(video_name).stem
    data_dir = os.path.join(output_base_dir, video_stem)
    faces_dir = os.path.join(data_dir, "faces")
    if os.path.exists(faces_dir):
        # clean up previous run? or just overwrite?
        pass
    os.makedirs(faces_dir, exist_ok=True)

    # 1) Extract faces
    n_faces = extract_faces_from_video(video_path, faces_dir)
    if n_faces == 0:
        return {"faces_detected": 0, "clusters": [], "message": "No faces detected"}

    # 2) Embeddings
    if use_deepface and DEEPFACE_AVAILABLE:
        dict_embedding = get_embeddings_dict(faces_dir)
        X, frame_list = get_embedding_2D_array(dict_embedding)
        
        if len(X) < 2:
            # If very few faces, just return them as individual "clusters" or error
             pass
             
        metric = METRIC
        eps = EPS
        min_samples = 3 # Lower min_samples for small videos
    else:
        return {"faces_detected": n_faces, "clusters": [], "message": "DeepFace not available"}

    # 3) DBSCAN
    if len(X) > 0:
        db = DBSCAN(eps=eps, min_samples=min_samples, metric=metric).fit(X)
        labels = db.labels_.tolist()
    else:
        labels = []

    # 4) Build cluster_id -> list of filenames (exclude noise -1)
    dict_label_to_file = get_dict_label_to_file(labels, frame_list)
    unique_labels = sorted(k for k in dict_label_to_file if k != -1)

    # 5) For each cluster: representative face as base64
    clusters_out = []
    
    # If we have noise (-1) and we want to allow users to pick from them too?
    # For now, let's only return valid clusters, OR if no clusters found, return all images as candidates?
    # Strategy: Return valid clusters first.
    
    for cid in unique_labels:
        files = dict_label_to_file[cid]
        if not files:
            continue
        # Pick middle face as representative
        rep_file = files[len(files)//2]
        rep_path = os.path.join(faces_dir, rep_file)
        
        # Calculate cluster embedding (centroid)
        cluster_embeddings = [dict_embedding[f] for f in files]
        centroid = np.mean(cluster_embeddings, axis=0).tolist()
        
        face_base64 = None
        if os.path.isfile(rep_path):
            with open(rep_path, "rb") as f:
                face_base64 = base64.b64encode(f.read()).decode("utf-8")
        
        clusters_out.append({
            "cluster_id": str(cid),
            "count": len(files),
            "face_base64": face_base64,
            "embedding": centroid # Return centroid for saving later
        })

    # Fallback: If no clusters found but faces exist, maybe return top 10 faces?
    if len(clusters_out) == 0 and len(frame_list) > 0:
        # Just return first 10 faces as potential "students"
        for i, fname in enumerate(frame_list[:20]):
            path = os.path.join(faces_dir, fname)
            with open(path, "rb") as f:
                face_base64 = base64.b64encode(f.read()).decode("utf-8")
            clusters_out.append({
                "cluster_id": f"single_{i}",
                "count": 1,
                "face_base64": face_base64,
                "embedding": dict_embedding[fname]
            })

    return {
        "faces_detected": n_faces,
        "unique_faces_registered": len(clusters_out),
        "clusters": clusters_out,
    }


def recognize_faces_in_video(video_path, known_students, output_base_dir):
    """
    Attendance Mode:
    1. Extract faces from video.
    2. Get embeddings.
    3. Match against known_students (list of {id, name, embedding}).
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
    extract_faces_from_video(video_path, faces_dir, max_faces=500)
    
    # Get embeddings
    dict_embedding = get_embeddings_dict(faces_dir)
    
    present_students = set()
    usage_log = []
    
    # Threshold for cosine similarity (VGG-Face usually < 0.40 is good match)
    THRESHOLD = 0.40
    
    for fname, emb in dict_embedding.items():
        best_match = None
        min_dist = 100.0
        
        for student in known_students:
            known_emb = student.get("embedding")
            if not known_emb:
                continue
            
            # Cosine distance
            dist = 1 - np.dot(emb, known_emb) / (np.linalg.norm(emb) * np.linalg.norm(known_emb))
            
            if dist < min_dist:
                min_dist = dist
                best_match = student
        
        if best_match and min_dist < THRESHOLD:
            present_students.add(best_match["id"])
            usage_log.append({
                "face": fname,
                "match": best_match["name"],
                "dist": float(min_dist)
            })
            
    return {
        "present_student_ids": list(present_students),
        "total_faces_processed": len(dict_embedding),
        "logs": usage_log
    }
