import React from "react";
import {
  LayoutDashboard,
  FileCheck2,
  ScanEye,
  Files,
  History,
  FileCode2,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export type NavTab = "dashboard" | "upload" | "review" | "bulk" | "history" | "templates";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "upload", label: "Screen Document", icon: FileCheck2 },
    { id: "review", label: "Visual Review", icon: ScanEye },
    { id: "bulk", label: "Bulk Processing", icon: Files },
    { id: "history", label: "Audit History", icon: History }
  ];

  // Admin-only template management
  if (user?.role === "ADMIN") {
    navItems.push({ id: "templates", label: "Template Profiles", icon: FileCode2 });
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col justify-between py-6 px-3">
      <nav className="space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavTab)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Security Status Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
          <ShieldCheck className="w-4 h-4" />
          Tamper Defense Active
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Screening uses multi-vector analysis: Design similarity != Authenticity. Authorized confirmation required for full validation.
        </p>
      </div>
    </aside>
  );
};
