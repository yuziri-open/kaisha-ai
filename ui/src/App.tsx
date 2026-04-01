import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { AgentsPage } from "@/pages/Agents";
import { AgentDetailPage } from "@/pages/AgentDetail";
import { ApprovalsPage } from "@/pages/Approvals";
import { CostsPage } from "@/pages/Costs";
import { DashboardPage } from "@/pages/Dashboard";
import { GoalsPage } from "@/pages/Goals";
import { RoutinesPage } from "@/pages/Routines";
import { SettingsPage } from "@/pages/Settings";
import { TaskDetailPage } from "@/pages/TaskDetail";
import { TasksPage } from "@/pages/Tasks";
import { OrgPage } from "@/pages/Org";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/org" element={<OrgPage />} />
        <Route path="/routines" element={<RoutinesPage />} />
        <Route path="/costs" element={<CostsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

