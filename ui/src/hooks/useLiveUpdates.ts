import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useLiveUpdates() {
  const queryClient = useQueryClient();

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
    source.addEventListener("heartbeat", invalidate);
    source.addEventListener("activity", invalidate);
    source.addEventListener("routine", invalidate);
    source.addEventListener("task", invalidate);
    source.addEventListener("agent", invalidate);
    source.addEventListener("chat:message", invalidate);
    source.addEventListener("run:complete", invalidate);
    source.onerror = () => invalidate();

    return () => {
      if (timer) window.clearTimeout(timer);
      source.close();
    };
  }, [queryClient]);
}
