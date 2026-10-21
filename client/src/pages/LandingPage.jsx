import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  HandCoins,
  UsersRound,
} from 'lucide-react'

const features = [
  {
    icon: HandCoins,
    title: 'Track contributions',
    description: 'Keep payment records organized and easy to review.',
  },
  {
    icon: UsersRound,
    title: 'Manage membership',
    description: 'Give members and group officers the right tools for their role.',
  },
  {
    icon: CalendarDays,
    title: 'Stay in sync',
    description: 'Keep meetings, minutes, and group updates together.',
  },
]

export default function LandingPage({ onLogin, onRegister }) {
  function follow(event, action) {
    event.preventDefault()
    action()
  }

  return (
    <main className="landing-page" id="home">
      <header className="landing-header">
        <a className="landing-brand" href="#home" aria-label="Gather home">
          <span className="landing-brand-mark">g</span>
          <span>gather<span className="brand-period">.</span></span>
        </a>
        <nav className="landing-nav" aria-label="Account navigation">
          <a href="#login" onClick={event => follow(event, onLogin)}>Sign in</a>
          <a
            className="primary-button landing-nav-cta"
            href="#sign-up"
            onClick={event => follow(event, onRegister)}
          >
            Create account <ArrowRight size={16} />
          </a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker"><span /> MADE FOR YOUR COMMUNITY</span>
          <h1>Good things happen when a group <em>grows together.</em></h1>
          <p>
            Gather gives your group one clear place to manage contributions,
            membership, meetings, and the details that keep everyone connected.
          </p>
          <div className="landing-actions">
            <a
              className="primary-button landing-primary"
              href="#sign-up"
              onClick={event => follow(event, onRegister)}
            >
              Get started <ArrowRight size={17} />
            </a>
            <a
              className="landing-login-link"
              href="#login"
              onClick={event => follow(event, onLogin)}
            >
              I already have an account
            </a>
          </div>
          <div className="landing-assurance">
            <span className="landing-check"><Check size={14} /></span>
            Built for the way community groups work
          </div>
        </div>

        <div className="landing-visual" aria-label="Gather group workspace preview">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="workspace-preview">
            <div className="workspace-preview-top">
              <span className="workspace-logo">g</span>
              <div>
                <strong>Your group workspace</strong>
                <small>Everything in one place</small>
              </div>
              <span className="workspace-menu">•••</span>
            </div>
            <div className="workspace-preview-rule" />
            <div className="workspace-items">
              <div className="workspace-item">
                <span className="workspace-item-icon icon-contributions"><HandCoins size={18} /></span>
                <span><strong>Contributions</strong><small>Records and reports</small></span>
                <ArrowRight size={15} />
              </div>
              <div className="workspace-item">
                <span className="workspace-item-icon icon-members"><UsersRound size={18} /></span>
                <span><strong>Members</strong><small>People in your group</small></span>
                <ArrowRight size={15} />
              </div>
              <div className="workspace-item">
                <span className="workspace-item-icon icon-meetings"><CalendarDays size={18} /></span>
                <span><strong>Meetings</strong><small>Plans and minutes</small></span>
                <ArrowRight size={15} />
              </div>
            </div>
            <div className="workspace-note">
              <span><ClipboardList size={17} /></span>
              <p><strong>Clear records.</strong> Confident decisions.</p>
            </div>
          </div>
          <span className="landing-spark landing-spark-one">✳</span>
          <span className="landing-spark landing-spark-two">✦</span>
        </div>
      </section>

      <section className="landing-features" aria-labelledby="landing-features-title">
        <div className="landing-section-heading">
          <span className="eyebrow">ONE SIMPLE WORKSPACE</span>
          <h2 id="landing-features-title">Everything your group needs to move forward.</h2>
        </div>
        <div className="landing-feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="landing-feature" key={title}>
              <span className="landing-feature-icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-footer-brand" href="#home">gather<span>.</span></a>
        <span>Helping groups grow together.</span>
      </footer>
    </main>
  )
}
