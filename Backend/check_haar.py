import cv2
import os

path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
print(f"Path: {path}")
print(f"Exists: {os.path.exists(path)}")

cascade = cv2.CascadeClassifier(path)
print(f"Loaded: {not cascade.empty()}")
