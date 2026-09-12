import React, { useState, useEffect } from "react";
import { Sparkles, ScanEye, ArrowRight, RefreshCw, FileCheck2 } from "lucide-react";
import confetti from "canvas-confetti";

import { api } from "../services/api";
import {
  VerificationResult,
  QualityCheckResult,
  DemoSample
} from "../types";
import { DocumentUploader } from "../components/DocumentUploader";
import { QualityModal } from "../components/QualityModal";
import { ProcessingTimeline, StepItem } from "../components/ProcessingTimeline";
import { VerificationScoreCard } from "../components/VerificationScoreCard";
import { StatusBadge } from "../components/StatusBadge";
import { ValidationNotes } from "../components/ValidationNotes";
import { CrossCheckTable } from "../components/CrossCheckTable";
import { DemoDocumentSelector } from "../components/DemoDocumentSelector";
import { DigiLockerVerificationPanel } from "../components/DigiLockerVerificationPanel";

interface UploadProps {
  onNavigateReview: (verificationId: number) => void;
}

const DEFAULT_STEPS: StepItem[] = [
  { id: "upload", label: "Document Ingestion & Format Validation", status: "pending" },
  { id: "quality", label: "OpenCV Strict Image Quality Screening", status: "pending" },
  { id: "detection", label: "Contour Detection & Perspective Rectification", status: "pending" },
  { id: "ocr", label: "OCR Structured Field Extraction", status: "pending" },
  { id: "type_verify", label: "Document Type & Profile Verification", status: "pending" },
  { id: "template", label: "Reference Template & Design Comparison", status: "pending" },
  { id: "qr", label: "QR Code Localization & Payload Decoding", status: "pending" },
  { id: "cross_check", label: "Visible OCR vs QR Data Cross-Check", status: "pending" },
  { id: "integrity", label: "Error Level & Splicing Integrity Analysis", status: "pending" },
  { id: "report", label: "Forensic Report & Classification Generation", status: "pending" }
];

export const UploadVerification: React.FC<UploadProps> = ({ onNavigateReview }) => {
  const [steps, setSteps] = useState<StepItem[]>(DEFAULT_STEPS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [qualityResult, setQualityResult] = useState<QualityCheckResult | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [demoSamples, setDemoSamples] = useState<DemoSample[]>([]);

  useEffect(() => {
    async function fetchDemos() {
      try {
        const samples = await api.getDemoSamples();
        setDemoSamples(samples);
      } catch (err) {
        console.error("Failed to load demo samples", err);
      }
    }
    fetchDemos();
  }, []);

  const simulateStepProgress = async (stepIndex: number) => {
    setSteps((prev) =>
      prev.map((s, idx) => {
        if (idx < stepIndex) return { ...s, status: "completed" };
        if (idx === stepIndex) return { ...s, status: "running" };
        return { ...s, status: "pending" };
      })
    );
    await new Promise((r) => setTimeout(r, 220));
  };

  const handleFileSelected = async (file: File, docType: string) => {
    setIsProcessing(true);
    setVerificationResult(null);
    setSteps(DEFAULT_STEPS);

    try {
      // Step 1: Upload
      await simulateStepProgress(0);
      const uploadRes = await api.uploadDocument(docType, file);

      // Step 2: Quality check
      await simulateStepProgress(1);
      setQualityResult(uploadRes.quality_result);

      if (!uploadRes.quality_result.acceptable) {
        setSteps((prev) =>
          prev.map((s, idx) => (idx === 1 ? { ...s, status: "error" } : s))
        );
        setQualityModalOpen(true);
        setIsProcessing(false);
        return;
      }

      // Progress through visual stages
      for (let i = 2; i <= 8; i++) {
        await simulateStepProgress(i);
      }

      // Backend verification execution
      const processRes = await api.processDocument(uploadRes.document_id);
      const finalRecord = await api.getVerification(processRes.verification_id);

      await simulateStepProgress(9);
      setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      setVerificationResult(finalRecord);

      if (finalRecord.status === "LIKELY AUTHENTIC" || finalRecord.status === "VERIFIED") {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error("Processing error:", err);
      alert(err.message || "Document processing failed. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectDemo = async (sampleId: string) => {
    setIsProcessing(true);
    setVerificationResult(null);
    setSteps(DEFAULT_STEPS);

    try {
      await simulateStepProgress(0);
      await simulateStepProgress(1);

      const demoRes = await api.loadDemoSample(sampleId);

      if (!demoRes.quality_acceptable) {
        setQualityResult(demoRes.quality_result);
        setSteps((prev) =>
          prev.map((s, idx) => (idx === 1 ? { ...s, status: "error" } : s))
        );
        setQualityModalOpen(true);
        setIsProcessing(false);
        return;
      }

      for (let i = 2; i <= 8; i++) {
        await simulateStepProgress(i);
      }

      const finalRecord = await api.getVerification(demoRes.verification_id);
      await simulateStepProgress(9);
      setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
      setVerificationResult(finalRecord);

      if (finalRecord.status === "LIKELY AUTHENTIC" || finalRecord.status === "VERIFIED") {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error("Demo processing error:", err);
      alert(err.message || "Failed to execute demo scenario");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
          Identity Document Screening Terminal
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Perform multi-layered computer vision screening: image quality, perspective warp, OCR, QR analysis, reference template matching, and tamper detection.
        </p>
      </div>

      {/* 1-Click Demo Suite Selector */}
      {demoSamples.length > 0 && (
        <DemoDocumentSelector
          samples={demoSamples}
          onSelectSample={handleSelectDemo}
          isLoading={isProcessing}
        />
      )}

      {/* Document Uploader Card */}
      <DocumentUploader onFileSelected={handleFileSelected} isLoading={isProcessing} />

      {/* Live Processing Pipeline Timeline */}
      {isProcessing && <ProcessingTimeline steps={steps} />}

      {/* Verification Results Display */}
      {verificationResult && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Status Header Banner */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Final Automated Classification
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={verificationResult.status} size="lg" />
                <span className="text-xs text-slate-400 font-mono">
                  Document ID #{verificationResult.document_id}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigateReview(verificationResult.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <ScanEye className="w-4 h-4" />
                Inspect in Visual Reviewer
              </button>
            </div>
          </div>

          {/* Verification Screening Score & Breakdown */}
          <VerificationScoreCard result={verificationResult} />

          {/* Data Cross-Check Matrix (Visible vs QR) */}
          <CrossCheckTable items={verificationResult.cross_check_data} />

          {/* Validation Summary & Official Recommendation */}
          <ValidationNotes
            notes={verificationResult.validation_notes}
            recommendation={verificationResult.recommendation}
            authorizedStatus={verificationResult.authorized_verification_status}
            authorizedNotes={verificationResult.authorized_verification_notes}
          />

          {/* DigiLocker Official Verification & Registry Query */}
          <DigiLockerVerificationPanel
            result={verificationResult}
            onRefresh={async () => {
              const updated = await api.getVerification(verificationResult.id);
              setVerificationResult(updated);
            }}
          />
        </div>
      )}

      {/* Image Quality Rejection Modal */}
      <QualityModal
        isOpen={qualityModalOpen}
        result={qualityResult}
        onRetry={() => setQualityModalOpen(false)}
        onDismiss={() => setQualityModalOpen(false)}
      />
    </div>
  );
};
