import os
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
from datetime import datetime, timedelta

from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.template import DocumentTemplate, TemplateRegion
from app.models.verification import VerificationRecord
from app.config import TEMPLATE_DIR, DEMO_DIR, UPLOAD_DIR
from app.utils.security import get_password_hash

def generate_qr_image(data: str, size: int = 160) -> Image.Image:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img.resize((size, size))

def create_aadhaar_card(
    name: str = "Aarav Sharma",
    dob: str = "15/08/1992",
    gender: str = "Male",
    uid: str = "9823 4512 8734",
    qr_name: str = "Aarav Sharma",
    watermark: str = "SPECIMEN / DEMO DATA ONLY",
    blur: bool = False,
    dark: bool = False
) -> Image.Image:
    w, h = 1050, 660
    card = Image.new("RGB", (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(card)

    # Gradient header bar (Tricolor motif: Saffron, White, Green)
    draw.rectangle([(0, 0), (w, 35)], fill=(255, 153, 51))
    draw.rectangle([(0, 35), (w, 45)], fill=(255, 255, 255))
    draw.rectangle([(0, 45), (w, 55)], fill=(19, 136, 8))

    # Header text
    draw.text((420, 75), "GOVERNMENT OF INDIA", fill=(20, 20, 20))
    draw.text((440, 105), "Unique Identification Authority", fill=(80, 80, 80))

    # Gov Emblem placeholder box
    draw.rectangle([(60, 70), (130, 150)], outline=(100, 100, 100), fill=(240, 240, 240))
    draw.text((70, 100), "EMBLEM", fill=(100, 100, 100))

    # Photo Box
    draw.rectangle([(60, 180), (280, 450)], outline=(40, 40, 40), fill=(210, 220, 230), width=2)
    draw.text((120, 300), "PHOTO", fill=(90, 100, 110))

    # Identity Details
    draw.text((320, 190), "Name / नाम :", fill=(100, 100, 100))
    draw.text((320, 220), name, fill=(15, 23, 42))

    draw.text((320, 270), "Date of Birth / जन्म तिथि :", fill=(100, 100, 100))
    draw.text((320, 300), dob, fill=(15, 23, 42))

    draw.text((320, 350), "Gender / लिंग :", fill=(100, 100, 100))
    draw.text((320, 380), gender, fill=(15, 23, 42))

    # Aadhaar Number (Large Center-Bottom)
    draw.rectangle([(300, 480), (750, 540)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((370, 495), uid, fill=(220, 38, 38))

    # Footer
    draw.rectangle([(0, 605), (w, 660)], fill=(241, 245, 249))
    draw.text((360, 625), "मेरा आधार, मेरी पहचान", fill=(71, 85, 105))

    # Generate QR Code
    qr_payload = f'''<?xml version="1.0" encoding="UTF-8"?>
<PrintLetterBarcodeData uid="{uid.replace(' ', '')}" name="{qr_name}" gender="{gender[0]}" yob="{dob[-4:]}" dob="{dob}" co="S/O Rajesh" vtc="New Delhi" dist="New Delhi" state="Delhi" pc="110001"/>'''
    qr_img = generate_qr_image(qr_payload, size=210)
    card.paste(qr_img, (760, 200))

    # Watermark
    draw.text((350, 430), watermark, fill=(200, 200, 200))

    if dark:
        card = Image.eval(card, lambda p: int(p * 0.12))

    if blur:
        card = card.filter(ImageFilter.GaussianBlur(radius=8))

    return card

def create_pan_card(
    name: str = "ROHAN VERMA",
    father_name: str = "SURESH VERMA",
    dob: str = "24/11/1988",
    pan: str = "ABCDE1234F",
    tampered_dob: bool = False
) -> Image.Image:
    w, h = 1050, 660
    card = Image.new("RGB", (w, h), color=(224, 242, 254))  # Light sky-blue hue
    draw = ImageDraw.Draw(card)

    # Header
    draw.rectangle([(0, 0), (w, 80)], fill=(30, 58, 138))
    draw.text((250, 20), "INCOME TAX DEPARTMENT", fill=(255, 255, 255))
    draw.text((350, 50), "GOVT. OF INDIA", fill=(219, 234, 254))

    # Emblem
    draw.rectangle([(40, 95), (110, 165)], fill=(255, 255, 255), outline=(100, 100, 100))
    draw.text((50, 120), "SEAL", fill=(80, 80, 80))

    # PAN Number
    draw.text((150, 110), "Permanent Account Number Card", fill=(71, 85, 105))
    draw.text((150, 135), pan, fill=(15, 23, 42))

    # Photo Box
    draw.rectangle([(60, 200), (260, 460)], fill=(190, 200, 215), outline=(15, 23, 42), width=2)
    draw.text((120, 320), "PHOTO", fill=(70, 80, 90))

    # Details
    draw.text((310, 210), "Name", fill=(100, 116, 139))
    draw.text((310, 235), name, fill=(15, 23, 42))

    draw.text((310, 285), "Father's Name", fill=(100, 116, 139))
    draw.text((310, 310), father_name, fill=(15, 23, 42))

    draw.text((310, 360), "Date of Birth", fill=(100, 116, 139))
    
    if tampered_dob:
        # Paint an artificially bright white patch over the DOB to simulate sloppy copy-paste alteration!
        draw.rectangle([(305, 385), (520, 420)], fill=(255, 255, 255))
        draw.text((310, 390), "01/01/2000", fill=(0, 0, 0))
    else:
        draw.text((310, 385), dob, fill=(15, 23, 42))

    # QR Code
    qr_payload = json.dumps({
        "pan": pan,
        "name": name,
        "dob": dob,
        "father_name": father_name
    })
    qr_img = generate_qr_image(qr_payload, size=190)
    card.paste(qr_img, (780, 210))

    # Signature box
    draw.rectangle([(310, 450), (600, 520)], fill=(255, 255, 255), outline=(148, 163, 184))
    draw.text((410, 480), "SIGNATURE", fill=(148, 163, 184))

    return card

def create_registered_deed(
    deed_no: str = "1452/2023",
    sro: str = "Tiyagadurugam SRO",
    year: int = 2023,
    seller: str = "Ramalingam S",
    buyer: str = "Samivel R",
    schedule: str = "Survey No. 303/4, Ward 4, Extent: 2,400 Sq. Ft. (5.5 Cents) Residential Plot"
) -> Image.Image:
    w, h = 800, 1130
    deed = Image.new("RGB", (w, h), color=(254, 252, 245))
    draw = ImageDraw.Draw(deed)

    # Border double line
    draw.rectangle([(20, 20), (w - 20, h - 20)], outline=(120, 80, 40), width=3)
    draw.rectangle([(28, 28), (w - 28, h - 28)], outline=(180, 140, 90), width=1)

    # Header section
    draw.rectangle([(30, 30), (w - 30, 115)], fill=(245, 235, 220))
    draw.text((220, 45), "GOVERNMENT OF TAMIL NADU", fill=(60, 30, 10))
    draw.text((170, 70), "REGISTRATION & STAMPS DEPARTMENT (IGRS)", fill=(100, 50, 20))
    draw.text((250, 95), "FORM OF REGISTERED SALE DEED", fill=(140, 40, 20))

    # Stamp duty banner
    draw.rectangle([(50, 130), (w - 50, 175)], fill=(230, 240, 235), outline=(100, 160, 120))
    draw.text((70, 145), "E-STAMP CERTIFICATE NO: IN-TN82947192847190V | DUTY PAID: RS. 3,15,000", fill=(20, 80, 40))

    # Registry Details Box
    draw.rectangle([(50, 195), (w - 50, 310)], fill=(255, 255, 255), outline=(200, 200, 200))
    draw.text((70, 210), f"Deed Number: {deed_no}", fill=(15, 23, 42))
    draw.text((450, 210), f"Registration Year: {year}", fill=(15, 23, 42))
    draw.text((70, 240), f"Sub-Registrar Office: {sro}", fill=(15, 23, 42))
    draw.text((450, 240), "Book: Book 1 (Immovable)", fill=(15, 23, 42))
    draw.text((70, 270), "Volume: Volume-2023-893", fill=(15, 23, 42))
    draw.text((450, 270), "Page Range: 431 to 444", fill=(15, 23, 42))

    # Parties Box
    draw.rectangle([(50, 330), (w - 50, 450)], fill=(255, 255, 255), outline=(200, 200, 200))
    draw.text((70, 345), "PARTIES TO THE CONVEYANCE:", fill=(100, 50, 20))
    draw.text((70, 375), f"Executant (Seller / Vendor): {seller}", fill=(15, 23, 42))
    draw.text((70, 405), f"Claimant (Buyer / Purchaser): {buyer}", fill=(15, 23, 42))

    # Schedule Box
    draw.rectangle([(50, 470), (w - 50, 610)], fill=(255, 255, 255), outline=(200, 200, 200))
    draw.text((70, 485), "SCHEDULE OF PROPERTY:", fill=(100, 50, 20))
    draw.text((70, 515), schedule, fill=(15, 23, 42))
    draw.text((70, 545), "Market Value: Rs. 48,00,000 | Sale Consideration: Rs. 45,00,000", fill=(15, 23, 42))
    draw.text((70, 575), "Encumbrance Status: NIL ENCUMBRANCE CERTIFICATE ATTACHED", fill=(30, 100, 50))

    # Attestation & Digital Stamp
    draw.rectangle([(50, 630), (480, 800)], fill=(250, 250, 250), outline=(180, 180, 180))
    draw.text((70, 645), "OFFICIAL ATTESTATION & ENDORSEMENT:", fill=(80, 80, 80))
    draw.text((70, 675), f"Registered at {sro} on 19/07/{year}", fill=(15, 23, 42))
    draw.text((70, 705), "Digitally Signed via NIC CA e-Mudhra Token", fill=(20, 80, 40))
    draw.text((70, 735), "DigiLocker Integration Id: DIGI-IGRS-TN-2023-1452", fill=(60, 60, 60))
    draw.text((70, 765), "Signer: Joint Sub-Registrar II, Tiyagadurugam", fill=(15, 23, 42))

    # QR Code for DigiLocker / IGRS Verification
    qr_data = json.dumps({
        "doc": "Registered Sale Deed",
        "deed": deed_no,
        "sro": sro,
        "year": year,
        "buyer": buyer,
        "seller": seller,
        "uri": f"in.gov.digilocker.igrs.tamilnadu.deed-{deed_no.replace('/', '-')}_{year}"
    })
    qr_img = generate_qr_image(qr_data, size=220)
    deed.paste(qr_img, (520, 630))

    # Footer note
    draw.text((120, 860), "CENTRAL REGISTRATION REGISTRY COPY - OFFICIAL USE ONLY", fill=(160, 160, 160))
    draw.text((180, 890), "Sec. 57 Registration Act, 1908 - DigiLocker Document", fill=(180, 180, 180))

    return deed

def seed_database():
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Seed Users
    users_data = [
        {"email": "admin@screening.gov", "full_name": "Admin Officer", "role": "ADMIN", "password": "Admin@123"},
        {"email": "officer@screening.gov", "full_name": "Senior Screening Officer", "role": "OFFICER", "password": "Officer@123"},
        {"email": "reviewer@screening.gov", "full_name": "Compliance Reviewer", "role": "REVIEWER", "password": "Reviewer@123"},
        {"email": "viewer@screening.gov", "full_name": "Auditing Viewer", "role": "VIEWER", "password": "Viewer@123"}
    ]

    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=get_password_hash(u["password"]),
                is_active=True
            )
            db.add(user)
    db.commit()
    print("Users seeded successfully.")

    admin_user = db.query(User).filter(User.role == "ADMIN").first()

    # 2. Generate Sample Templates & Images
    aadhaar_template_path = os.path.join(str(TEMPLATE_DIR), "sample_aadhaar_ref.png")
    create_aadhaar_card().save(aadhaar_template_path)

    pan_template_path = os.path.join(str(TEMPLATE_DIR), "sample_pan_ref.png")
    create_pan_card().save(pan_template_path)

    deed_template_path = os.path.join(str(TEMPLATE_DIR), "sample_deed_ref.png")
    create_registered_deed().save(deed_template_path)

    # 3. Seed Document Templates
    templates_meta = [
        {
            "document_type": "Aadhaar",
            "name": "Standard Aadhaar Card Profile",
            "version": "1.0",
            "issuing_organization": "Unique Identification Authority of India (UIDAI)",
            "sample_path": aadhaar_template_path,
            "aspect_ratio": 1.59,
            "qr_required": True,
            "required_fields": ["Name", "Date of Birth", "Gender", "Document ID"],
            "regions": [
                {"region_type": "header", "label": "Gov Header", "x": 0.0, "y": 0.0, "width": 1.0, "height": 0.12, "is_required": True},
                {"region_type": "emblem", "label": "National Emblem", "x": 0.05, "y": 0.10, "width": 0.08, "height": 0.12, "is_required": True},
                {"region_type": "photo", "label": "Photograph", "x": 0.05, "y": 0.27, "width": 0.21, "height": 0.41, "is_required": True},
                {"region_type": "text_field", "label": "Name", "x": 0.30, "y": 0.28, "width": 0.40, "height": 0.08, "is_required": True},
                {"region_type": "text_field", "label": "Date of Birth", "x": 0.30, "y": 0.40, "width": 0.40, "height": 0.08, "is_required": True},
                {"region_type": "text_field", "label": "Gender", "x": 0.30, "y": 0.52, "width": 0.40, "height": 0.08, "is_required": True},
                {"region_type": "id_box", "label": "Aadhaar Number", "x": 0.28, "y": 0.72, "width": 0.45, "height": 0.10, "is_required": True},
                {"region_type": "qr", "label": "QR Code", "x": 0.72, "y": 0.30, "width": 0.22, "height": 0.34, "is_required": True}
            ]
        },
        {
            "document_type": "PAN Card",
            "name": "Income Tax PAN Card Profile",
            "version": "1.0",
            "issuing_organization": "Income Tax Department, Govt. of India",
            "sample_path": pan_template_path,
            "aspect_ratio": 1.59,
            "qr_required": True,
            "required_fields": ["Name", "Date of Birth", "Document ID"],
            "regions": [
                {"region_type": "header", "label": "ITD Header", "x": 0.0, "y": 0.0, "width": 1.0, "height": 0.12, "is_required": True},
                {"region_type": "photo", "label": "Photograph", "x": 0.05, "y": 0.30, "width": 0.20, "height": 0.40, "is_required": True},
                {"region_type": "id_box", "label": "PAN Number", "x": 0.14, "y": 0.20, "width": 0.40, "height": 0.08, "is_required": True},
                {"region_type": "text_field", "label": "Name", "x": 0.29, "y": 0.32, "width": 0.42, "height": 0.08, "is_required": True},
                {"region_type": "text_field", "label": "Date of Birth", "x": 0.29, "y": 0.55, "width": 0.42, "height": 0.08, "is_required": True},
                {"region_type": "qr", "label": "QR Code", "x": 0.74, "y": 0.32, "width": 0.20, "height": 0.32, "is_required": True}
            ]
        },
        {
            "document_type": "Driving Licence",
            "name": "State Motor Vehicles Driving Licence",
            "version": "1.0",
            "issuing_organization": "Ministry of Road Transport and Highways",
            "sample_path": None,
            "aspect_ratio": 1.58,
            "qr_required": True,
            "required_fields": ["Name", "Date of Birth", "Document ID", "Issue Date"],
            "regions": []
        },
        {
            "document_type": "Passport",
            "name": "Indian Republic Passport Biodata",
            "version": "1.0",
            "issuing_organization": "Ministry of External Affairs, Consular Division",
            "sample_path": None,
            "aspect_ratio": 1.42,
            "qr_required": False,
            "required_fields": ["Name", "Date of Birth", "Document ID", "Gender"],
            "regions": []
        },
        {
            "document_type": "Voter ID",
            "name": "Election Commission E-EPIC",
            "version": "1.0",
            "issuing_organization": "Election Commission of India",
            "sample_path": None,
            "aspect_ratio": 1.58,
            "qr_required": True,
            "required_fields": ["Name", "Document ID", "Gender"],
            "regions": []
        },
        {
            "document_type": "Birth Certificate",
            "name": "Vital Statistics Birth Certificate",
            "version": "1.0",
            "issuing_organization": "Municipal Corporation / Registrar of Births & Deaths",
            "sample_path": None,
            "aspect_ratio": 1.414,
            "qr_required": True,
            "required_fields": ["Name", "Date of Birth", "Document ID"],
            "regions": []
        },
        {
            "document_type": "Registered Deed / Sale Deed",
            "name": "State Registration Department Registered Deed Profile",
            "version": "1.0",
            "issuing_organization": "Department of Registration and Stamps (IGRS)",
            "sample_path": deed_template_path,
            "aspect_ratio": 0.707,
            "qr_required": False,
            "required_fields": ["Document ID", "Registration Year", "SRO Office", "Executant", "Claimant"],
            "regions": []
        }
    ]


    for tm in templates_meta:
        tpl = db.query(DocumentTemplate).filter(DocumentTemplate.document_type == tm["document_type"]).first()
        if not tpl:
            tpl = DocumentTemplate(
                document_type=tm["document_type"],
                name=tm["name"],
                version=tm["version"],
                issuing_organization=tm["issuing_organization"],
                sample_image_path=tm["sample_path"],
                aspect_ratio=tm["aspect_ratio"],
                qr_required=tm["qr_required"],
                required_fields=json.dumps(tm["required_fields"]),
                created_by=admin_user.id if admin_user else None
            )
            db.add(tpl)
            db.flush()

            for r in tm["regions"]:
                reg = TemplateRegion(
                    template_id=tpl.id,
                    region_type=r["region_type"],
                    label=r["label"],
                    x=r["x"],
                    y=r["y"],
                    width=r["width"],
                    height=r["height"],
                    is_required=r["is_required"]
                )
                db.add(reg)

    db.commit()
    print("Templates seeded successfully.")

    # 4. Generate Demo Documents
    d1 = create_aadhaar_card(name="Aarav Sharma", qr_name="Aarav Sharma")
    d1.save(os.path.join(str(DEMO_DIR), "demo_aadhaar_authentic.png"))

    d2 = create_aadhaar_card(name="Aarav Sharma", qr_name="Vikram Singh")  # Mismatch!
    d2.save(os.path.join(str(DEMO_DIR), "demo_aadhaar_qr_mismatch.png"))

    d3 = create_pan_card(name="ROHAN VERMA", pan="ABCDE1234F", tampered_dob=True)
    d3.save(os.path.join(str(DEMO_DIR), "demo_pan_tampered.png"))

    d4 = create_aadhaar_card(blur=True, dark=True)
    d4.save(os.path.join(str(DEMO_DIR), "demo_blurry_unreadable.png"))

    d5 = create_registered_deed()
    d5.save(os.path.join(str(DEMO_DIR), "demo_sale_deed_authentic.png"))

    print("Demo sample images created in storage/demo.")

    # 5. Populate initial historic verification records for dashboard richness
    officer = db.query(User).filter(User.role == "OFFICER").first()
    aadhaar_tpl = db.query(DocumentTemplate).filter(DocumentTemplate.document_type == "Aadhaar").first()
    
    if officer and aadhaar_tpl and db.query(VerificationRecord).count() == 0:
        history_presets = [
            ("Aadhaar", "LIKELY AUTHENTIC", 94.0, 98.0, 100.0, 95.0),
            ("Aadhaar", "LIKELY AUTHENTIC", 92.5, 96.0, 98.0, 92.0),
            ("Aadhaar", "SUSPICIOUS / LIKELY ALTERED", 58.0, 65.0, 20.0, 60.0),
            ("PAN Card", "LIKELY AUTHENTIC", 91.0, 95.0, 96.0, 90.0),
            ("PAN Card", "SUSPICIOUS / LIKELY ALTERED", 62.0, 70.0, 90.0, 45.0),
            ("Driving Licence", "UNABLE TO VERIFY", 30.0, 0.0, 0.0, 30.0),
            ("Passport", "LIKELY AUTHENTIC", 89.0, 92.0, 85.0, 92.0)
        ]

        for i, (dtype, st, scr, tm_scr, qr_scr, int_scr) in enumerate(history_presets):
            # Create a mock document record
            doc = Document(
                user_id=officer.id,
                document_type=dtype,
                original_filename=f"historic_{dtype.lower().replace(' ', '_')}_{i+1}.png",
                file_path=aadhaar_template_path,
                normalized_path=aadhaar_template_path,
                file_type="image/png",
                file_size=124000 + i * 5000,
                status="PROCESSED" if st != "UNABLE TO VERIFY" else "REJECTED",
                created_at=datetime.utcnow() - timedelta(days=i, hours=2 * i)
            )
            db.add(doc)
            db.flush()

            rec = VerificationRecord(
                document_id=doc.id,
                user_id=officer.id,
                template_id=aadhaar_tpl.id,
                status=st,
                screening_score=scr,
                template_match_score=tm_scr,
                ocr_consistency_score=92.0,
                qr_consistency_score=qr_scr,
                required_fields_score=95.0,
                image_quality_score=95.0 if st != "UNABLE TO VERIFY" else 30.0,
                integrity_score=int_scr,
                template_breakdown=json.dumps({"layout": tm_scr, "dimensions": 98.0, "symbols": 95.0, "qr_position": qr_scr}),
                ocr_data=json.dumps({"name": "Sample Person", "dob": "10/10/1990", "document_id": "123456789012"}),
                qr_data=json.dumps({"name": "Sample Person", "dob": "10/10/1990", "document_id": "123456789012"}),
                cross_check_data=json.dumps([
                    {"field": "Name", "extracted_value": "Sample Person", "reference_or_qr_value": "Sample Person", "result": "MATCH" if qr_scr > 50 else "MISMATCH"},
                    {"field": "DOB", "extracted_value": "10/10/1990", "reference_or_qr_value": "10/10/1990", "result": "MATCH"},
                    {"field": "Document ID", "extracted_value": "XXXX-XXXX-9012", "reference_or_qr_value": "XXXX-XXXX-9012", "result": "MATCH"}
                ]),
                flagged_regions=json.dumps([] if scr > 80 else [{"label": "Suspect Anomaly", "severity": "HIGH", "description": "Flagged alteration"}]),
                validation_notes=json.dumps(["Screening executed.", f"Status evaluated as {st}."]),
                recommendation="Manual officer review recommended." if scr < 80 else "Template and checks consistent.",
                authorized_verification_status="NOT AVAILABLE",
                review_status="PENDING" if scr < 80 else "ACCEPTED",
                created_at=doc.created_at
            )
            db.add(rec)

        db.commit()
        print("Historic verification records seeded.")

    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
