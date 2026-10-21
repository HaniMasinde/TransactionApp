import { useEffect, useState } from 'react'
import FeaturePage from '../components/FeaturePage.jsx'
import {
  getNextMeeting,
  saveNextMeeting,
} from '../services/meetingsService.js'

const getMeeting = payload =>
  payload?.meeting ??
  payload?.nextMeeting ??
  payload?.next_meeting ??
  payload

function getMeetingDate(meeting) {
  return (
    meeting?.startsAt ??
    meeting?.starts_at ??
    meeting?.meetingAt ??
    meeting?.meeting_at ??
    meeting?.meetingDate ??
    meeting?.meeting_date ??
    meeting?.date ??
    ''
  )
}

function toLocalDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function MeetingsPage({ user }) {
  const canEdit = String(user?.role ?? '').toLowerCase() === 'chairperson'

  const [meeting, setMeeting] = useState(null)
  const [title, setTitle] = useState('')
  const [meetingAt, setMeetingAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    getNextMeeting()
      .then(payload => {
        if (!active) return

        const item = getMeeting(payload)
        setMeeting(item)
        setTitle(item?.title ?? '')
        setMeetingAt(getMeetingDate(item) ? toLocalDateTime(getMeetingDate(item)) : '')
        setNotes(item?.description ?? item?.notes ?? item?.agenda ?? '')
      })
      .catch(err => {
        if (active) setError(err.message || 'Could not load the next meeting.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const startsAt = new Date(meetingAt)

    if (Number.isNaN(startsAt.getTime())) {
      setError('Enter a valid meeting date and time.')
      setSaving(false)
      return
    }

    try {
      const payload = await saveNextMeeting({
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        description: notes.trim() || null,
        location: meeting?.location ?? null,
      })

      const savedMeeting = getMeeting(payload)
      setMeeting(savedMeeting || {
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        description: notes.trim(),
        location: meeting?.location ?? null,
      })
      setSuccess('Next meeting updated.')
    } catch (err) {
      setError(err.message || 'Could not save the meeting.')
    } finally {
      setSaving(false)
    }
  }

  const displayDate = getMeetingDate(meeting)
  const description = meeting?.description ?? meeting?.notes ?? meeting?.agenda

  return (
    <FeaturePage
      title="Meetings"
      description="View the next group meeting and its details."
    >
      {error && <div className="feature-error" role="alert">{error}</div>}
      {success && <div className="feature-success" role="status">{success}</div>}

      {loading ? (
        <div className="feature-card" aria-live="polite">Loading meeting details…</div>
      ) : canEdit ? (
        <form className="feature-card feature-form" onSubmit={handleSave}>
          <label>
            Meeting title
            <input
              className="feature-input"
              type="text"
              name="title"
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={200}
              placeholder="e.g. Monthly group meeting"
              required
            />
          </label>

          <label>
            Meeting date and time
            <input
              className="feature-input"
              type="datetime-local"
              name="startsAt"
              value={meetingAt}
              onChange={event => setMeetingAt(event.target.value)}
              required
            />
          </label>

          <label>
            Notes or agenda
            <textarea
              className="feature-textarea"
              name="description"
              value={notes}
              onChange={event => setNotes(event.target.value)}
            />
          </label>

          <div>
            <button
              className="feature-button feature-button--primary"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save next meeting'}
            </button>
          </div>
        </form>
      ) : (
        <section className="feature-card meeting-details">
          {meeting ? (
            <>
              <h2>{meeting.title || 'Group meeting'}</h2>
              {displayDate && (
                <p className="meeting-details__date">
                  {new Date(displayDate).toLocaleString('en-KE', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              )}
              {meeting.location && <p>{meeting.location}</p>}
              {description && <p className="meeting-details__description">{description}</p>}
            </>
          ) : (
            <p className="feature-empty">The next meeting has not been scheduled.</p>
          )}
        </section>
      )}
    </FeaturePage>
  )
}
