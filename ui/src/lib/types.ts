export type AgentStatus = string;
export type TaskStatus = string;
export type TaskPriority = string;
export type RoutineScheduleType = "cron" | "interval";
export type ApprovalStatus = string;
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type ChatMessageRole = "user" | "assistant" | "system";

export interface CodexAdapterConfig {
  model?: string;
  cwd?: string;
  fullAuto?: boolean;
  timeoutSec?: number;
  env?: Record<string, string>;
}

export interface ClaudeAdapterConfig {
  model?: string;
  cwd?: string;
  maxTurns?: number;
  timeoutSec?: number;
  env?: Record<string, string>;
}

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  description: string;
  occurredAt: string;
  entityType: string | null;
  entityId: string | null;
}

export interface DashboardData {
  summary: {
    activeAgents: number;
    inProgressTasks: number;
    monthlyCost: number;
    pendingApprovals: number;
  };
  activities: ActivityItem[];
  liveAgents: AgentLiveCard[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  team: string;
  status: AgentStatus;
  adapterType: string;
  reportsToId: string | null;
  lastHeartbeatAt: string | null;
  costPerHour: number;
  monthlyCost: number;
  prompt: string;
  skills: string[];
  color: string;
  adapterConfig: CodexAdapterConfig | ClaudeAdapterConfig;
  createdAt: string;
  updatedAt: string;
}

export type LiveAgent = AgentLiveCard;

export interface AgentLiveCard {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  message: string;
  cpuUsage: number;
  memoryUsage: number;
  lastHeartbeatAt: string | null;
  color: string;
}

export interface HeartbeatLog {
  id: string;
  agentId: string;
  status: AgentStatus;
  message: string;
  cpuUsage: number;
  memoryUsage: number;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TaskWorklog {
  id: string;
  summary: string;
  minutes: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  goalId: string | null;
  dueDate: string | null;
  attachments: string[];
  comments: TaskComment[];
  worklogs: TaskWorklog[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentDetailData {
  agent: Agent;
  taskHistory: Task[];
  heartbeats: HeartbeatLog[];
}

export interface ChatMessage {
  id: string;
  agentId: string;
  runId: string | null;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agentId: string;
  prompt: string;
  status: RunStatus;
  output: string;
  exitCode: number | null;
  model: string | null;
  cwd: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface AgentChatData {
  agentId: string;
  messages: ChatMessage[];
  runs: AgentRun[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  level: string;
  parentId: string | null;
  progress: number;
  status: string;
  owner: string;
  children: Goal[];
}

export interface RoutineRun {
  id: string;
  routineId: string;
  triggerType: string;
  status: string;
  log: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  agentId: string | null;
  scheduleType: RoutineScheduleType;
  cronExpression: string | null;
  intervalMinutes: number | null;
  isEnabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatus: string;
  runs: RoutineRun[];
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  title: string;
  category: string;
  requester: string;
  status: ApprovalStatus;
  requestedAt: string;
  comment: string;
  targetType: string;
  targetId: string;
}

export interface CostsData {
  budget: number;
  spent: number;
  remaining: number;
  trend: Array<{ month: string; value: number }>;
  breakdown: Array<{ agentId: string; agentName: string; amount: number; color: string }>;
}

export interface SettingsData {
  company: {
    name: string;
    prefix: string;
    logo: string;
  };
  instance: {
    serverName: string;
    databasePath: string;
    authMode: string;
    apiToken: string;
  };
  skills: string[];
  setup: {
    completed: boolean;
    completedAt: string | null;
  };
}
