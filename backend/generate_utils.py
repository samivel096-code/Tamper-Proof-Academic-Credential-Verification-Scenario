import os

utils_dir = os.path.join('app', 'utils')
os.makedirs(utils_dir, exist_ok=True)

with open(os.path.join(utils_dir, 'security.py'), 'w', encoding='utf-8') as f:
    f.write('''from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_val = payload.get("sub")
        if user_id_val is None:
            raise credentials_exception
        user_id = int(user_id_val)
    except (JWTError, ValueError):
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'. Required: {allowed_roles}"
            )
        return current_user
    return role_checker
''')

with open(os.path.join(utils_dir, 'masking.py'), 'w', encoding='utf-8') as f:
    f.write('''import re

def mask_aadhaar(uid: str) -> str:
    clean = re.sub(r'\\D', '', str(uid or ''))
    if len(clean) == 12:
        return f"XXXX-XXXX-{clean[-4:]}"
    elif len(clean) > 4:
        return f"XXXX-XXXX-{clean[-4:]}"
    return "XXXX-XXXX-XXXX"

def mask_pan(pan: str) -> str:
    clean = str(pan or '').strip().upper()
    if len(clean) == 10:
        return f"{clean[:2]}***{clean[-2:]}"
    return "XXXX***XX"

def mask_passport(ppt: str) -> str:
    clean = str(ppt or '').strip().upper()
    if len(clean) >= 6:
        return f"{clean[0]}*****{clean[-2:]}"
    return "*****"

def mask_identifier(field_name: str, value: str) -> str:
    if not value:
        return "N/A"
    fn = field_name.lower()
    if 'aadhaar' in fn or 'uid' in fn:
        return mask_aadhaar(value)
    elif 'pan' in fn:
        return mask_pan(value)
    elif 'passport' in fn:
        return mask_passport(value)
    elif 'document' in fn or 'number' in fn or 'id' in fn or 'licence' in fn or 'license' in fn:
        clean = str(value).strip()
        if len(clean) > 4:
            return f"***{clean[-4:]}"
        return "****"
    return value
''')

with open(os.path.join(utils_dir, 'audit.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy.orm import Session
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
''')

print('Utils generated successfully.')
