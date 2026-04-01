export type AgentStatus = "稼働中" | "待機" | "注意" | "停止";
export type TaskStatus = "バックログ" | "進行中" | "レビュー" | "完了";
export type TaskPriority = "低" | "中" | "高" | "緊急";
export type RoutineScheduleType = "cron" | "interval";
export type ApprovalStatus = "承認待ち" | "承認" | "却下";

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

export interface Goal {
  id: string;
  title: string;
  description: string;
  level: "会社" | "プロジェクト" | "タスク";
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

