from pydantic import BaseModel
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
