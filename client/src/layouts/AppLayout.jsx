import { useState } from 'react'
import facebookLogo from '../assets/facebook.jpeg'
import messageLogo from '../assets/message.jpeg'
import phoneLogo from '../assets/phone.jpeg'
import tiktokLogo from '../assets/tiktok.jpeg'
import whatsappLogo from '../assets/whatsapp.jpeg'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

const footerLinks = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/254113745958',
    icon: whatsappLogo,
    external: true,
  },
  { label: 'Phone', href: 'tel:+254113745958', icon: phoneLogo },
  {
    label: 'Message',
    href: 'mailto:haningtonemasinde@gmail.com',
    icon: messageLogo,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61592740528794',
    icon: facebookLogo,
    external: true,
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@wuod_atieno01',
    icon: tiktokLogo,
    external: true,
  },
]

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
  loggingOut = false,
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
        loggingOut={loggingOut}
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
          <footer className="app-footer">
            <div className="app-footer__credits">
              <span>Copyright © {new Date().getFullYear()} Wuod Atieno</span>
              <span>Designed and developed by Haningtone Omondi</span>
            </div>
            <nav className="app-footer__links" aria-label="Contact and social links">
              {footerLinks.map(({ label, href, icon, external }) => (
                <a
                  className="app-footer__link"
                  href={href}
                  key={label}
                  {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <img src={icon} alt="" aria-hidden="true" />
                  <span>{label}</span>
                </a>
              ))}
            </nav>
          </footer>
        </div>
      </main>
    </div>
  )
}
