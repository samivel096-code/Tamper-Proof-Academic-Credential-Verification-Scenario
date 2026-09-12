import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, FileCheck, FileText, AlertCircle, X, RefreshCw } from "lucide-react";

interface UploaderProps {
  onFileSelected: (file: File, docType: string) => void;
  isLoading: boolean;
}

const DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN Card",
  "Driving Licence",
  "Passport",
  "Voter ID",
  "Registered Deed / Sale Deed",
  "Property Title Deed",
  "Birth Certificate",
  "Death Certificate",
  "Caste Certificate",
  "Income Certificate",
  "Community Certificate",
  "Educational Certificate",
  "Vehicle Registration Certificate",
  "Government Certificate",
  "Business Certificate",
  "Invoice",
  "Other / Custom Document"
];

export const DocumentUploader: React.FC<UploaderProps> = ({ onFileSelected, isLoading }) => {
  const [selectedType, setSelectedType] = useState("Aadhaar");
  const [dragActive, setDragActive] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (facing: "environment" | "user" = cameraFacing) => {
    setCameraError(null);
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Could not access camera. Please verify your webcam is connected or use file upload."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openCameraModal = () => {
    setShowCameraModal(true);
    startCamera("environment");
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCameraError(null);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        closeCameraModal();
        onFileSelected(file, selectedType);
      }
    }, "image/jpeg", 0.95);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0], selectedType);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0], selectedType);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      {/* Type Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">
            Step 1: Select Document Type & Profile
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configures the corresponding reference template, expected fields, and symbol baselines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            disabled={isLoading}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white focus:border-blue-500 focus:outline-none shadow-sm cursor-pointer"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-950/20 shadow-xl"
            : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-4">
          <Upload className="w-8 h-8" />
        </div>

        <h4 className="text-base font-bold text-white tracking-tight">
          Drag and drop your document here
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
          Supports high-resolution JPG, JPEG, PNG, and PDF. Maximum size: 25 MB.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            Browse Files
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={openCameraModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera Scanner (Webcam / Mobile)
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Strict Image Quality Engine will automatically inspect blur, glare, and resolution before screening.</span>
        </div>
      </div>

      {/* Interactive Live Camera Scanner Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Live Document Scanner
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Align your {selectedType} inside the viewfinder frame and capture.
                </p>
              </div>
              <button
                onClick={closeCameraModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-6 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm text-rose-200 font-medium">{cameraError}</p>
                <button
                  onClick={() => startCamera()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  Retry Camera Access
                </button>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Card Alignment Overlay Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-full max-w-[85%] aspect-[1.586/1] border-2 border-dashed border-blue-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                      Align Card Within Edges
                    </span>
                    {/* Corner Reticles */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl -mt-0.5 -ml-0.5" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr -mt-0.5 -mr-0.5" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl -mb-0.5 -ml-0.5" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br -mb-0.5 -mr-0.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Switch Camera
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(cameraError)}
                  onClick={capturePhoto}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  Capture & Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

