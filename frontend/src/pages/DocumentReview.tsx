import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Send,
  Printer,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { api } from "../services/api";
import { VerificationResult, FlaggedRegion } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { VisualReviewViewer } from "../components/VisualReviewViewer";
import { TemplateComparisonView } from "../components/TemplateComparisonView";
import { CrossCheckTable } from "../components/CrossCheckTable";
import { VerificationScoreCard } from "../components/VerificationScoreCard";
import { ValidationNotes } from "../components/ValidationNotes";
import { DigiLockerVerificationPanel } from "../components/DigiLockerVerificationPanel";

interface DocumentReviewProps {
  verificationId: number;
  onBack: () => void;
}

export const DocumentReview: React.FC<DocumentReviewProps> = ({ verificationId, onBack }) => {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual_review" | "template_diff" | "cross_check">("visual_review");

  const loadRecord = async () => {
    try {
      const data = await api.getVerification(verificationId);
      setResult(data);
      if (data.review_notes) setDecisionNotes(data.review_notes);
    } catch (err) {
      console.error("Failed to load verification record", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [verificationId]);

  const handleDecision = async (status: string) => {
    if (!result) return;
    setSubmitting(true);
    try {
      await api.submitReview(result.id, status, decisionNotes);
      const updated = await api.getVerification(result.id);
      setResult(updated);
      alert(`Decision recorded successfully: ${status}`);
    } catch (err: any) {
      alert(err.message || "Failed to record review decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !result) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-xs text-slate-400 font-mono animate-pulse">
          Loading Document Forensic Dossier #{verificationId}...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                Document Review Dossier #{result.id}
              </h2>
              <StatusBadge status={result.status} size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Type: {result.document_type} | Filename: {result.original_filename} | Submitted: {new Date(result.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("visual_review")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === "visual_review"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          Visual Layer Inspector
        </button>
        <button
          onClick={() => setActiveTab("template_diff")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === "template_diff"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          Reference Template Diff
        </button>
        <button
          onClick={() => setActiveTab("cross_check")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === "cross_check"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          Data Cross-Check Matrix
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === "visual_review" && <VisualReviewViewer result={result} />}
      {activeTab === "template_diff" && <TemplateComparisonView result={result} />}
      {activeTab === "cross_check" && <CrossCheckTable items={result.cross_check_data} />}

      {/* Metrics & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationScoreCard result={result} />
        <ValidationNotes
          notes={result.validation_notes}
          recommendation={result.recommendation}
          authorizedStatus={result.authorized_verification_status}
          authorizedNotes={result.authorized_verification_notes}
        />
      </div>

      {/* DigiLocker Official Verification & Registry Query */}
      <DigiLockerVerificationPanel result={result} onRefresh={loadRecord} />

      {/* Officer Manual Decision Panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Authorized Officer Review & Attestation
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit your formal human-in-the-loop review decision. All officer actions are immutably logged to the audit trail.
            </p>
          </div>
          {result.review_status !== "PENDING" && (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Decision: {result.review_status}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Officer Inspection Notes / Justification:
          </label>
          <textarea
            rows={3}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder="Enter specific observations regarding image quality, QR mismatch, or reason for acceptance/rejection..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleDecision("REJECTED_FRAUD")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Flag as Altered / Fraudulent
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleDecision("REQUEST_RESCAN")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Request Rescan
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleDecision("ACCEPTED_VALID")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accept / Clear Document
          </button>
        </div>
      </div>
    </div>
  );
};
