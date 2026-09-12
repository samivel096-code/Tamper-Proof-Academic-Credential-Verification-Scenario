import os

services_dir = os.path.join('app', 'services')

with open(os.path.join(services_dir, 'template_matching_service.py'), 'w', encoding='utf-8') as f:
    f.write(r'''import cv2
import numpy as np
import json
from typing import Dict, Any, List, Optional
from app.models.template import DocumentTemplate, TemplateRegion

class TemplateMatchingService:
    @staticmethod
    def calculate_iou(box1: Dict[str, float], box2: Dict[str, float]) -> float:
        # box: x, y, width, height in 0..1 coordinates
        x1 = max(box1["x"], box2["x"])
        y1 = max(box1["y"], box2["y"])
        x2 = min(box1["x"] + box1["width"], box2["x"] + box2["width"])
        y2 = min(box1["y"] + box1["height"], box2["y"] + box2["height"])

        w = max(0.0, x2 - x1)
        h = max(0.0, y2 - y1)
        intersection = w * h

        area1 = box1["width"] * box1["height"]
        area2 = box2["width"] * box2["height"]
        union = area1 + area2 - intersection

        return float(intersection / union) if union > 0 else 0.0

    @classmethod
    def compare(
        cls,
        normalized_image_path: str,
        template: DocumentTemplate,
        detected_qr: Dict[str, Any],
        ocr_blocks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Comprehensive template comparison:
        - Dimensions & Aspect ratio
        - Layout & field positions
        - Typography / text structure similarity
        - Symbols / emblem regions
        - QR code region
        """
        img = cv2.imread(normalized_image_path)
        if img is None:
            return {
                "overall": 0.0,
                "breakdown": {
                    "layout": 0.0,
                    "field_positions": 0.0,
                    "typography": 0.0,
                    "symbols": 0.0,
                    "qr_position": 0.0,
                    "dimensions": 0.0
                },
                "discrepancies": ["Normalized image could not be loaded."]
            }

        ih, iw = img.shape[:2]
        current_aspect = float(iw) / float(ih)
        expected_aspect = float(template.aspect_ratio)

        # 1. Dimension & Aspect Ratio Score
        aspect_diff = abs(current_aspect - expected_aspect) / expected_aspect
        dimensions_score = max(0.0, min(100.0, (1.0 - aspect_diff * 2.0) * 100.0))

        discrepancies: List[str] = []

        # 2. QR Position Score
        qr_score = 95.0
        expected_qr_region = next((r for r in template.regions if r.region_type == 'qr'), None)
        if expected_qr_region:
            if detected_qr.get("detected") and detected_qr.get("box"):
                det_box = detected_qr["box"]
                exp_box = {
                    "x": expected_qr_region.x,
                    "y": expected_qr_region.y,
                    "width": expected_qr_region.width,
                    "height": expected_qr_region.height
                }
                iou = cls.calculate_iou(det_box, exp_box)
                # Euclidean distance between centers
                cx_det = det_box["x"] + det_box["width"] / 2.0
                cy_det = det_box["y"] + det_box["height"] / 2.0
                cx_exp = exp_box["x"] + exp_box["width"] / 2.0
                cy_exp = exp_box["y"] + exp_box["height"] / 2.0
                dist = np.sqrt((cx_det - cx_exp)**2 + (cy_det - cy_exp)**2)

                if dist < 0.12:
                    qr_score = 98.0
                elif dist < 0.25:
                    qr_score = 80.0
                    discrepancies.append("QR code is offset from the standard template position.")
                else:
                    qr_score = 45.0
                    discrepancies.append("QR code detected in an abnormal location compared to reference template.")
            else:
                if template.qr_required:
                    qr_score = 20.0
                    discrepancies.append("Required QR code was not detected in the expected template region.")
                else:
                    qr_score = 90.0

        # 3. Symbols & Emblems
        symbol_score = 92.0
        symbol_regions = [r for r in template.regions if r.region_type == 'emblem']
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        for sym in symbol_regions:
            sx = int(sym.x * iw)
            sy = int(sym.y * ih)
            sw = int(sym.width * iw)
            sh = int(sym.height * ih)
            # Crop symbol ROI
            roi = gray[max(0, sy):min(ih, sy+sh), max(0, sx):min(iw, sx+sw)]
            if roi.size > 0:
                edge_energy = float(np.std(roi))
                if edge_energy < 15.0:
                    symbol_score -= 25.0
                    discrepancies.append(f"Expected symbol/emblem '{sym.label}' appears missing or faded.")
        symbol_score = max(20.0, min(100.0, symbol_score))

        # 4. Field Positions & Layout
        field_regions = [r for r in template.regions if r.region_type in ['text_field', 'header', 'id_box']]
        matched_fields = 0
        total_fields = len(field_regions) if field_regions else 1

        for fr in field_regions:
            exp_box = {"x": fr.x, "y": fr.y, "width": fr.width, "height": fr.height}
            has_overlap = False
            for blk in ocr_blocks:
                iou = cls.calculate_iou(blk["box"], exp_box)
                if iou > 0.05 or (
                    abs((blk["box"]["x"] + blk["box"]["width"]/2) - (exp_box["x"] + exp_box["width"]/2)) < 0.18 and
                    abs((blk["box"]["y"] + blk["box"]["height"]/2) - (exp_box["y"] + exp_box["height"]/2)) < 0.12
                ):
                    has_overlap = True
                    break
            if has_overlap:
                matched_fields += 1

        field_match_ratio = matched_fields / total_fields
        field_score = round(max(30.0, min(100.0, field_match_ratio * 100.0)), 1)
        layout_score = round(max(40.0, min(100.0, (field_match_ratio * 0.7 + (dimensions_score/100.0) * 0.3) * 100.0)), 1)

        # 5. Typography / Text Structure
        typography_score = 94.0
        if len(ocr_blocks) < 5:
            typography_score = 65.0
            discrepancies.append("Extracted text region density is significantly lower than template standard.")
        elif len(ocr_blocks) > 60:
            typography_score = 75.0
            discrepancies.append("Unusual excess text elements detected across document surface.")

        # Overall Template Match (Weighted sum)
        overall = (
            layout_score * 0.25 +
            field_score * 0.25 +
            typography_score * 0.15 +
            symbol_score * 0.15 +
            qr_score * 0.10 +
            dimensions_score * 0.10
        )

        return {
            "overall": round(overall, 1),
            "breakdown": {
                "layout": round(layout_score, 1),
                "field_positions": round(field_score, 1),
                "typography": round(typography_score, 1),
                "symbols": round(symbol_score, 1),
                "qr_position": round(qr_score, 1),
                "dimensions": round(dimensions_score, 1)
            },
            "discrepancies": discrepancies
        }
''')

with open(os.path.join(services_dir, 'integrity_analysis_service.py'), 'w', encoding='utf-8') as f:
    f.write(r'''import cv2
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
''')

print('Template matching and integrity services generated successfully.')
