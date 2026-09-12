from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
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
