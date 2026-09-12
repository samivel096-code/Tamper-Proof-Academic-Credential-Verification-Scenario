import cv2
import numpy as np
import os
from typing import Tuple, Optional

class DocumentDetectionService:
    @staticmethod
    def order_points(pts: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]  # top-left
        rect[2] = pts[np.argmax(s)]  # bottom-right

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]  # top-right
        rect[3] = pts[np.argmax(diff)]  # bottom-left
        return rect

    @classmethod
    def detect_and_normalize(
        cls, 
        image_path: str, 
        output_path: str, 
        target_width: int = 1050, 
        target_height: int = 660
    ) -> Tuple[bool, str, dict]:
        """
        Detects document boundaries, corrects perspective, and produces a normalized image.
        Returns (success, normalized_image_path, detection_metadata).
        """
        img = cv2.imread(image_path)
        if img is None:
            return False, image_path, {"detected": False}

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 200)

        # Dilate to connect broken contours
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        dilated = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

        doc_contour = None
        img_area = w * h

        for c in contours:
            area = cv2.contourArea(c)
            # Must occupy at least 25% of total image area
            if area < 0.25 * img_area:
                continue

            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)

            if len(approx) == 4:
                doc_contour = approx
                break

        if doc_contour is not None:
            pts = doc_contour.reshape(4, 2)
            rect = cls.order_points(pts)

            w_top = np.linalg.norm(rect[1] - rect[0])
            w_bot = np.linalg.norm(rect[2] - rect[3])
            h_left = np.linalg.norm(rect[3] - rect[0])
            h_right = np.linalg.norm(rect[2] - rect[1])
            cont_w = max(int(w_top), int(w_bot))
            cont_h = max(int(h_left), int(h_right))

            # Choose orientation matching detected geometry
            if cont_h > cont_w * 1.15:
                out_w, out_h = target_height, target_width
            else:
                out_w, out_h = target_width, target_height

            dst = np.array([
                [0, 0],
                [out_w - 1, 0],
                [out_w - 1, out_h - 1],
                [0, out_h - 1]
            ], dtype="float32")

            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (out_w, out_h))
            cv2.imwrite(output_path, warped)

            return True, output_path, {
                "detected": True,
                "perspective_corrected": True,
                "corners": rect.tolist(),
                "normalized_dimensions": [out_w, out_h]
            }
        else:
            # Document already cropped or clean capture: preserve natural aspect ratio
            aspect = float(w) / float(h)
            if aspect >= 1.1:
                out_w, out_h = target_width, target_height
                resized = cv2.resize(img, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4)
            else:
                # Vertical / portrait format (e.g. e-Aadhaar full page letter)
                scale = min(1400.0 / float(h), 1.0)
                out_w = max(600, int(w * scale))
                out_h = max(800, int(h * scale))
                resized = cv2.resize(img, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4)

            cv2.imwrite(output_path, resized)

            return True, output_path, {
                "detected": True,
                "perspective_corrected": False,
                "corners": [[0, 0], [w, 0], [w, h], [0, h]],
                "normalized_dimensions": [out_w, out_h]
            }

