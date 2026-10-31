"use client";

import React from "react";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  const btnLabel = action?.label || actionLabel;
  const btnClick = action?.onClick || onAction;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 bg-[#F5F2FC] rounded-xl flex items-center justify-center mb-3 border border-[#E8E3F3]">
        {icon || <InboxIcon className="w-6 h-6 text-[#7439D5]" />}
      </div>
      <h3 className="text-sm font-bold text-[#202044] mb-1">{title}</h3>
      <p className="text-xs text-[#77758A] max-w-sm mb-4 leading-relaxed">{description}</p>
      {btnLabel && btnClick && (
        <button
          onClick={btnClick}
          className="h-8 px-4 bg-[#7439D5] text-white rounded-lg font-semibold text-xs hover:bg-[#602BB7] transition-colors shadow-xs"
        >
          {btnLabel}
        </button>
      )}
    </div>
  );
}
