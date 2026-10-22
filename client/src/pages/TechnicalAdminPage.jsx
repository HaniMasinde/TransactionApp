
import { useCallback, useEffect, useState } from 'react'
import {
  getTechnicalAdminUsers,
  updateUserRole,
} from '../services/technicalAdminService.js'

const assignableRoles = [
  { value: 'member', label: 'Member' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'secretary', label: 'Secretary' },
]
const staffingRequirements = [
  { role: 'chairperson', label: 'Chairpersons', minimum: 2 },
  { role: 'treasurer', label: 'Treasurers', minimum: 1 },
]

export default function TechnicalAdminPage({ user: currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedRoles, setSelectedRoles] = useState({})

  const staffing = staffingRequirements.map(requirement => {
    const count = users.filter(
      user => user.role === requirement.role,
    ).length

    return { ...requirement, count, shortfall: Math.max(requirement.minimum - count, 0) }
  })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getTechnicalAdminUsers()
      setUsers(result)
      setSelectedRoles(
        Object.fromEntries(result.map(user => [user.id, user.role])),
      )
    } catch (err) {
      setError(err.message || 'Unable to load approved users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleSave(user) {
    if (user.id === currentUser?.id) return

    const nextRole = selectedRoles[user.id]

    if (!nextRole || nextRole === user.role) return

    const confirmed = window.confirm(
      `Change ${user.fullName}'s role from ${user.role} to ${nextRole}?`,
    )

    if (!confirmed) {
      setSelectedRoles(current => ({
        ...current,
        [user.id]: user.role,
      }))
      return
    }

    setSavingId(user.id)
    setError('')
    setNotice('')

    try {
      const result = await updateUserRole(user.id, nextRole)
      const updatedUser = result.user

      setUsers(current =>
        current.map(item =>
          item.id === user.id
            ? { ...item, role: updatedUser?.role || nextRole }
            : item,
        ),
      )

      setSelectedRoles(current => ({
        ...current,
        [user.id]: updatedUser?.role || nextRole,
      }))

      setNotice(`Role updated successfully for ${user.fullName}.`)
    } catch (err) {
      setSelectedRoles(current => ({
        ...current,
        [user.id]: user.role,
      }))
      setError(err.message || 'Unable to update the user role.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <section className="technical-admin-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">SYSTEM MANAGEMENT</p>
          <h1>Technical Administration</h1>
          <p>
            Manage roles for approved GCMS accounts. Technical Administrator
            accounts cannot be changed from this screen.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={loadUsers}
          disabled={loading || Boolean(savingId)}
        >
          Refresh users
        </button>
      </header>

      <div className="technical-admin-summary">
        <span>Approved accounts</span>
        <strong>{users.length}</strong>
      </div>

      <section className="technical-admin-staffing" aria-label="Officer staffing targets">
        <h2>Staffing targets</h2>
        <p>Secretary is optional; the group can operate without one assigned.</p>
        <ul>
          {staffing.map(item => (
            <li key={item.role}>
              <span>{item.label}</span>
              <strong>{item.count} / {item.minimum}</strong>
              {item.shortfall > 0 && (
                <small>Assign {item.shortfall} more</small>
              )}
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <div className="technical-admin-error" role="alert">
          <strong>Why this failed</strong>
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <p className="technical-admin-notice" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p aria-live="polite">Loading approved users…</p>
      ) : users.length === 0 ? (
        <div className="technical-admin-empty">
          <h2>No approved users found</h2>
          <p>Approved accounts will appear here when available.</p>
        </div>
      ) : (
        <div className="technical-admin-table-wrap">
          <table className="technical-admin-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">Phone</th>
                <th scope="col">Current role</th>
                <th scope="col">Assign role</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName}</strong>
                    {user.recoveryEmail && (
                      <small className="technical-admin-email">
                        {user.recoveryEmail}
                      </small>
                    )}
                  </td>

                  <td>{user.phone || '—'}</td>

                  <td>
                    <span className="technical-admin-role">
                      {assignableRoles.find(
                        role => role.value === user.role,
                      )?.label || user.role}
                    </span>
                  </td>

                  <td>
                    {user.id === currentUser?.id ? (
                      <span className="technical-admin-role-lock">
                        Technical_admin
                      </span>
                    ) : (
                      <select
                        aria-label={`Assign role to ${user.fullName}`}
                        value={selectedRoles[user.id] || user.role}
                        disabled={Boolean(savingId)}
                        onChange={event =>
                          setSelectedRoles(current => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                      >
                        {assignableRoles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td>
                    {user.id === currentUser?.id ? (
                      <span className="technical-admin-role-lock">Current account</span>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={
                          Boolean(savingId) ||
                          selectedRoles[user.id] === user.role
                        }
                        onClick={() => handleSave(user)}
                      >
                        {savingId === user.id ? 'Saving…' : 'Save role'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="technical-admin-footnote">
        Every successful role change is recorded in the system audit log.
      </p>
    </section>
  )
}
