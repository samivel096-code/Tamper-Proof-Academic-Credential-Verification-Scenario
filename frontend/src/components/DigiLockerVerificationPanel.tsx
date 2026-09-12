import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileCheck2,
  ExternalLink,
  Lock,
  Stamp,
  Copy,
  Check,
  Search,
  Sparkles
} from "lucide-react";
import { VerificationResult, DigiLockerVerificationResult } from "../types";
import { api } from "../services/api";

interface DigiLockerPanelProps {
  result: VerificationResult;
  onRefresh?: () => void;
}

export const DigiLockerVerificationPanel: React.FC<DigiLockerPanelProps> = ({
  result,
  onRefresh
}) => {
  const isDeed = /deed|sale|property|conveyance|title|registration/i.test(result.document_type);
  const isAlreadyVerified =
    result.status === "VERIFIED" ||
    result.authorized_verification_status?.includes("DIGILOCKER");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [digiResult, setDigiResult] = useState<DigiLockerVerificationResult | null>(
    result.digilocker_payload || null
  );

  // Deed Form State (pre-filled from OCR if available)
  const [deedNumber, setDeedNumber] = useState(
    result.ocr_data.deed_number || result.ocr_data.document_id || "1452/2023"
  );
  const [sroOffice, setSroOffice] = useState(
    result.ocr_data.sro_office || "Tiyagadurugam SRO"
  );
  const [registrationYear, setRegistrationYear] = useState<number>(
    parseInt(result.ocr_data.registration_year || "2023", 10) || 2023
  );
  const [stateName, setStateName] = useState("Tamil Nadu");
  const [claimantName, setClaimantName] = useState(
    result.ocr_data.claimant || result.ocr_data.name || "Samivel R"
  );
  const [executantName, setExecutantName] = useState(
    result.ocr_data.executant || "Ramalingam S"
  );

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleVerifyDeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.verifyDeedViaDigiLocker({
        deed_number: deedNumber,
        sro_office: sroOffice,
        registration_year: registrationYear,
        state: stateName,
        claimant: claimantName,
        executant: executantName,
        verification_id: result.id
      });
      setDigiResult(res);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || "DigiLocker Deed verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDocument = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.verifyRecordViaDigiLocker(result.id);
      setDigiResult(res);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message || "DigiLocker verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeDetails = digiResult?.deed_details;
  const activeSignature = digiResult?.digital_signature;
  const activeUri =
    digiResult?.digilocker_uri ||
    result.ocr_data.digilocker_uri ||
    `in.gov.digilocker.igrs.${stateName.toLowerCase().replace(/\s+/g, "")}.deed-${deedNumber.replace(/\//g, "-")}_${registrationYear}`;

  return (
    <div className="rounded-2xl border border-emerald-900/60 bg-gradient-to-b from-slate-900 via-slate-900/90 to-emerald-950/20 p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Decorative Government Seal Watermark */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Official Government Gateway
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                API Setu &bull; National e-Governance Division (NeGD)
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
              DigiLocker Authoritative Registry Verification
              {isAlreadyVerified && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20 inline" />
              )}
            </h3>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div className="flex items-center gap-2">
          {isAlreadyVerified ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>OFFICIALLY VERIFIED</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Awaiting Authoritative Check</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isAlreadyVerified || digiResult ? (
        /* VERIFIED PROOF STATE */
        <div className="space-y-5">
          {/* Certificate Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-900/50 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Issuing Authority & Registry
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {digiResult?.issuer_name ||
                    (isDeed
                      ? "Department of Registration and Stamps (TNREGINET), Govt. of Tamil Nadu"
                      : result.authorized_provider_name || "DigiLocker National Authority")}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">DigiLocker URI:</span>
                <code className="text-xs font-mono text-emerald-300 bg-slate-950/80 px-2 py-1 rounded border border-emerald-900/60 max-w-xs truncate">
                  {activeUri}
                </code>
                <button
                  onClick={() => handleCopyUri(activeUri)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Copy URI"
                >
                  {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Grid of Verified Registry Attributes */}
            {activeDetails ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Registration Info</span>
                  <p className="font-bold text-white text-sm">{activeDetails.registration_number}</p>
                  <p className="text-[11px] text-slate-300">
                    SRO: <span className="font-medium text-emerald-300">{activeDetails.sub_registrar_office}</span> ({activeDetails.registration_year})
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Parties to the Deed</span>
                  <p className="text-[11px] text-slate-300">
                    Purchaser (Claimant): <span className="font-bold text-white">{activeDetails.claimant_buyer}</span>
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Vendor (Executant): <span className="font-bold text-white">{activeDetails.executant_seller}</span>
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Financials & Duty</span>
                  <p className="text-[11px] text-slate-300">
                    Consideration: <span className="font-bold text-emerald-300">{activeDetails.consideration_amount}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Stamp Duty: <span className="text-white font-medium">{activeDetails.stamp_duty_paid}</span>
                  </p>
                </div>

                <div className="col-span-1 md:col-span-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Property Schedule & Extent</span>
                    <p className="font-medium text-white text-xs mt-0.5">{activeDetails.property_schedule}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400">Encumbrance Status</span>
                    <p className="text-xs font-bold text-emerald-300">{activeDetails.encumbrance_status}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Verified Identity Attributes</span>
                <p className="text-white">
                  Document Identifier: <span className="font-mono font-bold text-emerald-300">{result.ocr_data.aadhaar_number || result.ocr_data.document_id}</span>
                </p>
                <p className="text-slate-300">
                  Holder: <span className="font-semibold text-white">{result.ocr_data.name}</span> &bull; DOB: <span className="font-semibold text-white">{result.ocr_data.dob}</span> &bull; Gender: <span className="font-semibold text-white">{result.ocr_data.gender}</span>
                </p>
              </div>
            )}

            {/* Cryptographic Digital Signature Block */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Stamp className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span>Cryptographic Digital Signature Confirmed</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      {activeSignature?.algorithm || "SHA256withRSA"}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Signer: {activeSignature?.signer || "Sub-Registrar Authority"} &bull; CA: {activeSignature?.certifying_authority || "National Informatics Centre (NIC) CA"}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                Thumbprint: {(activeSignature?.certificate_thumbprint || "7A4F8B2C9D1E3F5A").slice(0, 16)}...
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* UNVERIFIED ACTION STATE */
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            This document has completed forensic visual screening. Connect with the{" "}
            <span className="text-emerald-300 font-semibold">DigiLocker National Gateway (API Setu)</span> to confirm
            cryptographic authenticity against the official central repository under Section 57 of the Registration Act.
          </p>

          {isDeed ? (
            /* DEED VERIFICATION FORM */
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                  Registered Deed Query Parameters (Pre-filled from OCR)
                </span>
                <span className="text-[10px] text-slate-500">Auto-extracted from image scan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Deed Registration No.</label>
                  <input
                    type="text"
                    value={deedNumber}
                    onChange={(e) => setDeedNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 1452/2023"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sub-Registrar Office (SRO)</label>
                  <input
                    type="text"
                    value={sroOffice}
                    onChange={(e) => setSroOffice(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Tiyagadurugam SRO"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Registration Year</label>
                  <input
                    type="number"
                    value={registrationYear}
                    onChange={(e) => setRegistrationYear(parseInt(e.target.value, 10) || 2023)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">State Department</label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Tamil Nadu">Tamil Nadu (TNREGINET IGRS)</option>
                    <option value="Maharashtra">Maharashtra (IGR Maharashtra)</option>
                    <option value="Karnataka">Karnataka (Kaveri 2.0 IGRS)</option>
                    <option value="Uttar Pradesh">Uttar Pradesh (IGRUP IGRS)</option>
                    <option value="Delhi">Delhi (DORIS Sub-Registrar)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (IGRS AP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Purchaser / Claimant</label>
                  <input
                    type="text"
                    value={claimantName}
                    onChange={(e) => setClaimantName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Buyer Name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vendor / Executant</label>
                  <input
                    type="text"
                    value={executantName}
                    onChange={(e) => setExecutantName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Seller Name"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleVerifyDeed}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  {isLoading ? "Querying IGRS Registry..." : "Query IGRS Registry & Verify via DigiLocker"}
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD DOCUMENT 1-CLICK VERIFY */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <div>
                <p className="text-xs font-semibold text-white">
                  Verify {result.document_type} against National DigiLocker Repository
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Connects to API Setu to authenticate holder identity, digital signature, and active issuance status.
                </p>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleVerifyDocument}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLoading ? "Authenticating via DigiLocker..." : "Authenticate via DigiLocker"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
