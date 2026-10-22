import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import './landing.css'

const highlights = [
  {
    number: '01',
    icon: CircleDollarSign,
    title: 'Money, made clear',
    text: 'Keep contributions and group spending easy to understand, with every transaction in one place.',
  },
  {
    number: '02',
    icon: UsersRound,
    title: 'Everyone in the loop',
    text: 'Give members and officers a shared view of the people, decisions, and work that keep you moving.',
  },
  {
    number: '03',
    icon: CalendarDays,
    title: 'Plans with follow-through',
    text: 'Bring meetings, minutes, and next steps together so good intentions turn into progress.',
  },
]

function Brand({ footer = false }) {
  return (
    <a className={`gather-brand${footer ? ' gather-brand-footer' : ''}`} href="#top" aria-label="Gather home">
      <span className="gather-mark"><span /></span>
      <span>gather<span className="gather-brand-dot">.</span></span>
    </a>
  )
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
          <a className="gather-signin gather-action-button" href="#sign-in" onClick={event => go(event, onLogin)}>Login</a>
          <a className="gather-button gather-button-dark" href="#sign-up" onClick={event => go(event, onRegister)}>Sign up <ArrowUpRight size={15} /></a>
        </div>
      </header>

      <section className="gather-hero">
        <div className="gather-hero-copy">
          <div className="gather-eyebrow"><span className="gather-eyebrow-star">✳</span> YOUR GROUP, ALL TOGETHER</div>
          <h1>One group.<br />Many hands.<br /><em>More good.</em></h1>
          <p className="gather-lede">One shared home for our members, contributions, and plans. Everyone can see what’s happening and help move our group forward.</p>
          <div className="gather-hero-actions">
            <a className="gather-button gather-button-green" href="#get-started" onClick={event => go(event, onRegister)}>
              Join the group <ArrowRight size={16} />
            </a>
          </div>
          <div className="gather-trust-line"><span className="gather-trust-icon"><ShieldCheck size={15} /></span> Built for the people who build community</div>
        </div>

        <div className="gather-hero-art" aria-label="Illustration of a group workspace dashboard">
          <div className="gather-art-sun" />
          <div className="gather-art-caption"><span>ONE GROUP. MOVING TOGETHER.</span><span className="gather-caption-line" /></div>
          <div className="gather-dash-card">
            <div className="gather-dash-top">
              <div className="gather-dash-identity"><span className="gather-dash-logo">g<span>.</span></span><span><b>Our Group</b><small>Shared group space</small></span></div>
              <button className="gather-dash-more" aria-label="More dashboard options"><span /><span /><span /></button>
            </div>
            <div className="gather-dash-welcome"><small>OUR GROUP AT A GLANCE</small><h2>Growing together,<br />one step at a time.</h2></div>
            <div className="gather-dash-stat">
              <span className="gather-stat-icon"><CircleDollarSign size={17} /></span>
              <span className="gather-stat-label"><small>Group balance</small><b>KES 84,250</b></span>
              <span className="gather-stat-trend"><ArrowUpRight size={14} /> 8.4%</span>
            </div>
            <div className="gather-chart-wrap">
              <div className="gather-chart-label"><span>Contribution activity</span><span>This month <ChevronDown size={12} /></span></div>
              <div className="gather-chart" aria-hidden="true">
                <div className="gather-chart-y"><i>KES 40k</i><i>KES 20k</i><i>0</i></div>
                <div className="gather-chart-graph"><span className="gather-gridline" /><span className="gather-gridline" /><span className="gather-gridline" /><svg viewBox="0 0 340 94" preserveAspectRatio="none"><defs><linearGradient id="gather-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a9cf8d" stopOpacity=".45" /><stop offset="100%" stopColor="#a9cf8d" stopOpacity="0" /></linearGradient></defs><path d="M0 76 C22 72 24 55 48 62 S74 70 96 48 S122 53 146 42 S170 53 194 31 S220 39 242 23 S271 29 292 14 S322 18 340 4 V94 H0Z" fill="url(#gather-fill)" /><path d="M0 76 C22 72 24 55 48 62 S74 70 96 48 S122 53 146 42 S170 53 194 31 S220 39 242 23 S271 29 292 14 S322 18 340 4" fill="none" stroke="#36835f" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="gather-chart-x"><i>Wk 1</i><i>Wk 2</i><i>Wk 3</i><i>Wk 4</i></div></div>
              </div>
            </div>
            <div className="gather-next-meeting"><span className="gather-meeting-icon"><CalendarDays size={16} /></span><span><small>UP NEXT · GROUP MEETING</small><b>Sunday, 10:30 am</b></span><ArrowRight size={15} /></div>
          </div>
          <div className="gather-art-note"><span className="gather-note-check"><Check size={13} /></span><span><b>One shared picture</b><small>Everyone in the loop.</small></span></div>
          <span className="gather-art-spark gather-spark-one">✳</span><span className="gather-art-spark gather-spark-two">✦</span>
        </div>
      </section>

      <section className="gather-strip" aria-label="Gather benefits">
        <span>ONE GROUP, ONE SPACE</span><i />
        <span><Check size={14} /> Contributions</span><i />
        <span><Check size={14} /> Members</span><i />
        <span><Check size={14} /> Meetings</span><i />
        <span><Check size={14} /> Decisions</span>
      </section>

      <section className="gather-why" id="why-gather">
        <div className="gather-section-intro">
          <span className="gather-eyebrow">OUR GROUP, WORKING AS ONE</span>
          <h2>Everything our group needs, together.</h2>
          <p>Keep the details visible to everyone, so we can spend less time chasing updates and more time making progress together.</p>
        </div>
        <div className="gather-feature-list">
          {highlights.map(({ number, icon: Icon, title, text }) => (
            <article className="gather-feature" key={number}>
              <span className="gather-feature-number">{number}</span>
              <span className="gather-feature-icon"><Icon size={21} strokeWidth={1.7} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
              <ArrowUpRight className="gather-feature-arrow" size={17} />
            </article>
          ))}
        </div>
      </section>

      <section className="gather-cta" id="how-it-works">
        <div className="gather-cta-pattern" aria-hidden="true">✳</div>
        <div><span className="gather-eyebrow">OUR NEXT CHAPTER STARTS HERE</span><h2>We go further<br />when we go together.</h2></div>
        <div className="gather-cta-action"><p>Our shared space keeps every member connected and helps us shape what comes next for the group.</p></div>
      </section>

      <footer className="gather-footer"><Brand footer /><span>Made for groups moving forward, together.</span><span className="gather-footer-copy">© 2026 Gather. A little more together.</span><Sparkles className="gather-footer-spark" size={17} /></footer>
    </main>
  )
}
