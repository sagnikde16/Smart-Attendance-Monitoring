import cv2
import os
import mediapipe as mp

video_path = r"uploads\reg_c82d45ec57a44259bb9a616383ac1988.mov"
if not os.path.exists(video_path):
    print(f"File not found: {video_path}")
    exit(1)

print(f"Testing MediaPipe on {video_path}")
try:
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        print("Extracting faces with mediapipe...")
        mp_face_detection = mp.solutions.face_detection
        with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detection.process(rgb_frame)
            
            if results.detections:
                print(f"Found {len(results.detections)} faces.")
                for i, detection in enumerate(results.detections):
                    print(f"  Face {i} score: {detection.score}")
            else:
                print("No faces found.")
    else:
        print("Could not read frame")

except Exception as e:
    print(f"Error: {e}")
