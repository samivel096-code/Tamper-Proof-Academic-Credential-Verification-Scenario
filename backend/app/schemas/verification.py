from pydantic import BaseModel
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
