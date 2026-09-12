import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / 'app' / 'storage'
UPLOAD_DIR = STORAGE_DIR / 'uploads'
PROCESSED_DIR = STORAGE_DIR / 'processed'
TEMPLATE_DIR = STORAGE_DIR / 'templates'
DEMO_DIR = STORAGE_DIR / 'demo'

for p in [UPLOAD_DIR, PROCESSED_DIR, TEMPLATE_DIR, DEMO_DIR]:
    p.mkdir(parents=True, exist_ok=True)

SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-jwt-key-for-fake-id-screening-system-2026')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{BASE_DIR}/screening_system.db')

ROLES = ['ADMIN', 'OFFICER', 'REVIEWER', 'VIEWER']

# DigiLocker & API Setu (National e-Governance Division) Configuration
DIGILOCKER_API_KEY = os.environ.get('DIGILOCKER_API_KEY', '')
DIGILOCKER_CLIENT_ID = os.environ.get('DIGILOCKER_CLIENT_ID', '')
DIGILOCKER_CLIENT_SECRET = os.environ.get('DIGILOCKER_CLIENT_SECRET', '')
DIGILOCKER_BASE_URL = os.environ.get('DIGILOCKER_BASE_URL', 'https://apisetu.gov.in/api/v1')
DIGILOCKER_MODE = os.environ.get('DIGILOCKER_MODE', 'sandbox')  # 'live' or 'sandbox'

