import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  ActivityItem,
  AgentChatResponse,
  ChatMessageRecord,
  ChatMessageRole,
  CodexAdapterConfig,
  AgentDetailResponse,
  AgentRecord,
  AgentStatus,
  ApprovalRecord,
  CostsResponse,
  DashboardResponse,
  GoalRecord,
  HeartbeatLog,
  RunRecord,
  RunStatus,
  RoutineRecord,
  RoutineRun,
  RoutineScheduleType,
  SettingsResponse,
  TaskComment,
  TaskRecord,
  TaskStatus,
  TaskWorklog,
} from "../types.js";

type Row = Record<string, unknown>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseAdapterConfig(value: unknown): CodexAdapterConfig {
  const parsed = parseJson<Record<string, unknown>>(value, {});
  return {
    model: typeof parsed.model === "string" ? parsed.model : undefined,
    cwd: typeof parsed.cwd === "string" ? parsed.cwd : undefined,
    fullAuto: typeof parsed.fullAuto === "boolean" ? parsed.fullAuto : undefined,
    timeoutSec: typeof parsed.timeoutSec === "number" ? parsed.timeoutSec : undefined,
    env:
      typeof parsed.env === "object" && parsed.env !== null && !Array.isArray(parsed.env)
        ? Object.fromEntries(
            Object.entries(parsed.env).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : undefined,
  };
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function mapActivity(row: Row): ActivityItem {
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    description: String(row.description),
    occurredAt: String(row.occurred_at),
    entityType: row.entity_type ? String(row.entity_type) : null,
    entityId: row.entity_id ? String(row.entity_id) : null,
  };
}

function mapTask(db: Database.Database, row: Row): TaskRecord {
  const comments = db.prepare(`
    SELECT id, author, body, created_at
    FROM task_comments
    WHERE task_id = ?
    ORDER BY created_at DESC
  `).all(row.id) as Row[];

  const worklogs = db.prepare(`
    SELECT id, summary, minutes, created_at
    FROM task_worklogs
    WHERE task_id = ?
    ORDER BY created_at DESC
  `).all(row.id) as Row[];

  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    status: String(row.status) as TaskStatus,
    priority: String(row.priority) as TaskRecord["priority"],
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    goalId: row.goal_id ? String(row.goal_id) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    attachments: parseJson<string[]>(row.attachments_json, []),
    comments: comments.map((comment): TaskComment => ({
      id: String(comment.id),
      author: String(comment.author),
      body: String(comment.body),
      createdAt: String(comment.created_at),
    })),
    worklogs: worklogs.map((worklog): TaskWorklog => ({
      id: String(worklog.id),
      summary: String(worklog.summary),
      minutes: Number(worklog.minutes),
      createdAt: String(worklog.created_at),
    })),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAgent(db: Database.Database, row: Row): AgentRecord {
  const currentMonth = `${monthKey(new Date())}%`;
  const costRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS value
    FROM cost_entries
    WHERE agent_id = ? AND occurred_at LIKE ?
  `).get(row.id, currentMonth) as Row;

  return {
    id: String(row.id),
    name: String(row.name),
    role: String(row.role),
    team: String(row.team),
    status: String(row.status) as AgentStatus,
    adapterType: String(row.adapter_type),
    reportsToId: row.reports_to_id ? String(row.reports_to_id) : null,
    lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
    costPerHour: Number(row.cost_per_hour),
    monthlyCost: Number(costRow.value ?? 0),
    prompt: String(row.prompt ?? ""),
    skills: parseJson<string[]>(row.skills_json, []),
    color: String(row.color ?? "#007AFF"),
    adapterConfig: parseAdapterConfig(row.adapter_config_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRun(row: Row): RunRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    prompt: String(row.prompt),
    status: String(row.status) as RunStatus,
    output: String(row.output ?? ""),
    exitCode: row.exit_code === null || row.exit_code === undefined ? null : Number(row.exit_code),
    model: row.model ? String(row.model) : null,
    cwd: row.cwd ? String(row.cwd) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    createdAt: String(row.created_at),
  };
}

function mapChatMessage(row: Row): ChatMessageRecord {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    runId: row.run_id ? String(row.run_id) : null,
    role: String(row.role) as ChatMessageRole,
    content: String(row.content ?? ""),
    createdAt: String(row.created_at),
  };
}

function mapHeartbeat(row: Row): HeartbeatLog {
  return {
    id: String(row.id),
    agentId: String(row.agent_id),
    status: String(row.status) as AgentStatus,
    message: String(row.message),
    cpuUsage: Number(row.cpu_usage),
    memoryUsage: Number(row.memory_usage),
    createdAt: String(row.created_at),
  };
}

function mapRoutine(db: Database.Database, row: Row): RoutineRecord {
  const runs = db.prepare(`
    SELECT id, routine_id, trigger_type, status, log, started_at, finished_at
    FROM routine_runs
    WHERE routine_id = ?
    ORDER BY started_at DESC
    LIMIT 5
  `).all(row.id) as Row[];

  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    agentId: row.agent_id ? String(row.agent_id) : null,
    scheduleType: String(row.schedule_type) as RoutineScheduleType,
    cronExpression: row.cron_expression ? String(row.cron_expression) : null,
    intervalMinutes: row.interval_minutes !== null ? Number(row.interval_minutes) : null,
    isEnabled: Number(row.is_enabled) === 1,
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
    nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
    lastStatus: String(row.last_status) as RoutineRecord["lastStatus"],
    runs: runs.map((run): RoutineRun => ({
      id: String(run.id),
      routineId: String(run.routine_id),
      triggerType: String(run.trigger_type),
      status: String(run.status) as RoutineRecord["lastStatus"],
      log: String(run.log),
      startedAt: String(run.started_at),
      finishedAt: run.finished_at ? String(run.finished_at) : null,
    })),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function computeNextRunFromSchedule(opts: {
  scheduleType: RoutineScheduleType;
  cronExpression: string | null;
  intervalMinutes: number | null;
  reference?: Date;
}) {
  const base = opts.reference ? new Date(opts.reference) : new Date();

  if (opts.scheduleType === "interval") {
    const minutes = Math.max(5, opts.intervalMinutes ?? 30);
    return new Date(base.getTime() + minutes * 60 * 1000);
  }

  const expression = (opts.cronExpression ?? "0 * * * *").trim();
  const [minuteField, hourField] = expression.split(/\s+/);
  const next = new Date(base);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  if (minuteField?.startsWith("*/")) {
    const step = Number(minuteField.slice(2));
    if (Number.isFinite(step) && step > 0) {
      const currentMinute = next.getMinutes();
      const nextMinute = currentMinute + (step - (currentMinute % step || step));
      next.setMinutes(nextMinute);
      return next;
    }
  }

  if (minuteField && hourField === "*") {
    const minute = Number(minuteField);
    if (Number.isFinite(minute)) {
      if (next.getMinutes() > minute) {
        next.setHours(next.getHours() + 1);
      }
      next.setMinutes(minute, 0, 0);
      return next;
    }
  }

  const minute = Number(minuteField);
  const hour = Number(hourField);
  if (Number.isFinite(minute) && Number.isFinite(hour)) {
    next.setHours(hour, minute, 0, 0);
    if (next <= base) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export const store = {
  listDashboard(db: Database.Database): DashboardResponse {
    const summaryRow = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM agents WHERE status = '稼働中') AS active_agents,
        (SELECT COUNT(*) FROM tasks WHERE status IN ('進行中', 'レビュー')) AS in_progress_tasks,
        (SELECT COALESCE(SUM(amount), 0) FROM cost_entries WHERE occurred_at LIKE ?) AS monthly_cost,
        (SELECT COUNT(*) FROM approvals WHERE status = '承認待ち') AS pending_approvals
    `).get(`${monthKey(new Date())}%`) as Row;

    const activities = db.prepare(`
      SELECT id, kind, title, description, occurred_at, entity_type, entity_id
      FROM activities
      ORDER BY occurred_at DESC
      LIMIT 10
    `).all() as Row[];

    const liveAgents = db.prepare(`
      SELECT
        a.id,
        a.name,
        a.role,
        a.status,
        a.last_heartbeat_at,
        a.color,
        h.message,
        h.cpu_usage,
        h.memory_usage
      FROM agents a
      LEFT JOIN agent_heartbeats h
        ON h.id = (
          SELECT id
          FROM agent_heartbeats ah
          WHERE ah.agent_id = a.id
          ORDER BY ah.created_at DESC
          LIMIT 1
        )
      ORDER BY a.updated_at DESC
      LIMIT 6
    `).all() as Row[];

    return {
      summary: {
        activeAgents: Number(summaryRow.active_agents),
        inProgressTasks: Number(summaryRow.in_progress_tasks),
        monthlyCost: Number(summaryRow.monthly_cost),
        pendingApprovals: Number(summaryRow.pending_approvals),
      },
      activities: activities.map(mapActivity),
      liveAgents: liveAgents.map((row: Row) => ({
        id: String(row.id),
        name: String(row.name),
        role: String(row.role),
        status: String(row.status) as AgentStatus,
        message: String(row.message ?? "Heartbeat 待機中"),
        cpuUsage: Number(row.cpu_usage ?? 0),
        memoryUsage: Number(row.memory_usage ?? 0),
        lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
        color: String(row.color ?? "#007AFF"),
      })),
    };
  },

  listActivities(db: Database.Database, limit = 20) {
    return db.prepare(`
      SELECT id, kind, title, description, occurred_at, entity_type, entity_id
      FROM activities
      ORDER BY occurred_at DESC
      LIMIT ?
    `).all(limit).map((row: unknown) => mapActivity(row as Row));
  },

  listActivitiesFiltered(
    db: Database.Database,
    opts: { kind?: string; limit: number; offset: number },
  ) {
    if (opts.kind) {
      const rows = db.prepare(`
        SELECT id, kind, title, description, occurred_at, entity_type, entity_id
        FROM activities
        WHERE kind = ?
        ORDER BY occurred_at DESC
        LIMIT ? OFFSET ?
      `).all(opts.kind, opts.limit, opts.offset) as Row[];
      const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM activities WHERE kind = ?`).get(opts.kind) as Row;
      return { items: rows.map(mapActivity), total: Number(totalRow.cnt) };
    }
    const rows = db.prepare(`
      SELECT id, kind, title, description, occurred_at, entity_type, entity_id
      FROM activities
      ORDER BY occurred_at DESC
      LIMIT ? OFFSET ?
    `).all(opts.limit, opts.offset) as Row[];
    const totalRow = db.prepare(`SELECT COUNT(*) AS cnt FROM activities`).get() as Row;
    return { items: rows.map(mapActivity), total: Number(totalRow.cnt) };
  },

  addActivity(
    db: Database.Database,
    input: { kind: string; title: string; description: string; entityType?: string | null; entityId?: string | null }
  ) {
    const activity = {
      id: randomUUID(),
      kind: input.kind,
      title: input.title,
      description: input.description,
      occurredAt: new Date().toISOString(),
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    };
    db.prepare(`
      INSERT INTO activities (id, kind, title, description, occurred_at, entity_type, entity_id)
      VALUES (@id, @kind, @title, @description, @occurredAt, @entityType, @entityId)
    `).run(activity);
    return activity;
  },

  listAgents(db: Database.Database) {
    const rows = db.prepare(`
      SELECT *
      FROM agents
      ORDER BY
        CASE status
          WHEN '稼働中' THEN 0
          WHEN '待機' THEN 1
          WHEN '注意' THEN 2
          ELSE 3
        END,
        name
    `).all() as Row[];
    return rows.map((row: Row) => mapAgent(db, row));
  },

  getAgent(db: Database.Database, agentId: string) {
    const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as Row | undefined;
    return row ? mapAgent(db, row) : null;
  },

  getAgentDetail(db: Database.Database, agentId: string): AgentDetailResponse | null {
    const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as Row | undefined;
    if (!row) return null;

    const taskHistory = db.prepare(`
      SELECT *
      FROM tasks
      WHERE assignee_id = ?
      ORDER BY updated_at DESC
      LIMIT 12
    `).all(agentId) as Row[];

    const heartbeats = db.prepare(`
      SELECT *
      FROM agent_heartbeats
      WHERE agent_id = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).all(agentId) as Row[];

    return {
      agent: mapAgent(db, row),
      taskHistory: taskHistory.map((task) => mapTask(db, task)),
      heartbeats: heartbeats.map((heartbeat) => mapHeartbeat(heartbeat)),
    };
  },

  listAgentRuns(db: Database.Database, agentId: string) {
    return db.prepare(`
      SELECT *
      FROM runs
      WHERE agent_id = ?
      ORDER BY created_at DESC
    `).all(agentId).map((row: unknown) => mapRun(row as Row));
  },

  getRun(db: Database.Database, agentId: string, runId: string) {
    const row = db.prepare(`
      SELECT *
      FROM runs
      WHERE id = ? AND agent_id = ?
    `).get(runId, agentId) as Row | undefined;
    return row ? mapRun(row) : null;
  },

  createRun(
    db: Database.Database,
    input: {
      agentId: string;
      prompt: string;
      model?: string | null;
      cwd?: string | null;
      status?: RunStatus;
    },
  ) {
    const run = {
      id: randomUUID(),
      agentId: input.agentId,
      prompt: input.prompt,
      status: input.status ?? "pending",
      output: "",
      exitCode: null,
      model: input.model ?? null,
      cwd: input.cwd ?? null,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date().toISOString(),
    };
    db.prepare(`
      INSERT INTO runs (
        id, agent_id, prompt, status, output, exit_code, model, cwd, started_at, finished_at, created_at
      ) VALUES (
        @id, @agentId, @prompt, @status, @output, @exitCode, @model, @cwd, @startedAt, @finishedAt, @createdAt
      )
    `).run(run);
    return this.getRun(db, input.agentId, run.id);
  },

  updateRun(
    db: Database.Database,
    runId: string,
    input: {
      status?: RunStatus;
      output?: string;
      exitCode?: number | null;
      model?: string | null;
      cwd?: string | null;
      startedAt?: string | null;
      finishedAt?: string | null;
    },
  ) {
    const current = db.prepare("SELECT * FROM runs WHERE id = ?").get(runId) as Row | undefined;
    if (!current) return null;
    const next = {
      id: String(current.id),
      agentId: String(current.agent_id),
      prompt: String(current.prompt),
      status: input.status ?? (String(current.status) as RunStatus),
      output: input.output ?? String(current.output ?? ""),
      exitCode:
        input.exitCode === undefined
          ? current.exit_code === null || current.exit_code === undefined
            ? null
            : Number(current.exit_code)
          : input.exitCode,
      model: input.model ?? (current.model ? String(current.model) : null),
      cwd: input.cwd ?? (current.cwd ? String(current.cwd) : null),
      startedAt:
        input.startedAt === undefined
          ? current.started_at
            ? String(current.started_at)
            : null
          : input.startedAt,
      finishedAt:
        input.finishedAt === undefined
          ? current.finished_at
            ? String(current.finished_at)
            : null
          : input.finishedAt,
      createdAt: String(current.created_at),
    };

    db.prepare(`
      UPDATE runs
      SET status = @status,
          output = @output,
          exit_code = @exitCode,
          model = @model,
          cwd = @cwd,
          started_at = @startedAt,
          finished_at = @finishedAt
      WHERE id = @id
    `).run(next);

    return this.getRun(db, next.agentId, next.id);
  },

  listChatMessages(db: Database.Database, agentId: string) {
    return db.prepare(`
      SELECT *
      FROM chat_messages
      WHERE agent_id = ?
      ORDER BY created_at ASC
    `).all(agentId).map((row: unknown) => mapChatMessage(row as Row));
  },

  addChatMessage(
    db: Database.Database,
    input: { agentId: string; runId?: string | null; role: ChatMessageRole; content: string },
  ) {
    const message = {
      id: randomUUID(),
      agentId: input.agentId,
      runId: input.runId ?? null,
      role: input.role,
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    db.prepare(`
      INSERT INTO chat_messages (id, agent_id, run_id, role, content, created_at)
      VALUES (@id, @agentId, @runId, @role, @content, @createdAt)
    `).run(message);
    return mapChatMessage({
      id: message.id,
      agent_id: message.agentId,
      run_id: message.runId,
      role: message.role,
      content: message.content,
      created_at: message.createdAt,
    });
  },

  getAgentChat(db: Database.Database, agentId: string): AgentChatResponse {
    return {
      agentId,
      messages: this.listChatMessages(db, agentId),
      runs: this.listAgentRuns(db, agentId),
    };
  },

  saveAgent(db: Database.Database, payload: Partial<AgentRecord>) {
    const id = payload.id ?? randomUUID();
    const now = new Date().toISOString();
    const current = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Row | undefined;
    const next = {
      id,
      name: payload.name ?? current?.name ?? "新規エージェント",
      role: payload.role ?? current?.role ?? "未設定",
      team: payload.team ?? current?.team ?? "未設定",
      status: payload.status ?? current?.status ?? "待機",
      adapterType: payload.adapterType ?? current?.adapter_type ?? "OpenClaw",
      reportsToId: payload.reportsToId ?? current?.reports_to_id ?? null,
      lastHeartbeatAt: payload.lastHeartbeatAt ?? current?.last_heartbeat_at ?? null,
      costPerHour: payload.costPerHour ?? Number(current?.cost_per_hour ?? 20),
      prompt: payload.prompt ?? current?.prompt ?? "",
      skillsJson: JSON.stringify(payload.skills ?? parseJson<string[]>(current?.skills_json, [])),
      color: payload.color ?? current?.color ?? "#007AFF",
      adapterConfigJson: JSON.stringify(payload.adapterConfig ?? parseAdapterConfig(current?.adapter_config_json)),
      createdAt: current?.created_at ?? now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO agents (
        id, name, role, team, status, adapter_type, reports_to_id, last_heartbeat_at,
        cost_per_hour, prompt, skills_json, color, adapter_config_json, created_at, updated_at
      ) VALUES (
        @id, @name, @role, @team, @status, @adapterType, @reportsToId, @lastHeartbeatAt,
        @costPerHour, @prompt, @skillsJson, @color, @adapterConfigJson, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        team = excluded.team,
        status = excluded.status,
        adapter_type = excluded.adapter_type,
        reports_to_id = excluded.reports_to_id,
        last_heartbeat_at = excluded.last_heartbeat_at,
        cost_per_hour = excluded.cost_per_hour,
        prompt = excluded.prompt,
        skills_json = excluded.skills_json,
        color = excluded.color,
        adapter_config_json = excluded.adapter_config_json,
        updated_at = excluded.updated_at
    `).run(next);

    return this.getAgentDetail(db, id);
  },

  deleteAgent(db: Database.Database, agentId: string) {
    db.prepare("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ?").run(agentId);
    db.prepare("UPDATE agents SET reports_to_id = NULL WHERE reports_to_id = ?").run(agentId);
    db.prepare("DELETE FROM chat_messages WHERE agent_id = ?").run(agentId);
    db.prepare("DELETE FROM runs WHERE agent_id = ?").run(agentId);
    db.prepare("DELETE FROM agents WHERE id = ?").run(agentId);
  },

  listOrgChart(db: Database.Database) {
    const agents = this.listAgents(db);
    const map = new Map(agents.map((agent) => [agent.id, { ...agent, children: [] as Array<AgentRecord & { children: unknown[] }> }]));
    const roots: Array<AgentRecord & { children: unknown[] }> = [];
    for (const node of map.values()) {
      if (node.reportsToId && map.has(node.reportsToId)) {
        map.get(node.reportsToId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },

  listTasks(db: Database.Database) {
    return db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC").all().map((row: unknown) => mapTask(db, row as Row));
  },

  getTask(db: Database.Database, taskId: string) {
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as Row | undefined;
    return row ? mapTask(db, row) : null;
  },

  saveTask(db: Database.Database, payload: Partial<TaskRecord>) {
    const id = payload.id ?? randomUUID();
    const now = new Date().toISOString();
    const current = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row | undefined;
    const next = {
      id,
      title: payload.title ?? current?.title ?? "新規タスク",
      description: payload.description ?? current?.description ?? "",
      status: payload.status ?? current?.status ?? "バックログ",
      priority: payload.priority ?? current?.priority ?? "中",
      assigneeId: payload.assigneeId ?? current?.assignee_id ?? null,
      goalId: payload.goalId ?? current?.goal_id ?? null,
      dueDate: payload.dueDate ?? current?.due_date ?? null,
      attachmentsJson: JSON.stringify(payload.attachments ?? parseJson<string[]>(current?.attachments_json, [])),
      createdAt: current?.created_at ?? now,
      updatedAt: now,
    };

    db.prepare(`
      INSERT INTO tasks (
        id, title, description, status, priority, assignee_id, goal_id, due_date,
        attachments_json, created_at, updated_at
      ) VALUES (
        @id, @title, @description, @status, @priority, @assigneeId, @goalId, @dueDate,
        @attachmentsJson, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        priority = excluded.priority,
        assignee_id = excluded.assignee_id,
        goal_id = excluded.goal_id,
        due_date = excluded.due_date,
        attachments_json = excluded.attachments_json,
        updated_at = excluded.updated_at
    `).run(next);

    return this.getTask(db, id);
  },

  deleteTask(db: Database.Database, taskId: string) {
    db.prepare("DELETE FROM task_comments WHERE task_id = ?").run(taskId);
    db.prepare("DELETE FROM task_worklogs WHERE task_id = ?").run(taskId);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
  },

  listGoals(db: Database.Database) {
    const rows = db.prepare("SELECT * FROM goals ORDER BY level, created_at").all() as Row[];
    const nodes = new Map<string, GoalRecord>();
    rows.forEach((row) => {
      nodes.set(String(row.id), {
        id: String(row.id),
        title: String(row.title),
        description: String(row.description),
        level: String(row.level) as GoalRecord["level"],
        parentId: row.parent_id ? String(row.parent_id) : null,
        progress: Number(row.progress),
        status: String(row.status),
        owner: String(row.owner),
        children: [],
      });
    });
    const roots: GoalRecord[] = [];
    nodes.forEach((goal) => {
      if (goal.parentId && nodes.has(goal.parentId)) {
        nodes.get(goal.parentId)?.children.push(goal);
      } else {
        roots.push(goal);
      }
    });
    return roots;
  },

  listRoutines(db: Database.Database) {
    return db.prepare("SELECT * FROM routines ORDER BY updated_at DESC").all().map((row: unknown) => mapRoutine(db, row as Row));
  },

  saveRoutine(db: Database.Database, payload: Partial<RoutineRecord>) {
    const id = payload.id ?? randomUUID();
    const now = new Date();
    const current = db.prepare("SELECT * FROM routines WHERE id = ?").get(id) as Row | undefined;
    const scheduleType = (payload.scheduleType ?? current?.schedule_type ?? "interval") as RoutineScheduleType;
    const cronExpression = payload.cronExpression ?? (current?.cron_expression ? String(current.cron_expression) : null);
    const intervalMinutes = payload.intervalMinutes ?? (current?.interval_minutes !== null ? Number(current?.interval_minutes) : null);
    const next = {
      id,
      name: payload.name ?? current?.name ?? "新規ルーティン",
      description: payload.description ?? current?.description ?? "",
      agentId: payload.agentId ?? current?.agent_id ?? null,
      scheduleType,
      cronExpression,
      intervalMinutes,
      isEnabled: payload.isEnabled ?? (current ? Number(current.is_enabled) === 1 : true),
      lastRunAt: payload.lastRunAt ?? (current?.last_run_at ? String(current.last_run_at) : null),
      nextRunAt: computeNextRunFromSchedule({
        scheduleType,
        cronExpression,
        intervalMinutes,
        reference: now,
      }).toISOString(),
      lastStatus: payload.lastStatus ?? String(current?.last_status ?? "待機"),
      createdAt: current?.created_at ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };

    db.prepare(`
      INSERT INTO routines (
        id, name, description, agent_id, schedule_type, cron_expression, interval_minutes,
        is_enabled, last_run_at, next_run_at, last_status, created_at, updated_at
      ) VALUES (
        @id, @name, @description, @agentId, @scheduleType, @cronExpression, @intervalMinutes,
        @isEnabled, @lastRunAt, @nextRunAt, @lastStatus, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        agent_id = excluded.agent_id,
        schedule_type = excluded.schedule_type,
        cron_expression = excluded.cron_expression,
        interval_minutes = excluded.interval_minutes,
        is_enabled = excluded.is_enabled,
        last_run_at = excluded.last_run_at,
        next_run_at = excluded.next_run_at,
        last_status = excluded.last_status,
        updated_at = excluded.updated_at
    `).run({
      ...next,
      isEnabled: next.isEnabled ? 1 : 0,
    });

    return this.listRoutines(db).find((routine: RoutineRecord) => routine.id === id) ?? null;
  },

  deleteRoutine(db: Database.Database, routineId: string) {
    db.prepare("DELETE FROM routine_runs WHERE routine_id = ?").run(routineId);
    db.prepare("DELETE FROM routines WHERE id = ?").run(routineId);
  },

  triggerRoutine(db: Database.Database, routineId: string, triggerType = "手動") {
    const routine = db.prepare("SELECT * FROM routines WHERE id = ?").get(routineId) as Row | undefined;
    if (!routine) return null;
    const startedAt = new Date();
    const success = Math.random() > 0.12;
    const finishedAt = new Date(startedAt.getTime() + 45 * 1000);
    db.prepare(`
      INSERT INTO routine_runs (id, routine_id, trigger_type, status, log, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      routineId,
      triggerType,
      success ? "成功" : "失敗",
      success
        ? `${routine.name} を実行し、ダッシュボードへ結果を反映しました。`
        : `${routine.name} で外部依存エラーが発生しました。再実行を推奨します。`,
      startedAt.toISOString(),
      finishedAt.toISOString(),
    );

    db.prepare(`
      UPDATE routines
      SET last_run_at = ?, next_run_at = ?, last_status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      startedAt.toISOString(),
      computeNextRunFromSchedule({
        scheduleType: String(routine.schedule_type) as RoutineScheduleType,
        cronExpression: routine.cron_expression ? String(routine.cron_expression) : null,
        intervalMinutes: routine.interval_minutes !== null ? Number(routine.interval_minutes) : null,
        reference: startedAt,
      }).toISOString(),
      success ? "成功" : "失敗",
      finishedAt.toISOString(),
      routineId,
    );

    return this.listRoutines(db).find((item: RoutineRecord) => item.id === routineId) ?? null;
  },

  listApprovals(db: Database.Database) {
    return db.prepare("SELECT * FROM approvals ORDER BY requested_at DESC").all().map((row: unknown) => {
      const item = row as Row;
      return {
        id: String(item.id),
        title: String(item.title),
        category: String(item.category),
        requester: String(item.requester),
        status: String(item.status) as ApprovalRecord["status"],
        requestedAt: String(item.requested_at),
        comment: String(item.comment),
        targetType: String(item.target_type),
        targetId: String(item.target_id),
      };
    });
  },

  decideApproval(db: Database.Database, approvalId: string, decision: "承認" | "却下", comment: string) {
    db.prepare(`
      UPDATE approvals
      SET status = ?, comment = ?
      WHERE id = ?
    `).run(decision, comment, approvalId);
    return this.listApprovals(db).find((approval: ApprovalRecord) => approval.id === approvalId) ?? null;
  },

  getCosts(db: Database.Database): CostsResponse {
    const currentMonth = monthKey(new Date());
    const budgetRow = db.prepare(`
      SELECT limit_amount
      FROM budgets
      WHERE month = ?
    `).get(currentMonth) as Row | undefined;
    const spentRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS value
      FROM cost_entries
      WHERE occurred_at LIKE ?
    `).get(`${currentMonth}%`) as Row;
    const trend = db.prepare(`
      SELECT SUBSTR(occurred_at, 1, 7) AS month, ROUND(SUM(amount), 2) AS value
      FROM cost_entries
      GROUP BY SUBSTR(occurred_at, 1, 7)
      ORDER BY month DESC
      LIMIT 6
    `).all() as Row[];
    const breakdown = db.prepare(`
      SELECT a.id AS agent_id, a.name AS agent_name, a.color, ROUND(COALESCE(SUM(c.amount), 0), 2) AS amount
      FROM agents a
      LEFT JOIN cost_entries c
        ON c.agent_id = a.id
        AND c.occurred_at LIKE ?
      GROUP BY a.id, a.name, a.color
      ORDER BY amount DESC
    `).all(`${currentMonth}%`) as Row[];

    const budget = Number(budgetRow?.limit_amount ?? 0);
    const spent = Number(spentRow.value ?? 0);
    return {
      budget,
      spent,
      remaining: Math.max(0, budget - spent),
      trend: trend.reverse().map((row: Row) => ({ month: String(row.month), value: Number(row.value) })),
      breakdown: breakdown.map((row: Row) => ({
        agentId: String(row.agent_id),
        agentName: String(row.agent_name),
        amount: Number(row.amount),
        color: String(row.color),
      })),
    };
  },

  getSettings(db: Database.Database): SettingsResponse {
    const rows = db.prepare("SELECT key, value_json FROM settings").all() as Row[];
    const data = Object.fromEntries(rows.map((row: Row) => [String(row.key), parseJson(row.value_json, {})]));
    return {
      company: data.company as SettingsResponse["company"],
      instance: data.instance as SettingsResponse["instance"],
      skills: data.skills as SettingsResponse["skills"],
      setup: data.setup as SettingsResponse["setup"],
    };
  },

  saveSettings(db: Database.Database, payload: Partial<SettingsResponse>) {
    const current = this.getSettings(db);
    const next: SettingsResponse = {
      company: { ...current.company, ...(payload.company ?? {}) },
      instance: { ...current.instance, ...(payload.instance ?? {}) },
      skills: payload.skills ?? current.skills,
      setup: { ...current.setup, ...(payload.setup ?? {}) },
    };
    const insert = db.prepare("INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json");
    insert.run("company", JSON.stringify(next.company));
    insert.run("instance", JSON.stringify(next.instance));
    insert.run("skills", JSON.stringify(next.skills));
    insert.run("setup", JSON.stringify(next.setup));
    return next;
  },

  recordHeartbeat(db: Database.Database, input: {
    agentId: string;
    status: AgentStatus;
    message: string;
    cpuUsage: number;
    memoryUsage: number;
  }) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO agent_heartbeats (id, agent_id, status, message, cpu_usage, memory_usage, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), input.agentId, input.status, input.message, input.cpuUsage, input.memoryUsage, now);
    db.prepare(`
      UPDATE agents
      SET status = ?, last_heartbeat_at = ?, updated_at = ?
      WHERE id = ?
    `).run(input.status, now, now, input.agentId);
  },
};
