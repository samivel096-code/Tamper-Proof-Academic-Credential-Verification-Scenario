import os
import sys

# Ensure stdout handles utf-8 if possible
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    print("[PASS] /api/health:", res.json())

def test_auth():
    res = client.post("/api/auth/login", json={"email": "officer@screening.gov", "password": "Officer@123"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    print("[PASS] Officer login. Token received.")
    return token

def test_dashboard(token):
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/dashboard/statistics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    print(f"[PASS] Dashboard stats: Total={data['total_documents']}, Processed={data['processed']}, LikelyAuthentic={data['likely_authentic']}")

def test_demo_processing(token):
    headers = {"Authorization": f"Bearer {token}"}
    # Test authentic Aadhaar
    res = client.post("/api/demo/load/sample_aadhaar_authentic", headers=headers)
    assert res.status_code == 200, f"Authentic Aadhaar failed: {res.text}"
    auth_data = res.json()
    print(f"[PASS] Authentic demo: Status={auth_data['status']}, Score={auth_data['screening_score']}")

    # Test QR mismatch Aadhaar
    res_mismatch = client.post("/api/demo/load/sample_aadhaar_qr_mismatch", headers=headers)
    assert res_mismatch.status_code == 200
    mismatch_data = res_mismatch.json()
    print(f"[PASS] QR Mismatch demo: Status={mismatch_data['status']}, Score={mismatch_data['screening_score']}")

    # Test blurry rejection
    res_blurry = client.post("/api/demo/load/sample_blurry_rejected", headers=headers)
    assert res_blurry.status_code == 200
    blurry_data = res_blurry.json()
    print(f"[PASS] Blurry rejection: Status={blurry_data['status']}, Acceptable={blurry_data['quality_acceptable']}")

if __name__ == "__main__":
    test_health()
    tok = test_auth()
    test_dashboard(tok)
    test_demo_processing(tok)
    print("\nALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")
