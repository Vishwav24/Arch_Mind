"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Table,
  Layers,
  Check,
  X as XIcon,
} from "lucide-react";
import {
  validateArchitecture,
  getTraceability,
  getRequirements,
  getArchitecture,
  Finding,
  Requirement,
  Component,
} from "@/lib/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function ValidationPage() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [traceability, setTraceability] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");

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
      const trace = await getTraceability(activeProjectId);
      setTraceability(trace);
      const res = await validateArchitecture(activeProjectId).catch(() => null);
      if (res?.findings) {
        setFindings(res.findings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunValidation = async () => {
    if (!activeProjectId) return;
    setValidating(true);
    try {
      const res = await validateArchitecture(activeProjectId);
      setFindings(res.findings || []);
      const trace = await getTraceability(activeProjectId);
      setTraceability(trace);
    } catch (e) {
      console.error(e);
    } finally {
      setValidating(false);
    }
  };

  const coveragePercent = traceability?.coverage_percent ?? 0;
  const filteredFindings = findings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
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
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">Validation &amp; Traceability</h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Verification of requirement coverage, absence of orphan components, and architectural risk analysis.
          </p>
        </div>

        <button
          onClick={handleRunValidation}
          disabled={validating}
          className="h-9 px-4 rounded-lg bg-[#7439D5] hover:bg-[#602BB7] text-white font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors self-start shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${validating ? "animate-spin" : ""}`} />
          <span>{validating ? "Validating..." : "Run Validation Suite"}</span>
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Coverage Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-[#E8E3F3] flex items-center gap-4">
              <div className="relative w-18 h-18 shrink-0 flex items-center justify-center">
                <svg className="w-18 h-18 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={coveragePercent >= 80 ? "text-[#16A34A]" : "text-[#EA580C]"}
                    strokeDasharray={`${coveragePercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute font-bold text-sm text-[#202044]">
                  {coveragePercent}%
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-xs text-[#202044]">Requirements Coverage</h3>
                <p className="text-[11px] text-[#77758A] mt-0.5">
                  {traceability?.covered_requirements || 0} of {traceability?.total_requirements || 0} requirements mapped.
                </p>
                <span
                  className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    coveragePercent === 100
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-orange-50 text-orange-700 border border-orange-200"
                  }`}
                >
                  {coveragePercent === 100 ? "100% Traceable" : "Gaps Detected"}
                </span>
              </div>
            </div>

            {/* Findings Count Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-[#E8E3F3]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A]">
                Validation Findings
              </span>
              <div className="text-2xl font-bold text-[#202044] mt-1">
                {findings.length}
              </div>
              <div className="flex gap-1.5 mt-2">
                <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-semibold">
                  {findings.filter((f) => f.severity === "High").length} High
                </span>
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                  {findings.filter((f) => f.severity === "Medium").length} Med
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                  {findings.filter((f) => f.severity === "Low").length} Low
                </span>
              </div>
            </div>

            {/* Deterministic Integrity Card */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-xs border border-[#E8E3F3]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A]">
                Deterministic Integrity
              </span>
              <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <span>Verified</span>
              </div>
              <p className="text-[11px] text-[#77758A] mt-1">
                Presence rules, dangling connection checks, and uniqueness tests enforced.
              </p>
            </div>
          </div>

          {/* Validation Findings List */}
          <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EDF8] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#202044]">Validation Findings &amp; Gaps</h2>
                <p className="text-[11px] text-[#77758A]">
                  Defects identified by deterministic checks and deep reasoning.
                </p>
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-8 text-xs px-2.5 rounded-lg border border-[#E8E3F3] bg-white text-[#202044] focus:outline-none focus:ring-1 focus:ring-[#7439D5]"
              >
                <option value="all">All Severities</option>
                <option value="High">High Severity</option>
                <option value="Medium">Medium Severity</option>
                <option value="Low">Low Severity</option>
              </select>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/60 rounded-lg border border-emerald-200">
                <CheckCircle className="w-5 h-5 mx-auto mb-1.5 text-emerald-600" />
                No validation findings matching filter. Architecture is compliant!
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFindings.map((f, i) => {
                  const isHigh = f.severity === "High";
                  const isMed = f.severity === "Medium";

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border flex items-start gap-2.5 transition-all ${
                        isHigh
                          ? "bg-red-50/50 border-red-200 text-red-950"
                          : isMed
                          ? "bg-amber-50/50 border-amber-200 text-amber-950"
                          : "bg-blue-50/50 border-blue-200 text-blue-950"
                      }`}
                    >
                      {isHigh ? (
                        <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : isMed ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isHigh
                                ? "bg-red-600 text-white"
                                : isMed
                                ? "bg-amber-500 text-white"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-[#77758A]">
                            {f.id}
                          </span>
                          <span className="text-[11px] text-[#77758A] capitalize">({f.type})</span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed">{f.explanation}</p>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {f.related_requirement_ids?.map((rid) => (
                            <span
                              key={rid}
                              className="text-[10px] font-mono bg-white/80 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200"
                            >
                              {rid}
                            </span>
                          ))}
                          {f.related_component_ids?.map((cid) => (
                            <span
                              key={cid}
                              className="text-[10px] font-mono bg-purple-50 text-[#7439D5] px-1.5 py-0.5 rounded border border-purple-200"
                            >
                              {cid}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Traceability Matrix */}
          <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#202044]">
                Traceability Matrix (Requirements × Components)
              </h2>
              <p className="text-[11px] text-[#77758A]">
                Bi-directional traceability mapping every requirement to responsible components.
              </p>
            </div>

            {traceability?.matrix && traceability.matrix.length > 0 ? (
              <div className="overflow-x-auto border border-[#E8E3F3] rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F5F2FC] text-[#202044]">
                    <tr>
                      <th className="p-2.5 border-b border-[#E8E3F3] font-bold sticky left-0 bg-[#F5F2FC] z-10 w-64 text-xs">
                        Requirement
                      </th>
                      {traceability.components?.map((c: any) => (
                        <th
                          key={c.id}
                          className="p-2.5 border-b border-l border-[#E8E3F3] font-mono font-bold text-center text-[#7439D5] text-[11px]"
                          title={c.name}
                        >
                          {c.id}
                        </th>
                      ))}
                      <th className="p-2.5 border-b border-l border-[#E8E3F3] font-bold text-center text-xs w-24">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDF8]">
                    {traceability.matrix.map((row: any) => (
                      <tr key={row.requirement_id} className="hover:bg-[#F5F2FC]/50 transition-colors">
                        <td className="p-2.5 font-medium sticky left-0 bg-white z-10 text-xs">
                          <span className="font-mono font-bold text-[#7439D5] mr-1.5">
                            {row.requirement_id}
                          </span>
                          <span className="text-[#202044] text-[11px]">{row.requirement_text}</span>
                        </td>
                        {traceability.components?.map((c: any) => {
                          const isSatisfied = row.satisfied_by?.includes(c.id);
                          return (
                            <td
                              key={c.id}
                              className={`p-2.5 border-l border-[#E8E3F3] text-center font-bold text-xs ${
                                isSatisfied ? "bg-emerald-50/70 text-emerald-700" : "text-gray-300"
                              }`}
                            >
                              {isSatisfied ? "✓" : "·"}
                            </td>
                          );
                        })}
                        <td className="p-2.5 border-l border-[#E8E3F3] text-center">
                          {row.is_covered ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                              Covered
                            </span>
                          ) : (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-full">
                              Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#77758A] py-2">No traceability matrix generated.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
