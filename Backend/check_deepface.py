import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
try:
    from deepface import DeepFace
    print("DeepFace imported successfully")
except Exception as e:
    print(f"Error importing DeepFace: {e}")
