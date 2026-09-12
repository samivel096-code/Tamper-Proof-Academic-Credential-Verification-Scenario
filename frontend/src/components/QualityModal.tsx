import React from "react";
import { AlertOctagon, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { QualityCheckResult } from "../types";

interface QualityModalProps {
  isOpen: boolean;
  result: QualityCheckResult | null;
  onRetry: () => void;
  onDismiss?: () => void;
}

export const QualityModal: React.FC<QualityModalProps> = ({
  isOpen,
  result,
  onRetry,
  onDismiss
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-slate-900 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">DOCUMENT NOT CLEAR</h3>
            <p className="text-xs text-rose-300/90 font-medium">
              The uploaded document is not sufficiently visible for reliable analysis.
            </p>
          </div>
        </div>

        {/* Reasons list */}
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-rose-300">Failure Reasons:</div>
          <ul className="space-y-1.5">
            {result.reasons.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-rose-200">
                <span className="text-rose-400 font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quality Criteria Checklist */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-300">Quality Checklist</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              {result.checklist.blur_acceptable ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className={result.checklist.blur_acceptable ? "text-slate-300" : "text-rose-300 font-medium"}>
                Blur acceptable
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result.checklist.resolution_sufficient ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className={result.checklist.resolution_sufficient ? "text-slate-300" : "text-rose-300 font-medium"}>
                Resolution sufficient
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result.checklist.lighting_acceptable ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className={result.checklist.lighting_acceptable ? "text-slate-300" : "text-rose-300 font-medium"}>
                Lighting acceptable
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result.checklist.document_visible ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span className={result.checklist.document_visible ? "text-slate-300" : "text-rose-300 font-medium"}>
                Document visible / not cropped
              </span>
            </div>
          </div>
        </div>

        {/* Guidance and Actions */}
        <p className="text-xs text-slate-400 text-center">
          Please upload a clear, complete, and well-lit image of the document without glare or reflections.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-500/25"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Upload Clear Image
          </button>
        </div>
      </div>
    </div>
  );
};
