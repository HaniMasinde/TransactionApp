import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import {
  getWeeklyGroupReport,
  getWeeklyMemberReport,
} from '../services/transactionService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'

function nairobiToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function currentWeekMonday() {
  const today = nairobiToday()
  const date = new Date(`${today}T00:00:00Z`)
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - daysSinceMonday)
  return date.toISOString().slice(0, 10)
}

function isMonday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date.getUTCDay() === 1
}

function displayDate(value) {
  const date = String(value || '').split('T')[0]
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export default function ReportsPage({ user }) {
  const canExport = String(user?.role ?? '').toLowerCase() === 'treasurer'
  const [weekStart, setWeekStart] = useState(currentWeekMonday)
  const [report, setReport] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupError, setGroupError] = useState('')
  const [membersError, setMembersError] = useState('')
  const [selectionError, setSelectionError] = useState('')

  useAutoDismiss(groupError, setGroupError)
  useAutoDismiss(membersError, setMembersError)
  useAutoDismiss(selectionError, setSelectionError)

  useEffect(() => {
    let active = true

    Promise.allSettled([
      getWeeklyGroupReport(weekStart),
      getWeeklyMemberReport(weekStart),
    ])
      .then(([groupResult, memberResult]) => {
        if (!active) return

        if (groupResult.status === 'fulfilled') {
          setReport(groupResult.value)
        } else {
          setReport(null)
          setGroupError(
            `Group weekly total failed: ${groupResult.reason?.message || 'Unable to load the report.'}`,
          )
        }

        if (memberResult.status === 'fulfilled') {
          const rows = Array.isArray(memberResult.value?.members)
            ? memberResult.value.members
            : []
          setMembers(rows)
        } else {
          setMembers([])
          setMembersError(
            `Member breakdown failed: ${memberResult.reason?.message || 'Unable to load the report.'}`,
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [weekStart])

  function handleWeekChange(event) {
    const value = event.target.value
    if (!isMonday(value)) {
      setSelectionError('Choose a Monday to load a weekly report.')
      return
    }
    setLoading(true)
    setGroupError('')
    setMembersError('')
    setSelectionError('')
    setWeekStart(value)
  }

  function exportReport() {
    if (!report) return

    const rows = [
      ['Weekly group contributions', weekStart, report.weekEnd],
      [],
      ['Member', 'Transactions', 'Contribution total (KES)'],
      ...members.map(member => [
        member.memberName,
        member.transactionCount,
        member.contributionTotal,
      ]),
      [],
      ['Group total', report.transactionCount, report.contributionTotal],
    ]
    const contents = rows.map(row => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `weekly-contributions-${weekStart}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const weekEnd = report?.weekEnd || `${weekStart}T00:00:00.000Z`

  return (
    <>
      <PageHeader
        eyebrow="INSIGHTS & EXPORTS"
        title="Weekly contributions"
        description="Review active payment contributions for your group and each contributing member."
        action={canExport ? (
          <button
            className="primary-button"
            type="button"
            onClick={exportReport}
            disabled={!report || loading}
          >
            ↓ Export report
          </button>
        ) : null}
      />

      <section className="content-card weekly-report-controls">
        <label htmlFor="weekly-report-start">Week starting Monday</label>
        <input
          id="weekly-report-start"
          type="date"
          value={weekStart}
          onChange={handleWeekChange}
          aria-describedby="weekly-report-help"
        />
        <p id="weekly-report-help">
          Reports cover Monday through Saturday in Africa/Nairobi time. Reversed payments are excluded.
        </p>
      </section>

      {selectionError && <p className="app-error" role="alert">{selectionError}</p>}
      {groupError && <p className="app-error" role="alert">{groupError}</p>}
      {membersError && <p className="app-error" role="alert">{membersError}</p>}

      {loading ? (
        <section className="content-card" aria-live="polite">Loading weekly contributions…</section>
      ) : (
        <>
          {report && (
            <section className="stat-grid weekly-report-summary">
              <article className="stat-card stat-dark">
                <small>Group contributions</small>
                <strong>{formatCurrency(report.contributionTotal)}</strong>
                <span>{Number(report.transactionCount || 0).toLocaleString('en-KE')} active payments</span>
              </article>
              <article className="stat-card">
                <small>Week</small>
                <strong>{displayDate(report.weekStart)} – {displayDate(weekEnd)}</strong>
                <span>Africa/Nairobi time</span>
              </article>
              {!membersError && (
                <article className="stat-card">
                  <small>Contributing members</small>
                  <strong>{members.length.toLocaleString('en-KE')}</strong>
                  <span>Members with at least one active payment</span>
                </article>
              )}
            </section>
          )}

          {!membersError && (
          <section className="content-card">
            <div className="card-heading">
              <div>
                <h2>Contribution by member</h2>
                <p>Only members with active contributions during the selected week are listed.</p>
              </div>
            </div>
            <div className="feature-table-wrap">
              <table className="feature-table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Payments</th>
                    <th scope="col">Contribution total</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.memberUserId || member.memberName}>
                      <td>{member.memberName}</td>
                      <td>{Number(member.transactionCount || 0).toLocaleString('en-KE')}</td>
                      <td>{formatCurrency(member.contributionTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <p className="feature-empty">No active contributions were recorded for this week.</p>
              )}
            </div>
          </section>
          )}
        </>
      )}
    </>
  )
}
