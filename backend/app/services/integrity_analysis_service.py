import cv2
import numpy as np
import tempfile
import os
from typing import Dict, Any, List

class IntegrityAnalysisService:
    @staticmethod
    def error_level_analysis(img: np.ndarray, quality: int = 90) -> np.ndarray:
        """
        Performs Error Level Analysis (ELA) by comparing original image
        against a re-compressed JPEG to detect localized pixel anomalies.
        """
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, encimg = cv2.imencode('.jpg', img, encode_param)
        resaved = cv2.imdecode(encimg, 1)

        # Compute absolute difference
        diff = cv2.absdiff(img, resaved)
        # Amplify difference for thresholding
        diff = cv2.convertScaleAbs(diff, alpha=15.0)
        return diff

    @classmethod
    def analyze(
        cls, 
        image_path: str, 
        template_regions: List[Any], 
        ocr_data: Dict[str, Any],
        qr_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Screening for image manipulation indicators:
        - ELA difference clusters (copy/paste artifacts)
        - Boundary gradients around photo or date/name fields
        - Unnatural edge transitions
        """
        img = cv2.imread(image_path)
        if img is None:
            return {"integrity_score": 50.0, "flagged_regions": [], "indicators_count": 0}

        ih, iw = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        flagged_regions: List[Dict[str, Any]] = []

        # 1. ELA Analysis
        ela_diff = cls.error_level_analysis(img)
        ela_gray = cv2.cvtColor(ela_diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(ela_gray, 180, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            area = cv2.contourArea(c)
            if 400 < area < (iw * ih * 0.15):
                rx, ry, rw, rh = cv2.boundingRect(c)
                flagged_regions.append({
                    "id": f"ela_{rx}_{ry}",
                    "region_type": "compression_anomaly",
                    "label": "Altered Compression Artifact",
                    "x": round(float(rx) / iw, 4),
                    "y": round(float(ry) / ih, 4),
                    "width": round(float(rw) / iw, 4),
                    "height": round(float(rh) / ih, 4),
                    "severity": "HIGH",
                    "description": "Localized JPEG compression artifact differs significantly from background noise, indicating potential digital editing."
                })

        # 2. Check Photo Region for Boundary Splicing
        photo_reg = next((r for r in template_regions if getattr(r, 'region_type', None) == 'photo'), None)
        if photo_reg:
            px = int(photo_reg.x * iw)
            py = int(photo_reg.y * ih)
            pw = int(photo_reg.width * iw)
            ph = int(photo_reg.height * ih)
            photo_roi = gray[max(0, py):min(ih, py+ph), max(0, px):min(iw, px+pw)]
            if photo_roi.size > 0:
                # Check sharpness at the exact boundary
                border_diff = cv2.Canny(photo_roi, 100, 200)
                edge_count = np.sum(border_diff > 0)
                # If there's an unnaturally sharp box border inside the photo frame
                if edge_count > photo_roi.size * 0.28:
                    flagged_regions.append({
                        "id": "photo_boundary",
                        "region_type": "photo_splicing",
                        "label": "Photograph Replacement Indicator",
                        "x": photo_reg.x,
                        "y": photo_reg.y,
                        "width": photo_reg.width,
                        "height": photo_reg.height,
                        "severity": "MEDIUM",
                        "description": "Photograph region shows abnormal perimeter gradient consistency, suggesting possible photo replacement."
                    })

        # Calculate integrity screening score
        base_score = 98.0
        for item in flagged_regions:
            if item["severity"] == "CRITICAL":
                base_score -= 30.0
            elif item["severity"] == "HIGH":
                base_score -= 15.0
            elif item["severity"] == "MEDIUM":
                base_score -= 8.0
            else:
                base_score -= 4.0

        integrity_score = max(20.0, min(100.0, base_score))

        return {
            "integrity_score": round(integrity_score, 1),
            "flagged_regions": flagged_regions,
            "indicators_count": len(flagged_regions)
        }
