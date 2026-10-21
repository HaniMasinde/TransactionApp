import { useState } from 'react'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import MembersPage from './pages/MembersPage.jsx'
import ApprovalsPage from './pages/ApprovalsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import './App.css'

const pageComponents = {
  dashboard: DashboardPage,
  transactions: TransactionsPage,
  members: MembersPage,
  approvals: ApprovalsPage,
  reports: ReportsPage,
  account: AccountPage,
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const Page = pageComponents[page] ?? DashboardPage
  return <AppLayout page={page} onNavigate={setPage}><Page /></AppLayout>
}
