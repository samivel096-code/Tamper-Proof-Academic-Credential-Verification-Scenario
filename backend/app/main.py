from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

from app.config import STORAGE_DIR, UPLOAD_DIR, PROCESSED_DIR, TEMPLATE_DIR, DEMO_DIR
from app.database import engine, Base
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.templates import router as templates_router
from app.api.verification import router as verification_router
from app.api.dashboard import router as dashboard_router
from app.api.demo import router as demo_router
from app.api.digilocker import router as digilocker_router

# Ensure tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Based Fake Identity & Document Screening System",
    description="Authorized Document Verification and Forensic Screening Engine",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Storage for serving document previews and overlays
app.mount("/storage/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/storage/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")
app.mount("/storage/templates", StaticFiles(directory=str(TEMPLATE_DIR)), name="templates")
app.mount("/storage/demo", StaticFiles(directory=str(DEMO_DIR)), name="demo")

# Include Routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(templates_router)
app.include_router(verification_router)
app.include_router(dashboard_router)
app.include_router(demo_router)
app.include_router(digilocker_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log securely and return clean officer-friendly response
    import traceback
    print(f"Global unhandled exception on {request.url}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal system error occurred during document processing. Please retry or contact system administrator."}
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "operational",
        "system": "AI-Based Fake Identity & Document Screening System",
        "version": "2.0.0"
    }

# Mount Frontend SPA if built
from pathlib import Path
from fastapi.responses import FileResponse

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API or storage paths
        if full_path.startswith("api") or full_path.startswith("storage"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

