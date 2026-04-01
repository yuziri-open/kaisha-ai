import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/context/ToastContext";

export function useLiveUpdates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const source = new EventSource("/api/events");
    let timer: number | null = null;
    const invalidate = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        queryClient.invalidateQueries();
      }, 250);
    };

    source.onmessage = invalidate;

    source.addEventListener("heartbeat", () => {
      // heartbeat → 通知しない、クエリのみ更新
      invalidate();
    });

    source.addEventListener("activity", (event) => {
      invalidate();
      try {
        const data = JSON.parse(event.data) as { kind?: string; title?: string };
        if (data.kind === "approval") {
          toast({ title: "新しい承認リクエスト", description: data.title, kind: "approval" });
        }
      } catch {
        // ignore parse errors
      }
    });

    source.addEventListener("chat:message", () => {
      invalidate();
      toast({ title: "新しいメッセージ", description: "エージェントからメッセージが届きました", kind: "chat" });
    });

    source.addEventListener("run:complete", () => {
      invalidate();
      toast({ title: "実行完了", description: "エージェントの実行が完了しました", kind: "run" });
    });

    source.addEventListener("routine", invalidate);
    source.addEventListener("task", invalidate);
    source.addEventListener("agent", invalidate);

    source.onerror = () => invalidate();

    return () => {
      if (timer) window.clearTimeout(timer);
      source.close();
    };
  }, [queryClient, toast]);
}
