import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSession } from '../lib/auth.ts'
import { isSupabaseConfigured } from '../lib/supabase.ts'

interface NavItem {
  to: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/command-center', label: 'NARA Command Center' },
    ],
  },
  {
    title: 'Organization',
    items: [
      { to: '/agents', label: 'AI Agent Management' },
      { to: '/departments', label: 'Departments' },
      { to: '/workflow', label: 'Workflow Management' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/tasks', label: 'Task Management' },
      { to: '/schedule', label: 'Work Schedule' },
      { to: '/approvals', label: 'Approval Center' },
      { to: '/deliverables', label: 'Deliverables' },
      { to: '/reports', label: 'Reports & Analytics' },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { to: '/drive', label: 'Google Drive Archive' },
      { to: '/providers', label: 'AI Provider Management' },
      { to: '/knowledge-base', label: 'Knowledge Base' },
      { to: '/monitoring', label: 'System Monitoring' },
      { to: '/security', label: 'Security & Audit' },
      { to: '/settings', label: 'Settings' },
      { to: '/login', label: 'Login Founder' },
    ],
  },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const session = useSession()

  return (
    <div className="app-shell">
      <aside
        className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        aria-label="Navigasi utama"
      >
        <div className="sidebar-brand">
          <img
            className="sidebar-brand-logo"
            src={`${import.meta.env.BASE_URL}logo-icon.jpg`}
            alt="Logo SINEVERSE"
          />
          <span className="sidebar-brand-text">
            <strong>SINEVERSE</strong>
            <small>AI Headquarters</small>
          </span>
        </div>

        <div className="sidebar-founder">
          <span className="sidebar-founder-avatar" aria-hidden="true">
            F
          </span>
          <span className="sidebar-founder-text">
            <strong>Founder</strong>
            <small>
              {session ? session.user.email : 'Belum login'}
            </small>
          </span>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-group-title">{group.title}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `nav-link${isActive ? ' nav-link-active' : ''}`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className="sidebar-foot">
          Supabase:{' '}
          {isSupabaseConfigured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
        </p>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            aria-label="Buka atau tutup menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <span className="topbar-title">SINEVERSE AI Headquarters</span>
          <span
            className={`connection-badge${
              isSupabaseConfigured ? ' connection-badge-ok' : ''
            }`}
          >
            {isSupabaseConfigured
              ? 'Supabase terhubung'
              : 'Supabase belum dikonfigurasi'}
          </span>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
