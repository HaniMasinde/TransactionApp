
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import FeaturePage from '../components/FeaturePage.jsx'
import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService.js'

const idOf = (item) =>
  item?.id ?? item?.notificationId ?? item?.notification_id

const titleOf = (item) =>
  item?.title ?? item?.type ?? 'Notification'

const messageOf = (item) =>
  item?.message ?? item?.body ?? item?.description ?? ''

const isRead = (item) =>
  Boolean(
    item?.read ??
    item?.isRead ??
    item?.is_read ??
    item?.readAt ??
    item?.read_at,
  )

export default function NotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function reload() {
    setItems(await getNotifications())
  }

  useEffect(() => {
    let active = true

    getNotifications()
      .then((result) => {
        if (active) setItems(result)
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Could not load notifications.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function markOne(item) {
    setError('')
    setSuccess('')
    setBusyId(idOf(item))

    try {
      await markNotificationRead(idOf(item))
      await reload()
      setSuccess('Notification marked as read.')
    } catch (err) {
      setError(err.message || 'Could not update notification.')
    } finally {
      setBusyId(null)
    }
  }

  async function markAll() {
    setError('')
    setSuccess('')

    try {
      await markAllNotificationsRead()
      await reload()
      setSuccess('All notifications marked as read.')
    } catch (err) {
      setError(err.message || 'Could not mark notifications as read.')
    }
  }

  async function deleteOne(item) {
    const id = idOf(item)
    setError('')
    setSuccess('')
    setBusyId(id)

    try {
      await deleteNotification(id)
      setItems(current => current.filter(notification => idOf(notification) !== id))
      setSuccess('Notification deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete notification.')
    } finally {
      setBusyId(null)
    }
  }

  const unreadCount = items.filter((item) => !isRead(item)).length

  return (
    <FeaturePage
      title="Notifications"
      description={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`}
      actions={
        <button
          className="feature-button"
          onClick={markAll}
          disabled={unreadCount === 0}
        >
          Mark all read
        </button>
      }
    >
      {error && (
        <div className="feature-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="feature-success" role="status">
          {success}
        </div>
      )}

      {loading ? (
        <div className="feature-card">Loading notifications…</div>
      ) : items.length === 0 ? (
        <div className="feature-card feature-empty">
          You have no notifications.
        </div>
      ) : (
        items.map((item, index) => (
          <article
            className="feature-card"
            key={idOf(item) ?? index}
            style={{
              borderLeft: `4px solid ${
                isRead(item) ? '#d0d5dd' : '#16a34a'
              }`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1rem', margin: '0 0 .4rem' }}>
                  {titleOf(item)}{' '}
                  {!isRead(item) && (
                    <span className="feature-pill">Unread</span>
                  )}
                </h2>

                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {messageOf(item)}
                </p>

                {(item.createdAt ?? item.created_at) && (
                  <p className="feature-muted">
                    {new Date(
                      item.createdAt ?? item.created_at,
                    ).toLocaleString('en-KE')}
                  </p>
                )}
              </div>

              <div className="notification-actions">
                {!isRead(item) && (
                  <button
                    className="feature-button"
                    disabled={busyId !== null}
                    onClick={() => markOne(item)}
                  >
                    {busyId === idOf(item) ? 'Saving…' : 'Mark read'}
                  </button>
                )}
                <button
                  className="feature-button notification-delete-button"
                  type="button"
                  aria-label={`Delete notification: ${titleOf(item)}`}
                  disabled={busyId !== null}
                  onClick={() => deleteOne(item)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {busyId === idOf(item) ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </FeaturePage>
  )
}
