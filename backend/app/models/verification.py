from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from app.database import Base

class VerificationRecord(Base):
    __tablename__ = 'verification_records'

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    template_id = Column(Integer, ForeignKey('document_templates.id'), nullable=True)
    status = Column(String, nullable=False)  # VERIFIED, LIKELY AUTHENTIC, SUSPICIOUS / LIKELY ALTERED, UNABLE TO VERIFY
    screening_score = Column(Float, nullable=False, default=0.0)
    template_match_score = Column(Float, default=0.0)
    ocr_consistency_score = Column(Float, default=0.0)
    qr_consistency_score = Column(Float, default=0.0)
    required_fields_score = Column(Float, default=0.0)
    image_quality_score = Column(Float, default=0.0)
    integrity_score = Column(Float, default=0.0)
    template_breakdown = Column(Text, default='{}')
    ocr_data = Column(Text, default='{}')
    qr_data = Column(Text, default='{}')
    cross_check_data = Column(Text, default='[]')
    flagged_regions = Column(Text, default='[]')
    validation_notes = Column(Text, default='[]')
    recommendation = Column(String, nullable=False)
    authorized_verification_status = Column(String, default='NOT AVAILABLE')
    authorized_provider_name = Column(String, nullable=True)
    authorized_verification_notes = Column(String, nullable=True)
    review_status = Column(String, default='PENDING')
    reviewed_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
