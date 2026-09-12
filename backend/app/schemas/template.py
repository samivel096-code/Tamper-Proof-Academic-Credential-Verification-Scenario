from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TemplateRegionSchema(BaseModel):
    id: Optional[int] = None
    region_type: str  # header, photo, qr, emblem, text_field, footer, id_box
    label: str
    x: float
    y: float
    width: float
    height: float
    is_required: bool = True
    font_hint: Optional[str] = None

class DocumentTemplateCreate(BaseModel):
    document_type: str
    name: str
    version: str = "1.0"
    issuing_organization: str
    aspect_ratio: float = 1.586
    expected_width: int = 1050
    expected_height: int = 660
    qr_required: bool = True
    required_fields: List[str]
    regions: List[TemplateRegionSchema]

class DocumentTemplateResponse(BaseModel):
    id: int
    document_type: str
    name: str
    version: str
    issuing_organization: str
    aspect_ratio: float
    expected_width: int
    expected_height: int
    sample_image_path: Optional[str] = None
    is_active: bool
    qr_required: bool
    required_fields: List[str]
    regions: List[TemplateRegionSchema]
    created_at: datetime

    class Config:
        from_attributes = True
