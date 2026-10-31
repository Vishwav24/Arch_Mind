"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  SkipForward,
  Check,
  Edit3,
  ThumbsUp,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import {
  getClarifications,
  answerClarification,
  getRequirements,
  Clarification,
  Requirement,
} from "@/lib/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function ClarificationsPage() {
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"all" | "high" | "conflicts" | "open" | "answered">("all");

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
      const [cData, rData] = await Promise.all([
        getClarifications(activeProjectId),
        getRequirements(activeProjectId),
      ]);
      setClarifications(cData);
      setRequirements(rData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (clarId: string, answerText: string, status: string) => {
    try {
      const updated = await answerClarification(clarId, answerText, status);
      setClarifications((prev) => prev.map((c) => (c.id === clarId ? updated : c)));
      setAnswerInputs((prev) => ({ ...prev, [clarId]: "" }));
    } catch (e) {
      console.error("Action error:", e);
    }
  };

  const handleSelectSuggestedAnswer = (clarId: string, option: string) => {
    setAnswerInputs((prev) => ({ ...prev, [clarId]: option }));
  };

  const openCount = clarifications.filter((c) => c.status === "open").length;
  const conflictCount = clarifications.filter((c) => c.kind === "conflict" || c.category === "conflict").length;
  const highPriorityCount = clarifications.filter((c) => c.priority === "High" && c.status === "open").length;

  const filteredClarifications = clarifications.filter((c) => {
    if (activeTab === "high") return c.priority === "High";
    if (activeTab === "conflicts") return c.kind === "conflict" || c.category === "conflict";
    if (activeTab === "open") return c.status === "open";
    if (activeTab === "answered") return c.status !== "open";
    return true;
  });

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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">Clarification Centre</h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Requirement-grounded questions identifying architectural ambiguities, missing specifications, and regulatory conflicts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {highPriorityCount > 0 && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              {highPriorityCount} High Priority
            </span>
          )}
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {openCount} Pending
          </span>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
            {conflictCount} Conflicts
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-[#E8E3F3] rounded-xl w-fit">
        {(["all", "high", "conflicts", "open", "answered"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-[#7439D5] text-white shadow-xs"
                : "text-[#77758A] hover:text-[#202044] hover:bg-gray-50"
            }`}
          >
            {tab === "high" ? "High Priority" : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : clarifications.length === 0 ? (
        <EmptyState
          title="No Clarifications Required"
          description="All requirements are fully specified with verified metrics. No architectural contradictions detected."
          actionLabel="Proceed to Architecture"
          onAction={() => (window.location.href = "/architecture")}
        />
      ) : (
        <div className="space-y-4">
          {filteredClarifications.map((clar) => {
            const isConflict = clar.kind === "conflict" || clar.category === "conflict";
            const isAnswered = clar.status !== "open";
            const priority = clar.priority || "Medium";
            const category = clar.category || clar.kind || "ambiguity";

            const relatedReqs = (clar.requirement_ids || [])
              .map((rid) => requirements.find((r) => r.id === rid))
              .filter(Boolean) as Requirement[];

            let borderAccent = "border-l-[#7439D5]";
            if (isAnswered) borderAccent = "border-l-emerald-500";
            else if (priority === "High") borderAccent = "border-l-rose-500";
            else if (isConflict) borderAccent = "border-l-orange-500";
            else borderAccent = "border-l-amber-500";

            return (
              <div
                key={clar.id}
                className={`bg-white rounded-xl shadow-xs border border-[#E8E3F3] border-l-4 ${borderAccent} p-5 space-y-3.5 transition-all`}
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isAnswered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : priority === "High" ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : isConflict ? (
                      <AlertOctagon className="w-4 h-4 text-orange-600 shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-[#7439D5] shrink-0" />
                    )}

                    <span className="font-mono text-xs font-bold text-[#77758A]">
                      {clar.id}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        priority === "High"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : priority === "Low"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {priority} Priority
                    </span>

                    {/* Category Badge */}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
                      {category}
                    </span>

                    {/* Linked Requirement IDs */}
                    {clar.requirement_ids && clar.requirement_ids.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#77758A]">Linked:</span>
                        {clar.requirement_ids.map((rid) => (
                          <span
                            key={rid}
                            className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-[#202044] border border-gray-200"
                          >
                            {rid}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold capitalize px-2.5 py-0.5 rounded-md ${
                      clar.status === "answered"
                        ? "bg-emerald-100 text-emerald-800"
                        : clar.status === "assumption_approved"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-[#77758A]"
                    }`}
                  >
                    {clar.status.replace("_", " ")}
                  </span>
                </div>

                {/* Question */}
                <div className="pl-6">
                  <h3 className="font-semibold text-sm text-[#202044] leading-snug">
                    {clar.question}
                  </h3>
                </div>

                {/* Reason for Asking (Explanation) */}
                {clar.explanation && (
                  <div className="ml-6 flex items-start gap-2 bg-[#F5F2FC]/60 border border-[#E8E3F3] p-2.5 rounded-lg text-xs text-[#202044]">
                    <Info className="w-4 h-4 text-[#7439D5] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#7439D5] mr-1">Why clarification is needed:</span>
                      <span className="text-[#77758A] leading-relaxed">{clar.explanation}</span>
                    </div>
                  </div>
                )}

                {/* Conflict Side-by-Side View if multiple conflicting requirements */}
                {isConflict && relatedReqs.length >= 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-6">
                    {relatedReqs.map((req) => (
                      <div
                        key={req.id}
                        className="bg-orange-50/50 p-3 rounded-lg border border-orange-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-orange-900">{req.id}</span>
                          <span className="text-[10px] font-semibold text-orange-700 uppercase">{req.type}</span>
                        </div>
                        <p className="text-gray-800 text-[11px] leading-relaxed">{req.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Answer Options (if open) */}
                {!isAnswered && clar.suggested_answers && clar.suggested_answers.length > 0 && (
                  <div className="pl-6 space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block">
                      Architectural Options:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {clar.suggested_answers.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggestedAnswer(clar.id, opt)}
                          className={`text-left text-xs p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                            answerInputs[clar.id] === opt
                              ? "bg-[#7439D5]/10 border-[#7439D5] text-[#202044] font-medium"
                              : "bg-gray-50/60 hover:bg-purple-50/40 border-[#E8E3F3] text-[#77758A] hover:text-[#202044]"
                          }`}
                        >
                          <span className="leading-snug">{opt}</span>
                          <span className="text-[10px] text-[#7439D5] font-semibold shrink-0 uppercase tracking-wider mt-0.5">
                            {answerInputs[clar.id] === opt ? "Selected" : "Use Option"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Display if Answered */}
                {isAnswered && (
                  <div className="pl-6 pt-2 border-t border-[#F0EDF8]">
                    <span className="text-[10px] font-bold text-[#77758A] uppercase tracking-wider block mb-1">
                      Recorded Decision:
                    </span>
                    <p className="text-xs font-medium text-emerald-900 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                      {clar.answer || "Resolved without additional comments."}
                    </p>
                  </div>
                )}

                {/* Action Controls if Open */}
                {!isAnswered && (
                  <div className="pl-6 space-y-2.5 pt-2 border-t border-[#F0EDF8]">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type confirmed answer or select an option above..."
                        value={answerInputs[clar.id] || ""}
                        onChange={(e) =>
                          setAnswerInputs({ ...answerInputs, [clar.id]: e.target.value })
                        }
                        className="flex-1 h-9 px-3 text-xs rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5] text-[#202044] bg-white"
                      />
                      <button
                        onClick={() =>
                          handleAction(
                            clar.id,
                            answerInputs[clar.id] || "Confirmed and incorporated into architecture baseline.",
                            "answered"
                          )
                        }
                        className="px-3.5 h-9 bg-[#7439D5] text-white rounded-lg text-xs font-semibold hover:bg-[#602BB7] transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
                      >
                        <Send className="w-3 h-3" />
                        <span>Save Resolution</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        onClick={() =>
                          handleAction(
                            clar.id,
                            answerInputs[clar.id] || "Baseline architectural assumption accepted and approved.",
                            "assumption_approved"
                          )
                        }
                        className="px-2.5 h-7 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Approve Assumption</span>
                      </button>

                      <button
                        onClick={() => handleAction(clar.id, "Deferred for future milestone", "skipped")}
                        className="px-2.5 h-7 rounded-md text-[11px] font-semibold bg-gray-50 text-[#77758A] border border-[#E8E3F3] hover:bg-gray-100 flex items-center gap-1 transition-colors"
                      >
                        <SkipForward className="w-3 h-3" />
                        <span>Skip for Now</span>
                      </button>
                    </div>
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
