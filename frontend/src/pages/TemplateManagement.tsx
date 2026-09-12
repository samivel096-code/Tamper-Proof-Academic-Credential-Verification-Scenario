import React, { useState, useEffect } from "react";
import { Plus, Check, X, Upload, FileCode2, ShieldAlert, Cpu, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { DocumentTemplate } from "../types";

export const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [learning, setLearning] = useState(false);

  // Form states
  const [docType, setDocType] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [issuingOrg, setIssuingOrg] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      await api.toggleTemplate(id);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to toggle template status");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleFile) {
      alert("Please upload a reference sample document.");
      return;
    }
    setLearning(true);
    try {
      const res = await api.uploadTemplateSample(docType, templateName, issuingOrg, sampleFile);
      alert(res.message || "Template created successfully.");
      setShowAddModal(false);
      setDocType("");
      setTemplateName("");
      setIssuingOrg("");
      setSampleFile(null);
      loadTemplates();
    } catch (err: any) {
      alert(err.message || "Failed to process reference template");
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-blue-400" />
            Document Template Management (Admin)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure reference document profiles, baseline dimensions, QR requirements, and automated layout learning.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Template & Learn Sample
        </button>
      </div>

      {/* Regulatory Notice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Authorized Reference Notice:</strong> Do not attempt to reproduce or infer secret government security features. Only configure reference layout characteristics legally approved for your agency.
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl border p-6 space-y-4 transition-all ${
              t.is_active
                ? "bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-xl"
                : "bg-slate-950/40 border-slate-900 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                  {t.version}
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">{t.document_type}</h3>
              </div>
              <button
                onClick={() => handleToggle(t.id)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  t.is_active
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {t.is_active ? "ACTIVE" : "DISABLED"}
              </button>
            </div>

            <p className="text-xs text-slate-400 font-medium">{t.name}</p>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Issuing Org:</span>
                <span className="text-white truncate max-w-[150px] text-right font-sans">
                  {t.issuing_organization}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Aspect Ratio:</span>
                <span className="text-white">{t.aspect_ratio}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>QR Required:</span>
                <span className={t.qr_required ? "text-emerald-400" : "text-slate-400"}>
                  {t.qr_required ? "YES" : "NO"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Regions Learned:</span>
                <span className="text-blue-400 font-bold">{t.regions?.length || 0}</span>
              </div>
            </div>

            {t.required_fields && t.required_fields.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Required Fields:
                </span>
                <div className="flex flex-wrap gap-1">
                  {t.required_fields.map((rf, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-medium"
                    >
                      {rf}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add & Learn Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Create Template Profile (Automated Learning)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Document Type Name</label>
                <input
                  type="text"
                  required
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="e.g. State Security ID"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Template Profile Name</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Official Identification Card v2"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Issuing Organization / Authority</label>
                <input
                  type="text"
                  required
                  value={issuingOrg}
                  onChange={(e) => setIssuingOrg(e.target.value)}
                  placeholder="e.g. Ministry of Interior"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Upload Reference Sample (JPG/PNG)</label>
                <input
                  type="file"
                  required
                  accept=".png,.jpg,.jpeg"
                  onChange={(e) => setSampleFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  System will run Perspective Warp, QR Localization, OCR Text Boundary Detection, and auto-learn expected regions.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={learning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {learning ? "Learning Template..." : "Run Template Learning Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
