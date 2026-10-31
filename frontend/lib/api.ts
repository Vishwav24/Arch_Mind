const API_BASE = "/api";

// Types
export interface Project {
  id: string;
  title: string;
  description: string;
  mode: "greenfield" | "brownfield";
  status: string;
  created_at: string;
}

export interface Requirement {
  id: string;
  text: string;
  type: string;
  priority: string;
  confidence: number;
  source: { doc: string; location: string; quote: string };
  provenance: string;
  status: string;
  version: number;
}

export interface Clarification {
  id: string;
  issue_id: string;
  question: string;
  answer: string;
  status: string;
  kind?: string;
  explanation?: string;
  requirement_ids?: string[];
  priority?: "High" | "Medium" | "Low";
  category?: string;
  suggested_answers?: string[];
}

export interface Component {
  id: string;
  name: string;
  type: string;
  description: string;
  responsibilities: string[];
  satisfies: string[];
  provenance: string;
  change_status: string;
}

export interface Connection {
  id: string;
  from_component: string;
  to_component: string;
  protocol: string;
  data_description: string;
}

export interface ADR {
  id: string;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  trade_offs: string[];
  related_requirement_ids: string[];
  status?: "Proposed" | "Accepted" | "Rejected" | "Superseded";
}

export interface Finding {
  id: string;
  type: string;
  severity: string;
  related_requirement_ids: string[];
  related_component_ids: string[];
  explanation: string;
}

export interface ImpactReport {
  changed_requirement_ids: string[];
  affected_component_ids: string[];
  explanation: string;
  recommended_changes: string[];
}

// API Functions
export async function createProject(data: { title: string; description: string; mode: string }): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadDocuments(projectId: string, files: File[]): Promise<unknown> {
  const formData = new FormData();
  files.forEach(f => formData.append("files", f));
  const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeProject(projectId: string, onProgress?: (msg: string) => void): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/analyze`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();

  if (reader) {
    let streamError: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split("\n").filter(l => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.step === "error") {
            streamError = data.message || "Analysis error";
          }
          onProgress?.(data.message || data.step || "Processing...");
        } catch {
          // ignore parse errors from partial chunks
        }
      }
    }
    if (streamError) {
      throw new Error(streamError);
    }
  }
}

export async function getRequirements(projectId: string): Promise<Requirement[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/requirements`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateRequirement(projectId: string, reqId: string, data: Partial<Requirement>): Promise<Requirement> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/requirements`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ req_id: reqId, ...data }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getClarifications(projectId: string): Promise<Clarification[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/clarifications`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function answerClarification(clarId: string, answer: string, status: string): Promise<Clarification> {
  const res = await fetch(`${API_BASE}/clarifications/${clarId}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer, status }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateArchitecture(projectId: string): Promise<{ style: string; components: Component[]; connections: Connection[]; decisions: ADR[]; rationale: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/architecture/generate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getArchitecture(projectId: string): Promise<{ components: Component[]; connections: Connection[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/architecture`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function validateArchitecture(projectId: string): Promise<{ findings: Finding[]; coverage_percent: number; total_requirements: number; covered_requirements: number }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/validate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTraceability(projectId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/traceability`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDecisions(projectId: string): Promise<ADR[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/decisions`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateDecisionStatus(projectId: string, adrId: string, status: string): Promise<ADR> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/decisions/${adrId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeImpact(projectId: string, changes: { req_id: string; new_text: string }[]): Promise<ImpactReport> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/impact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function askQuestion(projectId: string, question: string): Promise<{ answer: string; citations: string[] }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportProject(projectId: string, format: "md" | "pdf"): Promise<Blob> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/export?format=${format}`);
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export async function loadSampleProject(): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/sample`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function pasteRequirements(projectId: string, text: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/paste`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
