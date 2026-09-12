import React, { useState, useEffect } from "react";
import {
  Building2,
  Shield,
  Key,
  Globe,
  CheckCircle2,
  X,
  RefreshCw,
  Server,
  Layers,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { DigiLockerStatus } from "../types";
import { api } from "../services/api";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DigiLockerConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [statusData, setStatusData] = useState<DigiLockerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form inputs
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [mode, setMode] = useState<"live" | "sandbox">("sandbox");
  const [baseUrl, setBaseUrl] = useState("https://apisetu.gov.in/api/v1");

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDigiLockerStatus();
      setStatusData(data);
      setMode(data.mode);
      setBaseUrl(data.base_url);
    } catch (err: any) {
      setError(err.message || "Failed to load DigiLocker status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await api.updateDigiLockerConfig({
        api_key: apiKey || undefined,
        client_id: clientId || undefined,
        client_secret: clientSecret || undefined,
        base_url: baseUrl,
        mode: mode
      });
      setSaveSuccess(true);
      await loadStatus();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight flex items-center gap-2">
                DigiLocker & API Setu Gateway Settings
              </h3>
              <p className="text-xs text-slate-400">
                Configure National e-Governance Division (NeGD) API connectivity & state registry routing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Configuration saved! Gateway state updated.</span>
          </div>
        )}

        {/* Live Status Overview Card */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Gateway Status & Routing
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                statusData?.mode === "live"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
              }`}
            >
              {statusData?.mode === "live" ? "Live API Setu Mode" : "Sandbox Simulator Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 text-[11px]">Provider:</span>
              <p className="font-semibold text-white mt-0.5 truncate">{statusData?.provider || "DigiLocker NeGD"}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[11px]">Endpoint:</span>
              <p className="font-mono text-slate-300 text-[11px] mt-0.5 truncate">{statusData?.base_url}</p>
            </div>
          </div>

          {/* Supported Registries Badges */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
              Connected State Registries (Deeds & Civil Records):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(statusData?.supported_registries || [
                "IGRS Tamil Nadu",
                "IGRS Maharashtra",
                "IGRS Karnataka",
                "IGRS Uttar Pradesh",
                "DORIS Delhi",
                "UIDAI Aadhaar"
              ]).map((reg, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-medium"
                >
                  {reg}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Gateway Operating Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "live" | "sandbox")}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="sandbox">Sandbox Engine (Full Offline Verification & IGRS Mock)</option>
                <option value="live">Live API Setu Gateway (Production / Sandbox Key)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Sandbox mode validates Deed parameters, generates cryptographic certificates, and enables full testing.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">API Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                placeholder="https://apisetu.gov.in/api/v1"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              API Setu / DigiLocker Requester Credentials
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  placeholder="e.g. in.gov.screening.app"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  placeholder="••••••••••••••••"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">X-APISETU-APIKEY</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                  placeholder="Enter API Setu subscription key..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={loadStatus}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Status
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
