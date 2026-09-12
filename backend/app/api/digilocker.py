from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel
import json
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.verification import VerificationRecord
from app.utils.security import get_current_user, require_roles

from app.providers.digilocker_provider import DigiLockerProvider
from app.utils.audit import record_audit_log

import app.config as config

router = APIRouter(prefix="/api/digilocker", tags=["DigiLocker Official Verification"])

class DeedVerificationRequest(BaseModel):
    deed_number: str
    sro_office: str
    registration_year: int
    state: Optional[str] = "Tamil Nadu"
    claimant: Optional[str] = None
    executant: Optional[str] = None
    verification_id: Optional[int] = None

class DigiLockerConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    base_url: Optional[str] = None
    mode: Optional[str] = "sandbox"

@router.get("/status")
def get_digilocker_status(current_user: User = Depends(get_current_user)):
    provider = DigiLockerProvider()
    return provider.get_status()

@router.post("/config")
def update_digilocker_config(
    body: DigiLockerConfigUpdate,
    current_user: User = Depends(require_roles(["ADMIN", "OFFICER"]))
):
    if body.api_key is not None:
        config.DIGILOCKER_API_KEY = body.api_key
    if body.client_id is not None:
        config.DIGILOCKER_CLIENT_ID = body.client_id
    if body.client_secret is not None:
        config.DIGILOCKER_CLIENT_SECRET = body.client_secret
    if body.base_url is not None:
        config.DIGILOCKER_BASE_URL = body.base_url
    if body.mode is not None:
        config.DIGILOCKER_MODE = body.mode

    provider = DigiLockerProvider()
    return {
        "message": "DigiLocker gateway configuration updated successfully",
        "current_status": provider.get_status()
    }

@router.post("/verify-deed")
def verify_deed(
    body: DeedVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    provider = DigiLockerProvider()
    deed_res = provider.verify_deed(
        deed_no=body.deed_number,
        sro=body.sro_office,
        year=body.registration_year,
        state=body.state or "Tamil Nadu",
        claimant=body.claimant,
        executant=body.executant
    )

    if body.verification_id:
        rec = db.query(VerificationRecord).filter(VerificationRecord.id == body.verification_id).first()
        if rec:
            if deed_res.get("verified"):
                rec.status = "VERIFIED"
                rec.authorized_verification_status = "OFFICIALLY VERIFIED VIA DIGILOCKER"
                rec.authorized_provider_name = deed_res.get("provider_name")
                rec.authorized_verification_notes = deed_res.get("disclaimer")
                rec.recommendation = "Document officially confirmed authentic by State Registration Department (IGRS) via DigiLocker."

                notes = json.loads(rec.validation_notes) if rec.validation_notes else []
                deed_info = f"DigiLocker IGRS Central Registry confirmed Registered Deed {body.deed_number} ({body.sro_office}, Year: {body.registration_year}). Digital Signature: Cryptographically Valid."
                if deed_info not in notes:
                    notes.insert(0, deed_info)
                rec.validation_notes = json.dumps(notes)

                # Store deed verification payload in ocr_data for viewer display
                ocr_dict = json.loads(rec.ocr_data) if rec.ocr_data else {}
                ocr_dict["deed_number"] = body.deed_number
                ocr_dict["sro_office"] = body.sro_office
                ocr_dict["registration_year"] = str(body.registration_year)
                ocr_dict["digilocker_uri"] = deed_res.get("digilocker_uri")
                rec.ocr_data = json.dumps(ocr_dict)

                db.commit()
                db.refresh(rec)

                record_audit_log(
                    db,
                    current_user,
                    "DIGILOCKER_DEED_VERIFY",
                    rec.document_id,
                    "VERIFIED",
                    f"DigiLocker URI: {deed_res.get('digilocker_uri')}"
                )

    return deed_res

@router.post("/verify-record/{verification_id}")
def verify_record_via_digilocker(
    verification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rec = db.query(VerificationRecord).filter(VerificationRecord.id == verification_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Verification record not found")

    doc = db.query(Document).filter(Document.id == rec.document_id).first()
    doc_type = doc.document_type if doc else "Document"
    ocr_dict = json.loads(rec.ocr_data) if rec.ocr_data else {}
    doc_id = ocr_dict.get("document_id") or ocr_dict.get("aadhaar_number") or ocr_dict.get("pan_number") or str(rec.document_id)

    provider = DigiLockerProvider()
    res = provider.verify_document(doc_type, doc_id, ocr_dict)

    if res.get("verified"):
        rec.status = "VERIFIED"
        rec.authorized_verification_status = res.get("status", "VERIFIED BY DIGILOCKER")
        rec.authorized_provider_name = res.get("provider_name")
        rec.authorized_verification_notes = res.get("disclaimer")
        rec.recommendation = f"Document officially confirmed authentic by {res.get('issuer_name', 'Authorized Government Issuer')} via DigiLocker."

        notes = json.loads(rec.validation_notes) if rec.validation_notes else []
        conf_note = f"DigiLocker National Authority confirmed document identity validity ({res.get('digilocker_uri', '')})."
        if conf_note not in notes:
            notes.insert(0, conf_note)
        rec.validation_notes = json.dumps(notes)

        # Store digilocker_uri
        ocr_dict["digilocker_uri"] = res.get("digilocker_uri")
        rec.ocr_data = json.dumps(ocr_dict)

        db.commit()
        db.refresh(rec)

        record_audit_log(
            db,
            current_user,
            "DIGILOCKER_DOCUMENT_VERIFY",
            rec.document_id,
            "VERIFIED",
            f"DigiLocker URI: {res.get('digilocker_uri')}"
        )

    return res
