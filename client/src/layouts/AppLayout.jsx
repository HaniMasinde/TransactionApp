import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const titles = {
  dashboard: 'Overview',
  transactions: 'Transactions',
  members: 'Members',
  approvals: 'Approvals',
  reports: 'Reports',
  account: 'Account settings',
  groupRules: 'Group rules',
  meetings: 'Meetings',
  minutes: 'Meeting minutes',
  notifications: 'Notifications',
  profile: 'Profile',
  technicalAdmin: 'Technical Administration',
}

export default function AppLayout({
  page,
  user,
  theme,
  onThemeToggle,
  onNavigate,
  onLogout,
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="app-shell" data-theme={theme} data-page={page}>
      {mobileNavOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar
        page={page}
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onClose={() => setMobileNavOpen(false)}
        mobileOpen={mobileNavOpen}
      />
      <main className="main-area">
        <Topbar
          title={titles[page] || 'Workspace'}
          user={user}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onNavigate={onNavigate}
          page={page}
          onMenuClick={() => setMobileNavOpen(open => !open)}
        />
        <div className="page-content" id="main-content">
          {children}
          <footer>
            <span>© {new Date().getFullYear()} Gather</span>
            <span>Group contributions, made clear.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}
