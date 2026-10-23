import {
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  UsersRound,
} from 'lucide-react'
import './landing.css'

const features = [
  {
    number: '01',
    icon: CircleDollarSign,
    title: 'Contributions at a glance',
    text: 'Record every payment once and find it again in seconds, by member or by month.',
    visual: 'bars',
  },
  {
    number: '02',
    icon: UsersRound,
    title: 'Members and roles',
    text: 'Keep member records tidy and give each officer exactly the access their role needs.',
    visual: 'roles',
  },
  {
    number: '03',
    icon: CalendarDays,
    title: 'Meetings and minutes',
    text: 'Dates, notes, and decisions live together, so nothing agreed is ever lost.',
    visual: 'meetings',
  },
  {
    number: '04',
    icon: Bell,
    title: 'Updates that reach people',
    text: 'Announcements, approvals, and account activity land where members will see them.',
    visual: 'updates',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create your account',
    text: 'Sign up with your contact details. Your group may need to approve your request.',
  },
  {
    number: '02',
    title: 'Join your group',
    text: 'Once approved, sign in and see the pages and tools that fit your role.',
  },
  {
    number: '03',
    title: 'Stay in sync',
    text: 'Follow contributions, member updates, and meetings from one dashboard.',
  },
]

function Brand({ footer = false }) {
  return (
    <a className={`gather-brand${footer ? ' gather-brand-footer' : ''}`} href="#top" aria-label="Gather home">
      <span className="gather-mark"><UsersRound size={15} strokeWidth={3} /></span>
      <span>gather<span className="gather-brand-dot">.</span></span>
    </a>
  )
}

function DashboardPreview() {
  return (
    <div className="gather-hero-art" aria-label="Example group dashboard preview">
      <span className="gather-orbit gather-orbit-outer" />
      <span className="gather-orbit gather-orbit-inner" />
      <span className="gather-orbit-dot gather-orbit-dot-pink" />
      <span className="gather-orbit-dot gather-orbit-dot-cyan" />
      <article className="gather-dash-card">
        <div className="gather-dash-top">
          <div className="gather-dash-identity">
            <span className="gather-dash-logo">g</span>
            <span><b>Our Group</b><small>Example group</small></span>
          </div>
          <span className="gather-dash-menu"><i /><i /><i /></span>
        </div>
        <div className="gather-dash-balance">
          <span>Group balance</span>
          <div><strong>KES 84,250</strong><b>+8.4%</b></div>
        </div>
        <div className="gather-dashboard-chart" aria-label="Contribution balance trending upward">
          <svg viewBox="0 0 340 100" preserveAspectRatio="none" role="img">
            <path className="gather-chart-fill" d="M0 78 L50 69 L102 74 L153 53 L207 57 L258 34 L340 15 L340 100 L0 100Z" />
            <path className="gather-chart-line" d="M0 78 L50 69 L102 74 L153 53 L207 57 L258 34 L340 15" />
          </svg>
        </div>
        <div className="gather-next-meeting">
          <span className="gather-next-icon"><CalendarDays size={14} /></span>
          <span><small>Up next</small><b>Group meeting, Sunday 10:30 am</b></span>
        </div>
      </article>
      <div className="gather-art-note"><Check size={14} /><span>Contribution recorded</span></div>
    </div>
  )
}

function FeatureVisual({ type }) {
  if (type === 'bars') {
    return <div className="gather-mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
  }

  if (type === 'roles') {
    return <div className="gather-role-tags" aria-hidden="true"><span>Treasurer</span><span>Secretary</span><span>Member</span></div>
  }

  if (type === 'meetings') {
    return <div className="gather-mini-rows" aria-hidden="true"><span><i className="dot-cyan" />Sun 10:30, monthly meeting</span><span><i className="dot-lime" />Minutes filed, 3 decisions</span></div>
  }

  return <div className="gather-mini-rows" aria-hidden="true"><span><i className="dot-pink" />New announcement posted</span><span><i className="dot-lime" />Request approved</span></div>
}

export default function LandingPage({ onLogin, onRegister }) {
  const go = (event, action) => {
    event.preventDefault()
    action()
  }

  return (
    <main className="gather-landing" id="top">
      <header className="gather-header">
        <Brand />
        <div className="gather-header-actions">
          <a className="gather-login-button" href="#login" onClick={event => go(event, onLogin)}>Login</a>
          <a className="gather-create-button" href="#create-account" onClick={event => go(event, onRegister)}>Create account</a>
        </div>
      </header>

      <section className="gather-hero">
        <div className="gather-hero-copy">
          <p className="gather-eyebrow">GROUP FINANCES, MINUS THE GUESSWORK</p>
          <h1>Money,<br />members and<br />meetings.<br /><em>All in one place.</em></h1>
          <p className="gather-lede">Gather gives your group one shared space for contributions, member records, meeting minutes and announcements. Treasurers stop chasing. Members stop guessing.</p>
          <div className="gather-hero-actions">
            <a className="gather-primary-button" href="#create-account" onClick={event => go(event, onRegister)}>Create your account</a>
            <a className="gather-secondary-button" href="#login" onClick={event => go(event, onLogin)}>Member sign in</a>
          </div>
          <p className="gather-trust-line">Built for savings groups, clubs and associations.</p>
        </div>
        <DashboardPreview />
      </section>

      <div className="gather-strip" aria-label="Group tools">
        <span>Contributions</span><i>/</i><span>Members</span><i>/</i><span>Meetings</span><i>/</i><span>Decisions</span>
      </div>

      <section className="gather-tools" id="features">
        <div className="gather-tools-heading">
          <p className="gather-eyebrow">TOOLS FOR EVERYDAY GROUP LIFE</p>
          <h2>Less chasing. <em>More doing.</em></h2>
          <p>Everything your group tracks, kept clear and in the open.</p>
        </div>
        <div className="gather-feature-grid">
          {features.map(({ number, icon: Icon, title, text, visual }) => (
            <article className="gather-feature-card" key={number}>
              <FeatureVisual type={visual} />
              <span className="gather-feature-card-icon"><Icon size={17} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="gather-steps" id="how-it-works">
        <div className="gather-steps-inner">
          <h2>Up and running in <em>three<br className="steps-mobile-break" /> steps.</em></h2>
          <div className="gather-step-grid">
            {steps.map(({ number, title, text }) => (
              <article className={`gather-step gather-step-${number}`} key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gather-cta" id="create-account">
        <div className="gather-cta-copy">
          <h2>Bring your group a<br />little closer.</h2>
          <p>Create an account in a minute, or sign in to pick up where your group left off.</p>
        </div>
        <div className="gather-cta-actions">
          <a className="gather-cta-dark-button" href="#create-account" onClick={event => go(event, onRegister)}>Create account</a>
          <a className="gather-cta-outline-button" href="#login" onClick={event => go(event, onLogin)}>Member sign in</a>
        </div>
      </section>

      <footer className="gather-footer">
        <Brand footer />
        <span>Made for groups moving forward, together.</span>
        <span className="gather-footer-copy">© 2026 Gather</span>
      </footer>
    </main>
  )
}
