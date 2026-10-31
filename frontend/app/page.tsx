"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  HelpCircle,
  Send,
  X,
  FileCheck2,
  Cpu,
} from "lucide-react";
import {
  createProject,
  uploadDocuments,
  pasteRequirements,
  analyzeProject,
  loadSampleProject,
  askQuestion,
  getRequirements,
} from "@/lib/api";
import { ProgressBar } from "@/components/ProgressBar";

export default function NewProjectPage() {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"greenfield" | "brownfield">("greenfield");
  const [pastedText, setPastedText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Q&A panel state
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<{ answer: string; citations: string[] } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles((prev) => [...prev, ...acceptedFiles]);
    },
    multiple: true,
  });

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLoadSample = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setProgressStep("Initializing Food Delivery demo project...");
    setProgressPercent(15);

    try {
      console.log("[ArchMind] Initializing demo project...");
      const sampleProj = await loadSampleProject();
      console.log("[ArchMind] Demo project created with ID:", sampleProj.id);

      localStorage.setItem("archmind_active_project_id", sampleProj.id);
      localStorage.setItem("archmind_active_project_title", sampleProj.title);
      setCurrentProjectId(sampleProj.id);

      setProgressStep("Analyzing food delivery requirements & detecting constraints...");
      setProgressPercent(35);

      await analyzeProject(sampleProj.id, (msg) => {
        console.log("[ArchMind] Analysis step:", msg);
        setProgressStep(msg);
        setProgressPercent((p) => Math.min(p + 15, 90));
      });

      // Verify requirements were saved before navigating
      setProgressStep("Verifying saved requirements...");
      setProgressPercent(95);
      const reqs = await getRequirements(sampleProj.id);
      console.log(`[ArchMind] Verified ${reqs?.length || 0} extracted requirements.`);

      if (!reqs || reqs.length === 0) {
        throw new Error("No requirements were extracted from the demo project. Please check backend analysis logs.");
      }

      setProgressStep(`Extracted and classified ${reqs.length} requirements. Opening Explorer...`);
      setProgressPercent(100);

      setTimeout(() => {
        router.push("/requirements");
      }, 400);
    } catch (err: any) {
      console.error("[ArchMind] Load sample failed:", err);
      setErrorMsg(err.message || "Failed to load sample project");
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!title.trim()) {
      setErrorMsg("Project title is required to proceed.");
      return;
    }
    if (files.length === 0 && !pastedText.trim()) {
      setErrorMsg("Please upload at least one document or paste requirement text.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setProgressStep("Initializing project...");
    setProgressPercent(10);

    try {
      const proj = await createProject({
        title: title.trim(),
        description: description.trim(),
        mode: mode,
      });

      localStorage.setItem("archmind_active_project_id", proj.id);
      localStorage.setItem("archmind_active_project_title", proj.title);
      setCurrentProjectId(proj.id);

      if (files.length > 0) {
        setProgressStep("Uploading and parsing documents...");
        setProgressPercent(25);
        await uploadDocuments(proj.id, files);
      }

      if (pastedText.trim()) {
        setProgressStep("Saving pasted requirements...");
        setProgressPercent(35);
        await pasteRequirements(proj.id, pastedText.trim());
      }

      setProgressStep("Starting AI Requirements Analysis...");
      setProgressPercent(45);

      await analyzeProject(proj.id, (msg) => {
        setProgressStep(msg);
        setProgressPercent((p) => Math.min(p + 12, 95));
      });

      setProgressStep("Analysis complete!");
      setProgressPercent(100);

      setTimeout(() => {
        router.push("/requirements");
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during analysis.");
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!currentProjectId) {
      setErrorMsg("Please initialize or load a project first to ask questions about its documents.");
      return;
    }
    if (!qaQuestion.trim()) return;

    setQaLoading(true);
    try {
      const res = await askQuestion(currentProjectId, qaQuestion.trim());
      setQaAnswer(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not answer question.");
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#202044] tracking-tight">New Project Setup</h1>
          <p className="text-xs text-[#77758A] mt-0.5">
            Configure system parameters, supply documentation, and trigger automated architecture synthesis.
          </p>
        </div>

        <button
          onClick={handleLoadSample}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg bg-white border border-[#7439D5]/30 text-[#7439D5] hover:bg-[#7439D5]/5 font-semibold text-xs transition-colors shadow-xs shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#7439D5]" />
          <span>Load Sample (Food Delivery)</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-orange-50/80 border border-orange-200 text-orange-800 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold block text-orange-900">Notice</span>
            {errorMsg}
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white p-5 rounded-xl shadow-xs border border-[#E8E3F3]">
          <ProgressBar currentStep={progressStep} progress={progressPercent} />
        </div>
      )}

      {/* Main Project Card */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-5 sm:p-6 space-y-6">
        {/* Section 1: Project Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#F0EDF8]">
            <span className="w-5 h-5 rounded-md bg-[#7439D5]/10 text-[#7439D5] flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <h2 className="text-sm font-bold text-[#202044]">Project Metadata</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#202044]">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NextGen Core Platform"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                className="w-full h-9 px-3 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5] text-xs text-[#202044] transition-colors bg-white"
              />
              <p className="text-[11px] text-[#77758A]">
                Required identifier for the architectural workspace.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#202044]">
                Architecture Mode
              </label>
              <div className="grid grid-cols-2 gap-2 h-9">
                <button
                  type="button"
                  onClick={() => setMode("greenfield")}
                  disabled={loading}
                  className={`h-full px-3 rounded-lg border text-left transition-all flex items-center justify-between text-xs font-semibold ${
                    mode === "greenfield"
                      ? "border-[#7439D5] bg-[#7439D5]/5 text-[#7439D5] ring-1 ring-[#7439D5]"
                      : "border-[#E8E3F3] hover:border-gray-300 bg-white text-[#77758A]"
                  }`}
                >
                  <span>Greenfield (New)</span>
                  <span className="text-[10px] text-[#7439D5]/70">Scratch</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("brownfield")}
                  disabled={loading}
                  className={`h-full px-3 rounded-lg border text-left transition-all flex items-center justify-between text-xs font-semibold ${
                    mode === "brownfield"
                      ? "border-[#7439D5] bg-[#7439D5]/5 text-[#7439D5] ring-1 ring-[#7439D5]"
                      : "border-[#E8E3F3] hover:border-gray-300 bg-white text-[#77758A]"
                  }`}
                >
                  <span>Brownfield (Existing)</span>
                  <span className="text-[10px] text-[#7439D5]/70">Evolution</span>
                </button>
              </div>
              <p className="text-[11px] text-[#77758A]">
                {mode === "greenfield"
                  ? "Design greenfield topology from raw specifications."
                  : "Ingest previous system and compute evolutionary diff."}
              </p>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-[#202044]">
                Project Scope &amp; Context (Optional)
              </label>
              <textarea
                placeholder="High-level objectives, anticipated peak concurrency, SLA mandates, cloud preferences..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5] text-xs text-[#202044] resize-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Requirements & Documents */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#F0EDF8]">
            <span className="w-5 h-5 rounded-md bg-[#7439D5]/10 text-[#7439D5] flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            <h2 className="text-sm font-bold text-[#202044]">Requirements &amp; Architecture Documents</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dropzone */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#202044]">
                Upload Documents / Diagrams
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-[#7439D5] bg-[#7439D5]/5"
                    : "border-[#E8E3F3] hover:border-[#7439D5]/50 bg-[#F5F2FC]/50"
                }`}
              >
                <input {...getInputProps()} />
                <UploadCloud className="w-6 h-6 text-[#7439D5] mx-auto mb-1.5" />
                <p className="text-xs font-medium text-[#202044]">
                  Drop documents here, or <span className="text-[#7439D5] underline">browse files</span>
                </p>
                <p className="text-[10px] text-[#77758A] mt-1">
                  PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, JSON, YAML, Mermaid, PlantUML, PNG/JPG
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto pt-1">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white text-[#202044] px-2.5 py-1.5 rounded-md border border-[#E8E3F3]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCheck2 className="w-3.5 h-3.5 shrink-0 text-[#7439D5]" />
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="text-[10px] text-[#77758A]">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-[#77758A] hover:text-rose-600 transition-colors ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paste Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#202044]">
                Or Paste Requirements Text
              </label>
              <textarea
                placeholder="Paste functional requirements, user stories, NFRs, SLA mandates, security policies, or Mermaid diagrams..."
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={6}
                disabled={loading}
                className="w-full p-2.5 rounded-xl border border-[#E8E3F3] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5] text-xs text-[#202044] resize-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="pt-3 border-t border-[#F0EDF8] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-[#77758A]">
            AI ensures strict quote-level traceability. Ambiguities and conflicts will be highlighted.
          </p>

          <button
            onClick={handleAnalyze}
            disabled={loading || !title.trim() || (files.length === 0 && !pastedText.trim())}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 h-9 rounded-lg bg-[#7439D5] hover:bg-[#602BB7] text-white font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            <span>Analyze Requirements</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ask About Document Panel */}
      <div className="bg-white rounded-xl shadow-xs border border-[#E8E3F3] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#7439D5]" />
          <h3 className="text-xs font-bold text-[#202044] uppercase tracking-wider">
            Ask About Documents
          </h3>
        </div>
        <p className="text-xs text-[#77758A]">
          Directly query uploaded documents with passage-level source citations.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. What is the peak concurrency SLA or payment gateway mentioned?"
            value={qaQuestion}
            onChange={(e) => setQaQuestion(e.target.value)}
            disabled={qaLoading}
            className="flex-1 h-9 px-3 rounded-lg border border-[#E8E3F3] text-xs text-[#202044] focus:outline-none focus:ring-2 focus:ring-[#7439D5]/20 focus:border-[#7439D5]"
          />
          <button
            onClick={handleAskQuestion}
            disabled={qaLoading || !qaQuestion.trim()}
            className="px-3.5 h-9 bg-[#7439D5] text-white rounded-lg text-xs font-semibold hover:bg-[#602BB7] disabled:opacity-50 flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Query</span>
          </button>
        </div>

        {qaAnswer && (
          <div className="p-3.5 rounded-lg bg-[#F5F2FC] border border-[#E8E3F3] text-xs space-y-2 mt-2">
            <div className="font-semibold text-[#202044]">Answer:</div>
            <p className="text-[#202044] leading-relaxed">{qaAnswer.answer}</p>
            {qaAnswer.citations && qaAnswer.citations.length > 0 && (
              <div className="pt-2 border-t border-[#E8E3F3]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block mb-1">
                  Citations:
                </span>
                <ul className="text-[11px] text-[#7439D5] list-disc list-inside space-y-0.5">
                  {qaAnswer.citations.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
