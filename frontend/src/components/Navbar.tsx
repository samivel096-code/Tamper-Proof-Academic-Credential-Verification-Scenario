import React, { useState } from "react";
import { Shield, LogOut, UserCheck, ShieldAlert, Cpu, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";
import { DigiLockerConfigModal } from "./DigiLockerConfigModal";

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const [showDigiConfig, setShowDigiConfig] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Brand & System Designation */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white uppercase">
                  AI Fake Identity & Document Screening System
                </h1>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  OFFICIAL v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authorized Forensic Document Screening & Verification Engine
              </p>
            </div>
          </div>

          {/* User Identity & Switcher */}
          {user && (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* DigiLocker Gateway Button */}
              <button
                onClick={() => setShowDigiConfig(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-all text-xs font-semibold shadow-sm cursor-pointer"
                title="DigiLocker & API Setu Gateway Status"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">DigiLocker Gateway</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              {/* Quick Demo Role Switcher for seamless evaluation */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
                <span className="text-[11px] text-slate-500 px-2 font-medium">Role:</span>
                {(["OFFICER", "ADMIN", "REVIEWER", "VIEWER"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => switchDemoRole(r)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      user.role === r
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Officer Profile Badge */}
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white">{user.full_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 font-bold text-xs">
                  {user.role[0]}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* DigiLocker Gateway Config Modal */}
      <DigiLockerConfigModal
        isOpen={showDigiConfig}
        onClose={() => setShowDigiConfig(false)}
      />
    </>
  );
};

