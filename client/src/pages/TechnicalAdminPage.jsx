
import { useCallback, useEffect, useState } from 'react'
import { Info, RefreshCw, UsersRound, UserRoundCheck, WalletCards } from 'lucide-react'
import {
  getTechnicalAdminUsers,
  updateUserRole,
} from '../services/technicalAdminService.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'
import './technical-admin.css'

const assignableRoles = [
  { value: 'member', label: 'Member' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'chairperson', label: 'Chairperson' },
  { value: 'secretary', label: 'Secretary' },
]
const roleOrder = ['technical_admin', 'chairperson', 'secretary', 'treasurer', 'member']

export default function TechnicalAdminPage({ user: currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedRoles, setSelectedRoles] = useState({})
  const [pendingRoleChange, setPendingRoleChange] = useState(null)

  useAutoDismiss(error, setError)
  useAutoDismiss(notice, setNotice)

  const treasurerCount = users.filter(user => user.role === 'treasurer').length
  const chairpersonCount = users.filter(user => user.role === 'chairperson').length

  const sortedUsers = users
    .map((user, index) => ({ user, index }))
    .sort((a, b) => {
      const roleDifference =
        roleOrder.indexOf(a.user.role) - roleOrder.indexOf(b.user.role)

      if (roleDifference === 0) return a.index - b.index
      if (roleOrder.indexOf(a.user.role) === -1) return 1
      if (roleOrder.indexOf(b.user.role) === -1) return -1
      return roleDifference
    })
    .map(({ user }) => user)

  function getInitials(name = '') {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }

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

    setPendingRoleChange({ user, nextRole })
  }

  function cancelRoleChange() {
    if (!pendingRoleChange) return

    setSelectedRoles(current => ({
      ...current,
      [pendingRoleChange.user.id]: pendingRoleChange.user.role,
    }))
    setPendingRoleChange(null)
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return

    const { user, nextRole } = pendingRoleChange
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

      setPendingRoleChange(null)
      setNotice(`Role updated successfully for ${user.fullName}.`)
    } catch (err) {
      setSelectedRoles(current => ({
        ...current,
        [user.id]: user.role,
      }))
      setPendingRoleChange(null)
      setError(err.message || 'Unable to update the user role.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <section className="technical-admin-page">
      <header className="page-header technical-admin-header">
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
          className="button button-secondary technical-admin-refresh"
          onClick={loadUsers}
          disabled={loading || Boolean(savingId) || Boolean(pendingRoleChange)}
        >
          <RefreshCw size={16} /> Refresh users
        </button>
      </header>

      <div className="technical-admin-overview">
        <article className="technical-admin-stat-card">
          <span className="technical-admin-stat-icon"><UsersRound size={21} /></span>
          <span className="technical-admin-stat-label">Approved accounts</span>
          <strong>{users.length}</strong>
        </article>
        <article className="technical-admin-stat-card">
          <span className="technical-admin-stat-icon"><UserRoundCheck size={21} /></span>
          <span className="technical-admin-stat-label">Chairpersons</span>
          <strong>{chairpersonCount}<small> / 1 min</small></strong>
          <span className="technical-admin-meter"><i style={{ width: `${Math.min(chairpersonCount * 100, 100)}%` }} /></span>
        </article>
        <article className="technical-admin-stat-card">
          <span className="technical-admin-stat-icon"><WalletCards size={21} /></span>
          <span className="technical-admin-stat-label">Treasurers</span>
          <strong>{treasurerCount}<small> / 2 max</small></strong>
          <span className="technical-admin-meter"><i style={{ width: `${Math.min(treasurerCount * 50, 100)}%` }} /></span>
        </article>
      </div>

      <p className="technical-admin-guidance"><Info size={18} /> Treasurer is optional. Assign up to two treasurers and at least one chairperson.</p>

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

      {pendingRoleChange && (
        <div className="technical-admin-confirmation-backdrop">
          <section
            className="technical-admin-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="role-change-confirmation-title"
            aria-describedby="role-change-confirmation-description"
          >
            <h2 id="role-change-confirmation-title">Confirm role change</h2>
            <p id="role-change-confirmation-description">
              Change {pendingRoleChange.user.fullName}&apos;s role from{' '}
              <strong>{pendingRoleChange.user.role}</strong> to{' '}
              <strong>{pendingRoleChange.nextRole}</strong>?
            </p>
            <div className="technical-admin-confirmation-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={cancelRoleChange}
                disabled={Boolean(savingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={confirmRoleChange}
                disabled={Boolean(savingId)}
              >
                {savingId ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      )}

      {loading ? (
        <p aria-live="polite">Loading approved users…</p>
      ) : users.length === 0 ? (
        <div className="technical-admin-empty">
          <h2>No approved users found</h2>
          <p>Approved accounts will appear here when available.</p>
        </div>
      ) : (
        <section className="technical-admin-assignment-card" aria-labelledby="technical-admin-assignments-title">
          <div className="technical-admin-table-heading">
            <h2 id="technical-admin-assignments-title">Officer assignments</h2>
            <span>{users.length} approved accounts</span>
          </div>
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
              {sortedUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <span className="technical-admin-user-cell">
                      <span className="technical-admin-avatar" aria-hidden="true">{getInitials(user.fullName)}</span>
                      <span className="technical-admin-user-details">
                        <strong>{user.fullName}</strong>
                        {user.recoveryEmail && (
                          <small className="technical-admin-email">
                            {user.recoveryEmail}
                          </small>
                        )}
                      </span>
                    </span>
                  </td>

                  <td>{user.phone || '—'}</td>

                  <td>
                    <span className={`technical-admin-role technical-admin-role--${user.role}`}>
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
                        disabled={Boolean(savingId) || Boolean(pendingRoleChange)}
                        onChange={event =>
                          setSelectedRoles(current => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                      >
                        {assignableRoles.map(role => (
                          <option
                            key={role.value}
                            value={role.value}
                            disabled={
                              role.value === 'treasurer' &&
                              user.role !== 'treasurer' &&
                              treasurerCount >= 2
                            }
                          >
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
                          Boolean(pendingRoleChange) ||
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
        </section>
      )}

      <p className="technical-admin-footnote">
        Every successful role change is recorded in the system audit log.
      </p>
    </section>
  )
}
