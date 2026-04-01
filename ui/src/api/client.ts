import type {
  Agent,
  AgentChatData,
  AgentDetailData,
  AgentRun,
  Approval,
  CostsData,
  DashboardData,
  Goal,
  Routine,
  SettingsData,
  Skill,
  Task,
  Workflow,
  WorkflowRun,
} from "@/lib/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "リクエストに失敗しました。");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  description: string;
  occurredAt: string;
  entityType: string | null;
  entityId: string | null;
};

export const api = {
  dashboard: () => request<DashboardData>("/api/dashboard"),
  activities: (kind?: string) =>
    request<{ items: ActivityItem[]; total: number }>(
      kind ? `/api/activity?kind=${encodeURIComponent(kind)}&limit=100` : "/api/activity?limit=100",
    ),
  agents: () => request<{ agents: Agent[]; orgChart: Array<Agent & { children: Agent[] }> }>("/api/agents"),
  agent: (agentId: string) => request<AgentDetailData>(`/api/agents/${agentId}`),
  createAgent: (payload: Partial<Agent>) =>
    request<AgentDetailData>("/api/agents", { method: "POST", body: JSON.stringify(payload) }),
  updateAgent: (agentId: string, payload: Partial<Agent>) =>
    request<AgentDetailData>(`/api/agents/${agentId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAgent: (agentId: string) => request<void>(`/api/agents/${agentId}`, { method: "DELETE" }),
  agentChat: (agentId: string) => request<AgentChatData>(`/api/agents/${agentId}/chat`),
  sendAgentMessage: (agentId: string, payload: { message: string; config?: Agent["adapterConfig"] }) =>
    request<{ run: AgentRun | null; message: AgentChatData["messages"][number] }>(`/api/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  agentRuns: (agentId: string) => request<{ runs: AgentRun[] }>(`/api/agents/${agentId}/runs`),
  agentRun: (agentId: string, runId: string) => request<{ run: AgentRun }>(`/api/agents/${agentId}/runs/${runId}`),
  cancelRun: (agentId: string, runId: string) =>
    request<{ cancelled: boolean }>(`/api/agents/${agentId}/runs/${runId}/cancel`, { method: "POST" }),
  tasks: () => request<{ tasks: Task[] }>("/api/tasks"),
  task: (taskId: string) => request<Task>(`/api/tasks/${taskId}`),
  createTask: (payload: Partial<Task>) => request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(payload) }),
  updateTask: (taskId: string, payload: Partial<Task>) =>
    request<Task>(`/api/tasks/${taskId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTask: (taskId: string) => request<void>(`/api/tasks/${taskId}`, { method: "DELETE" }),
  goals: () => request<{ goals: Goal[] }>("/api/goals"),
  routines: () => request<{ routines: Routine[] }>("/api/routines"),
  createRoutine: (payload: Partial<Routine>) =>
    request<Routine>("/api/routines", { method: "POST", body: JSON.stringify(payload) }),
  updateRoutine: (id: string, payload: Partial<Routine>) =>
    request<Routine>(`/api/routines/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  triggerRoutine: (id: string) => request<Routine>(`/api/routines/${id}/trigger`, { method: "POST" }),
  deleteRoutine: (id: string) => request<void>(`/api/routines/${id}`, { method: "DELETE" }),
  costs: () => request<CostsData>("/api/costs"),
  approvals: () => request<{ approvals: Approval[] }>("/api/approvals"),
  decideApproval: (id: string, decision: string, comment: string) =>
    request<Approval>(`/api/approvals/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, comment }),
    }),
  settings: () => request<SettingsData>("/api/settings"),
  updateSettings: (payload: Partial<SettingsData>) =>
    request<SettingsData>("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("アップロードに失敗しました。");
    return res.json() as Promise<{
      id: string;
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
    }>;
  },
  browsePath: (dirPath: string) =>
    request<{
      path: string;
      parent: string;
      entries: Array<{ name: string; type: "file" | "directory"; size: number }>;
    }>(`/api/filesystem/browse?path=${encodeURIComponent(dirPath)}`),
  drives: () => request<{ drives: string[] }>("/api/filesystem/drives"),
  skills: () => request<{ skills: Skill[] }>("/api/skills"),
  skill: (id: string) => request<Skill>(`/api/skills/${id}`),
  createSkill: (payload: Partial<Skill>) => request<Skill>("/api/skills", { method: "POST", body: JSON.stringify(payload) }),
  updateSkill: (id: string, payload: Partial<Skill>) => request<Skill>(`/api/skills/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSkill: (id: string) => request<void>(`/api/skills/${id}`, { method: "DELETE" }),
  importSkills: () => request<{ imported: string[] }>("/api/skills/import", { method: "POST" }),
  agentSkills: (agentId: string) => request<{ skills: Skill[] }>(`/api/agents/${agentId}/skills`),
  setAgentSkills: (agentId: string, skillIds: string[]) => request<{ skills: Skill[] }>(`/api/agents/${agentId}/skills`, { method: "POST", body: JSON.stringify({ skillIds }) }),
  workflows: () => request<{ workflows: Workflow[] }>("/api/workflows"),
  workflow: (id: string) => request<Workflow & { runs: WorkflowRun[] }>(`/api/workflows/${id}`),
  createWorkflow: (payload: Partial<Workflow>) => request<Workflow>("/api/workflows", { method: "POST", body: JSON.stringify(payload) }),
  updateWorkflow: (id: string, payload: Partial<Workflow>) => request<Workflow>(`/api/workflows/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteWorkflow: (id: string) => request<void>(`/api/workflows/${id}`, { method: "DELETE" }),
  runWorkflow: (id: string, input: string) => request<WorkflowRun>(`/api/workflows/${id}/run`, { method: "POST", body: JSON.stringify({ input }) }),
  workflowRuns: (id: string) => request<{ runs: WorkflowRun[] }>(`/api/workflows/${id}/runs`),
  workflowRun: (runId: string) => request<WorkflowRun>(`/api/workflow-runs/${runId}`),
};
