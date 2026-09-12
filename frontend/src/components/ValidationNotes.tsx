import React from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Info } from "lucide-react";

interface ValidationNotesProps {
  notes: string[];
  recommendation: string;
  authorizedStatus: string;
  authorizedNotes?: string;
}

export const ValidationNotes: React.FC<ValidationNotesProps> = ({
  notes,
  recommendation,
  authorizedStatus,
  authorizedNotes
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Validation Summary & Recommendations
        </h4>
        <div className="text-[11px] font-mono text-slate-500">Forensic Audit Trail</div>
      </div>

      {/* Bulleted validation notes */}
      <div className="space-y-2">
        {notes.map((note, idx) => {
          const isAlert = note.includes("WARNING:") || note.includes("INTEGRITY ALERT:") || note.includes("CRITICAL");
          const isCheck = note.includes("acceptable") || note.includes("verified") || note.includes("detected") || note.includes("Extracted");

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed ${
                isAlert
                  ? "bg-rose-950/20 border-rose-500/40 text-rose-200"
                  : isCheck
                  ? "bg-slate-950/60 border-slate-800 text-slate-300"
                  : "bg-slate-950/40 border-slate-850 text-slate-400"
              }`}
            >
              {isAlert ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : isCheck ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <span>{note}</span>
            </div>
          );
        })}
      </div>

      {/* Authoritative Provider Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-4 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-blue-300">Authorized Source Verification:</span>
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
              authorizedStatus === "VERIFIED" || authorizedStatus === "DEMO_CONFIRMED"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {authorizedStatus}
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          {authorizedNotes || "Official verification source unavailable. AI automated screening completed."}
        </p>
      </div>

      {/* Official Officer Recommendation */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Officer Recommendation
        </div>
        <p className="text-xs font-medium text-white leading-relaxed">{recommendation}</p>
      </div>

      {/* Mandatory Regulatory Disclaimer */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-300 block mb-0.5">CRITICAL LEGAL NOTICE:</span>
          Template and document checks evaluate visual design similarity only. Design matching alone does not establish legal authenticity. An authoritative government verification source is required to legally establish validity.
        </div>
      </div>
    </div>
  );
};
