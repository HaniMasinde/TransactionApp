import { useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import TransactionTable from '../components/TransactionTable.jsx'
import { transactions } from '../data/demoData.js'

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const results = transactions.filter(row => `${row.name} ${row.reference}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeader eyebrow="FINANCIAL RECORDS" title="Transactions" description="Every contribution received, recorded in one place." action={<button className="primary-button">＋ Record payment</button>}/><section className="content-card"><div className="toolbar"><input aria-label="Search transactions" placeholder="Search member or M-Pesa code" value={search} onChange={event => setSearch(event.target.value)}/><button className="secondary-button">Filter</button><button className="secondary-button">Export</button></div><TransactionTable rows={results}/></section></>
}
