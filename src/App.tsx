import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Agents from './pages/Agents.tsx'
import Approvals from './pages/Approvals.tsx'
import CommandCenter from './pages/CommandCenter.tsx'
import Dashboard from './pages/Dashboard.tsx'
import Deliverables from './pages/Deliverables.tsx'
import Departments from './pages/Departments.tsx'
import DriveArchive from './pages/DriveArchive.tsx'
import KnowledgeBase from './pages/KnowledgeBase.tsx'
import Login from './pages/Login.tsx'
import Monitoring from './pages/Monitoring.tsx'
import Providers from './pages/Providers.tsx'
import Reports from './pages/Reports.tsx'
import Schedule from './pages/Schedule.tsx'
import SecurityAudit from './pages/SecurityAudit.tsx'
import Settings from './pages/Settings.tsx'
import Tasks from './pages/Tasks.tsx'
import Workflow from './pages/Workflow.tsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="agents" element={<Agents />} />
          <Route path="departments" element={<Departments />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="deliverables" element={<Deliverables />} />
          <Route path="reports" element={<Reports />} />
          <Route path="drive" element={<DriveArchive />} />
          <Route path="providers" element={<Providers />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="security" element={<SecurityAudit />} />
          <Route path="settings" element={<Settings />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
