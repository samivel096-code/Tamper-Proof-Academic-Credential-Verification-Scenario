import os

api_dir = os.path.join('app', 'api')
os.makedirs(api_dir, exist_ok=True)

with open(os.path.join(api_dir, 'auth.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.utils.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
''')

with open(os.path.join(api_dir, 'documents.py'), 'w', encoding='utf-8') as f:
    f.write(r'''from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import shutil
import os
import uuid

from app.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.verification import VerificationRecord
from app.models.template import DocumentTemplate
from app.config import UPLOAD_DIR
from app.utils.security import get_current_user
from app.utils.audit import record_audit_log
from app.services.image_quality_service import ImageQualityService
from app.services.verification_service import VerificationService

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/upload")
async def upload_document(
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.pdf', '.webp']:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload JPG, PNG, or PDF.")

    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(str(UPLOAD_DIR), safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    # Initial image quality check
    quality_result = ImageQualityService.evaluate(file_path)

    doc = Document(
        user_id=current_user.id,
        document_type=document_type,
        original_filename=file.filename,
        file_path=file_path,
        file_type=file.content_type or f"image/{ext.replace('.', '')}",
        file_size=file_size,
        status="PENDING" if quality_result["acceptable"] else "REJECTED"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    record_audit_log(
        db, 
        current_user, 
        "UPLOAD", 
        doc.id, 
        "PASS" if quality_result["acceptable"] else "REJECTED_QUALITY",
        f"Document: {doc.original_filename} ({document_type})"
    )

    return {
        "document_id": doc.id,
        "document_type": doc.document_type,
        "original_filename": doc.original_filename,
        "status": doc.status,
        "quality_result": quality_result
    }

@router.post("/{document_id}/process")
def process_document(
    document_id: int,
    simulate_authoritative: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

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
        "screening_score": record.screening_score
    }

@router.get("")
def list_documents(
    skip: int = 0,
    limit: int = 50,
    doc_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Document)
    if doc_type:
        query = query.filter(Document.document_type == doc_type)
    total = query.count()
    docs = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": d.id,
                "document_type": d.document_type,
                "original_filename": d.original_filename,
                "status": d.status,
                "created_at": d.created_at
            }
            for d in docs
        ]
    }
''')

print('Auth and Documents routers generated.')
