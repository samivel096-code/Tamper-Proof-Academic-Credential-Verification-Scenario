import os

schemas_dir = os.path.join('app', 'schemas')
os.makedirs(schemas_dir, exist_ok=True)

with open(os.path.join(schemas_dir, 'auth.py'), 'w', encoding='utf-8') as f:
    f.write('''from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    email: str
    full_name: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "OFFICER"
''')

with open(os.path.join(schemas_dir, 'document.py'), 'w', encoding='utf-8') as f:
    f.write('''from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class DocumentUploadResponse(BaseModel):
    id: int
    document_type: str
    original_filename: str
    file_path: str
    normalized_path: Optional[str] = None
    file_size: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class QualityCheckDetail(BaseModel):
    acceptable: bool
    score: float
    message: str

class QualityCheckResult(BaseModel):
    acceptable: bool
    reasons: List[str]
    checklist: Dict[str, bool]
    blur_score: float
    brightness: float
    contrast: float
    resolution: Dict[str, int]
    glare_detected: bool
    crop_detected: bool
''')

with open(os.path.join(schemas_dir, 'template.py'), 'w', encoding='utf-8') as f:
    f.write('''from pydantic import BaseModel
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
''')

with open(os.path.join(schemas_dir, 'verification.py'), 'w', encoding='utf-8') as f:
    f.write('''from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CrossCheckItem(BaseModel):
    field: str
    extracted_value: str
    reference_or_qr_value: str
    result: str  # MATCH, PARTIAL MATCH, MISMATCH, NOT FOUND, NOT AVAILABLE

class FlaggedRegion(BaseModel):
    id: Optional[str] = None
    region_type: str
    label: str
    x: float
    y: float
    width: float
    height: float
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    description: str

class TemplateBreakdown(BaseModel):
    layout: float
    field_positions: float
    typography: float
    symbols: float
    qr_position: float
    dimensions: float
    overall: float

class VerificationResultResponse(BaseModel):
    id: int
    document_id: int
    document_type: str
    status: str  # VERIFIED, LIKELY AUTHENTIC, SUSPICIOUS / LIKELY ALTERED, UNABLE TO VERIFY
    screening_score: float
    template_match_score: float
    ocr_consistency_score: float
    qr_consistency_score: float
    required_fields_score: float
    image_quality_score: float
    integrity_score: float
    
    template_breakdown: Dict[str, Any]
    ocr_data: Dict[str, Any]
    qr_data: Dict[str, Any]
    cross_check_data: List[Dict[str, Any]]
    flagged_regions: List[Dict[str, Any]]
    validation_notes: List[str]
    recommendation: str
    
    authorized_verification_status: str
    authorized_provider_name: Optional[str] = None
    authorized_verification_notes: Optional[str] = None
    
    review_status: str
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    original_image_url: str
    normalized_image_url: Optional[str] = None
    template_sample_url: Optional[str] = None
    created_at: datetime

class ReviewDecisionRequest(BaseModel):
    status: str  # ACCEPTED, REJECTED, SUSPICIOUS
    notes: str

class DashboardStatsResponse(BaseModel):
    total_documents: int
    processed: int
    verified: int
    likely_authentic: int
    suspicious: int
    unable_to_verify: int
    needs_review: int
    daily_processing: List[Dict[str, Any]]
    results_distribution: Dict[str, int]
    document_types_distribution: Dict[str, int]
    qr_results_distribution: Dict[str, int]
    recent_verifications: List[Dict[str, Any]]
''')

with open(os.path.join(schemas_dir, '__init__.py'), 'w', encoding='utf-8') as f:
    f.write('''from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserCreate
from app.schemas.document import DocumentUploadResponse, QualityCheckResult
from app.schemas.template import DocumentTemplateCreate, DocumentTemplateResponse, TemplateRegionSchema
from app.schemas.verification import VerificationResultResponse, ReviewDecisionRequest, DashboardStatsResponse
''')

print('All schemas generated successfully.')
