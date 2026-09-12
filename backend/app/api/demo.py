from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import shutil

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.config import DEMO_DIR, UPLOAD_DIR
from app.utils.security import get_current_user
from app.utils.audit import record_audit_log
from app.services.image_quality_service import ImageQualityService
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/api/demo", tags=["Demo Test Suite"])

DEMO_SAMPLES = [
    {
        "id": "sample_aadhaar_authentic",
        "title": "Authentic Aadhaar Card",
        "document_type": "Aadhaar",
        "description": "Standard high-clarity document matching reference template. Encoded QR matches visible identity fields perfectly.",
        "expected_result": "LIKELY AUTHENTIC",
        "risk_level": "LOW",
        "badge_color": "emerald",
        "filename": "demo_aadhaar_authentic.png"
    },
    {
        "id": "sample_aadhaar_qr_mismatch",
        "title": "Aadhaar with QR Mismatch",
        "document_type": "Aadhaar",
        "description": "Visible document text displays 'Aarav Sharma', but embedded QR code payload encodes 'Vikram Singh'. Triggers critical mismatch alert.",
        "expected_result": "SUSPICIOUS / LIKELY ALTERED",
        "risk_level": "HIGH",
        "badge_color": "rose",
        "filename": "demo_aadhaar_qr_mismatch.png"
    },
    {
        "id": "sample_pan_tampered",
        "title": "Tampered PAN Card (Altered DOB)",
        "document_type": "PAN Card",
        "description": "Date of birth region exhibits digital splicing artifacts (ELA discrepancy) and photograph frame exhibits abnormal border gradient.",
        "expected_result": "SUSPICIOUS / LIKELY ALTERED",
        "risk_level": "HIGH",
        "badge_color": "rose",
        "filename": "demo_pan_tampered.png"
    },
    {
        "id": "sample_blurry_rejected",
        "title": "Severely Blurry Document",
        "document_type": "Driving Licence",
        "description": "Defocused capture failing strict OpenCV Laplacian variance threshold. Triggers immediate Stage 2 quality rejection.",
        "expected_result": "DOCUMENT NOT CLEAR (REJECTED)",
        "risk_level": "UNUSABLE",
        "badge_color": "amber",
        "filename": "demo_blurry_unreadable.png"
    },
    {
        "id": "sample_type_mismatch",
        "title": "Document Type Mismatch",
        "document_type": "Passport",
        "description": "Officer selects Passport template, but uploaded document is a PAN Card. Triggers dimension and layout mismatch alert.",
        "expected_result": "DOCUMENT TYPE MISMATCH",
        "risk_level": "HIGH",
        "badge_color": "amber",
        "filename": "demo_pan_tampered.png"
    },
    {
        "id": "sample_deed_authentic",
        "title": "Registered Sale Deed (DigiLocker / IGRS Verifiable)",
        "document_type": "Registered Deed / Sale Deed",
        "description": "Tamil Nadu IGRS Land Conveyance Deed (Deed No. 1452/2023, Tiyagadurugam SRO). Pre-filled for direct 1-click DigiLocker API registry verification & NIC CA digital signature validation.",
        "expected_result": "LIKELY AUTHENTIC (VERIFIABLE VIA DIGILOCKER)",
        "risk_level": "LOW",
        "badge_color": "emerald",
        "filename": "demo_sale_deed_authentic.png"
    }
]

@router.get("/samples")
def get_demo_samples():
    return DEMO_SAMPLES

@router.post("/load/{sample_id}")
def load_and_screen_sample(
    sample_id: str,
    simulate_authoritative: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sample = next((s for s in DEMO_SAMPLES if s["id"] == sample_id), None)
    if not sample:
        raise HTTPException(status_code=404, detail="Demo sample not found")

    demo_file = os.path.join(str(DEMO_DIR), sample["filename"])
    if not os.path.exists(demo_file):
        raise HTTPException(status_code=500, detail="Demo asset not found on server disk. Please run seed script.")

    target_name = f"demo_exec_{sample_id}_{os.path.basename(demo_file)}"
    upload_target = os.path.join(str(UPLOAD_DIR), target_name)
    shutil.copyfile(demo_file, upload_target)

    # Perform quality check
    quality_result = ImageQualityService.evaluate(upload_target)

    doc = Document(
        user_id=current_user.id,
        document_type=sample["document_type"],
        original_filename=sample["filename"],
        file_path=upload_target,
        file_type="image/png",
        file_size=os.path.getsize(upload_target),
        status="PENDING" if quality_result["acceptable"] else "REJECTED"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    record_audit_log(
        db,
        current_user,
        "DEMO_SAMPLE_EXECUTE",
        doc.id,
        sample["expected_result"],
        f"Executing preset: {sample['title']}"
    )

    # Execute full verification
    record = VerificationService.execute_screening(
        db=db,
        document=doc,
        user=current_user,
        simulate_authoritative=simulate_authoritative
    )

    return {
        "verification_id": record.id,
        "document_id": doc.id,
        "status": record.status,
        "screening_score": record.screening_score,
        "quality_acceptable": quality_result["acceptable"],
        "quality_result": quality_result
    }
