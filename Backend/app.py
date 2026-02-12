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

MEDIA_FOLDER = Path(__file__).parent / "uploads"
DATA_FOLDER = Path(__file__).parent / "data"
REGISTRATIONS_FILE = DATA_FOLDER / "registrations.json"
CLASSES_FILE = DATA_FOLDER / "classes.json"
STUDENTS_FILE = DATA_FOLDER / "students.json"
ATTENDANCE_FILE = DATA_FOLDER / "attendance.json"

MEDIA_FOLDER.mkdir(exist_ok=True)
DATA_FOLDER.mkdir(exist_ok=True)

app.config["UPLOAD_FOLDER"] = str(MEDIA_FOLDER)
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


def load_students():
    if not STUDENTS_FILE.exists():
        return []
    try:
        with open(STUDENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_students(data):
    with open(STUDENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_attendance():
    if not ATTENDANCE_FILE.exists():
        return []
    try:
        with open(ATTENDANCE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_attendance(data):
    with open(ATTENDANCE_FILE, "w", encoding="utf-8") as f:
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
    teacher_id = request.args.get("teacherId")
    student_id = request.args.get("studentId") # This is the roll_no
    
    print(f"DEBUG: get_classes called with teacherId={teacher_id}, studentId={student_id}")

    all_classes = load_classes()
    
    if teacher_id:
        # Filter classes for this teacher
        user_classes = [c for c in all_classes if c.get("teacherId") == teacher_id]
        return jsonify(user_classes)
        
    if student_id:
        # Filter classes where student is enrolled
        all_students = load_students()
        # Find all classIds for this student roll_no
        enrolled_class_ids = {s.get("classId") for s in all_students if s.get("roll_no") == student_id}
        
        student_classes = [c for c in all_classes if c.get("id") in enrolled_class_ids]
        return jsonify(student_classes)

    # STRICT ISOLATION: If no ID provided, return nothing.
    # This prevents users from seeing all data if they bypass the frontend filters.
    return jsonify([])


@app.route("/api/classes", methods=["POST"])
def add_class():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    
    name = data.get("name")
    code = data.get("code") # e.g. CS-101
    time_schedule = data.get("time") # e.g. Mon/Wed 09:00 AM
    teacher_id = data.get("teacherId")
    image = data.get("image", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60")

    if not name or not code or not time_schedule or not teacher_id:
        return jsonify({"error": "name, code, time, and teacherId are required"}), 400

    classes = load_classes()
    new_id = f"C{len(classes) + 201}" # Start from 201 to avoid conflict with mock data C101-C103
    
    # Check if ID exists (edge case with deletions, but simple for now)
    while any(c["id"] == new_id for c in classes):
         new_id = f"C{int(new_id[1:]) + 1}"

    new_class = {
        "id": new_id,
        "name": f"{code}: {name}", # Format to match mock data expectation
        "time": time_schedule,
        "teacherId": teacher_id,
        "students": 0, # Default
        "image": image
    }
    
    classes.append(new_class)
    save_classes(classes)
    
    return jsonify(new_class), 201


@app.route("/api/classes/<class_id>", methods=["DELETE"])
def delete_class(class_id):
    classes = load_classes()
    # Filter out the class
    new_classes = [c for c in classes if c.get("id") != class_id]
    
    if len(new_classes) == len(classes):
        return jsonify({"error": "Class not found"}), 404
        
    save_classes(new_classes)
    return jsonify({"success": True, "message": "Class deleted"})


@app.route("/api/process-register-video", methods=["POST"])
def process_register_video():
    """Upload video -> Extract Faces -> Return Clusters for user to label."""
    if "video" not in request.files:
         return jsonify({"error": "No video file provided"}), 400
    
    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Invalid file type"}), 400

    unique_name = f"reg_{uuid.uuid4().hex}.{ext}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(save_path)

    try:
        from pipeline import run_pipeline
        # Output to temp dir
        output_base = Path(app.config["UPLOAD_FOLDER"]).parent / "temp"
        output_base.mkdir(exist_ok=True)
        
        result = run_pipeline(save_path, str(output_base), use_deepface=True)
        result["video_id"] = unique_name
         # Clean up video? Keep for now?
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/students", methods=["GET"])
def get_students():
    return jsonify(load_students())


@app.route("/api/students", methods=["POST"])
def add_student():
    """Save a student with embedding."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    
    # Validation
    if not data.get("name") or not data.get("roll_no"):
        return jsonify({"error": "Name and Roll No required"}), 400

    students = load_students()
    
    # Check duplicate roll no IN THE SAME CLASS
    target_class = data.get("classId")
    if any(s["roll_no"] == data["roll_no"] and s.get("classId") == target_class for s in students):
        return jsonify({"error": "Student with this Roll No already exists in this class"}), 409

    new_student = {
        "id": str(uuid.uuid4()),
        "name": data["name"],
        "roll_no": data["roll_no"],
        "classId": data.get("classId"),
        "embedding": data.get("embedding"), # Centroid embedding (backward compatible)
        "embeddings_list": data.get("embeddings_list", []), # Multiple reference embeddings for better matching
        "face_base64": data.get("face_base64"), # Thumbnail
        "registered_at": "2023-10-27" # Mock date or current
    }
    
    students.append(new_student)
    save_students(students)
    
    return jsonify(new_student), 201


@app.route("/api/process-attendance-video", methods=["POST"])
def process_attendance_video():
    """Upload video -> Recognize Faces -> Return Present Students."""
    if "video" not in request.files:
         return jsonify({"error": "No video file provided"}), 400
    
    file = request.files["video"]
    unique_name = f"att_{uuid.uuid4().hex}.{file.filename.rsplit('.', 1)[1].lower()}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(save_path)

    try:
        from pipeline import recognize_faces_in_video
        output_base = Path(app.config["UPLOAD_FOLDER"]).parent / "temp"
        
        # Load all students (or filter by classId if passed in form data)
        students = load_students()
        
        # FILTER BY CLASS ID
        class_id = request.form.get("classId")
        if class_id:
            print(f"DEBUG: Filtering attendance for class {class_id}")
            students = [s for s in students if s.get("classId") == class_id]
        else:
            print("WARNING: No classId provided for attendance. Using ALL students.")

        result = recognize_faces_in_video(save_path, students, str(output_base))
        
        # Hydrate student details
        present_details = []
        for sid in result["present_student_ids"]:
            stu = next((s for s in students if s["id"] == sid), None)
            if stu:
                present_details.append(stu)
        
        result["present_students"] = present_details
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/attendance", methods=["POST"])
def save_attendance_record():
    """Save the final attendance list."""
    data = request.get_json()
    records = load_attendance()
    
    # Ensure ID
    if "id" not in data:
        data["id"] = str(uuid.uuid4())
        
    records.append(data)
    save_attendance(records)
    return jsonify({"success": True, "record": data}), 201


@app.route("/api/attendance/<class_id>", methods=["GET"])
def get_class_attendance(class_id):
    student_id = request.args.get("studentId")
    all_records = load_attendance()
    
    # Filter by class
    class_records = [r for r in all_records if r.get("classId") == class_id]
    
    if student_id:
        # For a student, we want to see sessions where they were present OR absent?
        # Typically students want to see their attendance log.
        # The records structure is a list of sessions, each having "present_students".
        # We should probably return the sessions, but maybe mark if they were present?
        # Or just return sessions where they were present?
        # User said "show their validation report for each day".
        # Let's return all sessions for the class, but the frontend will check if they are in 'present_students'.
        # Actually, simpler: return all class records. The frontend can check if the student is in the list.
        # BUT for privacy, maybe we shouldn't send the full list of other students?
        # Let's filter the "present_students" list in each record to only include THIS student if present.
        
        filtered_records = []
        for record in class_records:
            # Create a copy to not mutate original
            new_record = record.copy()
            # Filter present_students to just this student
            new_record["present_students"] = [
                s for s in record.get("present_students", []) 
                if s.get("roll_no") == student_id
            ]
            filtered_records.append(new_record)
        return jsonify(filtered_records)

    return jsonify(class_records)


@app.route("/api/attendance/export/<class_id>", methods=["GET"])
def export_attendance(class_id):
    """Export class attendance to Excel with Photos."""
    try:
        import pandas as pd
        from io import BytesIO
        import base64
        from openpyxl.drawing.image import Image as ExcelImage
        from openpyxl.utils import get_column_letter

        all_records = load_attendance()
        class_sessions = [r for r in all_records if r.get("classId") == class_id]
        
        if not class_sessions:
            return jsonify({"error": "No attendance data found for this class"}), 404

        # Prepare data and images
        rows = []
        images_to_add = [] # List of (row_index, col_index, image_stream)

        # Header
        headers = ["Date", "Roll No", "Name", "Status", "Photo"]
        
        for session in class_sessions:
            date_str = session.get("date", "")[:10]
            time_str = session.get("date", "")[11:16]
            full_date = f"{date_str} {time_str}"
            
            present_stu = session.get("present_students", [])
            
            # ID check: if present_stu is list of strings (legacy/buggy data), skip or handle
            if present_stu and isinstance(present_stu[0], str):
                # Try to resolve IDs if needed, or just print ID
                # For now, let's skip legacy data to avoid errors, or try to load students
                 continue

            for stu in present_stu:
                row_data = {
                    "Date": full_date,
                    "Roll No": stu.get("roll_no", ""),
                    "Name": stu.get("name", ""),
                    "Status": "Present",
                    "Photo": "" # Placeholder
                }
                rows.append(row_data)
                
                # Handle Image
                b64_str = stu.get("face_base64")
                if b64_str:
                    try:
                        img_data = base64.b64decode(b64_str)
                        img_stream = BytesIO(img_data)
                        # We need to add this to the sheet later
                        # Current row index is len(rows) (1-based because of header) + 1
                        images_to_add.append((len(rows) + 1, 5, img_stream)) # 5 is Column E (Photo)
                    except Exception:
                        pass
        
        if not rows:
             return jsonify({"error": "No valid attendance records found"}), 404

        df = pd.DataFrame(rows)
        
        output = BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name='Attendance')
        
        workbook = writer.book
        worksheet = writer.sheets['Attendance']
        
        # Adjust column widths
        worksheet.column_dimensions['A'].width = 20
        worksheet.column_dimensions['B'].width = 15
        worksheet.column_dimensions['C'].width = 25
        worksheet.column_dimensions['D'].width = 15
        worksheet.column_dimensions['E'].width = 15 # Photo column
        
        # Add images
        for row_idx, col_idx, img_stream in images_to_add:
            try:
                img = ExcelImage(img_stream)
                img.width = 50
                img.height = 50
                # Anchor to cell
                cell_addr = f"{get_column_letter(col_idx)}{row_idx}"
                worksheet.add_image(img, cell_addr)
                # Adjust row height
                worksheet.row_dimensions[row_idx].height = 40
            except Exception as e:
                print(f"Error adding image: {e}")

        writer.close()
        output.seek(0)
        
        filename = f"Attendance_{class_id}.xlsx"
        return send_file(
            output, 
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True, 
            download_name=filename
        )

    except ImportError:
        return jsonify({"error": "pandas or openpyxl missing on server"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
