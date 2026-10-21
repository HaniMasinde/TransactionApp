import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import TransactionTable from '../components/TransactionTable.jsx'
import { getTransactions } from '../services/transactionService.js'

export default function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getTransactions({ limit: 100 })
      .then(result => {
        if (active) setTransactions(result.transactions)
      })
      .catch(requestError => {
        if (active) setError(requestError.message || 'Unable to load transactions.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const results = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return transactions

    return transactions.filter(transaction =>
      `${transaction.entered_member_name || ''} ${transaction.mpesa_reference || ''}`
        .toLowerCase()
        .includes(term),
    )
  }, [search, transactions])

  return (
    <>
      <PageHeader
        eyebrow="FINANCIAL RECORDS"
        title="Transactions"
        description="Every contribution received, recorded in one place."
      />
      <section className="content-card">
        <div className="toolbar">
          <input
            aria-label="Search transactions"
            placeholder="Search member or M-Pesa code"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        {error && <p className="app-error" role="alert">{error}</p>}
        {loading ? <p>Loading transactions…</p> : <TransactionTable rows={results} />}
      </section>
    </>
  )
}
