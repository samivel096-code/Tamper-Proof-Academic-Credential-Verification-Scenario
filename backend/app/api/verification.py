from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import os
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

    ocr_dict = json.loads(rec.ocr_data) if rec.ocr_data else {}
    ocr_blocks = ocr_dict.pop("_blocks", [])
    qr_box = ocr_dict.pop("_qr_box", None)

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
        "ocr_data": ocr_dict,
        "ocr_blocks": ocr_blocks,
        "qr_box": qr_box,
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
