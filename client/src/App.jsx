import { useEffect, useState } from 'react'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import MembersPage from './pages/MembersPage.jsx'
import ApprovalsPage from './pages/ApprovalsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { getCurrentUser, login, logout } from './services/authService.js'
import './App.css'
import GroupRulesPage from './pages/GroupRulesPage.jsx'
import MeetingsPage from './pages/MeetingsPage.jsx'
import MeetingMinutesPage from './pages/MeetingMinutesPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import TechnicalAdminPage from './pages/TechnicalAdminPage.jsx'
import useAutoDismiss from './hooks/useAutoDismiss.js'

const pageComponents = {
  dashboard: DashboardPage,
  transactions: TransactionsPage,
  members: MembersPage,
  approvals: ApprovalsPage,
  reports: ReportsPage,
  account: AccountPage,
  groupRules: GroupRulesPage,
  meetings: MeetingsPage,
  minutes: MeetingMinutesPage,
  notifications: NotificationsPage,
  profile: ProfilePage,
  technicalAdmin: TechnicalAdminPage,
}

function defaultPageFor(user) {
  return String(user?.role || '').toLowerCase() === 'secretary'
    ? 'account'
    : 'dashboard'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem('gather-theme') === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const [page, setPage] = useState('dashboard')
  const [checkingSession, setCheckingSession] = useState(true)
  const [appError, setAppError] = useState('')
  const [authPage, setAuthPage] = useState('landing')

  useAutoDismiss(appError, setAppError)

  useEffect(() => {
    let active = true

    getCurrentUser()
      .then(currentUser => {
        if (!active) return
        setUser(currentUser)
        setPage(defaultPageFor(currentUser))
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleLogin(phone, password) {
    const signedInUser = await login(phone, password)
    setUser(signedInUser)
    setPage(defaultPageFor(signedInUser))
    setAppError('')
  }

  async function handleLogout() {
    setAppError('')

    try {
      await logout()
      setUser(null)
      setPage('dashboard')
      setAuthPage('landing')
    } catch (error) {
      setAppError(error.message || 'Unable to sign out. Please try again.')
    }
  }

  function handleAccountUpdated(account) {
    setUser(current => ({
      ...current,
      fullName: account.fullName,
      phone: account.phone,
      recoveryEmail: account.recoveryEmail,
    }))
  }

  function handleThemeToggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      window.localStorage.setItem('gather-theme', nextTheme)
    } catch {
      // Keep the current session toggle working when storage is unavailable.
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="brand-mark">g</span>
        <p>Checking your session…</p>
      </main>
    )
  }

  if (!user) {
    if (authPage === 'landing') {
      return (
        <LandingPage
          onLogin={() => setAuthPage('login')}
          onRegister={() => setAuthPage('register')}
        />
      )
    }

    if (authPage === 'register') {
      return (
        <RegisterPage
          onLogin={() => setAuthPage('login')}
          onHome={() => setAuthPage('landing')}
        />
      )
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setAuthPage('register')}
        onHome={() => setAuthPage('landing')}
      />
    )
  }

  const role = String(user.role || '').toLowerCase().replace(/\s+/g, '')

  const permittedPages = {
    member: [
      'dashboard', 'transactions', 'members', 'groupRules',
      'meetings', 'minutes', 'notifications', 'account', 'profile',
    ],
    treasurer: [
      'dashboard', 'transactions', 'members', 'reports', 'groupRules',
      'meetings', 'minutes', 'notifications', 'account', 'profile',
    ],
    chairperson: [
      'dashboard', 'transactions', 'members', 'approvals', 'reports',
      'groupRules', 'meetings', 'minutes', 'notifications', 'account', 'profile',
    ],
    secretary: [
      'members', 'groupRules', 'meetings', 'minutes',
      'notifications', 'account', 'profile',
    ],
    technical_admin: [
      'technicalAdmin','account','profile',
    ],
  }

  const allowedPages = permittedPages[role] || ['account']
  const safePage = allowedPages.includes(page) ? page : allowedPages[0]
  const Page = pageComponents[safePage] || AccountPage

  return (
    <AppLayout
      page={safePage}
      user={user}
      theme={theme}
      onThemeToggle={handleThemeToggle}
      onNavigate={setPage}
      onLogout={handleLogout}
    >
      {appError && (
        <p className="app-error" role="alert">
          {appError}
        </p>
      )}
      <Page
        user={user}
        onNavigate={setPage}
        onAccountUpdated={handleAccountUpdated}
      />
    </AppLayout>
  )
}
