import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { config } from "../config.js";
import { computeNextRunFromSchedule } from "./store.js";

type SeedAgent = {
  id: string;
  name: string;
  role: string;
  team: string;
  status: string;
  adapterType: string;
  reportsToId: string | null;
  costPerHour: number;
  prompt: string;
  skills: string[];
  color: string;
};

export function createDatabase() {
  mkdirSync(path.dirname(config.databasePath), { recursive: true });
  const db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      status TEXT NOT NULL,
      adapter_type TEXT NOT NULL,
      reports_to_id TEXT,
      last_heartbeat_at TEXT,
      cost_per_hour REAL NOT NULL DEFAULT 0,
      prompt TEXT NOT NULL DEFAULT '',
      skills_json TEXT NOT NULL DEFAULT '[]',
      color TEXT NOT NULL DEFAULT '#007AFF',
      adapter_config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL,
      parent_id TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '進行中',
      owner TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      assignee_id TEXT,
      goal_id TEXT,
      due_date TEXT,
      attachments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_worklogs (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      agent_id TEXT,
      schedule_type TEXT NOT NULL,
      cron_expression TEXT,
      interval_minutes INTEGER,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      next_run_at TEXT,
      last_status TEXT NOT NULL DEFAULT '待機',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_runs (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      log TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cost_entries (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS budgets (
      month TEXT PRIMARY KEY,
      limit_amount REAL NOT NULL,
      alert_threshold REAL NOT NULL DEFAULT 0.8
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      requester TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_heartbeats (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      cpu_usage REAL NOT NULL,
      memory_usage REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      output TEXT NOT NULL DEFAULT '',
      exit_code INTEGER,
      model TEXT,
      cwd TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      run_id TEXT REFERENCES runs(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn(db, "agents", "adapter_config_json", "TEXT NOT NULL DEFAULT '{}'");
  seedDatabase(db);
  return db;
}

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function seedDatabase(db: Database.Database) {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM agents").get() as { count?: number } | undefined;
  const agentCount = Number(countRow?.count ?? 0);
  if (agentCount > 0) {
    ensureDefaultSettings(db);
    return;
  }

  const now = new Date();
  const iso = (date: Date) => date.toISOString();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const agents: SeedAgent[] = [
    {
      id: "agent-iori",
      name: "伊織オーケストレーター",
      role: "AI戦略室長",
      team: "経営企画",
      status: "稼働中",
      adapterType: "OpenClaw",
      reportsToId: null,
      costPerHour: 42,
      prompt: "全社の優先順位と承認負荷を見ながら、AIエージェントの配備を最適化します。",
      skills: ["全社調整", "意思決定支援", "予算最適化"],
      color: "#007AFF"
    },
    {
      id: "agent-jack",
      name: "Jack COO エージェント",
      role: "運用統括",
      team: "オペレーション",
      status: "稼働中",
      adapterType: "Claude Code",
      reportsToId: "agent-iori",
      costPerHour: 35,
      prompt: "各チームのタスク滞留を減らし、承認フローを前に進めます。",
      skills: ["運用設計", "承認管理", "レポーティング"],
      color: "#8B5CF6"
    },
    {
      id: "agent-mika",
      name: "美香ビルダー",
      role: "開発自動化",
      team: "プロダクト",
      status: "稼働中",
      adapterType: "Codex",
      reportsToId: "agent-jack",
      costPerHour: 31,
      prompt: "仕様から実装とテスト計画までを高速に前進させます。",
      skills: ["TypeScript", "設計", "テスト自動化"],
      color: "#F43F5E"
    },
    {
      id: "agent-ren",
      name: "蓮アナリスト",
      role: "データ分析",
      team: "経営企画",
      status: "待機",
      adapterType: "HTTP",
      reportsToId: "agent-iori",
      costPerHour: 28,
      prompt: "コストと成果を横断的に分析し、次の一手を提案します。",
      skills: ["SQL", "BI", "異常検知"],
      color: "#06B6D4"
    },
    {
      id: "agent-sora",
      name: "空サポート",
      role: "カスタマー対応",
      team: "CS",
      status: "注意",
      adapterType: "Bash",
      reportsToId: "agent-jack",
      costPerHour: 22,
      prompt: "問い合わせ傾向と引き継ぎ負荷を見ながら対応を平準化します。",
      skills: ["一次回答", "エスカレーション", "ナレッジ整理"],
      color: "#FF9F0A"
    },
    {
      id: "agent-kai",
      name: "魁セキュリティ",
      role: "ガードレール監査",
      team: "情報システム",
      status: "停止",
      adapterType: "OpenClaw",
      reportsToId: "agent-jack",
      costPerHour: 26,
      prompt: "ルール違反の兆候を先回りで検出し、監査ログを整備します。",
      skills: ["監査", "権限レビュー", "ポリシー整備"],
      color: "#EF4444"
    }
  ];

  const insertAgent = db.prepare(`
    INSERT INTO agents (
      id, name, role, team, status, adapter_type, reports_to_id, last_heartbeat_at,
      cost_per_hour, prompt, skills_json, color, created_at, updated_at
    ) VALUES (
      @id, @name, @role, @team, @status, @adapterType, @reportsToId, @lastHeartbeatAt,
      @costPerHour, @prompt, @skillsJson, @color, @createdAt, @updatedAt
    )
  `);

  for (const [index, agent] of agents.entries()) {
    const heartbeatAt = new Date(now.getTime() - index * 18 * 60 * 1000);
    insertAgent.run({
      ...agent,
      lastHeartbeatAt: iso(heartbeatAt),
      skillsJson: JSON.stringify(agent.skills),
      createdAt: iso(new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000)),
      updatedAt: iso(heartbeatAt),
    });
  }

  const goals = [
    {
      id: "goal-company-1",
      title: "AI運用を四半期で定着させる",
      description: "会社横断でAIエージェントの稼働率と成果物品質を両立する。",
      level: "会社",
      parentId: null,
      progress: 68,
      status: "進行中",
      owner: "伊織オーケストレーター",
    },
    {
      id: "goal-project-1",
      title: "承認リードタイムを40%短縮",
      description: "承認待ちのボトルネックを可視化し、定常運用に落とし込む。",
      level: "プロジェクト",
      parentId: "goal-company-1",
      progress: 73,
      status: "進行中",
      owner: "Jack COO エージェント",
    },
    {
      id: "goal-project-2",
      title: "開発自動化フローを標準化",
      description: "要件整理からレビューまでの反復を短縮する。",
      level: "プロジェクト",
      parentId: "goal-company-1",
      progress: 61,
      status: "進行中",
      owner: "美香ビルダー",
    },
    {
      id: "goal-task-1",
      title: "承認パケットのテンプレート再設計",
      description: "必要情報を不足なく収集できるフォームに改修する。",
      level: "タスク",
      parentId: "goal-project-1",
      progress: 84,
      status: "レビュー",
      owner: "Jack COO エージェント",
    },
    {
      id: "goal-task-2",
      title: "週次ルーティンの失敗率を10%未満へ",
      description: "Heartbeatと再実行導線を見直す。",
      level: "タスク",
      parentId: "goal-project-2",
      progress: 56,
      status: "進行中",
      owner: "伊織オーケストレーター",
    }
  ];

  const insertGoal = db.prepare(`
    INSERT INTO goals (
      id, title, description, level, parent_id, progress, status, owner, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @level, @parentId, @progress, @status, @owner, @createdAt, @updatedAt
    )
  `);

  for (const goal of goals) {
    insertGoal.run({
      ...goal,
      createdAt: iso(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)),
      updatedAt: iso(now),
    });
  }

  const tasks = [
    {
      id: "task-1",
      title: "承認テンプレート v2 を設計",
      description: "承認理由、影響範囲、コスト見積もりを1画面で確認できるようにする。",
      status: "レビュー",
      priority: "高",
      assigneeId: "agent-jack",
      goalId: "goal-task-1",
      dueDate: iso(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)),
      attachments: ["approval-spec-v2.pdf", "stakeholders.xlsx"]
    },
    {
      id: "task-2",
      title: "Codex エージェントのルーチン監視",
      description: "失敗ログを蓄積し、再試行条件を追加する。",
      status: "進行中",
      priority: "緊急",
      assigneeId: "agent-mika",
      goalId: "goal-task-2",
      dueDate: iso(new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)),
      attachments: ["routine-debug-log.txt"]
    },
    {
      id: "task-3",
      title: "月次コストレポートの自動配信",
      description: "Slack送信用の要約を生成し、部門別の内訳を添える。",
      status: "バックログ",
      priority: "中",
      assigneeId: "agent-ren",
      goalId: "goal-project-1",
      dueDate: iso(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)),
      attachments: []
    },
    {
      id: "task-4",
      title: "CS問い合わせルートの棚卸し",
      description: "Escalation基準を整理して、空サポートの負荷を平準化する。",
      status: "進行中",
      priority: "高",
      assigneeId: "agent-sora",
      goalId: "goal-project-1",
      dueDate: iso(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
      attachments: ["handover-checklist.docx"]
    },
    {
      id: "task-5",
      title: "監査ログ保管ポリシーの改訂",
      description: "セキュリティ停止中エージェントの再起動条件を明文化する。",
      status: "完了",
      priority: "中",
      assigneeId: "agent-kai",
      goalId: "goal-project-2",
      dueDate: iso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      attachments: ["security-policy.md"]
    }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, description, status, priority, assignee_id, goal_id, due_date,
      attachments_json, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @status, @priority, @assigneeId, @goalId, @dueDate,
      @attachmentsJson, @createdAt, @updatedAt
    )
  `);

  for (const [index, task] of tasks.entries()) {
    insertTask.run({
      ...task,
      attachmentsJson: JSON.stringify(task.attachments),
      createdAt: iso(new Date(now.getTime() - (10 - index) * 24 * 60 * 60 * 1000)),
      updatedAt: iso(new Date(now.getTime() - index * 6 * 60 * 60 * 1000)),
    });
  }

  const insertComment = db.prepare(`
    INSERT INTO task_comments (id, task_id, author, body, created_at)
    VALUES (@id, @taskId, @author, @body, @createdAt)
  `);
  insertComment.run({
    id: randomUUID(),
    taskId: "task-1",
    author: "伊織オーケストレーター",
    body: "承認判断の前提条件が一目で分かる構成にしたいです。",
    createdAt: iso(new Date(now.getTime() - 14 * 60 * 60 * 1000)),
  });
  insertComment.run({
    id: randomUUID(),
    taskId: "task-2",
    author: "美香ビルダー",
    body: "再実行条件の暫定ロジックを今日中に入れます。",
    createdAt: iso(new Date(now.getTime() - 5 * 60 * 60 * 1000)),
  });

  const insertWorklog = db.prepare(`
    INSERT INTO task_worklogs (id, task_id, summary, minutes, created_at)
    VALUES (@id, @taskId, @summary, @minutes, @createdAt)
  `);
  insertWorklog.run({
    id: randomUUID(),
    taskId: "task-2",
    summary: "エラーパターン集約とSSE通知設計",
    minutes: 95,
    createdAt: iso(new Date(now.getTime() - 4 * 60 * 60 * 1000)),
  });
  insertWorklog.run({
    id: randomUUID(),
    taskId: "task-4",
    summary: "CSフロー棚卸しワークショップ",
    minutes: 60,
    createdAt: iso(new Date(now.getTime() - 7 * 60 * 60 * 1000)),
  });

  const routines = [
    {
      id: "routine-1",
      name: "朝会ダイジェスト配信",
      description: "直近24時間のアクティビティと承認待ちをまとめて共有します。",
      agentId: "agent-jack",
      scheduleType: "cron",
      cronExpression: "0 9 * * *",
      intervalMinutes: null,
      isEnabled: 1,
      lastStatus: "成功"
    },
    {
      id: "routine-2",
      name: "Heartbeat ドリフト監視",
      description: "20分以上沈黙したエージェントを検出して通知します。",
      agentId: "agent-iori",
      scheduleType: "interval",
      cronExpression: null,
      intervalMinutes: 30,
      isEnabled: 1,
      lastStatus: "成功"
    },
    {
      id: "routine-3",
      name: "コスト上限チェック",
      description: "予算消化率が80%を超えたエージェントを抽出します。",
      agentId: "agent-ren",
      scheduleType: "cron",
      cronExpression: "30 13 * * 1",
      intervalMinutes: null,
      isEnabled: 1,
      lastStatus: "待機"
    }
  ];

  const insertRoutine = db.prepare(`
    INSERT INTO routines (
      id, name, description, agent_id, schedule_type, cron_expression, interval_minutes,
      is_enabled, last_run_at, next_run_at, last_status, created_at, updated_at
    ) VALUES (
      @id, @name, @description, @agentId, @scheduleType, @cronExpression, @intervalMinutes,
      @isEnabled, @lastRunAt, @nextRunAt, @lastStatus, @createdAt, @updatedAt
    )
  `);

  for (const [index, routine] of routines.entries()) {
    const lastRunAt = new Date(now.getTime() - (index + 2) * 60 * 60 * 1000);
    insertRoutine.run({
      ...routine,
      lastRunAt: iso(lastRunAt),
      nextRunAt: iso(computeNextRunFromSchedule({
        scheduleType: routine.scheduleType as "cron" | "interval",
        cronExpression: routine.cronExpression,
        intervalMinutes: routine.intervalMinutes,
        reference: now,
      })),
      createdAt: iso(new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000)),
      updatedAt: iso(now),
    });
  }

  const insertRoutineRun = db.prepare(`
    INSERT INTO routine_runs (
      id, routine_id, trigger_type, status, log, started_at, finished_at
    ) VALUES (
      @id, @routineId, @triggerType, @status, @log, @startedAt, @finishedAt
    )
  `);

  insertRoutineRun.run({
    id: randomUUID(),
    routineId: "routine-1",
    triggerType: "スケジュール",
    status: "成功",
    log: "朝会ダイジェストを 12 名へ配信しました。",
    startedAt: iso(new Date(now.getTime() - 60 * 60 * 1000)),
    finishedAt: iso(new Date(now.getTime() - 59 * 60 * 1000)),
  });
  insertRoutineRun.run({
    id: randomUUID(),
    routineId: "routine-2",
    triggerType: "手動",
    status: "成功",
    log: "Heartbeat 停滞は 1 件、再通知対象はありません。",
    startedAt: iso(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
    finishedAt: iso(new Date(now.getTime() - 118 * 60 * 1000)),
  });

  const insertCost = db.prepare(`
    INSERT INTO cost_entries (id, agent_id, amount, category, occurred_at, note)
    VALUES (@id, @agentId, @amount, @category, @occurredAt, @note)
  `);
  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    for (const [index, agent] of agents.entries()) {
      const base = 340 + index * 80;
      const occurredAt = new Date(now.getFullYear(), now.getMonth() - monthOffset, 12 + index, 10, 0, 0);
      insertCost.run({
        id: randomUUID(),
        agentId: agent.id,
        amount: base + (5 - monthOffset) * 35,
        category: monthOffset === 0 ? "今月利用" : "利用実績",
        occurredAt: iso(occurredAt),
        note: `${agent.name} の月次処理`,
      });
    }
  }

  db.prepare("INSERT OR REPLACE INTO budgets (month, limit_amount, alert_threshold) VALUES (?, ?, ?)")
    .run(monthKey, 5200, 0.8);

  const insertApproval = db.prepare(`
    INSERT INTO approvals (
      id, title, category, requester, status, requested_at, comment, target_type, target_id
    ) VALUES (
      @id, @title, @category, @requester, @status, @requestedAt, @comment, @targetType, @targetId
    )
  `);
  [
    {
      id: "approval-1",
      title: "Codex エージェント権限拡張",
      category: "権限",
      requester: "美香ビルダー",
      status: "承認待ち",
      requestedAt: iso(new Date(now.getTime() - 90 * 60 * 1000)),
      comment: "テスト自動化のため、リポジトリ書き込み権限が必要です。",
      targetType: "agent",
      targetId: "agent-mika",
    },
    {
      id: "approval-2",
      title: "月次予算の5%増額",
      category: "予算",
      requester: "蓮アナリスト",
      status: "承認待ち",
      requestedAt: iso(new Date(now.getTime() - 4 * 60 * 60 * 1000)),
      comment: "自動レポート配信の追加検証に伴う一時増額です。",
      targetType: "budget",
      targetId: monthKey,
    },
    {
      id: "approval-3",
      title: "CSルート棚卸しの外部連携",
      category: "連携",
      requester: "空サポート",
      status: "却下",
      requestedAt: iso(new Date(now.getTime() - 36 * 60 * 60 * 1000)),
      comment: "要件が曖昧なため、先にワークフロー整理を優先してください。",
      targetType: "task",
      targetId: "task-4",
    }
  ].forEach((approval) => insertApproval.run(approval));

  const insertActivity = db.prepare(`
    INSERT INTO activities (
      id, kind, title, description, occurred_at, entity_type, entity_id
    ) VALUES (
      @id, @kind, @title, @description, @occurredAt, @entityType, @entityId
    )
  `);
  [
    ["routine", "朝会ダイジェストを配信", "Jack COO エージェントが朝会ダイジェストを送信しました。", "routine", "routine-1"],
    ["approval", "承認待ちが 2 件に増加", "権限拡張と予算増額の確認が必要です。", "approval", "approval-1"],
    ["task", "タスク「Codex エージェントのルーチン監視」が進行中へ", "美香ビルダーが監視ロジックの改修を開始しました。", "task", "task-2"],
    ["agent", "空サポートが注意ステータス", "CS問い合わせ負荷がしきい値を超えました。", "agent", "agent-sora"],
    ["cost", "今月コストが 76% 到達", "予算に近いエージェントを重点監視してください。", "budget", monthKey]
  ].forEach(([kind, title, description, entityType, entityId], index) => {
    insertActivity.run({
      id: randomUUID(),
      kind,
      title,
      description,
      occurredAt: iso(new Date(now.getTime() - index * 95 * 60 * 1000)),
      entityType,
      entityId,
    });
  });

  const insertHeartbeat = db.prepare(`
    INSERT INTO agent_heartbeats (
      id, agent_id, status, message, cpu_usage, memory_usage, created_at
    ) VALUES (
      @id, @agentId, @status, @message, @cpuUsage, @memoryUsage, @createdAt
    )
  `);
  const heartbeatMessages = [
    "承認待ちを確認中",
    "ルーティンの次回実行を計算しました",
    "コストレポートを更新しました",
    "作業ログを同期しました",
    "異常なし。定常監視を継続中"
  ];
  agents.forEach((agent, index) => {
    for (let heartbeatIndex = 0; heartbeatIndex < 5; heartbeatIndex += 1) {
      insertHeartbeat.run({
        id: randomUUID(),
        agentId: agent.id,
        status: agent.status,
        message: heartbeatMessages[(index + heartbeatIndex) % heartbeatMessages.length],
        cpuUsage: 28 + index * 6 + heartbeatIndex * 2,
        memoryUsage: 41 + index * 5 + heartbeatIndex * 3,
        createdAt: iso(new Date(now.getTime() - (index * 30 + heartbeatIndex * 17) * 60 * 1000)),
      });
    }
  });

  ensureDefaultSettings(db);
}

function ensureDefaultSettings(db: Database.Database) {
  const defaults: Record<string, unknown> = {
    company: {
      name: "KAISHA",
      prefix: "KAI",
      logo: "KAISHA AI",
    },
    instance: {
      serverName: "KAISHA AI オーケストレーター",
      databasePath: config.databasePath,
      authMode: "ローカル単一ユーザー",
      apiToken: "kaisha-local-token",
    },
    skills: ["要件整理", "レポート作成", "顧客対応", "開発自動化", "承認オペレーション"],
    setup: {
      completed: false,
      completedAt: null,
    },
  };

  const insert = db.prepare("INSERT OR IGNORE INTO settings (key, value_json) VALUES (?, ?)");
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, JSON.stringify(value));
  }
}
