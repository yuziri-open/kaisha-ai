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
  Task,
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
  activities: () => request<ActivityItem[]>("/api/activity"),
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
};
