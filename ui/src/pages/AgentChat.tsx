import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, FolderCode, FolderOpen, LoaderCircle, Paperclip, Save, SendHorizonal, StopCircle, X } from "lucide-react";
import { api } from "@/api/client";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { DirectoryPicker } from "@/components/DirectoryPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardSubtle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AgentRun, ChatMessage, CodexAdapterConfig, ClaudeAdapterConfig } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const CODEX_MODEL_OPTIONS = ["gpt-5.4", "o3", "o4-mini"];
const CLAUDE_MODEL_OPTIONS = ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-3-5-20241022"];

function upsertMessage(list: ChatMessage[], next: ChatMessage) {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [...list, next];
  const copy = [...list];
  copy[index] = next;
  return copy;
}

function upsertRun(list: AgentRun[], next: AgentRun) {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...list];
  const copy = [...list];
  copy[index] = next;
  return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function AgentChatPage() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId ?? "";
  const queryClient = useQueryClient();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [streamedText, setStreamedText] = useState("");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [config, setConfig] = useState<CodexAdapterConfig & ClaudeAdapterConfig>({
    model: "gpt-5.4",
    cwd: "",
    fullAuto: true,
    reasoningEffort: "high",
    maxTurns: 10,
    timeoutSec: 300,
  });
  const [attachments, setAttachments] = useState<Array<{ file: File; uploaded?: { url: string; originalName: string; mimeType: string; size: number }; preview?: string }>>([]);
  const [showDirPicker, setShowDirPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const agentQuery = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => api.agent(agentId),
    enabled: Boolean(agentId),
  });

  const chatQuery = useQuery({
    queryKey: ["agent-chat", agentId],
    queryFn: () => api.agentChat(agentId),
    enabled: Boolean(agentId),
  });

  useEffect(() => {
    if (!chatQuery.data) return;
    setMessages(chatQuery.data.messages);
    setRuns(chatQuery.data.runs);
    const runningRun = chatQuery.data.runs.find((run) => run.status === "running" || run.status === "pending");
    setActiveRunId(runningRun?.id ?? null);
  }, [chatQuery.data]);

  useEffect(() => {
    const agent = agentQuery.data?.agent;
    if (!agent) return;
    const isClaude = agent.adapterType === "Claude Code";
    const adapterCfg = agent.adapterConfig;
    setConfig({
      model: adapterCfg.model || (isClaude ? "claude-sonnet-4-20250514" : "gpt-5.4"),
      cwd: adapterCfg.cwd || "",
      fullAuto: "fullAuto" in adapterCfg ? (adapterCfg as CodexAdapterConfig).fullAuto ?? true : true,
      reasoningEffort: "reasoningEffort" in adapterCfg ? (adapterCfg as CodexAdapterConfig).reasoningEffort ?? "high" : "high",
      maxTurns: "maxTurns" in adapterCfg ? (adapterCfg as ClaudeAdapterConfig).maxTurns ?? 10 : 10,
      timeoutSec: adapterCfg.timeoutSec ?? (isClaude ? 600 : 300),
      env: adapterCfg.env ?? {},
    });
  }, [agentQuery.data]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamedText]);

  useEffect(() => {
    if (!agentId) return;

    const source = new EventSource("/api/events");

    const parse = <T,>(event: MessageEvent<string>) => {
      try {
        return JSON.parse(event.data) as T;
      } catch {
        return null;
      }
    };

    const onChatMessage = (event: MessageEvent<string>) => {
      const payload = parse<{ agentId: string; message: ChatMessage }>(event);
      if (!payload || payload.agentId !== agentId) return;
      setMessages((current) => upsertMessage(current, payload.message));
    };

    const onRunStarted = (event: MessageEvent<string>) => {
      const payload = parse<{ agentId: string; run: AgentRun | null }>(event);
      const run = payload?.run;
      if (!payload || payload.agentId !== agentId || !run) return;
      setRuns((current) => upsertRun(current, run));
      setActiveRunId(run.id);
      setStreamedText("");
    };

    const onRunOutput = (event: MessageEvent<string>) => {
      const payload = parse<{ agentId: string; runId: string; line: string }>(event);
      if (!payload || payload.agentId !== agentId) return;
      setActiveRunId(payload.runId);
      setStreamedText((current) => `${current}${current ? "\n" : ""}${payload.line}`);
    };

    const onRunComplete = (event: MessageEvent<string>) => {
      const payload = parse<{ agentId: string; run: AgentRun | null; message?: ChatMessage }>(event);
      if (!payload || payload.agentId !== agentId) return;
      const run = payload.run;
      const message = payload.message;
      if (run) {
        setRuns((current) => upsertRun(current, run));
        setActiveRunId(null);
      }
      if (message) {
        setMessages((current) => upsertMessage(current, message));
      }
      setStreamedText("");
      void queryClient.invalidateQueries({ queryKey: ["agent-chat", agentId] });
    };

    source.addEventListener("chat:message", onChatMessage);
    source.addEventListener("run:started", onRunStarted);
    source.addEventListener("run:output", onRunOutput);
    source.addEventListener("run:complete", onRunComplete);

    return () => {
      source.close();
    };
  }, [agentId, queryClient]);

  const isClaude = agentQuery.data?.agent.adapterType === "Claude Code";
  const modelOptions = isClaude ? CLAUDE_MODEL_OPTIONS : CODEX_MODEL_OPTIONS;

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error("agentId がありません。");
      return await api.updateAgent(agentId, {
        adapterType: agentQuery.data?.agent.adapterType ?? "Codex",
        adapterConfig: config,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
    },
  });

  const handleFiles = async (files: FileList | File[]) => {
    const newAttachments = await Promise.all(
      Array.from(files).map(async (file) => {
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        try {
          const uploaded = await api.uploadFile(file);
          return { file, uploaded, preview };
        } catch {
          return { file, preview };
        }
      }),
    );
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const copy = [...prev];
      if (copy[index]?.preview) URL.revokeObjectURL(copy[index].preview!);
      copy.splice(index, 1);
      return copy;
    });
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error("agentId がありません。");
      const attachmentLines = attachments
        .filter((a) => a.uploaded)
        .map((a) => {
          const isImage = a.uploaded!.mimeType.startsWith("image/");
          return `[添付ファイル: ${a.uploaded!.url} (${isImage ? "画像" : a.uploaded!.originalName})]`;
        });
      const fullMessage = [draft, ...attachmentLines].filter(Boolean).join("\n");
      return await api.sendAgentMessage(agentId, {
        message: fullMessage,
        config,
      });
    },
    onSuccess: (payload) => {
      const run = payload.run;
      const message = payload.message;
      if (message) {
        setMessages((current) => upsertMessage(current, message));
      }
      if (run) {
        setRuns((current) => upsertRun(current, run));
        setActiveRunId(run.id);
      }
      setDraft("");
      setAttachments([]);
      setStreamedText("");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!agentId || !activeRunId) throw new Error("キャンセルする実行がありません。");
      return await api.cancelRun(agentId, activeRunId);
    },
    onSuccess: () => {
      setActiveRunId(null);
      setStreamedText("");
      void queryClient.invalidateQueries({ queryKey: ["agent-chat", agentId] });
    },
  });

  const displayMessages = useMemo(() => {
    if (!streamedText.trim()) return messages;
    return [
      ...messages,
      {
        id: "__streaming__",
        agentId,
        runId: activeRunId,
        role: "assistant" as const,
        content: streamedText,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [activeRunId, agentId, messages, streamedText]);

  const latestRun = runs[0] ?? null;

  if (!agentQuery.data || !chatQuery.data) {
    return <div className="glass rounded-[28px] p-8 text-sm text-muted-foreground">チャット画面を読み込み中です...</div>;
  }

  const agent = agentQuery.data.agent;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="flex min-h-[calc(100vh-72px)] flex-col overflow-hidden p-0">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link to={`/agents/${agent.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft size={16} />
                エージェント詳細へ戻る
              </Link>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/20 bg-white/10">
                  <Bot size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground">{agent.name} とチャット</h2>
                  <p className="text-sm text-muted-foreground">
                    {agent.role} / モデル {config.model || "gpt-5.4"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge>{latestRun?.status === "running" ? "実行中" : latestRun?.status === "failed" ? "失敗" : "待機"}</Badge>
              {activeRunId ? (
                <>
                  <div className="inline-flex items-center gap-2 text-sm text-[#007AFF]">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    応答をストリーミング中
                  </div>
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/20"
                  >
                    <StopCircle size={14} />
                    停止
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            {displayMessages.map((message) => {
              const isUser = message.role === "user";
              const isStreaming = message.id === "__streaming__";
              return (
                <div key={`${message.id}-${message.createdAt}`} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-[24px] px-5 py-4 shadow-sm",
                      isUser ? "glass-accent text-white" : "glass text-foreground",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.16em] opacity-75">
                      <span>{isUser ? "ユーザー" : "エージェント"}</span>
                      <span>{formatDate(message.createdAt)}</span>
                    </div>
                    <MarkdownMessage
                      content={message.content}
                      className={cn(isUser ? "text-white" : "text-foreground", isStreaming && "chat-streaming")}
                    />
                    {isStreaming ? <span className="chat-stream-cursor mt-3 inline-block" /> : null}
                  </div>
                </div>
              );
            })}

            {displayMessages.length === 0 ? (
              <div className="glass-subtle rounded-[24px] px-5 py-8 text-center text-sm text-muted-foreground">
                まだ会話がありません。下の入力欄から最初のメッセージを送ってください。
              </div>
            ) : null}

            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-transparent px-5 pb-5 pt-4">
          <div
            className="glass flex flex-col gap-4 rounded-[24px] p-4"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files); e.target.value = ""; }}
            />

            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="glass-subtle relative flex items-center gap-2 rounded-[14px] px-3 py-2 text-xs">
                    {a.preview ? (
                      <img src={a.preview} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
                    ) : null}
                    <div className="max-w-[120px]">
                      <p className="truncate text-foreground">{a.file.name}</p>
                      <p className="text-muted-foreground">{(a.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => removeAttachment(i)} className="ml-1 text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="依頼内容を入力してください。Shift + Enter で改行、Enter で送信できます。"
              className="min-h-[120px] border-white/10 bg-transparent"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if ((!draft.trim() && attachments.length === 0) || sendMutation.isPending) return;
                  sendMutation.mutate();
                }
              }}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                現在の設定: {config.model || "gpt-5.4"} / {config.cwd || "作業ディレクトリ未設定"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[10px] p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  title="ファイルを添付"
                >
                  <Paperclip size={18} />
                </button>
                <Button
                  variant="accent"
                  onClick={() => sendMutation.mutate()}
                  disabled={(!draft.trim() && attachments.length === 0) || sendMutation.isPending}
                >
                {sendMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal size={16} />}
                {sendMutation.isPending ? "送信中..." : "送信"}
              </Button>
              </div>
            </div>

            {sendMutation.isError ? (
              <p className="text-sm text-red-500">
                {sendMutation.error instanceof Error ? sendMutation.error.message : "メッセージ送信に失敗しました。"}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FolderCode size={18} />
            <h3 className="text-lg font-semibold text-foreground">エージェント設定</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            送信前にモデルや作業ディレクトリを調整できます。
          </p>

          <div className="mt-5 space-y-4">
            <label className="space-y-2">
              <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">モデル</span>
              <select
                className="w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-foreground outline-none"
                value={config.model ?? (isClaude ? "claude-sonnet-4-20250514" : "gpt-5.4")}
                onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}
              >
                {modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">作業ディレクトリ</span>
              <div className="flex gap-2">
                <Input
                  value={config.cwd ?? ""}
                  onChange={(event) => setConfig((current) => ({ ...current, cwd: event.target.value }))}
                  placeholder="例: C:\\Users\\coli8\\.openclaw\\workspace\\apps\\kaisha-ai"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowDirPicker(true)}
                  className="shrink-0 rounded-[10px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 text-muted-foreground transition hover:text-foreground"
                  title="フォルダを選択"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">タイムアウト（秒）</span>
              <Input
                type="number"
                min={30}
                value={config.timeoutSec ?? 300}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    timeoutSec: Number(event.target.value) || 300,
                  }))
                }
              />
            </label>

            {isClaude ? (
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">最大ターン数</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={config.maxTurns ?? 10}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      maxTurns: Number(event.target.value) || 10,
                    }))
                  }
                />
              </label>
            ) : (
              <label className="glass-subtle flex items-center justify-between rounded-[18px] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">フルオート</p>
                  <p className="mt-1 text-xs text-muted-foreground">`codex exec --full-auto` を使用します。</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#007AFF]"
                  checked={config.fullAuto ?? true}
                  onChange={(event) => setConfig((current) => ({ ...current, fullAuto: event.target.checked }))}
                />
              </label>
            )}

            {!isClaude ? (
              <label className="space-y-2">
                <span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">Reasoning Effort</span>
                <select
                  className="w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-foreground outline-none"
                  value={config.reasoningEffort ?? "high"}
                  onChange={(event) => setConfig((current) => ({ ...current, reasoningEffort: event.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            ) : null}
          </div>

          <Button
            variant="outline"
            className="mt-5 w-full"
            onClick={() => saveConfigMutation.mutate()}
            disabled={saveConfigMutation.isPending}
          >
            {saveConfigMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save size={16} />}
            {saveConfigMutation.isPending ? "保存中..." : "設定を保存"}
          </Button>

          {saveConfigMutation.isError ? (
            <p className="mt-3 text-sm text-red-500">
              {saveConfigMutation.error instanceof Error ? saveConfigMutation.error.message : "設定の保存に失敗しました。"}
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-foreground">最新の実行</h3>
          {latestRun ? (
            <div className="mt-4 space-y-3">
              <CardSubtle className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{latestRun.model || "モデル未設定"}</span>
                  <Badge>{latestRun.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">開始: {formatDate(latestRun.startedAt || latestRun.createdAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">作業ディレクトリ: {latestRun.cwd || "未設定"}</p>
                {latestRun.output ? (
                  <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-[16px] border border-white/10 bg-black/10 px-3 py-3 text-[12px] leading-6 text-foreground/80 dark:bg-black/25">
                    {latestRun.output}
                  </pre>
                ) : null}
              </CardSubtle>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">まだ実行履歴はありません。</p>
          )}
        </Card>
      </div>

      <DirectoryPicker
        open={showDirPicker}
        onClose={() => setShowDirPicker(false)}
        onSelect={(p) => setConfig((c) => ({ ...c, cwd: p }))}
        initialPath={config.cwd || "C:\\"}
      />
    </div>
  );
}
