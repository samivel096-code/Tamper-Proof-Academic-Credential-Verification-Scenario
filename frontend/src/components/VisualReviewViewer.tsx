import React, { useState } from "react";
import {
  Eye,
  Scan,
  QrCode,
  Layers,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import { VerificationResult, FlaggedRegion } from "../types";

interface VisualReviewViewerProps {
  result: VerificationResult;
  onSelectIssue?: (region: FlaggedRegion) => void;
}

export const VisualReviewViewer: React.FC<VisualReviewViewerProps> = ({ result, onSelectIssue }) => {
  const [showOcrBoxes, setShowOcrBoxes] = useState(true);
  const [showQrBox, setShowQrBox] = useState(true);
  const [showTemplateOverlay, setShowTemplateOverlay] = useState(false);
  const [templateOpacity, setTemplateOpacity] = useState(0.45);
  const [showFlaggedRegions, setShowFlaggedRegions] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const imgSrc = result.normalized_image_url || result.original_image_url;
  const templateImgSrc = result.template_sample_url;

  const handleIssueClick = (region: FlaggedRegion) => {
    const id = region.id || `${region.x}_${region.y}`;
    setSelectedIssueId(id);
    if (onSelectIssue) onSelectIssue(region);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">
            Forensic Visual Reviewer & Overlay Canvas
          </h3>
          <p className="text-xs text-slate-400">
            Toggle inspection layers or click any flagged issue on the right to highlight its exact location.
          </p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-2 text-slate-300 font-semibold">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          onClick={() => setShowOcrBoxes(!showOcrBoxes)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showOcrBoxes
              ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scan className="w-3.5 h-3.5" />
          OCR Text Boxes
        </button>

        <button
          onClick={() => setShowQrBox(!showQrBox)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showQrBox
              ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          QR Region Box
        </button>

        <button
          onClick={() => setShowTemplateOverlay(!showTemplateOverlay)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showTemplateOverlay
              ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Template Overlay
        </button>

        {showTemplateOverlay && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400">
            <span>Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={templateOpacity}
              onChange={(e) => setTemplateOpacity(parseFloat(e.target.value))}
              className="w-20 accent-blue-500 cursor-pointer"
            />
            <span className="font-mono text-white">{Math.round(templateOpacity * 100)}%</span>
          </div>
        )}

        <button
          onClick={() => setShowFlaggedRegions(!showFlaggedRegions)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
            showFlaggedRegions
              ? "bg-rose-600/20 border-rose-500/50 text-rose-300"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Flagged Alterations ({result.flagged_regions.length})
        </button>
      </div>

      {/* Dual Screen: Left Canvas & Right Issue Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Document Canvas with Overlays (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex items-center justify-center overflow-auto min-h-[480px]">
          <div
            className="relative transition-transform duration-150 origin-center max-w-full"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Base Document Image */}
            <img
              src={imgSrc}
              alt="Uploaded Document"
              className="max-h-[500px] w-auto rounded-lg shadow-2xl border border-slate-800 object-contain block"
            />

            {/* Reference Template Overlay (when enabled) */}
            {showTemplateOverlay && templateImgSrc && (
              <img
                src={templateImgSrc}
                alt="Template Overlay"
                style={{ opacity: templateOpacity }}
                className="absolute inset-0 w-full h-full object-fill pointer-events-none rounded-lg mix-blend-screen"
              />
            )}

            {/* SVG Overlay for Bounding Boxes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {/* OCR Text Blocks Overlay */}
              {showOcrBoxes &&
                result.ocr_blocks &&
                result.ocr_blocks.map((blk, idx) => (
                  <g key={`ocr_${idx}`}>
                    <rect
                      x={`${blk.box.x * 100}%`}
                      y={`${blk.box.y * 100}%`}
                      width={`${blk.box.width * 100}%`}
                      height={`${blk.box.height * 100}%`}
                      fill="rgba(168, 85, 247, 0.12)"
                      stroke="#c084fc"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                  </g>
                ))}

              {/* QR Box Overlay */}
              {showQrBox && (
                <g>
                  <rect
                    x={`${(result.qr_box?.x ?? 0.72) * 100}%`}
                    y={`${(result.qr_box?.y ?? 0.30) * 100}%`}
                    width={`${(result.qr_box?.width ?? 0.22) * 100}%`}
                    height={`${(result.qr_box?.height ?? 0.34) * 100}%`}
                    fill="rgba(16, 185, 129, 0.15)"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={`${(result.qr_box?.x ?? 0.72) * 100}%`}
                    y={`${Math.max(4, ((result.qr_box?.y ?? 0.30) * 100) - 2)}%`}
                    fill="#10b981"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    QR Code Region
                  </text>
                </g>
              )}


              {/* Flagged Suspicious Regions */}
              {showFlaggedRegions &&
                result.flagged_regions.map((reg, idx) => {
                  const id = reg.id || `${reg.x}_${reg.y}`;
                  const isSelected = selectedIssueId === id;
                  return (
                    <g key={idx}>
                      <rect
                        x={`${reg.x * 100}%`}
                        y={`${reg.y * 100}%`}
                        width={`${reg.width * 100}%`}
                        height={`${reg.height * 100}%`}
                        fill={isSelected ? "rgba(244, 63, 94, 0.35)" : "rgba(244, 63, 94, 0.15)"}
                        stroke="#f43f5e"
                        strokeWidth={isSelected ? "3.5" : "2"}
                        className={isSelected ? "animate-pulse" : ""}
                      />
                      <text
                        x={`${reg.x * 100}%`}
                        y={`${Math.max(4, reg.y * 100 - 2)}%`}
                        fill="#f43f5e"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {reg.label}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>
        </div>

        {/* RIGHT: Analysis & Flagged Issues List (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inspection Flags & Issues
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click any issue below to illuminate the region on the left.
            </p>
          </div>

          {result.flagged_regions.length === 0 ? (
            <div className="p-6 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-400">No tampering indicators detected</p>
              <p className="text-[10px] text-slate-500">
                Document layout, font kerning, and ELA patterns appear consistent.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {result.flagged_regions.map((region, idx) => {
                const id = region.id || `${region.x}_${region.y}`;
                const isSelected = selectedIssueId === id;

                return (
                  <div
                    key={idx}
                    onClick={() => handleIssueClick(region)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/30 shadow-lg"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        {region.label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {region.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {region.description}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-blue-400 flex items-center justify-between">
                      <span>Coordinates: [{Math.round(region.x * 100)}%, {Math.round(region.y * 100)}%]</span>
                      <span className="underline">Click to Highlight</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
