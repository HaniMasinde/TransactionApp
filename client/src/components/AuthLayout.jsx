import { ArrowUpRight, HandCoins, Sparkles, UsersRound } from 'lucide-react'

export default function AuthLayout({
  children,
  eyebrow,
  title,
  description,
  onHome,
}) {
  function goHome(event) {
    event.preventDefault()
    onHome?.()
  }

  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <aside className="auth-visual">
          <a className="auth-story-brand" href="#home" onClick={goHome}>
            <span className="auth-story-mark">g</span>
            gather<span>.</span>
          </a>

          <div className="auth-story-copy">
            <span className="auth-story-kicker">
              <Sparkles size={14} /> BETTER, TOGETHER
            </span>
            <h2>Make good things happen, <em>together.</em></h2>
            <p>
              A calmer way to bring your people, plans, and contributions into
              focus.
            </p>
          </div>

          <div className="auth-story-card" aria-hidden="true">
            <div className="auth-story-card-top">
              <span className="auth-story-card-icon"><HandCoins size={18} /></span>
              <span>
                <strong>Group contributions</strong>
                <small>One clear picture</small>
              </span>
              <ArrowUpRight className="auth-story-arrow" size={17} />
            </div>
            <div className="auth-story-progress"><span /></div>
            <div className="auth-story-card-bottom">
              <span><UsersRound size={14} /> Your community</span>
              <span className="auth-story-live"><i /> In sync</span>
            </div>
          </div>

          <p className="auth-story-footer">A shared space for your community.</p>
        </aside>

        <section className="auth-card">
          <a className="auth-mobile-brand" href="#home" onClick={goHome}>
            <span className="auth-story-mark">g</span>
            gather<span>.</span>
          </a>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </section>
      </div>
    </main>
  )
}
