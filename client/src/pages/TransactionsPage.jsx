import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import TransactionTable from '../components/TransactionTable.jsx'
import { createTransaction, getTransactions, reverseTransaction } from '../services/transactionService.js'
import { getMembers } from '../services/memberService.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'

export default function TransactionsPage({ user }) {
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState([])
  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [amount, setAmount] = useState('')
  const [mpesaReference, setMpesaReference] = useState('')
  const [transactionToReverse, setTransactionToReverse] = useState(null)
  const [reversalReason, setReversalReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useAutoDismiss(error, setError)
  useAutoDismiss(success, setSuccess)

  const role = String(user?.role || '').toLowerCase().replace(/\s+/g, '')
  const canRecordPayment = role === 'treasurer'

  async function reloadTransactions() {
    const result = await getTransactions({ limit: 100 })
    setTransactions(result.transactions)
  }

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

    if (canRecordPayment) {
      setMembersLoading(true)
      getMembers()
        .then(result => {
          if (active) setMembers(result)
        })
        .catch(requestError => {
          if (active) setError(requestError.message || 'Unable to load approved members.')
        })
        .finally(() => {
          if (active) setMembersLoading(false)
        })
    }

    return () => {
      active = false
    }
  }, [canRecordPayment])

  async function handleRecordPayment(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const member = members.find(item => item.id === selectedMemberId)
    if (!member) {
      setError('Select an approved member to record this payment.')
      return
    }

    setSaving(true)
    try {
      await createTransaction({
        memberUserId: member.id,
        enteredMemberName: member.fullName,
        amount: Number(amount),
        mpesaReference: mpesaReference.trim(),
      })
      await reloadTransactions()
      setSelectedMemberId('')
      setAmount('')
      setMpesaReference('')
      setSuccess('Payment recorded. The date and received status were added automatically.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to record payment.')
    } finally {
      setSaving(false)
    }
  }

  function openReversal(transaction) {
    setError('')
    setSuccess('')
    setReversalReason('')
    setTransactionToReverse(transaction)
  }

  async function handleReverseTransaction(event) {
    event.preventDefault()
    if (!transactionToReverse) return

    setError('')
    setSuccess('')
    setReversing(true)

    try {
      await reverseTransaction(transactionToReverse.id, reversalReason.trim())
      await reloadTransactions()
      setTransactionToReverse(null)
      setReversalReason('')
      setSuccess('Transaction reversed successfully.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to reverse this transaction.')
    } finally {
      setReversing(false)
    }
  }

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
      {canRecordPayment && (
        <section className="content-card payment-entry-card">
          <div className="card-heading">
            <div>
              <h2>Record a payment</h2>
              <p>Select an approved member and enter the payment details.</p>
            </div>
          </div>

          {error && !transactionToReverse && <p className="app-error" role="alert">{error}</p>}
          {success && <p className="account-success" role="status">{success}</p>}

          <form className="account-form payment-entry-form" onSubmit={handleRecordPayment}>
            <label htmlFor="payment-member">
              Approved member
              <select
                id="payment-member"
                value={selectedMemberId}
                onChange={event => setSelectedMemberId(event.target.value)}
                required
                disabled={membersLoading || members.length === 0}
              >
                <option value="">
                  {membersLoading ? 'Loading approved members…' : 'Select a member'}
                </option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
              {!membersLoading && members.length === 0 && (
                <small>No approved members are available to select.</small>
              )}
            </label>

            <label htmlFor="payment-amount">
              Amount (KES)
              <input
                id="payment-amount"
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                required
              />
            </label>

            <label htmlFor="payment-mpesa-reference">
              M-Pesa code
              <input
                id="payment-mpesa-reference"
                type="text"
                maxLength={100}
                value={mpesaReference}
                onChange={event => setMpesaReference(event.target.value)}
                required
              />
            </label>

            <p className="payment-entry-meta">
              Payment date is recorded automatically. Status is set to Received by the server.
            </p>

            <button
              className="primary-button"
              type="submit"
              disabled={saving || membersLoading || members.length === 0}
            >
              {saving ? 'Recording payment…' : 'Record payment'}
            </button>
          </form>
        </section>
      )}
      <section className="content-card">
        <div className="toolbar">
          <input
            aria-label="Search transactions"
            placeholder="Search member or M-Pesa code"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        {!canRecordPayment && error && <p className="app-error" role="alert">{error}</p>}
        {loading ? <p>Loading transactions…</p> : (
          <TransactionTable
            rows={results}
            canReverse={canRecordPayment}
            onReverse={openReversal}
          />
        )}
      </section>
      {transactionToReverse && (
        <div className="transaction-reversal-backdrop">
          <section
            className="transaction-reversal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-reversal-title"
          >
            <h2 id="transaction-reversal-title">Reverse transaction</h2>
            <p>
              Reverse the payment recorded for {transactionToReverse.entered_member_name}?
              This action will be recorded in the audit log.
            </p>
            {error && <p className="app-error" role="alert">{error}</p>}
            <form onSubmit={handleReverseTransaction}>
              <label htmlFor="transaction-reversal-reason">
                Reason for reversal
                <textarea
                  id="transaction-reversal-reason"
                  value={reversalReason}
                  onChange={event => setReversalReason(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  required
                />
              </label>
              <div className="transaction-reversal-actions">
                <button
                  className="feature-button"
                  type="button"
                  onClick={() => setTransactionToReverse(null)}
                  disabled={reversing}
                >
                  Cancel
                </button>
                <button className="transaction-reverse-button" type="submit" disabled={reversing || !reversalReason.trim()}>
                  {reversing ? 'Reversing…' : 'Confirm reversal'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
