import sys
import os
import cv2

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pipeline import extract_faces_from_video

# Use the same video as previous tests
video_path = r"uploads\reg_c82d45ec57a44259bb9a616383ac1988.mov"
if not os.path.exists(video_path):
    print(f"File not found: {video_path}")
    # Try finding any video
    uploads = "uploads"
    if os.path.exists(uploads):
        for f in os.listdir(uploads):
            if f.endswith((".mp4", ".mov", ".avi", ".webm")):
                video_path = os.path.join(uploads, f)
                break

print(f"Testing pipeline pipeline on {video_path}")

output_dir = "temp_test_faces"
import shutil
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)

try:
    count = extract_faces_from_video(video_path, output_dir)
    print(f"Extraction complete. Found {count} faces.")
    
    if count > 0:
        print("Success! Faces detected.")
        # List a few files
        files = os.listdir(output_dir)
        print(f"Generated {len(files)} files in {output_dir}")
    else:
        print("Warning: No faces found (could be empty video or detection failure)")

except Exception as e:
    print(f"Pipeline failed: {e}")
    import traceback
    traceback.print_exc()
