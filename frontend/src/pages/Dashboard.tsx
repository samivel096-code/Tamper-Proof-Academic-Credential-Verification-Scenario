import React, { useEffect, useState } from "react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  BarChart3,
  PieChart,
  QrCode
} from "lucide-react";
import { api } from "../services/api";
import { DashboardStats } from "../types";
import { StatusBadge } from "../components/StatusBadge";

interface DashboardProps {
  onNavigateReview: (verificationId: number) => void;
  onNavigateUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateReview, onNavigateUpload }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Failed to load dashboard metrics", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-xs text-slate-400 font-mono animate-pulse">
          Loading Document Screening Metrics...
        </div>
      </div>
    );
  }

  // Helper values for charts
  const maxDaily = Math.max(1, ...stats.daily_processing.map((d) => d.count));
  const docTypeEntries = Object.entries(stats.document_types_distribution);
  const totalDocTypes = docTypeEntries.reduce((acc, [, v]) => acc + v, 0) || 1;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
            Document Verification Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time automated screening metrics, cross-validation integrity, and flagged document reviews.
          </p>
        </div>
        <button
          onClick={onNavigateUpload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all self-start cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Screen New Document
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Documents
          </div>
          <div className="text-2xl font-bold text-white font-mono">{stats.total_documents}</div>
          <div className="text-[10px] text-slate-500">All submissions</div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Processed
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{stats.processed}</div>
          <div className="text-[10px] text-slate-500">Pipeline completed</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Verified
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{stats.verified}</div>
          <div className="text-[10px] text-slate-500">Authoritative match</div>
        </div>

        <div className="rounded-2xl border border-teal-500/20 bg-teal-950/10 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-400">
            Likely Authentic
          </div>
          <div className="text-2xl font-bold text-teal-300 font-mono">{stats.likely_authentic}</div>
          <div className="text-[10px] text-slate-500">Design consistent</div>
        </div>

        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/15 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
            Suspicious
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{stats.suspicious}</div>
          <div className="text-[10px] text-rose-400/80">Tamper flags detected</div>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Unable to Verify
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{stats.unable_to_verify}</div>
          <div className="text-[10px] text-slate-500">Quality / OCR failure</div>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/15 p-4 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
            Needs Review
          </div>
          <div className="text-2xl font-bold text-purple-300 font-mono">{stats.needs_review}</div>
          <div className="text-[10px] text-purple-400/80">Pending officer decision</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Processing Trend (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Daily Document Processing (Past 7 Days)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Volume Tracker</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
            {stats.daily_processing.map((d, idx) => {
              const heightPct = Math.max(12, Math.round((d.count / maxDaily) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="text-[11px] font-mono text-slate-400 font-semibold">
                    {d.count}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[42px] bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-lg transition-all hover:brightness-110 shadow-lg shadow-blue-500/10"
                  />
                  <div className="text-[10px] font-mono text-slate-500">{d.date}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verification Results Distribution (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Verification Outcomes
            </h3>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Likely Authentic</span>
                <span className="font-mono text-teal-400 font-bold">
                  {stats.likely_authentic}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round((stats.likely_authentic / (stats.processed || 1)) * 100)}%`
                  }}
                  className="h-full bg-teal-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Verified (Official)</span>
                <span className="font-mono text-emerald-400 font-bold">{stats.verified}</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round((stats.verified / (stats.processed || 1)) * 100)}%`
                  }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Suspicious / Altered</span>
                <span className="font-mono text-rose-400 font-bold">{stats.suspicious}</span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round((stats.suspicious / (stats.processed || 1)) * 100)}%`
                  }}
                  className="h-full bg-rose-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Unable to Verify</span>
                <span className="font-mono text-amber-400 font-bold">
                  {stats.unable_to_verify}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden">
                <div
                  style={{
                    width: `${Math.round((stats.unable_to_verify / (stats.processed || 1)) * 100)}%`
                  }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Distribution: Document Types & QR Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Types */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Document Type Breakdown
          </h3>
          <div className="space-y-3">
            {docTypeEntries.map(([t, count], idx) => {
              const pct = Math.round((count / totalDocTypes) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{t}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Verification Analysis */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              QR Verification Results
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-center space-y-1">
              <div className="text-[11px] text-slate-400">Valid & Matched</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">
                {stats.qr_results_distribution["Valid & Matched"] || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-center space-y-1">
              <div className="text-[11px] text-slate-400">Payload Mismatch</div>
              <div className="text-xl font-bold text-rose-400 font-mono">
                {stats.qr_results_distribution["Mismatch Detected"] || 0}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-center space-y-1">
              <div className="text-[11px] text-slate-400">Missing / Defective</div>
              <div className="text-xl font-bold text-amber-400 font-mono">
                {stats.qr_results_distribution["Missing / Unreadable"] || 0}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Note: QR code decoding alone is never treated as conclusive authenticity proof; cryptographic cross-reference with visible text is required.
          </p>
        </div>
      </div>

      {/* Recent Verifications Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Recent Screening Records
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Real-time Feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Doc Type</th>
                <th className="py-3 px-3">Filename</th>
                <th className="py-3 px-3">Officer</th>
                <th className="py-3 px-3">Screening Status</th>
                <th className="py-3 px-3 text-right">Score</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.recent_verifications.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{r.document_type}</td>
                  <td className="py-3 px-3 font-mono text-slate-400 max-w-[180px] truncate">
                    {r.original_filename}
                  </td>
                  <td className="py-3 px-3 text-slate-300">{r.officer_name}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                    {r.screening_score} / 100
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onNavigateReview(r.verification_id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Inspect <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
