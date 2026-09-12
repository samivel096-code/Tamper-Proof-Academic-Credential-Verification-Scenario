# AI-Based Fake Identity & Document Screening System

A comprehensive, production-grade identity and document screening web platform designed for authorized screening officers. The platform validates identity documents (Aadhaar, PAN Card, Driving Licence, Passport, Voter ID, Certificates, etc.) by combining OpenCV computer vision image quality checks, contour normalization, structured OCR, decoded QR code cross-referencing, Error Level Analysis (ELA) tamper screening, and reference template profile matching.

---

## Key Design Principles

1. **Template Match != Authenticity**:
   - A `100/100` Template Match score represents **design and geometric similarity only**.
   - It does **NOT** mean `Authenticity: 100%`.
   - The platform clearly displays:
     > "Template and document checks are consistent, but design matching alone does not establish legal authenticity. Use an authorized verification source where available."
   - A document is only classified as `VERIFIED` when an authoritative verification provider confirms it.

2. **Strict Multi-Tiered Screening Pipeline**:
   ```
   Document Upload / Camera
              ↓
     Image Quality Check (OpenCV Laplacian Blur, Glare, Contrast, Resolution, Crop)
              ↓ (Pass)
     Document Boundary Detection & 4-Point Perspective Warp Normalization
              ↓
     OCR Extraction (Structured Key-Values & Bounding Boxes)
              ↓
     Document Type Verification (Checks uploaded document matches selected profile)
              ↓
     Reference Template Comparison (Dimensions, Layout, Field Positions, Symbols, QR Region)
              ↓
     QR Code Analysis (OpenCV QRCodeDetector, XML / JSON / vCard payload decode)
              ↓
     Data Cross-Check (Visible OCR text vs Decoded QR matrix)
              ↓
     Document Integrity Screening (ELA, Edge Discontinuity, Photo Splicing, Alteration Flags)
              ↓
     Authorized Provider Routing (Authoritative or Sandbox Demo Provider)
              ↓
     Verification Screening Score (0–100) & Explainable Validation Dossier
   ```

3. **Classification Outcomes**:
   - **`VERIFIED`**: Authoritative verification provider confirmed the document identifier.
   - **`LIKELY AUTHENTIC`**: High template consistency (≥85/100), OCR consistent, QR payload matches visible text, required fields present, no alteration indicators, authorized source unavailable.
   - **`SUSPICIOUS / LIKELY ALTERED`**: QR information mismatch, major template mismatch, altered date/photo patches detected, or missing required fields.
   - **`UNABLE TO VERIFY`**: Defocused/blurry capture, inadequate lighting, or severe cropping.

---

## Role-Based Access Control (RBAC)

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **OFFICER** | `officer@screening.gov` | `Officer@123` | Upload documents, run screening, perform visual review, submit decisions |
| **ADMIN** | `admin@screening.gov` | `Admin@123` | Full access + Template Management & Auto-learning reference samples |
| **REVIEWER** | `reviewer@screening.gov` | `Reviewer@123` | Secondary forensic inspection and compliance review |
| **VIEWER** | `viewer@screening.gov` | `Viewer@123` | Read-only access to audit logs and statistics |

*(Note: The login page includes 1-click credential auto-fill buttons for seamless role switching during evaluation).*

---

## 1-Click Demo Evaluation Suite

The platform includes 5 pre-configured forensic scenarios ready to test with a single click:

1. **Authentic Aadhaar Card**:
   - High-clarity specimen matching reference geometry.
   - Encoded QR XML payload matches visible identity details.
   - **Result**: `LIKELY AUTHENTIC` (Template Match: ~98/100, Score: ~95/100).
2. **Aadhaar with QR Mismatch**:
   - Visible document text shows "Aarav Sharma", but embedded QR code payload encodes "Vikram Singh".
   - **Result**: `SUSPICIOUS / LIKELY ALTERED` (Highlights critical QR Information Mismatch).
3. **Tampered PAN Card (Altered DOB & Photo Frame)**:
   - Date of birth region exhibits localized digital splicing patch.
   - **Result**: `SUSPICIOUS / LIKELY ALTERED` (Flags Altered Date Region).
4. **Severely Blurry Document**:
   - Defocused capture failing OpenCV Laplacian variance threshold (<50).
   - **Result**: Rejection modal `DOCUMENT NOT CLEAR` with actionable checklist.
5. **Document Type Mismatch**:
   - Officer selects Passport, but uploads a PAN card.
   - **Result**: Document Type Mismatch alert.

---

## Visual Reviewer Features

- **Interactive Layer Toggles**:
  - `Original Document`
  - `OCR Text Bounding Boxes`
  - `QR Region Box`
  - `Template Overlay` with live opacity slider (0% to 100%)
  - `Flagged Alteration Regions`
- **Click-to-Highlight Issue Inspector**: Clicking any flagged issue in the right panel illuminates and pulses the exact bounding box on the document canvas.
- **Side-by-Side & Split Slider Diff**: Slide between the reference template and the uploaded document to observe sub-pixel alignment discrepancies.
- **Data Cross-Check Matrix**: Masked identifiers (`XXXX-XXXX-8734`) showing match status (`MATCH`, `PARTIAL MATCH`, `MISMATCH`).
- **Officer Attestation**: Formally submit `Accepted`, `Flagged Fraudulent`, or `Request Rescan` decisions with custom audit notes.

---

## Running the Application

### 1. Unified Launch (Frontend + Backend)
```bash
python run_server.py
```
Open **`http://127.0.0.1:8000`** in your browser.

### 2. Running Frontend in Dev Mode (Hot Reloading)
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.
