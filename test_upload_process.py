import httpx
from PIL import Image, ImageDraw
import io

# Generate test image
img = Image.new('RGB', (1000, 650), color=(245, 245, 245))
draw = ImageDraw.Draw(img)
draw.rectangle([(40, 40), (960, 610)], outline=(30, 30, 30), width=3)
draw.text((100, 100), 'GOVERNMENT IDENTITY CARD', fill=(20, 20, 20))
draw.text((100, 180), 'Name: Test User', fill=(20, 20, 20))
draw.text((100, 240), 'DOB: 01/01/1990', fill=(20, 20, 20))
draw.text((100, 300), 'ID: 123456789012', fill=(20, 20, 20))
draw.rectangle([(700, 150), (900, 350)], outline=(50, 50, 50), fill=(200, 200, 200))
draw.text((750, 240), 'PHOTO', fill=(50, 50, 50))

buf = io.BytesIO()
img.save(buf, format='PNG')
img_bytes = buf.getvalue()

client = httpx.Client(base_url="http://127.0.0.1:8000")

# 1. Login
res = client.post("/api/auth/login", json={"email": "officer@screening.gov", "password": "Officer@123"})
print("1. Login status:", res.status_code)
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Upload
files = {"file": ("test_doc.png", img_bytes, "image/png")}
data = {"document_type": "Aadhaar"}
res_up = client.post("/api/documents/upload", headers=headers, data=data, files=files)
print("2. Upload status:", res_up.status_code, res_up.text)
up_json = res_up.json()
doc_id = up_json["document_id"]

# 3. Process
res_proc = client.post(f"/api/documents/{doc_id}/process", headers=headers)
print("3. Process status:", res_proc.status_code, res_proc.text)
proc_json = res_proc.json()
verif_id = proc_json["verification_id"]

# 4. Fetch verification record
res_verif = client.get(f"/api/verification/{verif_id}", headers=headers)
print("4. Verification status:", res_verif.status_code)
v_data = res_verif.json()
print("Verification Result:", {
    "status": v_data["status"],
    "score": v_data["screening_score"],
    "ocr_data": v_data["ocr_data"],
    "notes": v_data["validation_notes"]
})
