import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  HandCoins,
  UsersRound,
} from 'lucide-react'

const features = [
  {
    icon: HandCoins,
    title: 'See the full picture',
    description: 'Keep contributions clear, organized, and easy to follow.',
  },
  {
    icon: UsersRound,
    title: 'Bring people closer',
    description: 'Give every member and officer a place in the conversation.',
  },
  {
    icon: CalendarDays,
    title: 'Keep plans in motion',
    description: 'Bring meetings, minutes, and updates into one shared space.',
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
          <span className="landing-kicker"><span /> YOUR COMMUNITY, IN ONE PLACE</span>
          <h1>Bring your people together. <em>Move forward.</em></h1>
          <p>
            Make contributions easier to follow, keep everyone connected, and
            turn group plans into shared progress.
          </p>
          <div className="landing-proof">
            <span className="landing-proof-dot" />
            <span>Contributions</span>
            <i />
            <span>People</span>
            <i />
            <span>Plans</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="A preview of the Gather community workspace">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-orbit-track" aria-hidden="true">
            <span className="landing-orbit-tag orbit-tag-one">
              <HandCoins size={14} /> Contributions
            </span>
            <span className="landing-orbit-tag orbit-tag-two">
              <UsersRound size={14} /> Members
            </span>
            <span className="landing-orbit-tag orbit-tag-three">
              <CalendarDays size={14} /> Meetings
            </span>
          </div>
          <div className="workspace-preview">
            <div className="workspace-preview-top">
              <span className="workspace-logo">g</span>
              <div>
                <strong>Your community hub</strong>
                <small>Good things, growing together</small>
              </div>
              <span className="workspace-status"><i /> IN SYNC</span>
            </div>
            <div className="workspace-preview-rule" />
            <div className="workspace-items">
              <div className="workspace-item">
                <span className="workspace-item-icon icon-contributions"><HandCoins size={18} /></span>
                <span><strong>Shared contributions</strong><small>Clear records for everyone</small></span>
                <ArrowRight size={15} />
              </div>
              <div className="workspace-item">
                <span className="workspace-item-icon icon-members"><UsersRound size={18} /></span>
                <span><strong>Your community</strong><small>People at the heart of it all</small></span>
                <ArrowRight size={15} />
              </div>
              <div className="workspace-item">
                <span className="workspace-item-icon icon-meetings"><CalendarDays size={18} /></span>
                <span><strong>Plans that move</strong><small>Meetings, notes, and next steps</small></span>
                <ArrowRight size={15} />
              </div>
            </div>
            <div className="workspace-note">
              <span><ClipboardList size={17} /></span>
              <p><strong>One group.</strong> Moving as one.</p>
            </div>
          </div>
          <span className="landing-spark landing-spark-one">✳</span>
          <span className="landing-spark landing-spark-two">✦</span>
        </div>
      </section>

      <section className="landing-features" aria-labelledby="landing-features-title">
        <div className="landing-section-heading">
          <span className="eyebrow">MADE FOR THE WAY GROUPS GROW</span>
          <h2 id="landing-features-title">Less scattered. More together.</h2>
          <p>Bring the everyday pieces of your community into one clear view.</p>
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
