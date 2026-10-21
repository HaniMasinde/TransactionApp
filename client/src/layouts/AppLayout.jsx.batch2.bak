import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const titles = { dashboard: 'Overview', transactions: 'Transactions', members: 'Members', approvals: 'Approvals', reports: 'Reports', account: 'Account settings' }

export default function AppLayout({ page, onNavigate, children }) {
  return <div className="app-shell"><Sidebar page={page} onNavigate={onNavigate}/><main className="main-area"><Topbar title={titles[page]}/><div className="page-content">{children}<footer>© 2026 Gather <span>Built for groups that grow together ✳</span></footer></div></main></div>
}
