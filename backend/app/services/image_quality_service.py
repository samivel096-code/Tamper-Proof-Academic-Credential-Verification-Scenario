import cv2
import numpy as np
from typing import Dict, Any, List, Tuple

class ImageQualityService:
    @staticmethod
    def evaluate(image_path: str) -> Dict[str, Any]:
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
        is_blurry = bool(laplacian_var < 50.0)
        
        # 2. Resolution check
        is_resolution_low = bool(w < 600 or h < 400)
        
        # 3. Brightness & Contrast
        mean_brightness = float(np.mean(gray))
        std_contrast = float(np.std(gray))
        
        is_too_dark = bool(mean_brightness < 40.0)
        is_too_bright = bool(mean_brightness > 248.0)
        is_low_contrast = bool(std_contrast < 22.0)
        
        # 4. Glare detection (flash reflection causing washed out detail)
        # Glare is indicated by saturated pure white (254-255) covering more than 35% of the frame with low detail
        saturated_pixels = float(np.sum(gray >= 253)) / float(w * h)
        is_glare = bool(saturated_pixels > 0.40 and mean_brightness > 240.0)
        
        # 5. Cropping / Edge cutoff check
        border_thickness = max(4, int(min(w, h) * 0.02))
        edges = cv2.Canny(gray, 50, 150)
        border_edge_density = (
            float(np.sum(edges[0:border_thickness, :])) +
            float(np.sum(edges[h - border_thickness:h, :])) +
            float(np.sum(edges[:, 0:border_thickness])) +
            float(np.sum(edges[:, w - border_thickness:w]))
        ) / float(255 * (2 * w * border_thickness + 2 * h * border_thickness))
        
        is_heavily_cropped = bool(border_edge_density > 0.45 and (w < 700 or h < 450))
        
        # 6. Text visibility
        total_edge_density = float(np.sum(edges > 0)) / float(w * h)
        is_text_unreadable = bool(total_edge_density < 0.008 or is_blurry)

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
            reasons.append(f"Excessive specular glare detected ({saturated_pixels*100:.1f}% washed out hotspot area).")
        if is_heavily_cropped:
            reasons.append("Document appears partially cropped at the image borders.")

        acceptable = bool(len(reasons) == 0)

        checklist = {
            "document_visible": bool(not is_heavily_cropped),
            "resolution_sufficient": bool(not is_resolution_low),
            "text_readable": bool(not is_text_unreadable),
            "blur_acceptable": bool(not is_blurry),
            "lighting_acceptable": bool(not (is_too_dark or is_too_bright or is_glare or is_low_contrast)),
            "orientation_acceptable": True
        }

        return {
            "acceptable": acceptable,
            "reasons": reasons,
            "checklist": checklist,
            "blur_score": float(round(laplacian_var, 2)),
            "brightness": float(round(mean_brightness, 2)),
            "contrast": float(round(std_contrast, 2)),
            "resolution": {"width": int(w), "height": int(h)},
            "glare_detected": bool(is_glare),
            "crop_detected": bool(is_heavily_cropped)
        }
