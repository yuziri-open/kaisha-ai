import type Database from "better-sqlite3";
import type { SseService } from "./services/sse.js";

export type AgentStatus = string;
export type TaskStatus = string;
export type TaskPriority = string;
export type GoalLevel = string;
export type RoutineScheduleType = "cron" | "interval";
export type RoutineRunStatus = string;
export type ApprovalStatus = string;
export type RunStatus = "pending" | "running" | "completed" | "failed";
export type ChatMessageRole = "user" | "assistant" | "system";

export interface CodexAdapterConfig {
  model?: string;
  cwd?: string;
  fullAuto?: boolean;
  reasoningEffort?: string;
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

export interface OpenClawAdapterConfig {
  model?: string;
  gatewayUrl?: string;
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

export interface DashboardResponse {
  summary: {
    activeAgents: number;
    inProgressTasks: number;
    monthlyCost: number;
    pendingApprovals: number;
  };
  activities: ActivityItem[];
  liveAgents: AgentLiveCard[];
}

export interface AgentRecord {
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
  adapterConfig: CodexAdapterConfig | ClaudeAdapterConfig | OpenClawAdapterConfig;
  createdAt: string;
  updatedAt: string;
}

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

export interface AgentDetailResponse {
  agent: AgentRecord;
  taskHistory: TaskRecord[];
  heartbeats: HeartbeatLog[];
}

export interface RunRecord {
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

export interface ChatMessageRecord {
  id: string;
  agentId: string;
  runId: string | null;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
}

export interface AgentChatResponse {
  agentId: string;
  messages: ChatMessageRecord[];
  runs: RunRecord[];
}

export interface TaskRecord {
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

export interface GoalRecord {
  id: string;
  title: string;
  description: string;
  level: GoalLevel;
  parentId: string | null;
  progress: number;
  status: string;
  owner: string;
  children: GoalRecord[];
}

export interface RoutineRecord {
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
  lastStatus: RoutineRunStatus;
  runs: RoutineRun[];
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRun {
  id: string;
  routineId: string;
  triggerType: string;
  status: RoutineRunStatus;
  log: string;
  startedAt: string;
  finishedAt: string | null;
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

export interface ApprovalRecord {
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

export interface CostsResponse {
  budget: number;
  spent: number;
  remaining: number;
  trend: Array<{ month: string; value: number }>;
  breakdown: Array<{ agentId: string; agentName: string; amount: number; color: string }>;
}

export interface SettingsResponse {
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

export interface AppContext {
  db: Database.Database;
  sse: SseService;
}
