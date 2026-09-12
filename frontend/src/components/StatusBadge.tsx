import React from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const norm = status.toUpperCase();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-3 py-1 text-xs font-bold gap-1.5",
    lg: "px-4 py-2 text-sm font-black gap-2"
  };

  if (norm.includes("VERIFIED") && !norm.includes("UNABLE")) {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 ${sizeClasses[size]}`}>
        <ShieldCheck className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />
        VERIFIED
      </span>
    );
  }

  if (norm.includes("LIKELY AUTHENTIC")) {
    return (
      <span className={`inline-flex items-center rounded-full bg-teal-500/15 border border-teal-500/40 text-teal-300 ${sizeClasses[size]}`}>
        <CheckCircle2 className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />
        LIKELY AUTHENTIC
      </span>
    );
  }

  if (norm.includes("SUSPICIOUS") || norm.includes("ALTERED")) {
    return (
      <span className={`inline-flex items-center rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 animate-pulse ${sizeClasses[size]}`}>
        <AlertTriangle className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />
        SUSPICIOUS / LIKELY ALTERED
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 ${sizeClasses[size]}`}>
      <HelpCircle className={size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5"} />
      UNABLE TO VERIFY
    </span>
  );
};
