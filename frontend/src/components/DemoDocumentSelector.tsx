import React from "react";
import { Sparkles, ShieldCheck, AlertTriangle, ImageOff, ArrowRight } from "lucide-react";
import { DemoSample } from "../types";

interface DemoSelectorProps {
  samples: DemoSample[];
  onSelectSample: (sampleId: string) => void;
  isLoading: boolean;
}

export const DemoDocumentSelector: React.FC<DemoSelectorProps> = ({
  samples,
  onSelectSample,
  isLoading
}) => {
  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            1-Click Demo Evaluation Suite
          </h4>
        </div>
        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/30">
          Instant Pre-loaded Scenarios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {samples.map((s) => {
          const isAuthentic = s.expected_result.includes("AUTHENTIC");
          const isBlurry = s.expected_result.includes("NOT CLEAR");
          const isSuspicious = s.expected_result.includes("SUSPICIOUS") || s.expected_result.includes("MISMATCH");

          return (
            <button
              key={s.id}
              disabled={isLoading}
              onClick={() => onSelectSample(s.id)}
              className="text-left rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 hover:border-blue-500/50 hover:bg-slate-850/80 transition-all space-y-2 group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {s.document_type}
                </span>
                {isAuthentic ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                ) : isBlurry ? (
                  <ImageOff className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>

              <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                {s.title}
              </div>

              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {s.description}
              </p>

              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span
                  className={`font-semibold ${
                    isAuthentic
                      ? "text-emerald-400"
                      : isBlurry
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {s.expected_result}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
