"use client";

import React from "react";

type BadgeVariant =
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "purple"
  | "gray"
  | "pink"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-green-50 text-green-700 border-green-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  red: "bg-red-50 text-red-700 border-red-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  gray: "bg-gray-50 text-gray-700 border-gray-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

export function Badge({ children, variant = "gray", icon, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}

// Convenience badges for common use cases
export function ProvenanceBadge({ provenance }: { provenance: string }) {
  if (provenance === "source" || provenance === "extracted") {
    return (
      <Badge variant="blue" icon={<span>📄</span>}>
        Source
      </Badge>
    );
  }
  return (
    <Badge variant="yellow" icon={<span>🤖</span>}>
      AI Assumption
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    new: "blue",
    confirmed: "green",
    ambiguous: "orange",
    conflicting: "red",
    resolved: "green",
    open: "blue",
    skipped: "gray",
    draft: "purple",
    approved: "green",
  };
  return <Badge variant={map[status] || "gray"}>{status}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, BadgeVariant> = {
    critical: "red",
    high: "orange",
    medium: "yellow",
    low: "blue",
    info: "gray",
  };
  return <Badge variant={map[severity] || "gray"}>{severity}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, BadgeVariant> = {
    must: "red",
    should: "orange",
    could: "yellow",
    wont: "gray",
    high: "red",
    medium: "orange",
    low: "blue",
  };
  return <Badge variant={map[priority] || "gray"}>{priority}</Badge>;
}

export function TypeBadge({ type }: { type: string }) {
  const map: Record<string, BadgeVariant> = {
    functional: "blue",
    non_functional: "purple",
    constraint: "orange",
    assumption: "yellow",
    performance: "green",
    security: "red",
  };
  return <Badge variant={map[type] || "gray"}>{type.replace("_", " ")}</Badge>;
}
