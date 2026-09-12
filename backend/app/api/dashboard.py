from fastapi import APIRouter, Depends
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
