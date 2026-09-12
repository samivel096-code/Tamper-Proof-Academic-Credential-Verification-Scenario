from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User
from typing import Optional

def record_audit_log(
    db: Session,
    user: Optional[User],
    action: str,
    document_id: Optional[int] = None,
    result: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    log = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "SYSTEM",
        action=action,
        document_id=document_id,
        result=result,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
