import { useEffect, useState } from 'react'
import FeaturePage from '../components/FeaturePage.jsx'
import {
  createMeetingMinutes,
  getMeetingMinutes,
  updateMeetingMinutes,
} from '../services/meetingMinutesService.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'

const itemId = (item) =>
  item?.id ?? item?.minuteId ?? item?.minute_id

const itemTitle = (item) =>
  item?.title ??
  item?.meetingTitle ??
  item?.meeting_title ??
  'Meeting minutes'

const itemDate = (item) =>
  item?.meetingDate ??
  item?.meeting_date ??
  item?.date ??
  item?.createdAt ??
  item?.created_at

const itemContent = (item) =>
  item?.content ??
  item?.minutes ??
  item?.body ??
  item?.notes ??
  ''

export default function MeetingMinutesPage({ user }) {
  const canEdit =
    String(user?.role ?? '').toLowerCase() === 'secretary'

  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [title, setTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useAutoDismiss(error, setError)
  useAutoDismiss(success, setSuccess)

  async function reload() {
    const result = await getMeetingMinutes()
    setItems(result)
  }

  useEffect(() => {
    let active = true

    getMeetingMinutes()
      .then((result) => {
        if (active) setItems(result)
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Could not load meeting minutes.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function startNew() {
    setSelectedId(null)
    setTitle('')
    setMeetingDate(new Date().toISOString().slice(0, 10))
    setContent('')
    setEditing(true)
    setError('')
    setSuccess('')
  }

  function selectItem(item) {
    setSelectedId(itemId(item))
    setTitle(itemTitle(item))

    const date = itemDate(item)
    setMeetingDate(date ? String(date).slice(0, 10) : '')
    setContent(itemContent(item))
    setEditing(false)
    setError('')
    setSuccess('')
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const details = {
        title,
        meetingDate,
        content,
      }

      if (selectedId) {
        await updateMeetingMinutes(selectedId, details)
      } else {
        await createMeetingMinutes(details)
      }

      await reload()
      setEditing(false)

      setSuccess(
        selectedId
          ? 'Meeting minutes updated.'
          : 'Meeting minutes created.',
      )
    } catch (err) {
      setError(
        err.message ||
        'Could not save minutes. Check the backend request format.',
      )
    } finally {
      setSaving(false)
    }
  }

  const selected = items.find(
    (item) => String(itemId(item)) === String(selectedId),
  )

  return (
    <FeaturePage
      title="Meeting minutes"
      description={
        canEdit
          ? 'Read, create and edit meeting records.'
          : 'Read the official records of group meetings.'
      }
      actions={
        canEdit ? (
          <button
            className="feature-button feature-button--primary"
            onClick={startNew}
          >
            New minutes
          </button>
        ) : null
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
        <div className="feature-card">
          Loading meeting minutes…
        </div>
      ) : (
        <div
          className="feature-grid"
          style={{
            gridTemplateColumns:
              'minmax(220px, .8fr) minmax(300px, 1.6fr)',
          }}
        >
          <div className="feature-card">
            <h2 style={{ marginTop: 0 }}>Records</h2>

            {items.length === 0 ? (
              <p className="feature-empty">
                No meeting minutes are available.
              </p>
            ) : (
              items.map((item, index) => (
                <button
                  key={itemId(item) ?? index}
                  className="feature-button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    marginBottom: '.5rem',
                  }}
                  onClick={() => selectItem(item)}
                >
                  <strong style={{ display: 'block' }}>
                    {itemTitle(item)}
                  </strong>

                  <span className="feature-muted">
                    {itemDate(item)
                      ? new Date(itemDate(item)).toLocaleDateString('en-KE')
                      : 'Date not provided'}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="feature-card">
            {editing && canEdit ? (
              <form
                className="feature-form"
                onSubmit={handleSave}
              >
                <label>
                  Meeting title
                  <input
                    className="feature-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </label>

                <label>
                  Meeting date
                  <input
                    className="feature-input"
                    type="date"
                    value={meetingDate}
                    onChange={(event) =>
                      setMeetingDate(event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Minutes
                  <textarea
                    className="feature-textarea"
                    value={content}
                    onChange={(event) =>
                      setContent(event.target.value)
                    }
                    required
                  />
                </label>

                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button
                    className="feature-button feature-button--primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save minutes'}
                  </button>

                  <button
                    type="button"
                    className="feature-button"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selected ? (
              <>
                <h2 style={{ marginTop: 0 }}>
                  {itemTitle(selected)}
                </h2>

                <p className="feature-muted">
                  {itemDate(selected)
                    ? new Date(itemDate(selected)).toLocaleDateString('en-KE')
                    : 'Date not provided'}
                </p>

                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {itemContent(selected) || 'No content recorded.'}
                </div>

                {canEdit && (
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      className="feature-button"
                      onClick={() => setEditing(true)}
                    >
                      Edit minutes
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="feature-empty">
                Select a record to read it
                {canEdit ? ' or create new minutes' : ''}.
              </p>
            )}
          </div>
        </div>
      )}
    </FeaturePage>
  )
}