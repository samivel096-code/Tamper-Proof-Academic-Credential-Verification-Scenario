import React from "react";
import { Check, AlertTriangle, X, HelpCircle, ShieldAlert } from "lucide-react";
import { CrossCheckItem } from "../types";

interface CrossCheckTableProps {
  items: CrossCheckItem[];
}

export const CrossCheckTable: React.FC<CrossCheckTableProps> = ({ items }) => {
  const hasMismatch = items.some((i) => i.result === "MISMATCH");

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Document Data Cross-Check Matrix
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-validation between visible OCR extracted values and decoded QR payload. Sensitive identifiers masked.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500">Privacy Masking: ACTIVE</div>
      </div>

      {/* Mismatch Alert Banner */}
      {hasMismatch && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 text-rose-200 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-rose-300 block text-sm">QR INFORMATION MISMATCH DETECTED</span>
            <p className="text-rose-200/90 leading-relaxed">
              The information encoded in the QR code does not match the corresponding visible document information. This indicates probable digital tampering, badge swapping, or payload substitution.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Field</th>
              <th className="py-3 px-4">Visible / OCR Value</th>
              <th className="py-3 px-4">Decoded QR Value</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((row, idx) => {
              const isMatch = row.result === "MATCH";
              const isPartial = row.result === "PARTIAL MATCH";
              const isMismatch = row.result === "MISMATCH";

              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isMismatch
                      ? "bg-rose-950/20 hover:bg-rose-950/30"
                      : "hover:bg-slate-800/30"
                  }`}
                >
                  <td className="py-3 px-4 font-semibold text-slate-200">{row.field}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {row.extracted_value || "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {row.reference_or_qr_value || "—"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isMatch ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                        <Check className="w-3 h-3" /> MATCH
                      </span>
                    ) : isPartial ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-3 h-3" /> PARTIAL MATCH
                      </span>
                    ) : isMismatch ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/50 text-rose-300 animate-pulse">
                        <X className="w-3 h-3" /> MISMATCH
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
                        <HelpCircle className="w-3 h-3" /> {row.result}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
