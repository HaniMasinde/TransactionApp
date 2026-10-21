import { Menu } from 'lucide-react'

function displayName(user) {
  return user?.fullName || user?.name || user?.full_name || 'Account'
}

export default function Topbar({ title, user, onLogout, onMenuClick }) {
  const name = displayName(user)
  const initials = name
    .split(/\s+/)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
