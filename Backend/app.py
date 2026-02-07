"""
API: Upload video -> run notebook pipeline (face detection, clustering) -> return clusters.
Teacher then submits name & roll no per cluster -> save registration.
"""
import os
import uuid
import json
import re
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

UPLOAD_FOLDER = Path(__file__).parent / "uploads"
DATA_FOLDER = Path(__file__).parent / "data"
REGISTRATIONS_FILE = DATA_FOLDER / "registrations.json"
CLASSES_FILE = DATA_FOLDER / "classes.json"

UPLOAD_FOLDER.mkdir(exist_ok=True)
DATA_FOLDER.mkdir(exist_ok=True)

app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024 * 1024  # 2GB

ALLOWED_EXTENSIONS = {"mp4", "avi", "mkv", "mov", "webm"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def load_registrations():
    if not REGISTRATIONS_FILE.exists():
        return {}
    try:
        with open(REGISTRATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_registrations(data):
    with open(REGISTRATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_classes():
    if not CLASSES_FILE.exists():
        return []
    try:
        with open(CLASSES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_classes(data):
    with open(CLASSES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/upload-video", methods=["POST"])
def upload_video():
    if "video" not in request.files and "file" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files.get("video") or request.files.get("file")
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Use MP4, AVI, MKV, MOV, or WEBM"}), 400

    class_id = request.form.get("classId", "default")
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{class_id}_{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(save_path)

    try:
        from pipeline import run_pipeline
        output_base = Path(app.config["UPLOAD_FOLDER"]).parent / "temp"
        output_base.mkdir(exist_ok=True)
        result = run_pipeline(save_path, str(output_base), use_deepface=True)
        result["success"] = True
        result["video_id"] = unique_name
        result["video_name"] = file.filename
        result["classId"] = class_id
        return jsonify(result)
    except Exception as e:
        if os.path.exists(save_path):
            try:
                os.remove(save_path)
            except Exception:
                pass
        return jsonify({"error": str(e)}), 500


@app.route("/api/register-students", methods=["POST"])
def register_students():
    """Body: { classId, video_id, students: [ { cluster_id, name, roll_no } ] }"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    class_id = data.get("classId")
    video_id = data.get("video_id")
    students = data.get("students")
    if not class_id or not video_id or not isinstance(students, list):
        return jsonify({"error": "classId, video_id, and students (array) required"}), 400

    key = f"{class_id}_{video_id}"
    reg = load_registrations()
    reg[key] = {
        "classId": class_id,
        "video_id": video_id,
        "students": [
            {
                "cluster_id": s.get("cluster_id"),
                "name": (s.get("name") or "").strip(),
                "roll_no": (s.get("roll_no") or "").strip(),
            }
            for s in students
        ],
    }
    save_registrations(reg)
    return jsonify({"success": True, "message": "Registration saved"})


@app.route("/api/registrations/<class_id>/<video_id>", methods=["GET"])
def get_registrations(class_id, video_id):
    """Get saved name/roll_no for a video."""
    key = f"{class_id}_{video_id}"
    reg = load_registrations()
    if key not in reg:
        return jsonify({"students": []})
    return jsonify({"students": reg[key]["students"]})


@app.route("/api/video/<video_id>", methods=["GET"])
def get_video(video_id):
    if not video_id or not re.match(r"^[a-zA-Z0-9_.\-]+$", video_id):
        return jsonify({"error": "Invalid video"}), 400
    path = os.path.join(app.config["UPLOAD_FOLDER"], video_id)
    if not os.path.isfile(path):
        return jsonify({"error": "Video not found"}), 404
    return send_file(path, as_attachment=False, download_name=video_id)


@app.route("/api/classes", methods=["GET"])
def get_classes():
    return jsonify(load_classes())


@app.route("/api/classes", methods=["POST"])
def add_class():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    
    name = data.get("name")
    code = data.get("code") # e.g. CS-101
    time_schedule = data.get("time") # e.g. Mon/Wed 09:00 AM
    image = data.get("image", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60")

    if not name or not code or not time_schedule:
        return jsonify({"error": "name, code, and time are required"}), 400

    classes = load_classes()
    new_id = f"C{len(classes) + 201}" # Start from 201 to avoid conflict with mock data C101-C103
    
    # Check if ID exists (edge case with deletions, but simple for now)
    while any(c["id"] == new_id for c in classes):
         new_id = f"C{int(new_id[1:]) + 1}"

    new_class = {
        "id": new_id,
        "name": f"{code}: {name}", # Format to match mock data expectation
        "time": time_schedule,
        "students": 0, # Default
        "image": image
    }
    
    classes.append(new_class)
    save_classes(classes)
    
    return jsonify(new_class), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
