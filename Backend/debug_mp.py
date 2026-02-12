import sys
import subprocess
import traceback

with open("debug_output_venv.txt", "w") as f:
    f.write(f"Python version: {sys.version}\n")

    try:
        import numpy
        f.write(f"Numpy version: {numpy.__version__}\n")
    except ImportError as e:
        f.write(f"Numpy import failed: {e}\n")

    try:
        import google.protobuf
        f.write(f"Protobuf version: {google.protobuf.__version__}\n")
    except ImportError as e:
        f.write(f"Protobuf import failed: {e}\n")

    try:
        import cv2
        f.write(f"CV2 version: {cv2.__version__}\n")
    except ImportError as e:
        f.write(f"CV2 import failed: {e}\n")

    f.write("Attempting to import mediapipe...\n")
    try:
        import mediapipe as mp
        f.write(f"MediaPipe version: {mp.__version__}\n")
        f.write(f"MediaPipe dir: {dir(mp)}\n")
        try:
            import mediapipe.solutions
            f.write("Successfully imported mediapipe.solutions\n")
        except ImportError as e:
            f.write(f"Failed to import mediapipe.solutions: {e}\n")
            
    except Exception as e:
        f.write("MediaPipe import FAILED\n")
        traceback.print_exc(file=f)

    # Print pip list
    f.write("\nInstalled packages:\n")
    subprocess.run([sys.executable, "-m", "pip", "list"], stdout=f)
