import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import StatusBadge from '../components/ui/StatusBadge.jsx'
import { getMembers } from '../services/memberService.js'

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getMembers()
      .then(result => {
        if (active) setMembers(result)
      })
      .catch(requestError => {
        if (active) setError(requestError.message || 'Unable to load members.')
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
    if (!term) return members
    return members.filter(member => member.fullName.toLowerCase().includes(term))
  }, [members, search])

  return (
    <>
      <PageHeader
        eyebrow="YOUR COMMUNITY"
        title="Members"
        description="Registered and approved members in your group."
      />
      <section className="content-card">
        <div className="toolbar">
          <input
            aria-label="Search members"
            placeholder="Search by member name"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <span className="record-count">
            {loading
              ? 'Loading members…'
              : error
                ? 'Member list unavailable'
                : search
                  ? `${results.length} of ${members.length} members`
                  : `${members.length} members`}
          </span>
        </div>

        {error && <p className="app-error" role="alert">{error}</p>}
        {loading ? (
          <p className="empty-state" aria-live="polite">Loading members…</p>
        ) : error ? null : (
          results.length === 0 ? (
          <p className="empty-state">
            {search ? 'No members match your search.' : 'There are no approved members yet.'}
          </p>
          ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">MEMBER</th>
                  <th scope="col">REGISTERED</th>
                  <th scope="col">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {results.map(member => (
                  <tr key={member.id}>
                    <td>
                      <span className="person-cell">
                        <Avatar name={member.fullName} />
                        {member.fullName}
                      </span>
                    </td>
                    <td>
                      {member.registeredAt
                        ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(member.registeredAt))
                        : '—'}
                    </td>
                    <td>
                      <StatusBadge
                        tone={
                          member.accountStatus === 'pending'
                            ? 'warning'
                            : member.accountStatus === 'disabled'
                              ? 'neutral'
                              : 'success'
                        }
                      >
                        {member.accountStatus === 'pending'
                          ? 'Pending'
                          : member.accountStatus === 'disabled'
                            ? 'Disabled'
                            : 'Active'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )
        )}
      </section>
    </>
  )
}
