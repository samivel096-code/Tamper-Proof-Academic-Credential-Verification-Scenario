import React, { useState } from "react";
import { SlidersHorizontal, ArrowLeftRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { VerificationResult } from "../types";

interface TemplateComparisonProps {
  result: VerificationResult;
}

export const TemplateComparisonView: React.FC<TemplateComparisonProps> = ({ result }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<"side_by_side" | "split_slider">("side_by_side");

  const uploadedImg = result.normalized_image_url || result.original_image_url;
  const referenceImg = result.template_sample_url || uploadedImg;
  const tmScore = result.template_match_score;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">
            Side-by-Side Reference Template Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Compare layout geometry, emblem positions, and field alignment directly against the authorized reference template.
          </p>
        </div>

        {/* View Mode Switcher & Score */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-blue-600/15 border border-blue-500/30 text-xs font-mono font-bold text-blue-300">
            Template Match: {tmScore} / 100
          </div>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode("side_by_side")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "side_by_side" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode("split_slider")}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === "split_slider" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              Split Slider
            </button>
          </div>
        </div>
      </div>

      {viewMode === "side_by_side" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reference Sample */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-850">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                REFERENCE TEMPLATE (AUTHORIZED)
              </span>
              <span className="font-mono text-slate-500 text-[11px]">Baseline Specification</span>
            </div>
            <div className="flex items-center justify-center p-2 min-h-[340px]">
              <img
                src={referenceImg}
                alt="Reference Sample"
                className="max-h-[320px] w-auto rounded-lg shadow-xl border border-slate-800 object-contain"
              />
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Configured Dimensions: 1050x660 px | Aspect Ratio: 1.59
            </div>
          </div>

          {/* Uploaded Document */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-850">
              <span className="font-bold text-blue-400 flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4" />
                UPLOADED DOCUMENT (NORMALIZED)
              </span>
              <span className="font-mono text-slate-500 text-[11px]">Live Screening Input</span>
            </div>
            <div className="flex items-center justify-center p-2 min-h-[340px]">
              <img
                src={uploadedImg}
                alt="Uploaded Document"
                className="max-h-[320px] w-auto rounded-lg shadow-xl border border-slate-800 object-contain"
              />
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Geometric Similarity: {tmScore}% Alignment
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Split Slider Overlay */
        <div className="space-y-3">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-800 select-none">
            {/* Background: Uploaded Document */}
            <img src={uploadedImg} alt="Uploaded Document" className="w-full h-auto block" />

            {/* Foreground: Reference Template clipped by slider */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-blue-500 shadow-2xl"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src={referenceImg}
                alt="Reference Template"
                className="absolute top-0 left-0 max-w-none w-full h-full object-fill"
              />
            </div>

            {/* Labels */}
            <div className="absolute top-3 left-3 bg-slate-950/80 px-2 py-1 rounded text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Reference
            </div>
            <div className="absolute top-3 right-3 bg-slate-950/80 px-2 py-1 rounded text-[10px] font-bold text-blue-300 border border-blue-500/30">
              Uploaded
            </div>
          </div>

          {/* Slider input */}
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto pt-2">
            <span className="text-xs text-slate-400">Drag to compare alignment:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(parseInt(e.target.value))}
              className="w-48 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-white">{sliderPosition}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
