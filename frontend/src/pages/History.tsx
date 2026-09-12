import React, { useState, useEffect } from "react";
import { Search, Filter, History as HistoryIcon, ArrowUpRight, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";

interface HistoryProps {
  onNavigateReview: (verificationId: number) => void;
}

export const History: React.FC<HistoryProps> = ({ onNavigateReview }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory({
        search: search || undefined,
        status_filter: statusFilter || undefined,
        doc_type: docTypeFilter || undefined
      });
      setItems(data.items || []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter, docTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-blue-400" />
            Verification History & Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete, immutable record of all document screenings, officer manual reviews, and automated verification scores.
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          Total Records: {items.length}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by filename or officer name..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="LIKELY AUTHENTIC">LIKELY AUTHENTIC</option>
              <option value="SUSPICIOUS / LIKELY ALTERED">SUSPICIOUS</option>
              <option value="UNABLE TO VERIFY">UNABLE TO VERIFY</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Type:</span>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="Aadhaar">Aadhaar</option>
              <option value="PAN Card">PAN Card</option>
              <option value="Driving Licence">Driving Licence</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Voter ID</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Officer</th>
                <th className="py-3.5 px-4">Document Type</th>
                <th className="py-3.5 px-4">Screening Result</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Template Match</th>
                <th className="py-3.5 px-4 text-center">Review Decision</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-mono">
                    Loading audit records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    No matching verification records found.
                  </td>
                </tr>
              ) : (
                items.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">#{r.verification_id}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 font-semibold">
                      {r.officer_name}
                      <span className="block text-[10px] text-slate-500 font-normal">{r.officer_role}</span>
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">{r.document_type}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {r.screening_score} / 100
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-blue-400 font-semibold">
                      {r.template_match_score} / 100
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.review_status === "ACCEPTED_VALID"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : r.review_status === "REJECTED_FRAUD"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {r.review_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateReview(r.verification_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] transition-colors"
                      >
                        Dossier <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
