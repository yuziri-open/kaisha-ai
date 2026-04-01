import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SettingsData } from "@/lib/types";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [form, setForm] = useState<SettingsData | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (payload: SettingsData) => api.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (!form) {
    return <div className="glass-panel rounded-[28px] p-8 text-sm text-muted-foreground">設定を読み込み中です...</div>;
  }

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-foreground">設定</h2>
        <p className="mt-2 text-sm text-muted-foreground">インスタンス、会社情報、スキル群をまとめて編集します。</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">会社設定</h3>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm text-muted-foreground">
              会社名
              <Input value={form.company.name} onChange={(event) => setForm({ ...form, company: { ...form.company, name: event.target.value } })} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              プレフィックス
              <Input value={form.company.prefix} onChange={(event) => setForm({ ...form, company: { ...form.company, prefix: event.target.value } })} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              ロゴ表示
              <Input value={form.company.logo} onChange={(event) => setForm({ ...form, company: { ...form.company, logo: event.target.value } })} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xl font-semibold text-foreground">インスタンス設定</h3>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-sm text-muted-foreground">
              サーバー名
              <Input value={form.instance.serverName} onChange={(event) => setForm({ ...form, instance: { ...form.instance, serverName: event.target.value } })} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              DB パス
              <Input value={form.instance.databasePath} onChange={(event) => setForm({ ...form, instance: { ...form.instance, databasePath: event.target.value } })} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              認証モード
              <Input value={form.instance.authMode} onChange={(event) => setForm({ ...form, instance: { ...form.instance, authMode: event.target.value } })} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              API トークン
              <Input value={form.instance.apiToken} onChange={(event) => setForm({ ...form, instance: { ...form.instance, apiToken: event.target.value } })} />
            </label>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-xl font-semibold text-foreground">エージェントスキル管理</h3>
        <label className="mt-4 block space-y-2 text-sm text-muted-foreground">
          スキル一覧（1行1件）
          <Textarea
            value={form.skills.join("\n")}
            onChange={(event) =>
              setForm({
                ...form,
                skills: event.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
              })
            }
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

