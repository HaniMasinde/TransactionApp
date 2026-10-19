import PageHeader from '../components/PageHeader.jsx'
import TransactionTable from '../components/TransactionTable.jsx'
import { transactions } from '../data/demoData.js'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function DashboardPage() {
  return <><PageHeader eyebrow="TUESDAY, 15 OCTOBER 2026" title="Good morning, James" description="Here's what's happening with your group today." action={<button className="primary-button">＋ Record payment</button>}/>
    <section className="stat-grid"><article className="stat-card stat-dark"><small>Collective balance</small><strong>{formatCurrency(284500)}</strong><span>↗ 12.8% vs last month</span></article><article className="stat-card"><small>Contributions this month</small><strong>{formatCurrency(68400)}</strong><span>32 payments recorded</span></article><article className="stat-card"><small>Active members</small><strong>48 members</strong><span>+2 this month</span></article></section>
    <section className="content-card"><div className="card-heading"><div><h2>Recent transactions</h2><p>Latest contributions recorded for your group.</p></div><button className="link-button">View all →</button></div><TransactionTable rows={transactions}/></section></>
}
