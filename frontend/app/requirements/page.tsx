"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  Save,
  X,
  Sparkles,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { getRequirements, updateRequirement, Requirement } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("");

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const pid = typeof window !== "undefined" ? localStorage.getItem("archmind_active_project_id") : null;
    setActiveProjectId(pid);
    if (pid) {
      loadData(pid);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (pid?: string) => {
    const idToFetch = pid || activeProjectId;
    if (!idToFetch) return;
    setLoading(true);
    try {
      console.log(`[Requirements] Fetching requirements for project ${idToFetch}...`);
      const data = await getRequirements(idToFetch);
      console.log(`[Requirements] Received ${data.length} requirements.`);
      setRequirements(data);
      if (data.length > 0) {
        setSelectedReq(data[0]);
      }
    } catch (e) {
      console.error("[Requirements] Failed to load requirements:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (req: Requirement) => {
    setEditingId(req.id);
    setEditText(req.text);
    setEditPriority(req.priority);
  };

  const handleSaveEdit = async (reqId: string) => {
    if (!activeProjectId) return;
    try {
      const updated = await updateRequirement(activeProjectId, reqId, {
        text: editText,
        priority: editPriority,
      });
      setRequirements((prev) => prev.map((r) => (r.id === reqId ? updated : r)));
      if (selectedReq?.id === reqId) setSelectedReq(updated);
      setEditingId(null);
    } catch (e) {
      console.error("Save error:", e);
    }
  };

  const filteredRequirements = requirements.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (
      searchQuery &&
      !r.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  if (!activeProjectId) {
    return (
      <EmptyState
        title="No Project Active"
        description="Select or create a software architecture project to view its requirements catalogue."
        actionLabel="Create Project"
        onAction={() => (window.location.href = "/")}
      />
    );
  }

  const confirmedCount = requirements.filter((r) => r.status === "confirmed").length;
  const assumptionCount = requirements.filter((r) => r.provenance === "ai_assumption").length;

  return (
    <div className="space-y-5">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E3F3] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#202044]">
              Requirements Explorer
            </h1>
            <span className="text-xs bg-[#7439D5]/10 text-[#7439D5] font-semibold px-2 py-0.5 rounded-md">
              {requirements.length} total
            </span>
          </div>
          <p className="text-xs text-[#77758A] mt-0.5">
            Classified functional and non-functional requirements with strict provenance citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E3F3] text-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="font-semibold text-[#202044]">{confirmedCount}</span>
            <span className="text-[#77758A]">Confirmed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E3F3] text-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="font-semibold text-[#202044]">{assumptionCount}</span>
            <span className="text-[#77758A]">Assumptions</span>
          </div>
        </div>
      </div>

      {/* Compact Search and Filter Controls Bar */}
      <div className="bg-white p-3 rounded-xl border border-[#E8E3F3] shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#77758A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by REQ ID or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-1 focus:ring-[#7439D5] focus:border-[#7439D5] bg-[#F5F2FC]/40 text-[#202044]"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 text-xs px-2.5 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-1 focus:ring-[#7439D5] bg-white text-[#202044]"
        >
          <option value="all">All Types</option>
          <option value="functional">Functional</option>
          <option value="non_functional">Non-Functional</option>
          <option value="security">Security</option>
          <option value="compliance">Compliance</option>
          <option value="business_constraint">Business Constraint</option>
          <option value="technical_constraint">Technical Constraint</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-9 text-xs px-2.5 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-1 focus:ring-[#7439D5] bg-white text-[#202044]"
        >
          <option value="all">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 text-xs px-2.5 rounded-lg border border-[#E8E3F3] focus:outline-none focus:ring-1 focus:ring-[#7439D5] bg-white text-[#202044]"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="confirmed">Confirmed</option>
          <option value="ambiguous">Ambiguous</option>
          <option value="conflicting">Conflicting</option>
        </select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={7} />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No Requirements in Catalogue"
          description="Synthesize or import software requirements from the New Project view to start exploring."
          actionLabel="Go to New Project"
          onAction={() => (window.location.href = "/")}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Main Structured Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E8E3F3] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAF8FE] text-[#77758A] border-b border-[#E8E3F3]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold text-[11px] uppercase tracking-wider">ID</th>
                    <th className="py-2.5 px-3.5 font-semibold text-[11px] uppercase tracking-wider">Requirement</th>
                    <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-wider">Type</th>
                    <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-wider">Priority</th>
                    <th className="py-2.5 px-3 font-semibold text-[11px] uppercase tracking-wider">Provenance</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-[11px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0ECF8]">
                  {filteredRequirements.map((req) => {
                    const isSelected = selectedReq?.id === req.id;
                    const isEditing = editingId === req.id;

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedReq(req)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-[#7439D5]/8" : "hover:bg-[#FAF8FE]"
                        }`}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-[#7439D5] whitespace-nowrap">
                          {req.id}
                        </td>
                        <td className="py-3 px-3.5">
                          {isEditing ? (
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 text-xs border border-[#7439D5] rounded-md focus:outline-none bg-white"
                              rows={2}
                            />
                          ) : (
                            <p className="line-clamp-2 text-xs text-[#202044] leading-relaxed font-medium">
                              {req.text}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="text-[11px] font-medium bg-[#F5F2FC] text-[#452080] px-2 py-0.5 rounded capitalize">
                            {req.type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value)}
                              className="text-xs p-1 border rounded"
                            >
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          ) : (
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                req.priority === "High"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : req.priority === "Medium"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {req.priority}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {req.provenance === "ai_assumption" ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              🤖 Assumption
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              📄 Source
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit(req.id);
                                }}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save changes"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(req);
                              }}
                              className="p-1 text-[#77758A] hover:text-[#7439D5] hover:bg-[#F5F2FC] rounded"
                              title="Edit requirement"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Right Citation Inspector */}
          <div className="bg-white rounded-xl border border-[#E8E3F3] shadow-xs p-5 space-y-4 sticky top-6">
            {selectedReq ? (
              <>
                <div className="border-b border-[#E8E3F3] pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#7439D5] bg-[#7439D5]/10 px-2 py-0.5 rounded">
                      {selectedReq.id}
                    </span>
                    <span className="text-[11px] text-[#77758A]">ver. {selectedReq.version}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      selectedReq.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : selectedReq.status === "ambiguous"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : selectedReq.status === "conflicting"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {selectedReq.status}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77758A] block mb-1">
                    Normalized Text
                  </span>
                  <p className="text-xs text-[#202044] leading-relaxed font-medium bg-[#FAF8FE] p-3 rounded-lg border border-[#E8E3F3]">
                    {selectedReq.text}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#FAF8FE] p-2.5 rounded-lg border border-[#E8E3F3]">
                    <span className="text-[10px] text-[#77758A] block">Confidence</span>
                    <span className="font-bold text-[#202044]">
                      {Math.round((selectedReq.confidence || 0.8) * 100)}%
                    </span>
                  </div>
                  <div className="bg-[#FAF8FE] p-2.5 rounded-lg border border-[#E8E3F3]">
                    <span className="text-[10px] text-[#77758A] block">Type</span>
                    <span className="font-bold text-[#202044] capitalize">
                      {selectedReq.type.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Source Citation */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77758A] block mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#7439D5]" />
                    Source Citation
                  </span>
                  <div className="bg-[#F5F2FC] p-3 rounded-lg border border-[#E0D7F5] space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#452080] flex items-center justify-between">
                      <span className="truncate max-w-[170px]">{selectedReq.source?.doc || "User document"}</span>
                      {selectedReq.source?.location && (
                        <span className="text-[10px] bg-white text-[#7439D5] px-1.5 py-0.5 rounded border border-[#E0D7F5]">
                          {selectedReq.source.location}
                        </span>
                      )}
                    </div>
                    {selectedReq.source?.quote ? (
                      <blockquote className="text-xs italic text-[#452080] border-l-2 border-[#7439D5] pl-2 my-1">
                        &ldquo;{selectedReq.source.quote}&rdquo;
                      </blockquote>
                    ) : (
                      <p className="text-[11px] text-[#77758A] italic">No verbatim quote recorded.</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#77758A] text-center py-10">Select a requirement row to inspect details</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
