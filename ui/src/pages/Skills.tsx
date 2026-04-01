import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardSubtle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Skill } from "@/lib/types";

const emptySkill: Partial<Skill> = { name: "", description: "", content: "" };

export function SkillsPage() {
  const queryClient = useQueryClient();
  const skillsQuery = useQuery({ queryKey: ["skills"], queryFn: api.skills });
  const [editing, setEditing] = useState<Partial<Skill> | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Skill>) =>
      payload.id ? api.updateSkill(payload.id, payload) : api.createSkill(payload),
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
    mutationFn: api.importSkills,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const skills = useMemo(() => skillsQuery.data?.skills ?? [], [skillsQuery.data]);

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={18} />
              <h2 className="text-2xl font-semibold text-foreground">スキル</h2>
              <Badge>{skills.length}件</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              server/data/skills のMarkdownを取り込み、エージェントに割り当てできます。
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => importMutation.mutate()} disabled={importMutation.isPending}>
              <RefreshCw size={16} className={importMutation.isPending ? "animate-spin" : ""} />
              インポート
            </Button>
            <Button onClick={() => setEditing(emptySkill)}>
              <Plus size={16} />
              スキル追加
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {skills.map((skill) => (
          <Card key={skill.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{skill.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{skill.description || "説明なし"}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(skill)}><Pencil size={15} /></Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(skill.id)}><Trash2 size={15} /></Button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Badge>{skill.agentCount ?? 0} エージェント</Badge>
              {skill.filePath ? <Badge>{skill.filePath}</Badge> : null}
            </div>
            <CardSubtle className="mt-4 max-h-52 overflow-y-auto p-4 text-sm leading-7 text-foreground/85 whitespace-pre-wrap">
              {skill.content || "内容なし"}
            </CardSubtle>
          </Card>
        ))}
      </div>

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "スキル編集" : "スキル追加"}
        description="Markdownでスキル内容を管理します。"
      >
        {editing ? <SkillEditor initial={editing} onSubmit={(payload) => saveMutation.mutate(payload)} /> : null}
      </Dialog>
    </div>
  );
}

function SkillEditor({ initial, onSubmit }: { initial: Partial<Skill>; onSubmit: (payload: Partial<Skill>) => void }) {
  const [form, setForm] = useState<Partial<Skill>>(initial);
  return (
    <div className="grid gap-4">
      <label className="space-y-2 text-sm text-muted-foreground">
        名前
        <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="space-y-2 text-sm text-muted-foreground">
        説明
        <Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <label className="space-y-2 text-sm text-muted-foreground">
        内容
        <Textarea className="min-h-[260px]" value={form.content ?? ""} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      </label>
      <div className="flex justify-end">
        <Button onClick={() => onSubmit(form)}>保存</Button>
      </div>
    </div>
  );
}
