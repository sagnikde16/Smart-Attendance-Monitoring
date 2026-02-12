from deepface import DeepFace
import cv2
import os

video_path = r"uploads\reg_c82d45ec57a44259bb9a616383ac1988.mov"
if not os.path.exists(video_path):
    print(f"File not found: {video_path}")
    exit(1)

print(f"Testing SSD on {video_path}")
try:
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    
    if ret:
        print("Extracting faces with ssd...")
        # ssd might be called 'ssd' or 'opencv' with ssd model? 
        # DeepFace backends: 'opencv', 'ssd', 'dlib', 'mtcnn', 'retinaface', 'mediapipe', 'yolov8', 'yunet', 'fastmtcnn'
        faces = DeepFace.extract_faces(
            img_path=frame, 
            detector_backend='ssd', 
            enforce_detection=False, 
            align=True
        )
        print(f"Found {len(faces)} faces.")
        for i, face in enumerate(faces):
            print(f"  Face {i} confidence: {face.get('confidence', 'N/A')}")
    else:
        print("Could not read frame")

except Exception as e:
    print(f"Error: {e}")
