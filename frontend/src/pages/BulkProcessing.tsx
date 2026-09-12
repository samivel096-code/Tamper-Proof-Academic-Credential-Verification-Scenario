import React, { useState } from "react";
import { Files, Upload, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Loader2, Filter } from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";

interface BulkProcessingProps {
  onNavigateReview: (verificationId: number) => void;
}

interface BatchItem {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  resultStatus?: string;
  screeningScore?: number;
  verificationId?: number;
  error?: string;
}

export const BulkProcessing: React.FC<BulkProcessingProps> = ({ onNavigateReview }) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterNeedsReviewOnly, setFilterNeedsReviewOnly] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: BatchItem[] = Array.from(e.target.files).map((f) => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      status: "pending"
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleStartBatch = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "completed") continue;

      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
      );

      try {
        // Run demo Aadhaar or PAN pipeline for simulation
        const demoRes = await api.loadDemoSample(
          i % 4 === 1
            ? "sample_aadhaar_qr_mismatch"
            : i % 4 === 2
            ? "sample_pan_tampered"
            : i % 4 === 3
            ? "sample_blurry_rejected"
            : "sample_aadhaar_authentic"
        );

        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "completed",
                  resultStatus: demoRes.status,
                  screeningScore: demoRes.screening_score,
                  verificationId: demoRes.verification_id
                }
              : item
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "error",
                  error: err.message || "Failed"
                }
              : item
          )
        );
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setIsProcessing(false);
  };

  // Metrics
  const total = items.length;
  const processed = items.filter((i) => i.status === "completed").length;
  const verified = items.filter((i) => i.resultStatus?.includes("VERIFIED")).length;
  const likelyAuthentic = items.filter((i) => i.resultStatus?.includes("LIKELY AUTHENTIC")).length;
  const suspicious = items.filter((i) => i.resultStatus?.includes("SUSPICIOUS")).length;
  const unable = items.filter((i) => i.resultStatus?.includes("UNABLE")).length;

  const displayItems = filterNeedsReviewOnly
    ? items.filter((i) => i.resultStatus?.includes("SUSPICIOUS") || i.resultStatus?.includes("UNABLE"))
    : items;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <Files className="w-6 h-6 text-blue-400" />
            Bulk Document Batch Screening
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ingest up to 50 identity documents simultaneously. Queue automated pipelines and triage exceptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Add Batch Documents
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFiles}
              className="hidden"
            />
          </label>

          <button
            onClick={handleStartBatch}
            disabled={isProcessing || items.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Files className="w-3.5 h-3.5" />}
            {isProcessing ? `Processing ${processed}/${total}...` : "Process Entire Queue"}
          </button>
        </div>
      </div>

      {/* Batch Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Queue Total</div>
          <div className="text-2xl font-bold text-white font-mono">{total}</div>
        </div>
        <div className="rounded-xl border border-teal-500/20 bg-teal-950/10 p-4 space-y-1">
          <div className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider">Likely Authentic</div>
          <div className="text-2xl font-bold text-teal-300 font-mono">{likelyAuthentic}</div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/15 p-4 space-y-1">
          <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Suspicious</div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{suspicious}</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-1">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Unable to Verify</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{unable}</div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/15 p-4 space-y-1">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-bold text-blue-300 font-mono">{processed} / {total}</div>
        </div>
      </div>

      {/* Batch Queue Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Queue Processing Monitor ({displayItems.length} Items)
          </h3>
          <button
            onClick={() => setFilterNeedsReviewOnly(!filterNeedsReviewOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              filterNeedsReviewOnly
                ? "bg-rose-600/20 border-rose-500/50 text-rose-300"
                : "border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterNeedsReviewOnly ? "Showing Flagged Only" : "Filter: Needs Review Only"}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Files className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs font-medium text-slate-400">Queue is empty</p>
            <p className="text-[11px] text-slate-500">
              Click &quot;Add Batch Documents&quot; to upload multiple IDs for concurrent automated screening.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">File Name</th>
                  <th className="py-3 px-3">Queue Status</th>
                  <th className="py-3 px-3">Classification</th>
                  <th className="py-3 px-3 text-right">Score</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-medium text-white max-w-[200px] truncate">{item.name}</td>
                    <td className="py-3 px-3">
                      {item.status === "completed" ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Done
                        </span>
                      ) : item.status === "processing" ? (
                        <span className="text-blue-400 font-semibold flex items-center gap-1 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin" /> Screening...
                        </span>
                      ) : (
                        <span className="text-slate-500">Queued</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {item.resultStatus ? (
                        <StatusBadge status={item.resultStatus} size="sm" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                      {item.screeningScore !== undefined ? `${item.screeningScore} / 100` : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.verificationId ? (
                        <button
                          onClick={() => onNavigateReview(item.verificationId!)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
