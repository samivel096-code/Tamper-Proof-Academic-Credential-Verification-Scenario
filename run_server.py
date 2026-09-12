import os
import sys
import uvicorn
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

if __name__ == "__main__":
    print("=" * 70)
    print("  AI-BASED FAKE IDENTITY & DOCUMENT SCREENING SYSTEM")
    print("  Official Forensic Verification Terminal v2.0")
    print("=" * 70)
    print("Starting server on: http://127.0.0.1:8000")
    print("Default Officer Login: officer@screening.gov / Officer@123")
    print("Default Admin Login:   admin@screening.gov   / Admin@123")
    print("=" * 70)
    
    os.chdir(str(BACKEND_DIR))
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
