import cv2
import numpy as np
import re
import json
import xml.etree.ElementTree as ET
from typing import Dict, Any, Optional, Tuple

class QRService:
    @staticmethod
    def parse_payload(raw_text: str) -> Dict[str, Any]:
        fields = {}
        if not raw_text:
            return fields

        raw = raw_text.strip()

        # 1. Aadhaar XML format check
        if "<PrintLetterBarcodeData" in raw or "<PrintLetterBarcode" in raw:
            try:
                match = re.search(r'<PrintLetterBarcodeData[^>]*/>', raw)
                xml_str = match.group(0) if match else raw
                root = ET.fromstring(xml_str)
                attribs = root.attrib
                fields["document_id"] = attribs.get("uid", "")
                fields["name"] = attribs.get("name", "")
                fields["gender"] = attribs.get("gender", "")
                fields["dob"] = attribs.get("dob", attribs.get("yob", ""))
                
                addr_parts = [
                    attribs.get("co", ""),
                    attribs.get("house", ""),
                    attribs.get("street", ""),
                    attribs.get("lm", ""),
                    attribs.get("loc", ""),
                    attribs.get("vtc", ""),
                    attribs.get("dist", ""),
                    attribs.get("state", ""),
                    attribs.get("pc", "")
                ]
                fields["address"] = ", ".join([p for p in addr_parts if p])
                return fields
            except Exception:
                pass

        # 2. JSON check
        if raw.startswith("{") and raw.endswith("}"):
            try:
                data = json.loads(raw)
                for k, v in data.items():
                    norm_k = re.sub(r'[^a-zA-Z0-9_]', '', k.lower())
                    if any(x in norm_k for x in ["name", "full_name"]):
                        fields["name"] = str(v)
                    elif any(x in norm_k for x in ["dob", "birth"]):
                        fields["dob"] = str(v)
                    elif any(x in norm_k for x in ["gender", "sex"]):
                        fields["gender"] = str(v)
                    elif any(x in norm_k for x in ["id", "number", "uid", "pan", "license"]):
                        fields["document_id"] = str(v)
                    elif any(x in norm_k for x in ["address", "loc"]):
                        fields["address"] = str(v)
                    else:
                        fields[k] = str(v)
                return fields
            except Exception:
                pass

        # 3. vCard check
        if "BEGIN:VCARD" in raw:
            name_match = re.search(r'FN:(.+)', raw)
            if name_match:
                fields["name"] = name_match.group(1).strip()
            dob_match = re.search(r'BDAY:(.+)', raw)
            if dob_match:
                fields["dob"] = dob_match.group(1).strip()
            num_match = re.search(r'NOTE:.*?(?:ID|UID|PAN|NO)[:=\s]+([A-Z0-9\s-]+)', raw)
            if num_match:
                fields["document_id"] = num_match.group(1).strip()
            return fields

        # 4. Key-Value pairs
        for line in re.split(r'[\r\n|;,]+', raw):
            if ":" in line:
                key, val = line.split(":", 1)
                k = key.strip().lower()
                v = val.strip()
                if "name" in k:
                    fields["name"] = v
                elif "dob" in k or "birth" in k:
                    fields["dob"] = v
                elif "gender" in k:
                    fields["gender"] = v
                elif "id" in k or "number" in k or "uid" in k or "pan" in k:
                    fields["document_id"] = v
                elif "address" in k:
                    fields["address"] = v

        return fields

    @classmethod
    def _detect_finder_patterns(cls, gray_img: np.ndarray, w: int, h: int) -> Optional[Dict[str, float]]:
        """Fallback to detect nested square finder patterns of QR codes on compressed images."""
        for thresh_val in [110, 140, 170]:
            _, thresh = cv2.threshold(gray_img, thresh_val, 255, cv2.THRESH_BINARY_INV)
            contours, hier = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            if hier is None or len(hier) == 0:
                continue
            hier_flat = hier[0]
            finders = []
            for idx, _ in enumerate(hier_flat):
                k = idx
                depth = 0
                while hier_flat[k][2] != -1:
                    k = hier_flat[k][2]
                    depth += 1
                if depth >= 2:
                    rx, ry, rw, rh = cv2.boundingRect(contours[idx])
                    aspect = float(rw) / float(rh) if rh > 0 else 0
                    if 0.6 <= aspect <= 1.4 and 8 <= rw <= 200:
                        finders.append((rx, ry, rw, rh))
            if len(finders) >= 2:
                min_x = min(f[0] for f in finders)
                min_y = min(f[1] for f in finders)
                max_x = max(f[0] + f[2] for f in finders)
                max_y = max(f[1] + f[3] for f in finders)
                pad_x = int((max_x - min_x) * 0.15)
                pad_y = int((max_y - min_y) * 0.15)
                min_x = max(0, min_x - pad_x)
                min_y = max(0, min_y - pad_y)
                max_x = min(w, max_x + pad_x)
                max_y = min(h, max_y + pad_y)
                return {
                    "x": round(min_x / w, 4),
                    "y": round(min_y / h, 4),
                    "width": round((max_x - min_x) / w, 4),
                    "height": round((max_y - min_y) / h, 4)
                }
        return None

    @classmethod
    def analyze(cls, image_path: str) -> Dict[str, Any]:
        img = cv2.imread(image_path)
        if img is None:
            return {
                "detected": False,
                "readable": False,
                "raw_data": "",
                "parsed_fields": {},
                "box": None
            }

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        data = ""
        points = None

        # 1. Try standard OpenCV QRCodeDetector
        detector = cv2.QRCodeDetector()
        data, points, _ = detector.detectAndDecode(img)
        if not data or points is None:
            data, points, _ = detector.detectAndDecode(enhanced)

        # 2. Try OpenCV QRCodeDetectorAruco if available
        if (not data or points is None) and hasattr(cv2, "QRCodeDetectorAruco"):
            try:
                aruco_det = cv2.QRCodeDetectorAruco()
                data_a, points_a, _ = aruco_det.detectAndDecode(img)
                if data_a:
                    data, points = data_a, points_a
                elif points_a is not None and len(points_a) > 0:
                    points = points_a
            except Exception:
                pass

        detected = points is not None and len(points) > 0
        readable = bool(data and len(data.strip()) > 0)
        
        box = None
        if detected and points is not None:
            pts = points[0] if len(points.shape) == 3 else points
            x_min = float(np.min(pts[:, 0])) / w
            y_min = float(np.min(pts[:, 1])) / h
            x_max = float(np.max(pts[:, 0])) / w
            y_max = float(np.max(pts[:, 1])) / h
            box = {
                "x": round(max(0.0, x_min), 4),
                "y": round(max(0.0, y_min), 4),
                "width": round(min(1.0, x_max - x_min), 4),
                "height": round(min(1.0, y_max - y_min), 4)
            }
        else:
            # 3. Fallback: Nested contour finder patterns
            fallback_box = cls._detect_finder_patterns(gray, w, h)
            if fallback_box:
                detected = True
                readable = False
                box = fallback_box

        parsed_fields = cls.parse_payload(data) if readable else {}

        return {
            "detected": detected,
            "readable": readable,
            "raw_data": data if readable else "",
            "parsed_fields": parsed_fields,
            "box": box
        }

