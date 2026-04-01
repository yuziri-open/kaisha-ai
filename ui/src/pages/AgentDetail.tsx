import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Bot, FolderOpen, MessageSquare, Save, BookOpen } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardSubtle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DirectoryPicker } from "@/components/DirectoryPicker";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CodexAdapterConfig, ClaudeAdapterConfig, Skill } from "@/lib/types";

const CODEX_MODEL_OPTIONS = ["gpt-5.4", "o3", "o4-mini"];
const CLAUDE_MODEL_OPTIONS = ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-3-5-20241022"];

export function AgentDetailPage() {
  const params = useParams<{ agentId: string }>();
  const queryClient = useQueryClient();
  const [adapterType, setAdapterType] = useState("Codex");
  const [config, setConfig] = useState<CodexAdapterConfig & ClaudeAdapterConfig>({ model: "gpt-5.4", cwd: "", fullAuto: true, maxTurns: 10, timeoutSec: 300 });
  const [showDirPicker, setShowDirPicker] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const query = useQuery({ queryKey: ["agent", params.agentId], queryFn: () => api.agent(params.agentId ?? ""), enabled: Boolean(params.agentId) });
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: api.skills });
  const agentSkillsQuery = useQuery({ queryKey: ["agent-skills", params.agentId], queryFn: () => api.agentSkills(params.agentId ?? ""), enabled: Boolean(params.agentId) });

  useEffect(() => {
    if (!query.data) return;
    const agentAdapterType = query.data.agent.adapterType || "Codex";
    const adapterCfg = query.data.agent.adapterConfig;
    const isClaude = agentAdapterType === "Claude Code";
    setAdapterType(agentAdapterType);
    setConfig({
      model: adapterCfg.model || (isClaude ? "claude-sonnet-4-20250514" : "gpt-5.4"),
      cwd: adapterCfg.cwd || "",
      fullAuto: "fullAuto" in adapterCfg ? (adapterCfg as CodexAdapterConfig).fullAuto ?? true : true,
      maxTurns: "maxTurns" in adapterCfg ? (adapterCfg as ClaudeAdapterConfig).maxTurns ?? 10 : 10,
      timeoutSec: adapterCfg.timeoutSec ?? (isClaude ? 600 : 300),
      env: adapterCfg.env ?? {},
    });
  }, [query.data]);

  useEffect(() => {
    setSelectedSkillIds(agentSkillsQuery.data?.skills.map((skill) => skill.id) ?? []);
  }, [agentSkillsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!params.agentId) throw new Error("agentId がありません。");
      await api.updateAgent(params.agentId, { adapterType, adapterConfig: config });
      return api.setAgentSkills(params.agentId, selectedSkillIds);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent", params.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agent-skills", params.agentId] }),
        queryClient.invalidateQueries({ queryKey: ["skills"] }),
      ]);
    },
  });

  const assignedSkillNames = useMemo(() => {
    const map = new Map((skillsQuery.data?.skills ?? []).map((skill) => [skill.id, skill.name]));
    return selectedSkillIds.map((id) => map.get(id)).filter(Boolean) as string[];
  }, [selectedSkillIds, skillsQuery.data?.skills]);

  if (!query.data) return <div className="glass-panel rounded-[28px] p-8 text-sm text-muted-foreground">エージェント情報を読み込み中です...</div>;

  const { agent, taskHistory, heartbeats } = query.data;

  return (
    <>
      <div className="space-y-5">
        <Card className="p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-18 w-18 rounded-[22px] border border-white/25" style={{ background: `${agent.color}66` }} />
              <div>
                <div className="flex items-center gap-2"><h2 className="text-3xl font-semibold text-foreground">{agent.name}</h2><Badge>{agent.status}</Badge></div>
                <p className="mt-2 text-sm text-muted-foreground">{agent.role} / {agent.team}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <div><p>アダプター</p><p className="mt-1 text-foreground">{agent.adapterType}</p></div>
              <div><p>月次コスト</p><p className="mt-1 text-foreground">{formatCurrency(agent.monthlyCost)}</p></div>
              <div><p>最終応答</p><p className="mt-1 text-foreground">{formatDate(agent.lastHeartbeatAt)}</p></div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-subtle rounded-[22px] p-4"><p className="text-sm text-muted-foreground">エージェントプロンプト</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground">{agent.prompt}</p></div>
            <div className="glass-subtle rounded-[22px] p-4">
              <p className="text-sm text-muted-foreground">現在の割り当てスキル</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedSkillNames.length > 0 ? assignedSkillNames.map((skill) => <Badge key={skill}>{skill}</Badge>) : <span className="text-sm text-muted-foreground">未割り当て</span>}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-foreground"><Bot size={18} /><h3 className="text-xl font-semibold">{adapterType === "Claude Code" ? "Claude Code" : "Codex"} アダプター設定</h3></div>
              <p className="mt-2 text-sm text-muted-foreground">この設定はチャット画面の既定値として使われます。</p>
            </div>
            <div className="flex gap-3">
              <Link to={`/agents/${agent.id}/chat`} className="glass-subtle inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-medium text-foreground transition hover:bg-[var(--glass-bg)]"><MessageSquare size={16} />チャットを開く</Link>
              <Button variant="accent" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}><Save size={16} />{saveMutation.isPending ? "保存中..." : "設定を保存"}</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            <label className="space-y-2"><span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">アダプタータイプ</span><select className="w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-foreground outline-none" value={adapterType} onChange={(event) => { const newType = event.target.value; setAdapterType(newType); setConfig((current) => ({ ...current, model: newType === "Claude Code" ? "claude-sonnet-4-20250514" : "gpt-5.4" })); }}><option value="Codex">Codex</option><option value="Claude Code">Claude Code</option></select></label>
            <label className="space-y-2"><span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">モデル</span><select className="w-full rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-foreground outline-none" value={config.model ?? (adapterType === "Claude Code" ? "claude-sonnet-4-20250514" : "gpt-5.4")} onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}>{(adapterType === "Claude Code" ? CLAUDE_MODEL_OPTIONS : CODEX_MODEL_OPTIONS).map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
            <label className="space-y-2 xl:col-span-2"><span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">作業ディレクトリ</span><div className="flex gap-2"><Input value={config.cwd ?? ""} onChange={(event) => setConfig((current) => ({ ...current, cwd: event.target.value }))} placeholder="例: C:\Users\coli8\.openclaw\workspace" className="flex-1" /><button type="button" onClick={() => setShowDirPicker(true)} className="shrink-0 rounded-[10px] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 text-muted-foreground transition hover:text-foreground" title="フォルダを選択"><FolderOpen size={16} /></button></div></label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="space-y-2"><span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">タイムアウト（秒）</span><Input type="number" min={30} value={config.timeoutSec ?? 300} onChange={(event) => setConfig((current) => ({ ...current, timeoutSec: Number(event.target.value) || 300 }))} /></label>
            {adapterType === "Claude Code" ? <label className="space-y-2"><span className="text-xs font-medium tracking-[0.08em] text-muted-foreground">最大ターン数</span><Input type="number" min={1} max={100} value={config.maxTurns ?? 10} onChange={(event) => setConfig((current) => ({ ...current, maxTurns: Number(event.target.value) || 10 }))} /></label> : <label className="glass-subtle flex items-center justify-between rounded-[18px] px-4 py-3"><div><p className="text-sm font-medium text-foreground">`--full-auto` を有効にする</p><p className="mt-1 text-xs text-muted-foreground">承認なしで Codex に処理を進めさせます。</p></div><input type="checkbox" className="h-4 w-4 accent-[#007AFF]" checked={config.fullAuto ?? true} onChange={(event) => setConfig((current) => ({ ...current, fullAuto: event.target.checked }))} /></label>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-foreground"><BookOpen size={18} /><h3 className="text-xl font-semibold">スキル割り当て</h3></div>
          <p className="mt-2 text-sm text-muted-foreground">チェックを入れたスキルがチャット時のプロンプトへ自動注入されます。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(skillsQuery.data?.skills ?? []).map((skill) => (
              <label key={skill.id} className="glass-subtle flex items-start gap-3 rounded-[18px] p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#007AFF]" checked={selectedSkillIds.includes(skill.id)} onChange={(event) => setSelectedSkillIds((current) => event.target.checked ? [...current, skill.id] : current.filter((id) => id !== skill.id))} />
                <div>
                  <p className="text-sm font-medium text-foreground">{skill.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{skill.description || "説明なし"}</p>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card className="p-5"><h3 className="text-xl font-semibold text-foreground">最近の担当タスク</h3><div className="mt-4 space-y-3">{taskHistory.map((task) => <CardSubtle key={task.id} className="border border-white/12 bg-white/8 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-foreground">{task.title}</p><Badge>{task.status}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{task.description}</p></CardSubtle>)}</div></Card>
          <Card className="p-5"><h3 className="text-xl font-semibold text-foreground">Heartbeat ログ</h3><div className="mt-4 space-y-3">{heartbeats.map((heartbeat) => <CardSubtle key={heartbeat.id} className="border border-white/12 bg-white/8 p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium text-foreground">{heartbeat.message}</p><span className="text-xs text-muted-foreground">{formatDate(heartbeat.createdAt)}</span></div><p className="mt-2 text-sm text-muted-foreground">CPU {heartbeat.cpuUsage}% / MEM {heartbeat.memoryUsage}% / ステータス {heartbeat.status}</p></CardSubtle>)}</div></Card>
        </div>
      </div>

      <DirectoryPicker open={showDirPicker} onClose={() => setShowDirPicker(false)} onSelect={(p) => setConfig((c) => ({ ...c, cwd: p }))} initialPath={config.cwd || "C:\\"} />
    </>
  );
}
