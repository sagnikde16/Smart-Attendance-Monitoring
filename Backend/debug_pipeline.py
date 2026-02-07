import os
import cv2
import numpy as np

try:
    from deepface import DeepFace
    print("DeepFace imported.")
except ImportError:
    print("DeepFace import FAILED.")
    exit(1)

# Create a dummy image (black square)
img = np.zeros((224, 224, 3), dtype=np.uint8)
cv2.imwrite("dummy_face.jpg", img)

print("Running DeepFace.represent on dummy image...")
try:
    objs = DeepFace.represent(
        img_path="dummy_face.jpg",
        detector_backend="skip",
        align=False, # fail fast
        model_name="Facenet512",
        enforce_detection=False,
    )
    print("DeepFace.represent success!")
    print(f"Embedding length: {len(objs[0]['embedding'])}")
except Exception as e:
    print(f"DeepFace.represent FAILED: {e}")
    import traceback
    traceback.print_exc()
finally:
    if os.path.exists("dummy_face.jpg"):
        os.remove("dummy_face.jpg")
