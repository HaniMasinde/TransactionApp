import { Bell, Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getUnreadNotificationCount } from '../services/notificationService.js'

function displayName(user) {
  return user?.fullName || user?.name || user?.full_name || 'Account'
}

export default function Topbar({
  title,
  user,
  theme,
  onThemeToggle,
  onLogout,
  onMenuClick,
  onNavigate,
  page,
}) {
  const [unreadCount, setUnreadCount] = useState(0)
  const name = displayName(user)
  const initials = name
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  useEffect(() => {
    let active = true

    async function refreshUnreadCount() {
      try {
        const count = await getUnreadNotificationCount()
        if (active) setUnreadCount(count)
      } catch {
        if (active) setUnreadCount(0)
      }
    }

    refreshUnreadCount()
    const interval = window.setInterval(refreshUnreadCount, 30000)
    window.addEventListener('focus', refreshUnreadCount)
    window.addEventListener('notifications:changed', refreshUnreadCount)

    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshUnreadCount)
      window.removeEventListener('notifications:changed', refreshUnreadCount)
    }
  }, [page])

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <button
          className="mobile-menu-button"
          type="button"
          aria-label="Open navigation menu"
          aria-controls="app-navigation"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <nav aria-label="Breadcrumb">
          <ol className="breadcrumb">
            <li>Umoja Welfare</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
      </div>
      <div className="topbar-actions">
        <button
          className="theme-toggle"
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={onThemeToggle}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          className="notification-shortcut"
          type="button"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          title="Notifications"
          onClick={() => onNavigate?.('notifications')}
        >
          <Bell size={19} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="notification-shortcut-count" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <span className="topbar-identity">
          <span className="avatar avatar-green">{initials}</span>
          <span>{name}</span>
        </span>
        <button
          className="logout-button"
          type="button"
          onClick={onLogout}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
