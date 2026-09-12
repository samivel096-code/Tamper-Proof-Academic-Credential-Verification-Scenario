import os

services_dir = os.path.join('app', 'services')
os.makedirs(services_dir, exist_ok=True)

with open(os.path.join(services_dir, 'image_quality_service.py'), 'w', encoding='utf-8') as f:
    f.write('''import cv2
import numpy as np
from typing import Dict, Any, List, Tuple

class ImageQualityService:
    @staticmethod
    def evaluate(image_path: str) -> Dict[str, Any]:
        """
        Strict quality checks using OpenCV:
        - Blur (Laplacian variance)
        - Resolution (Min width/height)
        - Brightness & Contrast
        - Glare (specular hotspots)
        - Cropping / Boundary clipping
        - Text Visibility & Edge density
        """
        img = cv2.imread(image_path)
        if img is None:
            return {
                "acceptable": False,
                "reasons": ["The uploaded file could not be decoded as a valid image."],
                "checklist": {
                    "document_visible": False,
                    "resolution_sufficient": False,
                    "text_readable": False,
                    "blur_acceptable": False,
                    "lighting_acceptable": False,
                    "orientation_acceptable": False
                },
                "blur_score": 0.0,
                "brightness": 0.0,
                "contrast": 0.0,
                "resolution": {"width": 0, "height": 0},
                "glare_detected": False,
                "crop_detected": True
            }

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur evaluation via variance of the Laplacian
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_blurry = laplacian_var < 80.0
        
        # 2. Resolution check
        is_resolution_low = (w < 600 or h < 400)
        
        # 3. Brightness & Contrast
        mean_brightness = float(np.mean(gray))
        std_contrast = float(np.std(gray))
        
        is_too_dark = mean_brightness < 42.0
        is_too_bright = mean_brightness > 235.0
        is_low_contrast = std_contrast < 30.0
        
        # 4. Glare detection
        # High intensity pixels with near zero saturation
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        glare_mask = (v_channel > 240) & (s_channel < 25)
        glare_ratio = float(np.sum(glare_mask)) / float(w * h)
        is_glare = glare_ratio > 0.08  # Over 8% specular glare
        
        # 5. Cropping / Edge cutoff check
        # Check if borders have high edge density (indicating cutoff text or clipped document)
        border_thickness = max(4, int(min(w, h) * 0.02))
        top_border = gray[0:border_thickness, :]
        bottom_border = gray[h - border_thickness:h, :]
        left_border = gray[:, 0:border_thickness]
        right_border = gray[:, w - border_thickness:w]
        
        edges = cv2.Canny(gray, 50, 150)
        border_edge_density = (
            np.sum(edges[0:border_thickness, :]) +
            np.sum(edges[h - border_thickness:h, :]) +
            np.sum(edges[:, 0:border_thickness]) +
            np.sum(edges[:, w - border_thickness:w])
        ) / float(255 * (2 * w * border_thickness + 2 * h * border_thickness))
        
        # If border edge density is excessively high while document covers entire frame, it may be heavily cropped
        is_heavily_cropped = border_edge_density > 0.35 and (w < 800 or h < 500)
        
        # 6. Text visibility & edge energy
        total_edge_density = float(np.sum(edges > 0)) / float(w * h)
        is_text_unreadable = total_edge_density < 0.015 or is_blurry

        # Compile failure reasons
        reasons: List[str] = []
        if is_blurry:
            reasons.append("Image is blurry; text features are not sharp enough for reliable verification.")
        if is_resolution_low:
            reasons.append(f"Image resolution is too low ({w}x{h} px). Minimum recommended is 800x600 px.")
        if is_too_dark:
            reasons.append("Lighting is insufficient; document appears severely underexposed or in deep shadows.")
        if is_too_bright:
            reasons.append("Image is overexposed / washed out; critical details are unreadable.")
        if is_low_contrast:
            reasons.append("Contrast is insufficient between document text and background.")
        if is_glare:
            reasons.append(f"Excessive specular glare detected ({glare_ratio*100:.1f}% hotspot area).")
        if is_heavily_cropped:
            reasons.append("Document appears partially cropped at the image borders.")

        acceptable = len(reasons) == 0

        checklist = {
            "document_visible": not is_heavily_cropped,
            "resolution_sufficient": not is_resolution_low,
            "text_readable": not is_text_unreadable,
            "blur_acceptable": not is_blurry,
            "lighting_acceptable": not (is_too_dark or is_too_bright or is_glare or is_low_contrast),
            "orientation_acceptable": True
        }

        return {
            "acceptable": acceptable,
            "reasons": reasons,
            "checklist": checklist,
            "blur_score": round(laplacian_var, 2),
            "brightness": round(mean_brightness, 2),
            "contrast": round(std_contrast, 2),
            "resolution": {"width": w, "height": h},
            "glare_detected": is_glare,
            "crop_detected": is_heavily_cropped
        }
''')

with open(os.path.join(services_dir, 'document_detection_service.py'), 'w', encoding='utf-8') as f:
    f.write('''import cv2
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

            dst = np.array([
                [0, 0],
                [target_width - 1, 0],
                [target_width - 1, target_height - 1],
                [0, target_height - 1]
            ], dtype="float32")

            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(img, M, (target_width, target_height))
            cv2.imwrite(output_path, warped)

            return True, output_path, {
                "detected": True,
                "perspective_corrected": True,
                "corners": rect.tolist(),
                "normalized_dimensions": [target_width, target_height]
            }
        else:
            # Document already cropped or clean card image: standardize resolution
            resized = cv2.resize(img, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
            cv2.imwrite(output_path, resized)

            return True, output_path, {
                "detected": True,
                "perspective_corrected": False,
                "corners": [[0, 0], [w, 0], [w, h], [0, h]],
                "normalized_dimensions": [target_width, target_height]
            }
''')

print('Quality and detection services generated successfully.')
