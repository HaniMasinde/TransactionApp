import { useEffect, useState } from 'react'
import Avatar from '../components/ui/Avatar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import {
  approveMember,
  getPendingMembers,
  rejectMember,
} from '../services/adminService.js'

export default function ApprovalsPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

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

  return (
    <>
      <PageHeader
        eyebrow="MEMBER MANAGEMENT"
        title="Registration approvals"
        description="Review requests to join your group."
      />
      {error && <p className="app-error" role="alert">{error}</p>}
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
