import { useEffect, useState } from 'react'
import Avatar from '../components/ui/Avatar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import {
  approveMember,
  decideMemberDeletion,
  getMemberDeletionRequests,
  getPendingMembers,
  rejectMember,
} from '../services/adminService.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'

export default function ApprovalsPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletionRequests, setDeletionRequests] = useState([])
  const [deletionLoading, setDeletionLoading] = useState(true)
  const [deletionReasons, setDeletionReasons] = useState({})
  const [deletionBusyId, setDeletionBusyId] = useState('')
  const [confirmingDeletion, setConfirmingDeletion] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState('')

  useAutoDismiss(error, setError)
  useAutoDismiss(success, setSuccess)

  useEffect(() => {
    let active = true

    getPendingMembers()
      .then(result => {
        if (active) setMembers(result)
      })
      .catch(requestError => {
        if (active) setError(requestError.message || 'Unable to load registrations.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getMemberDeletionRequests()
      .then(result => {
        if (active) setDeletionRequests(result)
      })
      .catch(requestError => {
        if (active) setError(requestError.message || 'Unable to load deletion requests.')
      })
      .finally(() => {
        if (active) setDeletionLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function decide(member, action) {
    setBusyId(member.id)
    setError('')

    try {
      if (action === 'approve') await approveMember(member.id)
      else await rejectMember(member.id)
      setMembers(current => current.filter(item => item.id !== member.id))
    } catch (requestError) {
      setError(requestError.message || 'Unable to update this registration.')
    } finally {
      setBusyId('')
    }
  }

  async function submitDeletionDecision(request, decision) {
    const reason = String(deletionReasons[request.id] || '').trim()
    setDeletionBusyId(request.id)
    setError('')
    setSuccess('')

    try {
      const result = await decideMemberDeletion(request.id, decision, reason)
      setDeletionRequests(current => current.filter(item => item.id !== request.id))
      setDeletionReasons(current => {
        const next = { ...current }
        delete next[request.id]
        return next
      })
      setSuccess(result.message || 'Deletion request reviewed.')
      setConfirmingDeletion(null)
    } catch (requestError) {
      const message = requestError.message || 'Unable to review this deletion request.'
      if (decision === 'approved') setConfirmationError(message)
      else setError(message)
    } finally {
      setDeletionBusyId('')
    }
  }

  function decideDeletion(request, decision) {
    const reason = String(deletionReasons[request.id] || '').trim()
    if (reason.length < 5) {
      setError('Enter a decision reason of at least 5 characters.')
      return
    }

    if (decision === 'approved') {
      setConfirmationError('')
      setConfirmingDeletion(request)
      return
    }

    submitDeletionDecision(request, decision)
  }

  return (
    <>
      <PageHeader
        eyebrow="MEMBER MANAGEMENT"
        title="Member approvals"
        description="Review registration and account deletion requests."
      />
      {error && <p className="app-error" role="alert">{error}</p>}
      {success && <p className="account-success" role="status">{success}</p>}

      <section className="content-card">
        <div className="account-card-heading">
          <div>
            <h2>Member account deletion requests</h2>
            <p>Review the member’s reason and record your decision reason.</p>
          </div>
        </div>
        {deletionLoading ? (
          <p>Loading deletion requests…</p>
        ) : deletionRequests.length === 0 ? (
          <p className="empty-state">There are no pending account deletion requests.</p>
        ) : (
          <section className="approval-grid">
            {deletionRequests.map(request => (
              <article className="content-card approval-card" key={request.id}>
                <div className="person-cell">
                  <Avatar name={request.memberName} />
                  <b>{request.memberName}</b>
                </div>
                {request.requestedAt && (
                  <small>
                    Requested {new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(request.requestedAt))}
                  </small>
                )}
                <div className="deletion-request-reason">
                  <span>MEMBER’S REQUEST REASON</span>
                  <p>{request.requestReason}</p>
                </div>
                <div className="deletion-decision-field">
                  <label htmlFor={`deletion-decision-reason-${request.id}`}>
                  Decision reason
                  <textarea
                    className="deletion-decision-textarea"
                    id={`deletion-decision-reason-${request.id}`}
                    placeholder="Explain why you are approving or declining this request."
                    value={deletionReasons[request.id] || ''}
                    onChange={event => setDeletionReasons(current => ({
                      ...current,
                      [request.id]: event.target.value,
                    }))}
                    minLength={5}
                    maxLength={1000}
                    rows={3}
                    required
                  />
                  </label>
                  <div className="deletion-decision-field-footer">
                    <span>This reason will be recorded in the audit log and shared in notifications.</span>
                    <span>{(deletionReasons[request.id] || '').length}/1000</span>
                  </div>
                </div>
                <p className="password-change-hint">
                  Approving anonymizes the member account but preserves transaction records.
                </p>
                <div className="approval-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={deletionBusyId === request.id || (deletionReasons[request.id] || '').trim().length < 5}
                    onClick={() => decideDeletion(request, 'rejected')}
                  >
                    Decline request
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={deletionBusyId === request.id || (deletionReasons[request.id] || '').trim().length < 5}
                    onClick={() => decideDeletion(request, 'approved')}
                  >
                    Approve deletion
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {confirmingDeletion && (
          <div className="deletion-confirmation-backdrop">
            <section
              className="deletion-confirmation-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deletion-confirmation-title"
              aria-describedby="deletion-confirmation-description"
            >
              <h2 id="deletion-confirmation-title">Approve account deletion?</h2>
              <p id="deletion-confirmation-description">
                This will anonymize <strong>{confirmingDeletion.memberName}</strong>’s
                account and revoke their access. Their transaction records will remain
                unchanged. Fellow active members will receive a notification with your
                recorded reason.
              </p>
              <div className="deletion-confirmation-reason">
                <span>RECORDED DECISION REASON</span>
                <p>{deletionReasons[confirmingDeletion.id]}</p>
              </div>
              {confirmationError && (
                <p className="app-error" role="alert">{confirmationError}</p>
              )}
              <div className="deletion-confirmation-actions">
                <button
                  type="button"
                  className="secondary-button"
                  autoFocus
                  onClick={() => {
                    setConfirmingDeletion(null)
                    setConfirmationError('')
                  }}
                  disabled={deletionBusyId === confirmingDeletion.id}
                >
                  Go back
                </button>
                <button
                  type="button"
                  className="deletion-confirm-button"
                  onClick={() => submitDeletionDecision(confirmingDeletion, 'approved')}
                  disabled={deletionBusyId === confirmingDeletion.id}
                >
                  {deletionBusyId === confirmingDeletion.id ? 'Approving…' : 'Confirm deletion'}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>

      {loading ? (
        <section className="content-card"><p>Loading registrations…</p></section>
      ) : members.length === 0 ? (
        <section className="content-card">
          <p className="empty-state">There are no pending registrations.</p>
        </section>
      ) : (
        <>
          <div className="notice-card">
            <b>{members.length} registrations need your attention</b>
            <p>Approved members can sign in and view their contribution records.</p>
          </div>
          <section className="approval-grid">
            {members.map(member => (
              <article className="content-card approval-card" key={member.id}>
                <div className="person-cell">
                  <Avatar name={member.fullName} />
                  <b>{member.fullName}</b>
                </div>
                <p>{member.phone}</p>
                {member.registeredAt && (
                  <small>
                    Applied {new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(member.registeredAt))}
                  </small>
                )}
                <div className="approval-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => decide(member, 'reject')}
                  >
                    Decline
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => decide(member, 'approve')}
                  >
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </>
  )
}
