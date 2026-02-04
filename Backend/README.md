# Attendance Backend (notebook pipeline)

Runs the same logic as `new_pipeline.ipynb`: **video → face detection → face clustering → registration**.  
Teacher then enters **name** and **roll no** per cluster in the frontend.

## Setup

```powershell
cd "C:\Users\SAGNIK DE\Documents\IS-Project\backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** `deepface` is used for face embeddings (VGG-Face, same as notebook). If you skip it, the pipeline falls back to OpenCV-only features and simpler clustering.

## Run

```powershell
python app.py
```

Server: `http://localhost:5000`. Frontend: `http://localhost:5173`.

## Flow

1. **Upload video** – Frontend sends video + `classId` → backend saves video, runs pipeline (extract faces with Haar, embeddings with DeepFace, DBSCAN with `metric=correlation`, `eps=0.28`, `min_samples=11`).
2. **Clusters returned** – Each cluster has `cluster_id`, `count`, and a representative face image (base64).
3. **Teacher enters name & roll no** – For each cluster, teacher fills Name and Roll No in the UI and clicks **Save registration**.
4. **Registration saved** – Stored in `backend/data/registrations.json` keyed by `classId` and `video_id`.

## API

- `POST /api/upload-video` – form: `video` (file), `classId` → returns `clusters` with `face_base64`.
- `POST /api/register-students` – JSON: `{ classId, video_id, students: [ { cluster_id, name, roll_no } ] }`.
- `GET /api/registrations/<classId>/<video_id>` – get saved names/roll numbers.
- `GET /api/video/<video_id>` – stream uploaded video.

Pipeline parameters (same as notebook): `FRAME_SAMPLE_INTERVAL=30`, `EPS=0.28`, `MIN_SAMPLES=11`, `METRIC=correlation`.
