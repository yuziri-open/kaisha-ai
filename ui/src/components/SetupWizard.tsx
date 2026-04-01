import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "@/api/client";
import type { SettingsData } from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function SetupWizard({ settings }: { settings: SettingsData }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState(settings.company.name);
  const [prefix, setPrefix] = useState(settings.company.prefix);
  const [serverName, setServerName] = useState(settings.instance.serverName);
  const [token, setToken] = useState(settings.instance.apiToken);
  const [skills, setSkills] = useState(settings.skills.join("\n"));

  const mutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        company: { ...settings.company, name: companyName, prefix },
        instance: { ...settings.instance, serverName, apiToken: token },
        skills: skills.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        setup: { completed: true, completedAt: new Date().toISOString() },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const open = !settings.setup.completed;
  const descriptions = [
    "会社名とプレフィックスを設定します。",
    "サーバー名と簡易トークンを決めます。",
    "エージェントに割り当てるスキル群を確認します。",
  ];

  return (
    <Dialog open={open} onClose={() => null} title="初回セットアップ" description={descriptions[step]}>
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles size={16} />
          ステップ {step + 1} / 3
        </div>

        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-muted-foreground">
              会社名
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              プレフィックス
              <Input value={prefix} onChange={(event) => setPrefix(event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <label className="space-y-2 text-sm text-muted-foreground">
              サーバー表示名
              <Input value={serverName} onChange={(event) => setServerName(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm text-muted-foreground">
              ローカルトークン
              <Input value={token} onChange={(event) => setToken(event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <label className="space-y-2 text-sm text-muted-foreground">
            スキル管理
            <Textarea
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder={"要件整理\nレポート作成\n開発自動化"}
            />
          </label>
        ) : null}

        <div className="flex justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
            戻る
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep((current) => current + 1)}>次へ</Button>
          ) : (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "保存中..." : "セットアップ完了"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

