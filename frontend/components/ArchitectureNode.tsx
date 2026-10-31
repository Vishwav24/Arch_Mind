"use client";

import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Globe,
  Server,
  Database,
  Layers,
  Zap,
  ExternalLink,
  Shield,
  Cpu,
} from "lucide-react";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bgHeader: string; border: string; text: string }
> = {
  frontend: {
    label: "Frontend",
    icon: Globe,
    bgHeader: "bg-blue-600",
    border: "border-blue-400",
    text: "text-blue-700",
  },
  service: {
    label: "Service",
    icon: Server,
    bgHeader: "bg-purple-600",
    border: "border-purple-400",
    text: "text-purple-700",
  },
  database: {
    label: "Database",
    icon: Database,
    bgHeader: "bg-emerald-600",
    border: "border-emerald-400",
    text: "text-emerald-700",
  },
  queue: {
    label: "Queue",
    icon: Layers,
    bgHeader: "bg-amber-600",
    border: "border-amber-400",
    text: "text-amber-700",
  },
  cache: {
    label: "Cache",
    icon: Zap,
    bgHeader: "bg-yellow-500",
    border: "border-yellow-400",
    text: "text-yellow-700",
  },
  external: {
    label: "External",
    icon: ExternalLink,
    bgHeader: "bg-slate-600",
    border: "border-slate-400",
    text: "text-slate-700",
  },
  security: {
    label: "Security",
    icon: Shield,
    bgHeader: "bg-rose-600",
    border: "border-rose-400",
    text: "text-rose-700",
  },
  infra: {
    label: "Infra",
    icon: Cpu,
    bgHeader: "bg-indigo-700",
    border: "border-indigo-400",
    text: "text-indigo-700",
  },
};

export const ArchitectureNode = memo(({ data, selected }: any) => {
  const compType = (data.type || "service").toLowerCase();
  const cfg = TYPE_CONFIG[compType] || TYPE_CONFIG.service;
  const Icon = cfg.icon;

  // Brownfield status styling
  let statusBadge = null;
  let borderOverride = "";
  if (data.change_status === "kept") {
    statusBadge = <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium">Kept</span>;
  } else if (data.change_status === "modified") {
    statusBadge = <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Modified</span>;
    borderOverride = "border-yellow-500 ring-2 ring-yellow-300";
  } else if (data.change_status === "added") {
    statusBadge = <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">Added</span>;
    borderOverride = "border-green-500 ring-2 ring-green-300";
  } else if (data.change_status === "removed") {
    statusBadge = <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded font-medium line-through">Removed</span>;
    borderOverride = "border-red-400 opacity-60";
  }

  // Highlighted in pink/coral if affected by change impact
  const isAffected = data.is_affected;
  const containerHighlight = isAffected
    ? "ring-4 ring-[#FB7185] bg-[#FFE4E6] shadow-lg animate-pulse"
    : selected
    ? "ring-2 ring-purple-600 shadow-md"
    : "shadow";

  return (
    <div
      className={`w-64 rounded-xl bg-white border ${cfg.border} ${borderOverride} ${containerHighlight} overflow-hidden text-left transition-all`}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-purple-600" />

      {/* Header */}
      <div className={`${cfg.bgHeader} text-white px-3 py-1.5 flex items-center justify-between`}>
        <div className="flex items-center space-x-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">{cfg.label}</span>
        </div>
        <span className="text-[11px] font-mono opacity-80">{data.id}</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <h4 className="font-bold text-sm text-[var(--text-primary)] leading-snug truncate" title={data.name}>
            {data.name}
          </h4>
          {statusBadge}
        </div>
        {data.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Satisfied Requirements Badges */}
        {data.satisfies && data.satisfies.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
            {data.satisfies.slice(0, 3).map((reqId: string) => (
              <span
                key={reqId}
                className="text-[10px] bg-blue-50 text-blue-700 font-mono px-1.5 py-0.5 rounded border border-blue-200"
              >
                {reqId}
              </span>
            ))}
            {data.satisfies.length > 3 && (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                +{data.satisfies.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-purple-600" />
    </div>
  );
});

ArchitectureNode.displayName = "ArchitectureNode";

