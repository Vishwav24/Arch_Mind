"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network,
  Download,
  Layers,
  Code,
  Info,
  CheckCircle2,
  FileText,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  getArchitecture,
  generateArchitecture,
  getDecisions,
  Component,
  Connection,
  ADR,
} from "@/lib/api";
import { ArchitectureNode } from "@/components/ArchitectureNode";
import { EmptyState } from "@/components/EmptyState";
import { ProgressBar } from "@/components/ProgressBar";

const nodeTypes = {
  archNode: ArchitectureNode,
};

export default function ArchitecturePage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [decisions, setDecisions] = useState<ADR[]>([]);
  const [selectedNode, setSelectedNode] = useState<Component | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showMermaidModal, setShowMermaidModal] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const activeProjectId =
    typeof window !== "undefined"
      ? localStorage.getItem("archmind_active_project_id")
      : null;

  useEffect(() => {
    if (activeProjectId) {
      loadArchitecture();
    }
  }, [activeProjectId]);

  const loadArchitecture = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const [arch, decs] = await Promise.all([
        getArchitecture(activeProjectId),
        getDecisions(activeProjectId).catch(() => []),
      ]);
      setComponents(arch.components || []);
      setConnections(arch.connections || []);
      setDecisions(decs || []);
      layoutGraph(arch.components || [], arch.connections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!activeProjectId) return;
    setGenerating(true);
    try {
      const res = await generateArchitecture(activeProjectId);
      setComponents(res.components || []);
      setConnections(res.connections || []);
      setDecisions(res.decisions || []);
      layoutGraph(res.components || [], res.connections || []);
    } catch (e) {
      console.error("Generation error:", e);
    } finally {
      setGenerating(false);
    }
  };

  // Simple clean multi-tier auto-layout
  const layoutGraph = (comps: Component[], conns: Connection[]) => {
    const typeOrder = [
      "frontend",
      "infra",
      "security",
      "service",
      "queue",
      "cache",
      "database",
      "external",
    ];

    const groups: Record<string, Component[]> = {};
    comps.forEach((c) => {
      const t = (c.type || "service").toLowerCase();
      if (!groups[t]) groups[t] = [];
      groups[t].push(c);
    });

    const flowNodes: Node[] = [];
    let currentY = 50;

    typeOrder.forEach((t) => {
      const items = groups[t] || [];
      if (items.length > 0) {
        const spacingX = 280;
        const startX = Math.max(50, 600 - (items.length * spacingX) / 2);

        items.forEach((comp, idx) => {
          flowNodes.push({
            id: comp.id,
            type: "archNode",
            position: { x: startX + idx * spacingX, y: currentY },
            data: {
              ...comp,
              is_affected: false,
            },
          });
        });
        currentY += 170;
      }
    });

    Object.keys(groups).forEach((t) => {
      if (!typeOrder.includes(t)) {
        const items = groups[t];
        const spacingX = 280;
        const startX = 50;
        items.forEach((comp, idx) => {
          flowNodes.push({
            id: comp.id,
            type: "archNode",
            position: { x: startX + idx * spacingX, y: currentY },
            data: { ...comp, is_affected: false },
          });
        });
        currentY += 170;
      }
    });

    const flowEdges: Edge[] = conns.map((conn, idx) => {
      const fromId = conn.from_component;
      const toId = conn.to_component;
      return {
        id: conn.id || `e-${idx}`,
        source: fromId,
        target: toId,
        label: conn.protocol || undefined,
        animated: true,
        style: { stroke: "#7439D5", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#7439D5",
        },
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      const comp = components.find((c) => c.id === node.id);
      if (comp) setSelectedNode(comp);
    },
    [components]
  );

  const mermaidCode = useMemo(() => {
    const lines = ["graph TD"];
    components.forEach((c) => {
      const id = c.id.replace("-", "_");
      const name = c.name.replace('"', "'");
      lines.push(`    ${id}["${name} (${c.type})"]`);
    });
    connections.forEach((conn) => {
      const src = conn.from_component.replace("-", "_");
      const tgt = conn.to_component.replace("-", "_");
      const proto = conn.protocol ? `|${conn.protocol}|` : "";
      lines.push(`    ${src} -->${proto} ${tgt}`);
    });
    return lines.join("\n");
  }, [components, connections]);

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
    <div className="flex flex-col space-y-4 h-[calc(100vh-6.5rem)]">
      {/* Action Bar */}
      <div className="bg-[#2563EB] text-white px-5 py-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-700/70 rounded-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Software Architecture Diagram</h1>
            <p className="text-[11px] text-blue-100">
              Interactive system topology synthesized with strict requirement traceability.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowMermaidModal(true)}
            disabled={components.length === 0}
            className="h-8 px-3 rounded-lg bg-blue-700/80 hover:bg-blue-800 text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Mermaid Export</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="h-8 px-3.5 rounded-lg bg-white text-blue-900 hover:bg-blue-50 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{components.length > 0 ? "Regenerate" : "Generate Architecture"}</span>
          </button>
        </div>
      </div>

      {generating && (
        <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E8E3F3] shrink-0">
          <ProgressBar currentStep="AI Reasoning tier synthesizing architecture..." progress={65} />
        </div>
      )}

      {/* Main React Flow Canvas */}
      <div className="flex-1 bg-white rounded-xl border border-[#E8E3F3] overflow-hidden relative shadow-xs min-h-[450px]">
        {components.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              title="No Architecture Generated"
              description="Click 'Generate Architecture' above to synthesize components, connections, and ADRs."
              actionLabel="Generate Architecture"
              onAction={handleGenerate}
            />
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background color="#E2D9F3" gap={20} size={1} />
            <Controls className="!bg-white !border-[#E8E3F3] !shadow-xs !rounded-lg" />
            <MiniMap
              nodeStrokeColor="#7439D5"
              nodeColor="#F5F2FC"
              nodeBorderRadius={6}
              className="!bg-white !border-[#E8E3F3] !shadow-xs !rounded-lg"
            />
          </ReactFlow>
        )}

        {/* Selected Component Detail Drawer */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-84 sm:w-96 max-h-[calc(100%-1.5rem)] bg-white rounded-xl shadow-lg border border-[#E8E3F3] p-4 overflow-y-auto space-y-3 z-10 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-[#F0EDF8] pb-2.5">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#7439D5] bg-[#7439D5]/10 px-2 py-0.5 rounded">
                  {selectedNode.id}
                </span>
                <h3 className="font-bold text-sm text-[#202044] mt-1">
                  {selectedNode.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-[#77758A] hover:text-[#202044] rounded-md hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block mb-1">
                Type &amp; Status
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold bg-gray-100 text-[#202044] px-2 py-0.5 rounded capitalize">
                  {selectedNode.type}
                </span>
                <span className="text-xs font-semibold bg-purple-50 text-[#7439D5] px-2 py-0.5 rounded capitalize">
                  {selectedNode.change_status}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block mb-1">
                Description
              </span>
              <p className="text-xs text-[#202044] leading-relaxed bg-[#F5F2FC] p-2.5 rounded-lg border border-[#E8E3F3]">
                {selectedNode.description || "No description provided."}
              </p>
            </div>

            {selectedNode.responsibilities && selectedNode.responsibilities.length > 0 && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block mb-1">
                  Responsibilities
                </span>
                <ul className="text-xs text-[#202044] space-y-1 list-disc list-inside bg-[#F5F2FC] p-2.5 rounded-lg border border-[#E8E3F3]">
                  {selectedNode.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77758A] block mb-1">
                Traceable Requirements
              </span>
              <div className="flex flex-wrap gap-1">
                {selectedNode.satisfies && selectedNode.satisfies.length > 0 ? (
                  selectedNode.satisfies.map((rid) => (
                    <span
                      key={rid}
                      className="text-[11px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                    >
                      {rid}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-amber-600 italic">No mapped requirements (Assumption)</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mermaid Export Modal */}
      {showMermaidModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 space-y-3 shadow-xl border border-[#E8E3F3]">
            <div className="flex items-center justify-between border-b border-[#F0EDF8] pb-2">
              <h3 className="font-bold text-sm text-[#202044]">Mermaid Diagram Specification</h3>
              <button
                onClick={() => setShowMermaidModal(false)}
                className="text-[#77758A] hover:text-[#202044]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              readOnly
              value={mermaidCode}
              rows={10}
              className="w-full font-mono text-xs p-3 bg-gray-900 text-gray-100 rounded-lg"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mermaidCode);
                  setShowMermaidModal(false);
                }}
                className="h-8 px-3.5 bg-[#7439D5] text-white rounded-lg text-xs font-semibold hover:bg-[#602BB7] transition-colors"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
