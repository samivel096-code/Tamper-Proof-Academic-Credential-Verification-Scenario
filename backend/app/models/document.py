from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from app.database import Base

class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    document_type = Column(String, nullable=False)  # Aadhaar, PAN Card, Driving Licence, etc.
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    normalized_path = Column(String, nullable=True)
    file_type = Column(String, nullable=False)  # image/jpeg, image/png, application/pdf
    file_size = Column(Integer, nullable=False)
    status = Column(String, default='PENDING')  # PENDING, PROCESSED, REJECTED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)
