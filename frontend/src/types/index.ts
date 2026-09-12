export type UserRole = "ADMIN" | "OFFICER" | "REVIEWER" | "VIEWER";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface QualityCheckResult {
  acceptable: boolean;
  reasons: string[];
  checklist: {
    document_visible: boolean;
    resolution_sufficient: boolean;
    text_readable: boolean;
    blur_acceptable: boolean;
    lighting_acceptable: boolean;
    orientation_acceptable: boolean;
  };
  blur_score: number;
  brightness: number;
  contrast: number;
  resolution: { width: number; height: number };
  glare_detected: boolean;
  crop_detected: boolean;
}

export interface TemplateRegion {
  id?: number;
  region_type: "header" | "photo" | "qr" | "emblem" | "text_field" | "footer" | "id_box";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_required: boolean;
}

export interface DocumentTemplate {
  id: number;
  document_type: string;
  name: string;
  version: string;
  issuing_organization: string;
  aspect_ratio: number;
  expected_width: number;
  expected_height: number;
  sample_image_path?: string;
  is_active: boolean;
  qr_required: boolean;
  required_fields: string[];
  regions: TemplateRegion[];
}

export interface CrossCheckItem {
  field: string;
  raw_key: string;
  extracted_value: string;
  reference_or_qr_value: string;
  result: "MATCH" | "PARTIAL MATCH" | "MISMATCH" | "NOT FOUND" | "NOT AVAILABLE";
}

export interface FlaggedRegion {
  id?: string;
  region_type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

export interface VerificationResult {
  id: number;
  document_id: number;
  document_type: string;
  original_filename: string;
  status: "VERIFIED" | "LIKELY AUTHENTIC" | "SUSPICIOUS / LIKELY ALTERED" | "UNABLE TO VERIFY";
  screening_score: number;
  template_match_score: number;
  ocr_consistency_score: number;
  qr_consistency_score: number;
  required_fields_score: number;
  image_quality_score: number;
  integrity_score: number;
  template_breakdown: {
    layout?: number;
    field_positions?: number;
    typography?: number;
    symbols?: number;
    qr_position?: number;
    dimensions?: number;
  };
  ocr_data: Record<string, string>;
  ocr_blocks?: { text: string; confidence: number; box: { x: number; y: number; width: number; height: number } }[];
  qr_box?: { x: number; y: number; width: number; height: number };
  qr_data: Record<string, string>;
  cross_check_data: CrossCheckItem[];
  flagged_regions: FlaggedRegion[];
  validation_notes: string[];
  recommendation: string;
  authorized_verification_status: string;
  authorized_provider_name?: string;
  authorized_verification_notes?: string;
  review_status: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  original_image_url: string;
  normalized_image_url?: string;
  template_sample_url?: string;
  digilocker_payload?: DigiLockerVerificationResult;
  created_at: string;
}

export interface DigiLockerStatus {
  provider: string;
  gateway: string;
  mode: "live" | "sandbox";
  has_live_credentials: boolean;
  base_url: string;
  supported_registries: string[];
  status: string;
}

export interface DeedDetails {
  document_type?: string;
  registration_number?: string;
  registration_year?: number;
  sub_registrar_office?: string;
  district?: string;
  state?: string;
  book_number?: string;
  volume_number?: string;
  page_range?: string;
  registration_date?: string;
  executant_seller?: string;
  claimant_buyer?: string;
  property_schedule?: string;
  market_value?: string;
  consideration_amount?: string;
  stamp_duty_paid?: string;
  registration_fee_paid?: string;
  encumbrance_status?: string;
}

export interface DigiLockerDigitalSignature {
  signer: string;
  organization?: string;
  certifying_authority: string;
  certificate_serial_no?: string;
  certificate_thumbprint?: string;
  algorithm: string;
  signature_status?: string;
  signed_time?: string;
  timestamp?: string;
  valid: boolean;
}

export interface DigiLockerVerificationResult {
  status: string;
  verified: boolean;
  is_authoritative: boolean;
  provider_name: string;
  digilocker_uri?: string;
  issuer_name?: string;
  deed_details?: DeedDetails;
  digital_signature?: DigiLockerDigitalSignature;
  verified_data?: Record<string, any>;
  disclaimer: string;
  timestamp: string;
}

export interface DeedVerificationRequest {
  deed_number: string;
  sro_office: string;
  registration_year: number;
  state?: string;
  claimant?: string;
  executant?: string;
  verification_id?: number;
}

export interface DashboardStats {
  total_documents: number;
  processed: number;
  verified: number;
  likely_authentic: number;
  suspicious: number;
  unable_to_verify: number;
  needs_review: number;
  daily_processing: { date: string; count: number }[];
  results_distribution: Record<string, number>;
  document_types_distribution: Record<string, number>;
  qr_results_distribution: Record<string, number>;
  recent_verifications: {
    verification_id: number;
    document_id: number;
    document_type: string;
    original_filename: string;
    officer_name: string;
    status: string;
    screening_score: number;
    created_at: string;
  }[];
}

export interface DemoSample {
  id: string;
  title: string;
  document_type: string;
  description: string;
  expected_result: string;
  risk_level: string;
  badge_color: string;
  filename: string;
}

