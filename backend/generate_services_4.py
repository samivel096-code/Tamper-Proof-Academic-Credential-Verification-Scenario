import os

services_dir = os.path.join('app', 'services')
providers_dir = os.path.join('app', 'providers')
os.makedirs(providers_dir, exist_ok=True)

with open(os.path.join(services_dir, 'comparison_service.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from difflib import SequenceMatcher
from typing import Dict, Any, List, Tuple
from app.utils.masking import mask_identifier

class ComparisonService:
    @staticmethod
    def string_similarity(s1: str, s2: str) -> float:
        if not s1 or not s2:
            return 0.0
        return SequenceMatcher(None, s1.strip().lower(), s2.strip().lower()).ratio()

    @classmethod
    def compare_data(
        cls, 
        ocr_fields: Dict[str, str], 
        qr_fields: Dict[str, str],
        expected_fields: List[str]
    ) -> Tuple[List[Dict[str, Any]], float, List[str]]:
        """
        Cross-checks OCR extracted fields against QR decoded values.
        Returns (comparison_table, qr_consistency_score, mismatch_warnings)
        """
        table: List[Dict[str, Any]] = []
        scores: List[float] = []
        warnings: List[str] = []

        all_keys = set(list(ocr_fields.keys()) + list(qr_fields.keys()))
        # Prioritize key identity fields
        key_order = ["name", "dob", "document_id", "gender", "address", "issue_date"]
        sorted_keys = [k for k in key_order if k in all_keys] + [k for k in all_keys if k not in key_order]

        for key in sorted_keys:
            ocr_val = str(ocr_fields.get(key, "")).strip()
            qr_val = str(qr_fields.get(key, "")).strip()

            label = key.replace('_', ' ').title()
            if key == "dob":
                label = "Date of Birth"
            elif key == "document_id":
                label = "Document ID"

            # Sensitive masking
            masked_ocr = mask_identifier(key, ocr_val) if ocr_val else "NOT FOUND"
            masked_qr = mask_identifier(key, qr_val) if qr_val else "NOT AVAILABLE"

            if ocr_val and qr_val:
                sim = cls.string_similarity(ocr_val, qr_val)
                if sim >= 0.88 or (key == "document_id" and (ocr_val in qr_val or qr_val in ocr_val)):
                    result = "MATCH"
                    scores.append(100.0)
                elif sim >= 0.60:
                    result = "PARTIAL MATCH"
                    scores.append(70.0)
                    warnings.append(f"Minor discrepancy in {label}: Visible '{masked_ocr}' vs QR '{masked_qr}'.")
                else:
                    result = "MISMATCH"
                    scores.append(10.0)
                    warnings.append(f"CRITICAL MISMATCH in {label}: Visible '{masked_ocr}' does not match QR '{masked_qr}'.")
            elif ocr_val and not qr_val:
                result = "NOT AVAILABLE"
                scores.append(85.0)  # Neutral if QR doesn't contain this specific secondary field
            elif not ocr_val and qr_val:
                result = "NOT FOUND"
                scores.append(60.0)
            else:
                result = "NOT AVAILABLE"

            table.append({
                "field": label,
                "raw_key": key,
                "extracted_value": masked_ocr,
                "reference_or_qr_value": masked_qr,
                "result": result
            })

        avg_score = float(sum(scores) / len(scores)) if scores else 90.0
        return table, round(avg_score, 1), warnings
''')

with open(os.path.join(providers_dir, 'verification_provider.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from abc import ABC, abstractmethod
from typing import Dict, Any

class VerificationProvider(ABC):
    @abstractmethod
    def verify(self, doc_type: str, document_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        pass
''')

with open(os.path.join(providers_dir, 'mock_provider.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from app.providers.verification_provider import VerificationProvider
from typing import Dict, Any

class MockVerificationProvider(VerificationProvider):
    """
    Demo verification provider clearly designated with DEMO ONLY badges.
    Never fabricates genuine government API responses.
    """
    def __init__(self, simulate_authorized: bool = False):
        self.simulate_authorized = simulate_authorized

    def verify(self, doc_type: str, document_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        if not self.simulate_authorized:
            return {
                "status": "NOT AVAILABLE",
                "is_authoritative": False,
                "provider_name": "None Connected",
                "disclaimer": "Official verification source unavailable. AI automated screening completed.",
                "verified": False
            }

        return {
            "status": "DEMO_CONFIRMED",
            "is_authoritative": False,
            "provider_name": f"Mock {doc_type} Gateway (Sandbox)",
            "disclaimer": "DEMO ONLY — NOT OFFICIAL GOVERNMENT VERIFICATION. Authoritative source simulated for testing.",
            "verified": True,
            "reference_number": "DEMO-AUTH-2026-9921"
        }
''')

print('Comparison service and verification providers generated successfully.')
