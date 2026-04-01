import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { SetupWizard } from "./SetupWizard";
import { api } from "@/api/client";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";

export function Layout() {
  const location = useLocation();
  useLiveUpdates();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings,
  });

  return (
    <div className="min-h-screen px-5 py-5 md:px-6">
      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <main>
          <div key={location.pathname} className="page-fade space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      {settingsQuery.data ? <SetupWizard settings={settingsQuery.data} /> : null}
    </div>
  );
}
