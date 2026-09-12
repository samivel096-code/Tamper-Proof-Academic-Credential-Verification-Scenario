import React from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface StepItem {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
}

interface ProcessingTimelineProps {
  steps: StepItem[];
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({ steps }) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Forensic Screening Pipeline
        </h4>
        <span className="text-[11px] font-mono text-blue-400 font-semibold">
          {steps.filter((s) => s.status === "completed").length} / {steps.length} Steps
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const isDone = step.status === "completed";
          const isRunning = step.status === "running";
          const isError = step.status === "error";

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                isDone
                  ? "bg-slate-950/80 border-slate-800 text-slate-200"
                  : isRunning
                  ? "bg-blue-600/10 border-blue-500/40 text-blue-300 animate-pulse shadow-sm"
                  : isError
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                  : "bg-slate-950/40 border-slate-850 text-slate-500"
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isRunning ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                ) : isError ? (
                  <Circle className="w-4 h-4 text-rose-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </div>
              <div className="truncate font-medium">
                <span className="font-mono text-[10px] text-slate-500 mr-1.5">{idx + 1}.</span>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
