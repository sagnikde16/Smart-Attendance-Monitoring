import sys
print(f"Python: {sys.version}")

packages = ["flask", "flask_cors", "cv2", "numpy", "sklearn", "deepface", "pandas", "openpyxl"]
missing = []

for p in packages:
    try:
        if p == "cv2":
            import cv2
        elif p == "sklearn":
            import sklearn
        elif p == "deepface":
            import deepface
        elif p == "flask_cors":
            import flask_cors
        else:
            __import__(p)
        print(f"[OK] {p}")
    except ImportError as e:
        print(f"[MISSING] {p}: {e}")
        missing.append(p)
    except Exception as e:
        print(f"[ERROR] {p}: {e}")

if missing:
    print(f"Missing packages: {', '.join(missing)}")
    sys.exit(1)
else:
    print("All packages installed.")
