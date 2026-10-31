"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Check,
  X,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { getDecisions, updateDecisionStatus, ADR } from "@/lib/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<ADR[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "Proposed" | "Accepted" | "Rejected">("all");

  const activeProjectId =
    typeof window !== "undefined"
      ? localStorage.getItem("archmind_active_project_id")
      : null;

  useEffect(() => {
    if (activeProjectId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [activeProjectId]);

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const data = await getDecisions(activeProjectId);
      setDecisions(data);
      if (data.length > 0) setExpandedId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStatusChange = async (adrId: string, newStatus: "Accepted" | "Rejected" | "Proposed", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activeProjectId) return;

    setUpdatingId(adrId);
    try {
      await updateDecisionStatus(activeProjectId, adrId, newStatus);
      setDecisions((prev) =>
        prev.map((d) => (d.id === adrId ? { ...d, status: newStatus } : d))
      );
    } catch (err) {
      console.error("Failed to update ADR status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!activeProjectId) {
    return (
      <EmptyState
        title="No Project Active"
        description="Please create or load a project first from the New Project page."
        actionLabel="Create Project"
        onAction={() => (window.location.href = "/")}
      />
    );
  }

  const proposedCount = decisions.filter((d) => !d.status || d.status === "Proposed").length;
  const acceptedCount = decisions.filter((d) => d.status === "Accepted").length;
  const rejectedCount = decisions.filter((d) => d.status === "Rejected").length;

  const filteredDecisions = decisions.filter((d) => {
    const status = d.status || "Proposed";
    if (activeTab === "all") return true;
    return status === activeTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">
            Architecture Decision Records (ADRs)
          </h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Formal architectural records capturing technology choices, evaluated alternatives, and trade-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {proposedCount > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              {proposedCount} Proposed
            </span>
          )}
          {acceptedCount > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              {acceptedCount} Accepted
            </span>
          )}
          <span className="text-xs bg-[#7439D5]/10 text-[#7439D5] font-semibold px-3 py-1 rounded-full border border-[#7439D5]/20">
            {decisions.length} Total ADRs
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E8E3F3] rounded-xl w-fit">
        {(["all", "Proposed", "Accepted", "Rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-[#7439D5] text-white shadow-xs"
                : "text-[#77758A] hover:text-[#202044] hover:bg-gray-50"
            }`}
          >
            {tab === "all" ? "All Decisions" : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : decisions.length === 0 ? (
        <EmptyState
          title="No ADRs Recorded Yet"
          description="ADRs are automatically synthesized when analyzing requirements or generating architecture."
          actionLabel="Go to Architecture"
          onAction={() => (window.location.href = "/architecture")}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredDecisions.map((adr) => {
            const isExpanded = expandedId === adr.id;
            const status = adr.status || "Proposed";
            const isUpdating = updatingId === adr.id;

            return (
              <div
                key={adr.id}
                className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] overflow-hidden transition-all"
              >
                {/* Header */}
                <div
                  onClick={() => toggleExpand(adr.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#7439D5] bg-[#7439D5]/10 px-2 py-0.5 rounded border border-[#7439D5]/20">
                      {adr.id}
                    </span>
                    <h3 className="font-semibold text-xs sm:text-sm text-[#202044]">
                      {adr.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                        status === "Accepted"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : status === "Rejected"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : status === "Superseded"
                          ? "bg-gray-100 text-gray-700 border-gray-300"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {status === "Accepted" && <Check className="w-2.5 h-2.5" />}
                      {status === "Rejected" && <X className="w-2.5 h-2.5" />}
                      {status === "Proposed" && <Clock className="w-2.5 h-2.5" />}
                      {status}
                    </span>

                    {/* Quick Action Buttons for Proposed ADRs */}
                    {status === "Proposed" && (
                      <div className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={isUpdating}
                          onClick={(e) => handleStatusChange(adr.id, "Accepted", e)}
                          title="Approve / Accept ADR"
                          className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={(e) => handleStatusChange(adr.id, "Rejected", e)}
                          title="Reject ADR"
                          className="h-7 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {status !== "Proposed" && (
                      <button
                        disabled={isUpdating}
                        onClick={(e) => handleStatusChange(adr.id, "Proposed", e)}
                        title="Reset to Proposed for re-evaluation"
                        className="h-6 px-2 text-[10px] text-[#77758A] hover:text-[#202044] hover:bg-gray-100 rounded transition-colors"
                      >
                        Reset Status
                      </button>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#77758A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#77758A]" />
                    )}
                  </div>
                </div>

                {/* Body when expanded */}
                {isExpanded && (
                  <div className="p-5 pt-3 border-t border-[#F0EDF8] space-y-4 text-xs bg-[#F5F2FC]/20">
                    {/* Context */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                        1. Context &amp; Problem Statement
                      </h4>
                      <p className="text-[#202044] leading-relaxed bg-white p-3.5 rounded-lg border border-[#E8E3F3]">
                        {adr.context}
                      </p>
                    </div>

                    {/* Decision */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                        2. Architectural Decision
                      </h4>
                      <p className="text-emerald-950 font-medium leading-relaxed bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-200">
                        {adr.decision}
                      </p>
                    </div>

                    {/* Rationale */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                        3. Reasoning &amp; Rationale
                      </h4>
                      <p className="text-[#202044] leading-relaxed bg-white p-3.5 rounded-lg border border-[#E8E3F3]">
                        {adr.rationale}
                      </p>
                    </div>

                    {/* Alternatives & Consequences Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="bg-white p-3.5 rounded-lg border border-[#E8E3F3]">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#7439D5]" />
                          <span>Evaluated Alternatives</span>
                        </h4>
                        {adr.alternatives && adr.alternatives.length > 0 ? (
                          <ul className="text-xs text-[#202044] space-y-1.5 list-disc list-inside">
                            {adr.alternatives.map((alt, i) => (
                              <li key={i} className="leading-snug text-[#77758A]">
                                <span className="text-[#202044] font-medium">{alt}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-[#77758A] italic">None recorded.</p>
                        )}
                      </div>

                      <div className="bg-white p-3.5 rounded-lg border border-[#E8E3F3]">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Consequences &amp; Trade-offs</span>
                        </h4>
                        {adr.trade_offs && adr.trade_offs.length > 0 ? (
                          <ul className="text-xs text-[#202044] space-y-1.5 list-disc list-inside">
                            {adr.trade_offs.map((t, i) => (
                              <li key={i} className="leading-snug text-[#77758A]">
                                <span className="text-[#202044]">{t}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-[#77758A] italic">None recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* Related Requirements */}
                    {adr.related_requirement_ids && adr.related_requirement_ids.length > 0 && (
                      <div className="bg-white p-3.5 rounded-lg border border-[#E8E3F3]">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-2">
                          Governing Requirements
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {adr.related_requirement_ids.map((rid) => (
                            <span
                              key={rid}
                              className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded border border-blue-200"
                            >
                              {rid}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
