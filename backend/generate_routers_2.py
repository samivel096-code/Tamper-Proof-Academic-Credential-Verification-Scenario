import os

api_dir = os.path.join('app', 'api')

with open(os.path.join(api_dir, 'templates.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
import shutil
import uuid

from app.database import get_db
from app.models.user import User
from app.models.template import DocumentTemplate, TemplateRegion
from app.config import TEMPLATE_DIR
from app.utils.security import get_current_user, require_roles
from app.services.image_quality_service import ImageQualityService
from app.services.document_detection_service import DocumentDetectionService
from app.services.qr_service import QRService
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/api/templates", tags=["Document Templates"])

@router.get("")
def get_templates(db: Session = Depends(get_db)):
    templates = db.query(DocumentTemplate).all()
    result = []
    for t in templates:
        result.append({
            "id": t.id,
            "document_type": t.document_type,
            "name": t.name,
            "version": t.version,
            "issuing_organization": t.issuing_organization,
            "aspect_ratio": t.aspect_ratio,
            "expected_width": t.expected_width,
            "expected_height": t.expected_height,
            "sample_image_path": t.sample_image_path,
            "is_active": t.is_active,
            "qr_required": t.qr_required,
            "required_fields": json.loads(t.required_fields) if t.required_fields else [],
            "regions": [
                {
                    "id": r.id,
                    "region_type": r.region_type,
                    "label": r.label,
                    "x": r.x,
                    "y": r.y,
                    "width": r.width,
                    "height": r.height,
                    "is_required": r.is_required
                }
                for r in t.regions
            ]
        })
    return result

@router.post("/analyze-sample")
async def analyze_and_learn_template(
    document_type: str = Form(...),
    name: str = Form(...),
    issuing_organization: str = Form(...),
    qr_required: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    """
    Template Learning Pipeline:
    Reference Sample -> Quality Check -> Detection -> Perspective Correction -> OCR -> Layout/QR Analysis -> Template Profile
    """
    file_id = str(uuid.uuid4())[:8]
    ext = os.path.splitext(file.filename)[1].lower()
    sample_path = os.path.join(str(TEMPLATE_DIR), f"template_{file_id}{ext}")

    with open(sample_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 1. Quality Check
    q_res = ImageQualityService.evaluate(sample_path)
    if not q_res["acceptable"]:
        raise HTTPException(status_code=400, detail=f"Reference sample quality unacceptable: {', '.join(q_res['reasons'])}")

    # 2. Document Detection & Normalization
    norm_sample = os.path.join(str(TEMPLATE_DIR), f"norm_template_{file_id}.png")
    det_ok, norm_path, _ = DocumentDetectionService.detect_and_normalize(sample_path, norm_sample)

    # 3. QR Detection on sample
    qr_eval = QRService.analyze(norm_path)

    # 4. OCR on sample
    ocr_service = OCRService()
    ocr_eval = ocr_service.extract(norm_path)

    # Create Template
    existing = db.query(DocumentTemplate).filter(DocumentTemplate.document_type == document_type).first()
    if existing:
        template = existing
        template.name = name
        template.issuing_organization = issuing_organization
        template.sample_image_path = norm_path
        template.qr_required = qr_required
        # Clear existing regions
        db.query(TemplateRegion).filter(TemplateRegion.template_id == template.id).delete()
    else:
        template = DocumentTemplate(
            document_type=document_type,
            name=name,
            issuing_organization=issuing_organization,
            sample_image_path=norm_path,
            qr_required=qr_required,
            required_fields=json.dumps(["Name", "Date of Birth", "Document ID"]),
            created_by=current_user.id
        )
        db.add(template)
        db.flush()

    # Automatically add detected QR region if found
    if qr_eval.get("detected") and qr_eval.get("box"):
        b = qr_eval["box"]
        qr_reg = TemplateRegion(
            template_id=template.id,
            region_type="qr",
            label="QR Code",
            x=b["x"],
            y=b["y"],
            width=b["width"],
            height=b["height"],
            is_required=qr_required
        )
        db.add(qr_reg)

    # Add detected text blocks as template field regions
    for blk in ocr_eval.get("text_blocks", [])[:15]:
        b = blk["box"]
        reg = TemplateRegion(
            template_id=template.id,
            region_type="text_field",
            label=blk["text"][:30],
            x=b["x"],
            y=b["y"],
            width=b["width"],
            height=b["height"],
            is_required=False
        )
        db.add(reg)

    db.commit()
    db.refresh(template)

    return {
        "message": "Template profile created and learned successfully.",
        "template_id": template.id,
        "document_type": template.document_type,
        "regions_detected": len(template.regions)
    }

@router.patch("/{template_id}/toggle")
def toggle_template(
    template_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"]))
):
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    template.is_active = not template.is_active
    db.commit()
    return {"id": template.id, "is_active": template.is_active}
''')

with open(os.path.join(api_dir, 'verification.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.template import DocumentTemplate
from app.models.verification import VerificationRecord
from app.schemas.verification import ReviewDecisionRequest
from app.utils.security import get_current_user, require_roles
from app.utils.audit import record_audit_log

router = APIRouter(prefix="/api/verification", tags=["Verification"])

@router.get("/{verification_id}")
def get_verification_details(
    verification_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(VerificationRecord).filter(VerificationRecord.id == verification_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Verification record not found")

    doc = db.query(Document).filter(Document.id == rec.document_id).first()
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == rec.template_id).first() if rec.template_id else None

    # Construct clean relative image URLs
    orig_name = os.path.basename(doc.file_path) if doc and doc.file_path else ""
    norm_name = os.path.basename(doc.normalized_path) if doc and doc.normalized_path else ""
    tpl_name = os.path.basename(template.sample_image_path) if template and template.sample_image_path else ""

    return {
        "id": rec.id,
        "document_id": rec.document_id,
        "document_type": doc.document_type if doc else "Unknown",
        "original_filename": doc.original_filename if doc else "",
        "status": rec.status,
        "screening_score": rec.screening_score,
        "template_match_score": rec.template_match_score,
        "ocr_consistency_score": rec.ocr_consistency_score,
        "qr_consistency_score": rec.qr_consistency_score,
        "required_fields_score": rec.required_fields_score,
        "image_quality_score": rec.image_quality_score,
        "integrity_score": rec.integrity_score,
        "template_breakdown": json.loads(rec.template_breakdown) if rec.template_breakdown else {},
        "ocr_data": json.loads(rec.ocr_data) if rec.ocr_data else {},
        "qr_data": json.loads(rec.qr_data) if rec.qr_data else {},
        "cross_check_data": json.loads(rec.cross_check_data) if rec.cross_check_data else [],
        "flagged_regions": json.loads(rec.flagged_regions) if rec.flagged_regions else [],
        "validation_notes": json.loads(rec.validation_notes) if rec.validation_notes else [],
        "recommendation": rec.recommendation,
        "authorized_verification_status": rec.authorized_verification_status,
        "authorized_provider_name": rec.authorized_provider_name,
        "authorized_verification_notes": rec.authorized_verification_notes,
        "review_status": rec.review_status,
        "review_notes": rec.review_notes,
        "reviewed_by": rec.reviewed_by,
        "reviewed_at": rec.reviewed_at,
        "original_image_url": f"/storage/uploads/{orig_name}" if orig_name else "",
        "normalized_image_url": f"/storage/processed/{norm_name}" if norm_name else "",
        "template_sample_url": f"/storage/templates/{tpl_name}" if tpl_name else "",
        "created_at": rec.created_at
    }

@router.post("/{verification_id}/review")
def submit_officer_review(
    verification_id: int,
    body: ReviewDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "REVIEWER", "ADMIN"]))
):
    rec = db.query(VerificationRecord).filter(VerificationRecord.id == verification_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Verification record not found")

    rec.review_status = body.status
    rec.review_notes = body.notes
    rec.reviewed_by = current_user.id
    rec.reviewed_at = datetime.utcnow()
    db.commit()

    record_audit_log(
        db, 
        current_user, 
        "OFFICER_MANUAL_REVIEW", 
        rec.document_id, 
        body.status, 
        f"Notes: {body.notes}"
    )

    return {"message": "Review recorded successfully", "review_status": rec.review_status}

@router.get("/history/list")
def get_verification_history(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    doc_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(VerificationRecord, Document, User).join(
        Document, VerificationRecord.document_id == Document.id
    ).join(
        User, VerificationRecord.user_id == User.id
    )

    if status_filter:
        query = query.filter(VerificationRecord.status == status_filter)
    if doc_type:
        query = query.filter(Document.document_type == doc_type)
    if search:
        query = query.filter(Document.original_filename.contains(search) | User.full_name.contains(search))

    total = query.count()
    records = query.order_by(VerificationRecord.created_at.desc()).offset(skip).limit(limit).all()

    items = []
    for rec, doc, usr in records:
        items.append({
            "verification_id": rec.id,
            "document_id": doc.id,
            "document_type": doc.document_type,
            "original_filename": doc.original_filename,
            "officer_name": usr.full_name,
            "officer_role": usr.role,
            "status": rec.status,
            "screening_score": rec.screening_score,
            "template_match_score": rec.template_match_score,
            "qr_consistency_score": rec.qr_consistency_score,
            "review_status": rec.review_status,
            "created_at": rec.created_at
        })

    return {"total": total, "items": items}
''')

with open(os.path.join(api_dir, 'dashboard.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.models.document import Document
from app.models.verification import VerificationRecord
from app.models.user import User
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/statistics")
def get_dashboard_statistics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_docs = db.query(Document).count()
    processed = db.query(VerificationRecord).count()
    verified = db.query(VerificationRecord).filter(VerificationRecord.status == "VERIFIED").count()
    likely_authentic = db.query(VerificationRecord).filter(VerificationRecord.status == "LIKELY AUTHENTIC").count()
    suspicious = db.query(VerificationRecord).filter(VerificationRecord.status == "SUSPICIOUS / LIKELY ALTERED").count()
    unable_to_verify = db.query(VerificationRecord).filter(VerificationRecord.status == "UNABLE TO VERIFY").count()
    needs_review = db.query(VerificationRecord).filter(
        VerificationRecord.status.in_(["SUSPICIOUS / LIKELY ALTERED", "UNABLE TO VERIFY"]),
        VerificationRecord.review_status == "PENDING"
    ).count()

    # Distribution by Document Type
    type_counts = db.query(Document.document_type, func.count(Document.id)).group_by(Document.document_type).all()
    types_dist = {t: c for t, c in type_counts}

    # Distribution by Verification Result
    results_dist = {
        "VERIFIED": verified,
        "LIKELY AUTHENTIC": likely_authentic,
        "SUSPICIOUS": suspicious,
        "UNABLE TO VERIFY": unable_to_verify
    }

    # Daily processing for past 7 days
    daily = []
    for i in range(6, -1, -1):
        day_date = datetime.utcnow().date() - timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        count = db.query(VerificationRecord).filter(
            VerificationRecord.created_at >= datetime.combine(day_date, datetime.min.time()),
            VerificationRecord.created_at < datetime.combine(next_day, datetime.min.time())
        ).count()
        daily.append({
            "date": day_date.strftime("%b %d"),
            "count": count
        })

    # Recent verifications list
    recents = db.query(VerificationRecord, Document, User).join(
        Document, VerificationRecord.document_id == Document.id
    ).join(
        User, VerificationRecord.user_id == User.id
    ).order_by(VerificationRecord.created_at.desc()).limit(10).all()

    recent_list = [
        {
            "verification_id": rec.id,
            "document_id": doc.id,
            "document_type": doc.document_type,
            "original_filename": doc.original_filename,
            "officer_name": usr.full_name,
            "status": rec.status,
            "screening_score": rec.screening_score,
            "created_at": rec.created_at
        }
        for rec, doc, usr in recents
    ]

    return {
        "total_documents": total_docs,
        "processed": processed,
        "verified": verified,
        "likely_authentic": likely_authentic,
        "suspicious": suspicious,
        "unable_to_verify": unable_to_verify,
        "needs_review": needs_review,
        "daily_processing": daily,
        "results_distribution": results_dist,
        "document_types_distribution": types_dist,
        "qr_results_distribution": {
            "Valid & Matched": max(0, likely_authentic + verified),
            "Mismatch Detected": suspicious,
            "Missing / Unreadable": unable_to_verify
        },
        "recent_verifications": recent_list
    }
''')

print('Templates, Verification, and Dashboard routers written successfully.')
