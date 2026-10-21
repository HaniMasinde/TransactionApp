import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import TransactionTable from '../components/TransactionTable.jsx'
import { getTransactions } from '../services/transactionService.js'
import { getDashboardOverview } from '../services/dashboardService.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function displayDate() {
  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

function getUserName(user) {
  return (
    user?.fullName ||
    user?.full_name ||
    user?.name ||
    user?.firstName ||
    user?.first_name ||
    'there'
  )
}

function getOverviewStats(overview, role) {
  const dashboard = overview?.dashboard || overview || {}
  const contributions =
    dashboard.contributions || dashboard

  const members = dashboard.members || {}

  if (role === 'member') {
    return [
      {
        label: 'My contributions',
        value: formatCurrency(
          contributions.total_contributions ?? 0,
        ),
        detail: 'Total recorded contributions',
        dark: true,
      },
      {
        label: 'My transactions',
        value: Number(
          contributions.active_transaction_count ?? 0,
        ).toLocaleString('en-KE'),
        detail: 'Active contribution transactions',
      },
      {
        label: 'Reversed transactions',
        value: Number(
          contributions.reversed_transaction_count ?? 0,
        ).toLocaleString('en-KE'),
        detail: 'Transactions reversed',
      },
    ]
  }

  return [
    {
      label: 'Collective contributions',
      value: formatCurrency(
        contributions.total_contributions ?? 0,
      ),
      detail: 'Total active contributions recorded',
      dark: true,
    },
    {
      label: 'Active transactions',
      value: Number(
        contributions.active_transaction_count ?? 0,
      ).toLocaleString('en-KE'),
      detail: 'Recorded contribution transactions',
    },
    {
      label: 'Approved members',
      value: Number(
        members.approved_members ?? 0,
      ).toLocaleString('en-KE'),
      detail: 'Approved group members',
    },
  ]
}

export default function DashboardPage({ user, onNavigate }) {
  const role = String(user?.role || 'member')
    .toLowerCase()
    .replace(/\s+/g, '')

  const canRecordPayment = role === 'treasurer'

  const [overview, setOverview] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const requests = [
          getDashboardOverview(),
          getTransactions({ limit: 5, offset: 0 }),
        ]

        const results = await Promise.allSettled(requests)

        if (!active) return

        const [overviewResult, transactionsResult] = results

        if (overviewResult.status === 'fulfilled') {
          setOverview(overviewResult.value)
        } else {
          setError(
            overviewResult.reason?.message ||
              'Unable to load dashboard statistics.',
          )
        }

        if (transactionsResult.status === 'fulfilled') {
          setTransactions(
            transactionsResult.value.transactions,
          )
        } else if (overviewResult.status === 'fulfilled') {
          setError(
            transactionsResult.reason?.message ||
              'Dashboard statistics loaded, but recent transactions could not be loaded.',
          )
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message ||
              'Unable to load dashboard information.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const stats = overview
    ? getOverviewStats(overview, role)
    : []

  return (
    <>
      <PageHeader
        eyebrow={displayDate().toUpperCase()}
        title={`Good day, ${getUserName(user)}`}
        description="Here's what's happening with your group today."
        action={
          canRecordPayment ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => onNavigate?.('transactions')}
            >
              ＋ Record payment
            </button>
          ) : null
        }
      />

      {error && (
        <p className="app-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="content-card" aria-live="polite">
          <p>Loading dashboard information…</p>
        </section>
      ) : (
        <>
          <section className="stat-grid">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className={`stat-card${stat.dark ? ' stat-dark' : ''}`}
              >
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
                <span>{stat.detail}</span>
              </article>
            ))}
          </section>

          <section className="content-card">
            <div className="card-heading">
              <div>
                <h2>Recent transactions</h2>
                <p>
                  {role === 'member'
                    ? 'Your recent contribution transactions.'
                    : 'Latest contribution transactions recorded for your group.'}
                </p>
              </div>

              <button
                type="button"
                className="link-button"
                onClick={() => onNavigate?.('transactions')}
              >
                View all →
              </button>
            </div>

            {transactions.length > 0 ? (
              <TransactionTable rows={transactions} />
            ) : (
              <p className="empty-state">
                No recent transactions are available.
              </p>
            )}
          </section>
        </>
      )}
    </>
  )
}
