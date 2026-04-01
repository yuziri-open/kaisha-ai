import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FolderOpen, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardSubtle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DirectoryPicker } from "@/components/DirectoryPicker";
import type { Skill } from "@/lib/types";

const emptySkill: Partial<Skill> = { name: "", description: "", content: "" };
const DEFAULT_SKILL_DIR = "C:\\Users\\coli8\\.openclaw\\workspace\\apps\\kaisha-ai\\server\\data\\skills";

export function SkillsPage() {
  const queryClient = useQueryClient();
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: api.skills });
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [importDirectory, setImportDirectory] = useState(DEFAULT_SKILL_DIR);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Skill>) => payload.id ? api.updateSkill(payload.id, payload) : api.createSkill(payload),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSkill(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (directory?: string) => api.importSkills(directory),
    onSuccess: async (result) => {
      if (result.directory) setImportDirectory(result.directory);
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const skills = useMemo(() => skillsQuery.data?.skills ?? [], [skillsQuery.data]);

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#007AFF] to-[#7c5cff] text-white shadow-[0_8px_24px_rgba(0,122,255,0.22)]">
                <BookOpen size={18} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">スキル</h2>
                  <Badge>{skills.length}件</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Markdown の手順書を取り込み、エージェントの知識・手順として割り当てできます。</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => importMutation.mutate(importDirectory)} disabled={importMutation.isPending} className="min-w-[150px]">
              <RefreshCw size={16} className={importMutation.isPending ? "animate-spin" : ""} />
              {importMutation.isPending ? "取込中..." : "今のフォルダを取込"}
            </Button>
            <Button variant="outline" onClick={() => setShowImportPicker(true)} className="min-w-[170px]">
              <FolderOpen size={16} />
              取込フォルダを選択
            </Button>
            <Button onClick={() => setEditing(emptySkill)} className="min-w-[140px]">
              <Plus size={16} />
              スキル追加
            </Button>
          </div>
        </div>

        <CardSubtle className="mt-5 border border-white/10 bg-white/10 p-4">
          <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground">現在の取込フォルダ</p>
          <p className="mt-2 break-all text-sm leading-6 text-foreground">{importDirectory}</p>
        </CardSubtle>
      </Card>

      {skills.length === 0 ? (
        <Card className="p-10">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--glass-bg-strong)] text-[#007AFF]">
              <Sparkles size={22} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-foreground">まだスキルがありません</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">手動で追加するか、スキル用フォルダを選んで Markdown を一括取り込みできます。</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => importMutation.mutate(importDirectory)} disabled={importMutation.isPending}>
                <RefreshCw size={16} className={importMutation.isPending ? "animate-spin" : ""} />
                今のフォルダを取込
              </Button>
              <Button variant="outline" onClick={() => setShowImportPicker(true)}>
                <FolderOpen size={16} />
                取込フォルダを選択
              </Button>
              <Button onClick={() => setEditing(emptySkill)}>
                <Plus size={16} />
                スキルを作成
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
          {skills.map((skill) => (
            <Card key={skill.id} className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-foreground">{skill.name}</h3>
                    <Badge>{skill.agentCount ?? 0} エージェント</Badge>
                    {skill.filePath ? <Badge>{skill.filePath}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{skill.description || "説明なし"}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(skill)} aria-label="スキルを編集">
                    <Pencil size={15} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(skill.id)} aria-label="スキルを削除">
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>

              <CardSubtle className="mt-4 max-h-60 overflow-y-auto border border-white/10 bg-white/10 p-4 text-sm leading-7 text-foreground/88 whitespace-pre-wrap">
                {skill.content || "内容なし"}
              </CardSubtle>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "スキル編集" : "スキル追加"} description="Markdownでスキル内容を管理します。名前・説明・本文をまとめて編集できます。">
        {editing ? <SkillEditor initial={editing} onSubmit={(payload) => saveMutation.mutate(payload)} isSaving={saveMutation.isPending} /> : null}
      </Dialog>

      <DirectoryPicker
        open={showImportPicker}
        onClose={() => setShowImportPicker(false)}
        initialPath={importDirectory}
        onSelect={(path) => {
          setImportDirectory(path);
          setShowImportPicker(false);
        }}
      />
    </div>
  );
}

function SkillEditor({ initial, onSubmit, isSaving }: { initial: Partial<Skill>; onSubmit: (payload: Partial<Skill>) => void; isSaving: boolean; }) {
  const [form, setForm] = useState<Partial<Skill>>(initial);

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm text-muted-foreground">
          <span className="block font-medium">名前</span>
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例: SEO記事作成" autoFocus />
        </label>
        <label className="space-y-2 text-sm text-muted-foreground">
          <span className="block font-medium">説明</span>
          <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="このスキルの用途を短く説明" />
        </label>
      </div>

      <label className="space-y-2 text-sm text-muted-foreground">
        <span className="block font-medium">内容</span>
        <Textarea className="min-h-[320px] resize-y" value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="# 役割&#10;&#10;このスキルで何をするか..." />
      </label>

      <div className="flex justify-end">
        <Button onClick={() => onSubmit(form)} disabled={isSaving || !String(form.name ?? "").trim()} className="min-w-[120px]">
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
