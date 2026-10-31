"use client";

import React, { useState, useEffect } from "react";
import {
  GitCompare,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  getRequirements,
  getArchitecture,
  analyzeImpact,
  generateArchitecture,
  Requirement,
  Component,
  ImpactReport,
} from "@/lib/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function ChangeImpactPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Selected requirement to modify
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [modifiedText, setModifiedText] = useState("");
  const [impactResult, setImpactResult] = useState<ImpactReport | null>(null);
  const [accepted, setAccepted] = useState(false);

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
      const [reqs, arch] = await Promise.all([
        getRequirements(activeProjectId),
        getArchitecture(activeProjectId),
      ]);
      setRequirements(reqs);
      setComponents(arch.components || []);
      if (reqs.length > 0) {
        setSelectedReqId(reqs[0].id);
        setModifiedText(reqs[0].text);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReq = (id: string) => {
    setSelectedReqId(id);
    const found = requirements.find((r) => r.id === id);
    if (found) {
      setModifiedText(found.text);
      setImpactResult(null);
      setAccepted(false);
    }
  };

  const handlePresetConcurrencyDemo = () => {
    const concReq = requirements.find((r) =>
      r.text.toLowerCase().includes("10,000") || r.text.toLowerCase().includes("concurrent")
    );
    if (concReq) {
      setSelectedReqId(concReq.id);
      setModifiedText("The system shall support at least 100,000 concurrent users with sub-second response times.");
    } else if (requirements.length > 0) {
      setSelectedReqId(requirements[0].id);
      setModifiedText(requirements[0].text + " (Scaled to 100,000 concurrent users)");
    }
  };

  const handleAnalyzeImpact = async () => {
    if (!activeProjectId || !selectedReqId || !modifiedText.trim()) return;

    setAnalyzing(true);
    setImpactResult(null);
    setAccepted(false);

    try {
      const res = await analyzeImpact(activeProjectId, [
        { req_id: selectedReqId, new_text: modifiedText.trim() },
      ]);
      setImpactResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptAndEvolve = async () => {
    if (!activeProjectId) return;
    setAnalyzing(true);
    try {
      await generateArchitecture(activeProjectId);
      setAccepted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedReq = requirements.find((r) => r.id === selectedReqId);

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
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">Change Impact Analysis</h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Simulate requirement modifications, calculate ripple effects across component dependencies, and evolve architecture.
          </p>
        </div>

        <button
          onClick={handlePresetConcurrencyDemo}
          className="h-8 px-3 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg font-semibold text-xs hover:bg-pink-100 transition-colors self-start shadow-xs flex items-center gap-1.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-600" />
          <span>Preset Demo: 10k → 100k Users</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="space-y-4">
          {/* Requirement Selector & Editor Card */}
          <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#202044] border-b border-[#F0EDF8] pb-2.5">
              1. Select and Modify Requirement
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                  Choose Target Requirement
                </label>
                <select
                  value={selectedReqId}
                  onChange={(e) => handleSelectReq(e.target.value)}
                  className="w-full h-9 text-xs px-3 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5] bg-white text-[#202044]"
                >
                  {requirements.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.id}] {r.text.slice(0, 85)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Before / After Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Before */}
                <div className="bg-gray-50/80 p-3.5 rounded-lg border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block">
                    Original Baseline ({selectedReq?.id})
                  </span>
                  <p className="text-xs text-[#202044] leading-relaxed font-medium">
                    {selectedReq?.text}
                  </p>
                </div>

                {/* After / Editable */}
                <div className="bg-[#7439D5]/5 p-3.5 rounded-lg border border-[#7439D5]/20 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7439D5] block">
                    Updated Requirement Text
                  </span>
                  <textarea
                    rows={3}
                    value={modifiedText}
                    onChange={(e) => setModifiedText(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E8E3F3] focus:outline-none focus:ring-1 focus:ring-[#7439D5] bg-white text-[#202044] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAnalyzeImpact}
                  disabled={analyzing || !modifiedText.trim()}
                  className="h-9 px-4 bg-[#7439D5] text-white rounded-lg font-semibold text-xs hover:bg-[#602BB7] disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <GitCompare className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Calculating Ripple Effect..." : "Analyze Impact"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Impact Results Panel */}
          {impactResult && (
            <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#F0EDF8] pb-2.5">
                <h2 className="text-sm font-bold text-[#202044] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FB7185]" />
                  <span>Impact Analysis Results</span>
                </h2>
                <span className="text-[11px] bg-[#FFE4E6] text-[#FB7185] font-bold px-2.5 py-0.5 rounded-full border border-[#FB7185]/30">
                  {impactResult.affected_component_ids.length} Components Affected
                </span>
              </div>

              {/* Affected Components Highlighted in Pink/Coral */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-2">
                  Affected Architectural Components (Highlighted in Coral)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {impactResult.affected_component_ids.map((cid) => {
                    const comp = components.find((c) => c.id === cid);
                    return (
                      <div
                        key={cid}
                        className="p-3 rounded-lg bg-[#FFE4E6] border border-[#FB7185] text-[#202044] space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-pink-700">
                            {cid}
                          </span>
                          <span className="text-[9px] bg-white text-pink-800 font-bold px-1.5 py-0.5 rounded">
                            {comp?.type || "Service"}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs truncate">{comp?.name || cid}</h4>
                        <p className="text-[10px] text-pink-900 line-clamp-2">
                          {comp?.description || "Component in direct or indirect dependency path."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                  Architectural Impact Explanation
                </h3>
                <p className="text-xs text-[#202044] leading-relaxed bg-[#F5F2FC] p-3 rounded-lg border border-[#E8E3F3]">
                  {impactResult.explanation}
                </p>
              </div>

              {/* Recommended Changes */}
              {impactResult.recommended_changes && impactResult.recommended_changes.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] mb-1">
                    Recommended Modifications
                  </h3>
                  <ul className="space-y-1.5 bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-xs text-amber-950">
                    {impactResult.recommended_changes.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Accept Changes Button */}
              <div className="pt-3 border-t border-[#F0EDF8] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-[#77758A]">
                  Accepting changes creates a new immutable architecture version snapshot.
                </span>

                {accepted ? (
                  <span className="px-3.5 h-8 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    New Version Created &amp; Applied!
                  </span>
                ) : (
                  <button
                    onClick={handleAcceptAndEvolve}
                    disabled={analyzing}
                    className="h-9 px-4 bg-[#7439D5] text-white rounded-lg font-semibold text-xs hover:bg-[#602BB7] flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Accept Changes &amp; Evolve</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
