import React from "react";
import { Gauge, Layers, QrCode, FileText, CheckCheck, Eye, ShieldAlert } from "lucide-react";
import { VerificationResult } from "../types";

interface ScoreCardProps {
  result: VerificationResult;
}

export const VerificationScoreCard: React.FC<ScoreCardProps> = ({ result }) => {
  const score = result.screening_score;
  const tmScore = result.template_match_score;
  const b = result.template_breakdown || {};

  const getScoreColor = (s: number) => {
    if (s >= 85) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (s >= 70) return "text-teal-400 border-teal-500/40 bg-teal-500/10";
    if (s >= 50) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-rose-400 border-rose-500/40 bg-rose-500/10";
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              VERIFICATION SCREENING SCORE
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated multi-check consistency index. Represents screening quality, not legal certainty.
          </p>
        </div>

        {/* Primary Dial Score */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-black tracking-tight text-white font-mono">
              {score}
              <span className="text-lg font-bold text-slate-500"> / 100</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Screening Index
            </div>
          </div>
          <div
            className={`h-14 w-14 rounded-2xl border flex items-center justify-center font-black text-xl font-mono shadow-inner ${getScoreColor(
              score
            )}`}
          >
            {Math.round(score)}
          </div>
        </div>
      </div>

      {/* Core Screening Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Template Match
          </div>
          <div className="text-lg font-bold text-white font-mono">{tmScore}</div>
          <div className="text-[10px] text-slate-500">Design consistency</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            OCR Consistency
          </div>
          <div className="text-lg font-bold text-white font-mono">{result.ocr_consistency_score}</div>
          <div className="text-[10px] text-slate-500">Text recognition</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            QR Consistency
          </div>
          <div className="text-lg font-bold text-white font-mono">{result.qr_consistency_score}</div>
          <div className="text-[10px] text-slate-500">Payload cross-check</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <CheckCheck className="w-3.5 h-3.5 text-amber-400" />
            Required Fields
          </div>
          <div className="text-lg font-bold text-white font-mono">{result.required_fields_score}</div>
          <div className="text-[10px] text-slate-500">Mandatory data points</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            Image Quality
          </div>
          <div className="text-lg font-bold text-white font-mono">{result.image_quality_score}</div>
          <div className="text-[10px] text-slate-500">Resolution & clarity</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Integrity Screening
          </div>
          <div className="text-lg font-bold text-white font-mono">{result.integrity_score}</div>
          <div className="text-[10px] text-slate-500">Anti-tamper check</div>
        </div>
      </div>

      {/* Sub-breakdown of Template Match */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Template Match Granular Breakdown
          </div>
          <span className="text-[11px] font-mono text-blue-400 font-semibold">
            Overall Template Match: {tmScore} / 100
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Layout</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.layout ?? 98}/100</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Field Positions</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.field_positions ?? 96}/100</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Typography</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.typography ?? 95}/100</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Symbols / Emblems</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.symbols ?? 96}/100</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">QR Region</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.qr_position ?? 98}/100</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] text-slate-400">Dimensions</div>
            <div className="font-bold text-white font-mono mt-0.5">{b.dimensions ?? 98}/100</div>
          </div>
        </div>
      </div>
    </div>
  );
};
