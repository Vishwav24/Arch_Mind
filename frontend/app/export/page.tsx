"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  FileText,
  FileCode,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import {
  getRequirements,
  getArchitecture,
  getDecisions,
  getTraceability,
  exportProject,
  Requirement,
  Component,
  ADR,
} from "@/lib/api";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function ExportPage() {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [decisions, setDecisions] = useState<ADR[]>([]);
  const [coveragePercent, setCoveragePercent] = useState<number>(0);

  // Section checkboxes
  const [sections, setSections] = useState({
    requirements: true,
    diagram: true,
    components: true,
    adrs: true,
    traceability: true,
    validation: true,
  });

  const activeProjectId =
    typeof window !== "undefined"
      ? localStorage.getItem("archmind_active_project_id")
      : null;
  const projectTitle =
    typeof window !== "undefined"
      ? localStorage.getItem("archmind_active_project_title") || "Software Architecture Report"
      : "Software Architecture Report";

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
      const [reqs, arch, decs, trace] = await Promise.all([
        getRequirements(activeProjectId).catch(() => []),
        getArchitecture(activeProjectId).catch(() => ({ components: [], connections: [] })),
        getDecisions(activeProjectId).catch(() => []),
        getTraceability(activeProjectId).catch(() => ({ coverage_percent: 0 })),
      ]);
      setRequirements(reqs);
      setComponents(arch.components || []);
      setDecisions(decs);
      setCoveragePercent(trace.coverage_percent || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: "md" | "pdf") => {
    if (!activeProjectId) return;
    setDownloading(true);
    try {
      const blob = await exportProject(activeProjectId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle.replace(/\s+/g, "_").toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setDownloading(false);
    }
  };

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">Export Specification</h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Download standard Markdown specification documents and publication-ready PDF reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload("md")}
            disabled={downloading}
            className="h-9 px-3.5 rounded-lg bg-[#7439D5] hover:bg-[#602BB7] text-white font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Download Markdown</span>
          </button>

          <button
            onClick={() => handleDownload("pdf")}
            disabled={downloading}
            className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Section Options */}
          <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#202044] border-b border-[#F0EDF8] pb-2.5">
              Included Sections
            </h2>

            <div className="space-y-2">
              {[
                { key: "requirements", label: `Requirements Table (${requirements.length})` },
                { key: "diagram", label: "Mermaid Architecture Diagram" },
                { key: "components", label: `Components Catalogue (${components.length})` },
                { key: "adrs", label: `Architecture Decision Records (${decisions.length})` },
                { key: "traceability", label: `Traceability Matrix (${coveragePercent}% Coverage)` },
                { key: "validation", label: "Validation Findings & Integrity" },
              ].map(({ key, label }) => {
                const isChecked = sections[key as keyof typeof sections];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSection(key as keyof typeof sections)}
                    className="w-full flex items-center gap-2 text-xs font-medium text-[#202044] hover:text-[#7439D5] text-left p-1.5 rounded-md hover:bg-[#F5F2FC] transition-colors"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#7439D5] shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Preview */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EDF8] pb-2.5">
              <h2 className="text-sm font-bold text-[#202044]">Document Preview</h2>
              <span className="text-[10px] font-mono text-[#7439D5] bg-[#7439D5]/10 px-2 py-0.5 rounded">
                ArchMind AI
              </span>
            </div>

            <div className="font-mono text-xs bg-[#F5F2FC]/50 p-3.5 rounded-lg border border-[#E8E3F3] text-[#202044] space-y-2.5 max-h-[420px] overflow-y-auto leading-relaxed">
              <div className="text-[#7439D5] font-bold text-sm"># {projectTitle}</div>
              <div className="text-[#77758A] italic text-[11px]">
                *Generated on {new Date().toLocaleDateString()} — ArchMind AI Autonomous Software Architect*
              </div>

              {sections.requirements && (
                <div className="pt-1.5">
                  <div className="font-bold text-[#202044] text-[11px]">## Requirements ({requirements.length} entries)</div>
                  <div className="text-[#77758A] text-[11px]">
                    | ID | Text | Priority | Status |<br />
                    |---|---|---|---|
                    {requirements.slice(0, 3).map((r) => (
                      <div key={r.id}>
                        | {r.id} | {r.text.slice(0, 40)}... | {r.priority} | {r.status} |
                      </div>
                    ))}
                    {requirements.length > 3 && (
                      <div className="text-gray-400 italic">...and {requirements.length - 3} more</div>
                    )}
                  </div>
                </div>
              )}

              {sections.diagram && (
                <div className="pt-1.5">
                  <div className="font-bold text-[#202044] text-[11px]">## Architecture Diagram (Mermaid)</div>
                  <div className="text-blue-700 text-[11px]">
                    ```mermaid<br />
                    graph TD<br />
                    {components.slice(0, 4).map((c) => (
                      <span key={c.id}>&nbsp;&nbsp;{c.id.replace("-", "_")}["{c.name}"]<br /></span>
                    ))}
                    ```
                  </div>
                </div>
              )}

              {sections.adrs && (
                <div className="pt-1.5">
                  <div className="font-bold text-[#202044] text-[11px]">## Architecture Decision Records</div>
                  <div className="text-[#77758A] text-[11px]">
                    {decisions.slice(0, 2).map((d) => (
                      <div key={d.id} className="mt-0.5">
                        - **{d.id}: {d.title}** (Decision: {d.decision.slice(0, 50)}...)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sections.traceability && (
                <div className="pt-1.5">
                  <div className="font-bold text-[#202044] text-[11px]">## Traceability Matrix</div>
                  <div className="text-emerald-700 font-semibold text-[11px]">
                    Coverage: {coveragePercent}% Verified
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
