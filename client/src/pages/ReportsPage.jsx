import PageHeader from '../components/PageHeader.jsx'

const reports = [
  ['Monthly statement', 'Contributions received during a selected month.'],
  ['Member summary', 'Member totals and contribution history.'],
  ['Contribution overview', 'Group totals and activity over time.'],
]
export default function ReportsPage() {
  return <><PageHeader eyebrow="INSIGHTS & EXPORTS" title="Reports" description="Prepare contribution summaries for your next meeting." action={<button className="primary-button">↓ Export report</button>}/><section className="report-grid">{reports.map(([title, description]) => <article className="content-card report-card" key={title}><span className="report-mark">▤</span><h2>{title}</h2><p>{description}</p><button className="link-button">Prepare report →</button></article>)}</section></>
}
