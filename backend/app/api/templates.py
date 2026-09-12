from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
