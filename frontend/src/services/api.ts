import {
  User,
  DocumentTemplate,
  VerificationResult,
  DashboardStats,
  DemoSample,
  QualityCheckResult
} from "../types";

const API_BASE = "";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Invalid credentials");
    }
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  // Documents
  async uploadDocument(
    documentType: string,
    file: File
  ): Promise<{
    document_id: number;
    document_type: string;
    original_filename: string;
    status: string;
    quality_result: QualityCheckResult;
  }> {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  async processDocument(
    documentId: number,
    simulateAuthoritative = false
  ): Promise<{
    verification_id: number;
    document_id: number;
    status: string;
    screening_score: number;
  }> {
    const res = await fetch(
      `${API_BASE}/api/documents/${documentId}/process?simulate_authoritative=${simulateAuthoritative}`,
      {
        method: "POST",
        headers: getAuthHeaders()
      }
    );
    if (!res.ok) throw new Error("Document processing failed");
    return res.json();
  },

  // Verification & Review
  async getVerification(id: number): Promise<VerificationResult> {
    const res = await fetch(`${API_BASE}/api/verification/${id}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to load verification record");
    return res.json();
  },

  async submitReview(id: number, status: string, notes: string) {
    const res = await fetch(`${API_BASE}/api/verification/${id}/review`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error("Failed to submit review");
    return res.json();
  },

  async getHistory(params?: {
    status_filter?: string;
    doc_type?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.status_filter) query.set("status_filter", params.status_filter);
    if (params?.doc_type) query.set("doc_type", params.doc_type);
    if (params?.search) query.set("search", params.search);

    const res = await fetch(`${API_BASE}/api/verification/history/list?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/api/dashboard/statistics`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
    return res.json();
  },

  // Templates
  async getTemplates(): Promise<DocumentTemplate[]> {
    const res = await fetch(`${API_BASE}/api/templates`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to load templates");
    return res.json();
  },

  async uploadTemplateSample(
    documentType: string,
    name: string,
    issuingOrg: string,
    file: File
  ) {
    const formData = new FormData();
    formData.append("document_type", documentType);
    formData.append("name", name);
    formData.append("issuing_organization", issuingOrg);
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/templates/analyze-sample`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Template analysis failed" }));
      throw new Error(err.detail || "Template learning failed");
    }
    return res.json();
  },

  async toggleTemplate(id: number) {
    const res = await fetch(`${API_BASE}/api/templates/${id}/toggle`, {
      method: "PATCH",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to toggle template status");
    return res.json();
  },

  // Demo Suite
  async getDemoSamples(): Promise<DemoSample[]> {
    const res = await fetch(`${API_BASE}/api/demo/samples`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch demo samples");
    return res.json();
  },

  async loadDemoSample(sampleId: string, simulateAuthoritative = false) {
    const res = await fetch(
      `${API_BASE}/api/demo/load/${sampleId}?simulate_authoritative=${simulateAuthoritative}`,
      {
        method: "POST",
        headers: getAuthHeaders()
      }
    );
    if (!res.ok) throw new Error("Failed to load demo sample");
    return res.json();
  },

  // DigiLocker Official Verification
  async getDigiLockerStatus() {
    const res = await fetch(`${API_BASE}/api/digilocker/status`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Failed to fetch DigiLocker gateway status");
    return res.json();
  },

  async updateDigiLockerConfig(config: {
    api_key?: string;
    client_id?: string;
    client_secret?: string;
    base_url?: string;
    mode?: string;
  }) {
    const res = await fetch(`${API_BASE}/api/digilocker/config`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error("Failed to update DigiLocker configuration");
    return res.json();
  },

  async verifyDeedViaDigiLocker(payload: {
    deed_number: string;
    sro_office: string;
    registration_year: number;
    state?: string;
    claimant?: string;
    executant?: string;
    verification_id?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/digilocker/verify-deed`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Deed verification failed via DigiLocker API");
    return res.json();
  },

  async verifyRecordViaDigiLocker(verificationId: number) {
    const res = await fetch(`${API_BASE}/api/digilocker/verify-record/${verificationId}`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error("Document verification failed via DigiLocker");
    return res.json();
  }
};

