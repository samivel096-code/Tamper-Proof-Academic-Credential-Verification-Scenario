import os

models_dir = os.path.join('app', 'models')
os.makedirs(models_dir, exist_ok=True)

with open(os.path.join(models_dir, 'user.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default='OFFICER')  # ADMIN, OFFICER, REVIEWER, VIEWER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
''')

with open(os.path.join(models_dir, 'document.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
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
''')

with open(os.path.join(models_dir, 'template.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class DocumentTemplate(Base):
    __tablename__ = 'document_templates'

    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    version = Column(String, default='1.0')
    issuing_organization = Column(String, nullable=False)
    aspect_ratio = Column(Float, default=1.586)
    expected_width = Column(Integer, default=1050)
    expected_height = Column(Integer, default=660)
    sample_image_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    qr_required = Column(Boolean, default=True)
    required_fields = Column(Text, default='["Name", "Date of Birth", "Document ID"]')
    background_profile = Column(Text, default='{}')
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    regions = relationship('TemplateRegion', back_populates='template', cascade='all, delete-orphan')

class TemplateRegion(Base):
    __tablename__ = 'template_regions'

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey('document_templates.id'), nullable=False)
    region_type = Column(String, nullable=False)  # header, photo, qr, emblem, text_field, footer, id_box
    label = Column(String, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    is_required = Column(Boolean, default=True)
    font_hint = Column(String, nullable=True)

    template = relationship('DocumentTemplate', back_populates='regions')
''')

with open(os.path.join(models_dir, 'verification.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
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
''')

with open(os.path.join(models_dir, 'audit.py'), 'w', encoding='utf-8') as f:
    f.write('''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from app.database import Base

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    document_id = Column(Integer, nullable=True)
    result = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
''')

with open(os.path.join(models_dir, '__init__.py'), 'w', encoding='utf-8') as f:
    f.write('''from app.models.user import User
from app.models.document import Document
from app.models.template import DocumentTemplate, TemplateRegion
from app.models.verification import VerificationRecord
from app.models.audit import AuditLog
''')

print('All models generated successfully.')
