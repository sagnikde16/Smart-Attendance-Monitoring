"""
Face detection, clustering and registration pipeline based on new_pipeline.ipynb.
Flow: video -> extract faces (Haar) -> embeddings (DeepFace) -> DBSCAN cluster -> return clusters with representative face.
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
METRIC = "correlation"
EPS = 0.28
MIN_SAMPLES = 11
FRAME_SAMPLE_INTERVAL = 30
MAX_FACES = 2000
FACE_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


def extract_faces_from_video(video_path, faces_dir, max_faces=MAX_FACES):
    """Extract face crops from video using Haar (notebook also has YOLO/DeepFace extract)."""
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

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        for (x, y, w, h) in face_cascade.detectMultiScale(
            gray, scaleFactor=1.2, minNeighbors=5, minSize=(20, 20)
        ):
            if face_count >= max_faces:
                break
            face_crop = frame[y : y + h, x : x + w]
            if face_crop.size == 0:
                continue
            name = f"frame{frame_idx}face{face_count}.jpg"
            path = os.path.join(faces_dir, name)
            cv2.imwrite(path, face_crop)
            face_count += 1
        frame_idx += 1

    cap.release()
    return face_count


def get_embedding_for_face(image_path):
    """Notebook: DeepFace.represent with model VGG-Face, detector can be 'skip' for cropped face."""
    if not DEEPFACE_AVAILABLE:
        return None
    try:
        objs = DeepFace.represent(
            img_path=image_path,
            detector_backend="skip",
            align=True,
            model_name="VGG-Face",
            enforce_detection=False,
        )
        if objs and len(objs) > 0:
            return objs[0]["embedding"]
    except Exception:
        pass
    return None


def get_embeddings_dict(faces_dir, max_faces=1500):
    """Build dict face_filename -> embedding for all faces in faces_dir."""
    files = [f for f in os.listdir(faces_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    result = {}
    for i, f in enumerate(files[:max_faces]):
        if (i + 1) % 100 == 0:
            print(f"  Embedding {i + 1}/{min(len(files), max_faces)}")
        path = os.path.join(faces_dir, f)
        result[f] = get_embedding_for_face(path)
    return result


def get_embedding_2D_array(dictionary_frame_to_embedding):
    """Notebook: filter None/nan and return X, frame_list."""
    X = []
    new_frame_list = []
    for frame in dictionary_frame_to_embedding:
        emb = dictionary_frame_to_embedding[frame]
        if emb is not None and not (isinstance(emb, list) and len(emb) > 0 and np.isnan(emb[0])):
            try:
                arr = np.array(emb, dtype=np.float64)
                if not np.any(np.isnan(arr)):
                    X.append(list(arr))
                    new_frame_list.append(frame)
            except Exception:
                pass
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
    Run full pipeline: extract faces -> embeddings -> DBSCAN -> return clusters with representative face base64.
    If DeepFace is not available, uses simple OpenCV-based embedding and clustering (fewer clusters).
    """
    video_name = os.path.basename(video_path)
    video_stem = Path(video_name).stem
    data_dir = os.path.join(output_base_dir, video_stem)
    faces_dir = os.path.join(data_dir, "faces")
    os.makedirs(faces_dir, exist_ok=True)

    # 1) Extract faces
    n_faces = extract_faces_from_video(video_path, faces_dir)
    if n_faces == 0:
        return {"faces_detected": 0, "clusters": [], "message": "No faces detected"}

    # 2) Embeddings
    if use_deepface and DEEPFACE_AVAILABLE:
        dict_embedding = get_embeddings_dict(faces_dir)
        X, frame_list = get_embedding_2D_array(dict_embedding)
        if len(X) < MIN_SAMPLES:
            return {
                "faces_detected": n_faces,
                "clusters": [],
                "message": "Too few valid embeddings after filtering",
            }
        metric = METRIC
        eps = EPS
        min_samples = MIN_SAMPLES
    else:
        # Fallback: simple feature from face crop (no DeepFace)
        X = []
        frame_list = []
        for f in os.listdir(faces_dir):
            if not f.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(faces_dir, f)
            img = cv2.imread(path)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            small = cv2.resize(gray, (64, 64))
            feat = small.astype(np.float64).flatten() / 255.0
            norm = np.linalg.norm(feat)
            if norm > 0:
                feat = feat / norm
            X.append(feat.tolist())
            frame_list.append(f)
        if len(X) < 3:
            return {"faces_detected": n_faces, "clusters": [], "message": "Too few faces for clustering"}
        metric = "euclidean"
        eps = 3.0
        min_samples = 2

    # 3) DBSCAN
    X_arr = np.array(X, dtype=np.float64)
    db = DBSCAN(eps=eps, min_samples=min_samples, metric=metric).fit(X_arr)
    labels = db.labels_.tolist()

    # 4) Build cluster_id -> list of filenames (exclude noise -1)
    dict_label_to_file = get_dict_label_to_file(labels, frame_list)
    unique_labels = sorted(k for k in dict_label_to_file if k != -1)

    # 5) For each cluster: representative face as base64
    clusters_out = []
    for cid in unique_labels:
        files = dict_label_to_file[cid]
        if not files:
            continue
        rep_path = os.path.join(faces_dir, files[0])
        face_base64 = None
        if os.path.isfile(rep_path):
            with open(rep_path, "rb") as f:
                face_base64 = base64.b64encode(f.read()).decode("utf-8")
        clusters_out.append({
            "cluster_id": cid,
            "count": len(files),
            "face_base64": face_base64,
        })

    # 6) If no clusters (e.g. all noise), show each face as its own row so user can still see faces and enter names
    max_faces_show = 150
    if len(clusters_out) == 0 and frame_list:
        for idx, fname in enumerate(frame_list[:max_faces_show]):
            path = os.path.join(faces_dir, fname)
            face_base64 = None
            if os.path.isfile(path):
                with open(path, "rb") as f:
                    face_base64 = base64.b64encode(f.read()).decode("utf-8")
            clusters_out.append({
                "cluster_id": idx,
                "count": 1,
                "face_base64": face_base64,
            })

    return {
        "faces_detected": n_faces,
        "unique_faces_registered": len(clusters_out),
        "clusters": clusters_out,
    }
