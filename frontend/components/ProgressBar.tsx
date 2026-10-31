"use client";

import React from "react";

interface ProgressBarProps {
  progress: number;
  stepText?: string;
  currentStep?: string;
}

const steps = [
  "Reading your file",
  "Finding requirements",
  "Checking for conflicts",
  "Designing architecture",
  "Validating",
];

export function ProgressBar({ progress, stepText, currentStep }: ProgressBarProps) {
  const label = currentStep || stepText || "Processing...";
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-[var(--text-muted)]">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-3 bg-purple-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #7C3AED, #A78BFA, #7C3AED)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s linear infinite",
          }}
        />
      </div>
      <div className="flex justify-between">
        {steps.map((step, i) => {
          const stepProgress = ((i + 1) / steps.length) * 100;
          const isActive = progress >= stepProgress - 20;
          const isComplete = progress >= stepProgress;
          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  isComplete
                    ? "bg-[var(--sidebar-active)] border-[var(--sidebar-active)]"
                    : isActive
                    ? "bg-white border-[var(--sidebar-active)]"
                    : "bg-white border-gray-300"
                }`}
              />
              <span
                className={`text-xs text-center max-w-[80px] ${
                  isActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
