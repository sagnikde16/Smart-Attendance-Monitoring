import cv2
import os
from deepface import DeepFace
import logging

# Configure logging to stdout
logging.basicConfig(level=logging.DEBUG)

video_path = r"uploads\reg_c82d45ec57a44259bb9a616383ac1988.mov"

if not os.path.exists(video_path):
    print(f"File not found: {video_path}")
    exit(1)

print(f"Testing extraction on {video_path}")
cap = cv2.VideoCapture(video_path)
frame_count = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
    
    # Process only first few frames for test
    if frame_count > 30: 
        break
        
    if frame_count % 10 == 0:
        print(f"Processing frame {frame_count}")
        try:
            faces = DeepFace.extract_faces(
                img_path=frame, 
                detector_backend='retinaface', 
                enforce_detection=False, 
                align=True
            )
            print(f"Frame {frame_count}: Found {len(faces)} faces")
            for i, face in enumerate(faces):
                print(f"  Face {i} confidence: {face.get('confidence', 'N/A')}")
        except Exception as e:
            print(f"Error on frame {frame_count}: {e}")

    frame_count += 1

cap.release()
print("Done")
