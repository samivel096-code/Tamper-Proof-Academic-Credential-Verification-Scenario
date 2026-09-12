import os

services_dir = os.path.join('app', 'services')

with open(os.path.join(services_dir, 'verification_service.py'), 'w', encoding='utf-8') as f:
    f.write(r'''import json
import os
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.template import DocumentTemplate
from app.models.verification import VerificationRecord
from app.models.user import User
from app.config import PROCESSED_DIR
from app.services.image_quality_service import ImageQualityService
from app.services.document_detection_service import DocumentDetectionService
from app.services.ocr_service import OCRService
from app.services.qr_service import QRService
from app.services.template_matching_service import TemplateMatchingService
from app.services.integrity_analysis_service import IntegrityAnalysisService
from app.services.comparison_service import ComparisonService
from app.providers.mock_provider import MockVerificationProvider
from app.utils.audit import record_audit_log

class VerificationService:
    @classmethod
    def execute_screening(
        cls,
        db: Session,
        document: Document,
        user: User,
        simulate_authoritative: bool = False
    ) -> VerificationRecord:
        # 1. Fetch reference template for this document type
        template = db.query(DocumentTemplate).filter(
            DocumentTemplate.document_type == document.document_type,
            DocumentTemplate.is_active == True
        ).first()

        if not template:
            # Fallback to any generic active template
            template = db.query(DocumentTemplate).first()

        expected_fields = json.loads(template.required_fields) if template and template.required_fields else []

        # 2. Image Quality Analysis
        quality_eval = ImageQualityService.evaluate(document.file_path)
        image_quality_score = 95.0 if quality_eval["acceptable"] else 30.0

        if not quality_eval["acceptable"]:
            # Strict rejection: Document not clear
            record = VerificationRecord(
                document_id=document.id,
                user_id=user.id,
                template_id=template.id if template else None,
                status="UNABLE TO VERIFY",
                screening_score=round(image_quality_score, 1),
                template_match_score=0.0,
                ocr_consistency_score=0.0,
                qr_consistency_score=0.0,
                required_fields_score=0.0,
                image_quality_score=round(image_quality_score, 1),
                integrity_score=50.0,
                template_breakdown=json.dumps({}),
                ocr_data=json.dumps({}),
                qr_data=json.dumps({}),
                cross_check_data=json.dumps([]),
                flagged_regions=json.dumps([]),
                validation_notes=json.dumps([
                    "DOCUMENT NOT CLEAR: The uploaded document is not sufficiently visible for reliable analysis.",
                    *quality_eval["reasons"]
                ]),
                recommendation="Document Rejected. Please upload a clear, complete, and properly illuminated image.",
                authorized_verification_status="NOT AVAILABLE",
                review_status="PENDING"
            )
            db.add(record)
            document.status = "REJECTED"
            db.commit()
            db.refresh(record)
            record_audit_log(db, user, "VERIFY", document.id, "UNABLE TO VERIFY", "Image quality check failed")
            return record

        # 3. Document Boundary Detection & Normalization
        norm_filename = f"norm_{os.path.basename(document.file_path)}"
        norm_path = os.path.join(str(PROCESSED_DIR), norm_filename)
        det_success, norm_path, det_meta = DocumentDetectionService.detect_and_normalize(
            document.file_path, 
            norm_path,
            target_width=template.expected_width if template else 1050,
            target_height=template.expected_height if template else 660
        )
        document.normalized_path = norm_path
        document.status = "PROCESSED"

        # 4. OCR Service
        ocr_engine = OCRService()
        ocr_result = ocr_engine.extract(norm_path, expected_fields)
        ocr_fields = ocr_result.get("fields", {})
        ocr_blocks = ocr_result.get("text_blocks", [])
        ocr_score = ocr_result.get("confidence", 85.0)

        # 5. QR Code Analysis
        qr_result = QRService.analyze(norm_path)
        qr_fields = qr_result.get("parsed_fields", {})

        # 6. Template Matching & Design Comparison
        template_eval = TemplateMatchingService.compare(norm_path, template, qr_result, ocr_blocks)
        template_match_score = template_eval.get("overall", 88.0)
        template_breakdown = template_eval.get("breakdown", {})

        # 7. Data Cross-Check & Masking
        cross_check_table, qr_consistency_score, mismatch_warnings = ComparisonService.compare_data(
            ocr_fields, qr_fields, expected_fields
        )

        # Check required fields
        found_req = 0
        for rf in expected_fields:
            rf_clean = rf.lower().replace(' ', '_')
            if any(rf_clean in k or k in rf_clean for k in ocr_fields.keys()):
                found_req += 1
        req_score = round(float(found_req / len(expected_fields) * 100.0), 1) if expected_fields else 95.0

        # 8. Document Integrity & Alteration Screening
        integrity_eval = IntegrityAnalysisService.analyze(
            norm_path, 
            template.regions if template else [], 
            ocr_fields, 
            qr_fields
        )
        integrity_score = integrity_eval.get("integrity_score", 95.0)
        flagged_regions = integrity_eval.get("flagged_regions", [])

        # Add QR mismatch to flagged regions if discrepancy found
        has_critical_qr_mismatch = any("CRITICAL MISMATCH" in w for w in mismatch_warnings)
        if has_critical_qr_mismatch and qr_result.get("box"):
            flagged_regions.append({
                "id": "qr_data_mismatch",
                "region_type": "qr_mismatch",
                "label": "QR Information Mismatch",
                "x": qr_result["box"]["x"],
                "y": qr_result["box"]["y"],
                "width": qr_result["box"]["width"],
                "height": qr_result["box"]["height"],
                "severity": "CRITICAL",
                "description": "The information encoded in the QR code does not match the corresponding visible document information."
            })

        # 9. Authorized Verification Routing
        provider = MockVerificationProvider(simulate_authorized=simulate_authoritative)
        doc_id_val = ocr_fields.get("document_id", qr_fields.get("document_id", "UNKNOWN"))
        auth_res = provider.verify(document.document_type, doc_id_val, ocr_fields)

        # 10. Overall Screening Score (0 - 100)
        # Note: Weights emphasize template consistency, QR integrity, and OCR accuracy
        screening_score = round(
            template_match_score * 0.25 +
            ocr_score * 0.20 +
            qr_consistency_score * 0.25 +
            req_score * 0.10 +
            image_quality_score * 0.10 +
            integrity_score * 0.10,
            1
        )

        # 11. Final Result Classification Logic
        # Strictly following specifications:
        # - VERIFIED: Only if authoritative provider confirms
        # - LIKELY AUTHENTIC: Highly consistent template, OCR, QR match, no tampering, authoritative unavailable
        # - SUSPICIOUS / LIKELY ALTERED: Major template mismatch, QR mismatch, alteration indicators, or data conflicts
        # - UNABLE TO VERIFY: Low OCR confidence or missing critical data
        validation_notes: List[str] = []
        validation_notes.append("Document image quality acceptable and orientation verified.")
        validation_notes.append(f"Template match score evaluated at {template_match_score}/100 based on reference layout.")

        if ocr_fields:
            validation_notes.append(f"Extracted {len(ocr_fields)} structured identity fields via OCR.")
        else:
            validation_notes.append("Limited text fields could be extracted via OCR.")

        if qr_result.get("detected"):
            if qr_result.get("readable"):
                validation_notes.append("QR code detected and successfully decoded.")
            else:
                validation_notes.append("QR code detected but payload was unreadable or corrupted.")
        else:
            if template.qr_required:
                validation_notes.append("Expected QR code was missing from the document.")

        for warn in mismatch_warnings:
            validation_notes.append(f"WARNING: {warn}")

        for flag in flagged_regions:
            validation_notes.append(f"INTEGRITY ALERT: {flag['label']} - {flag['description']}")

        if auth_res.get("verified"):
            final_status = "VERIFIED"
            recommendation = "Document officially confirmed by authorized verification source."
            validation_notes.append("Official verification provider confirmed document identifier validity.")
        elif has_critical_qr_mismatch or template_match_score < 72.0 or integrity_score < 75.0 or len(flagged_regions) >= 2:
            final_status = "SUSPICIOUS / LIKELY ALTERED"
            recommendation = "Manual officer review strongly recommended due to detected anomalies or mismatch flags."
        elif screening_score >= 82.0 and req_score >= 80.0:
            final_status = "LIKELY AUTHENTIC"
            recommendation = "Template and document checks are consistent, but design matching alone does not establish legal authenticity. Use an authorized verification source where available."
            validation_notes.append("Official verification source unavailable. AI automated screening completed.")
        else:
            final_status = "UNABLE TO VERIFY"
            recommendation = "Unable to reliably verify document consistency. Officer manual inspection required."

        record = VerificationRecord(
            document_id=document.id,
            user_id=user.id,
            template_id=template.id if template else None,
            status=final_status,
            screening_score=screening_score,
            template_match_score=template_match_score,
            ocr_consistency_score=ocr_score,
            qr_consistency_score=qr_consistency_score,
            required_fields_score=req_score,
            image_quality_score=image_quality_score,
            integrity_score=integrity_score,
            template_breakdown=json.dumps(template_breakdown),
            ocr_data=json.dumps(ocr_fields),
            qr_data=json.dumps(qr_fields),
            cross_check_data=json.dumps(cross_check_table),
            flagged_regions=json.dumps(flagged_regions),
            validation_notes=json.dumps(validation_notes),
            recommendation=recommendation,
            authorized_verification_status=auth_res.get("status", "NOT AVAILABLE"),
            authorized_provider_name=auth_res.get("provider_name"),
            authorized_verification_notes=auth_res.get("disclaimer"),
            review_status="PENDING"
        )

        db.add(record)
        db.commit()
        db.refresh(record)

        record_audit_log(
            db, 
            user, 
            "VERIFY_DOCUMENT", 
            document.id, 
            final_status, 
            f"Screening Score: {screening_score}/100, Template Match: {template_match_score}/100"
        )

        return record
''')

print('Master VerificationService written successfully.')
