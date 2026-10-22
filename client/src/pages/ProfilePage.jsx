import { useEffect, useState } from 'react'
import FeaturePage from '../components/FeaturePage.jsx'
import { getMyAccount } from '../services/memberService.js'

function show(value) {
  if (value === undefined || value === null || value === '') {
    return 'Not provided'
  }

  return String(value)
}

export default function ProfilePage({ onNavigate }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getMyAccount()
      .then(result => {
        if (active) setAccount(result)
      })
      .catch(requestError => {
        if (active) {
          setError(requestError.message || 'Unable to load your profile.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <FeaturePage
      title="My account"
      description="Review the account currently signed in to GCMS."
    >
      {error && (
        <div className="feature-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="feature-card" aria-live="polite">
          Loading profile…
        </div>
      ) : account ? (
        <div className="feature-card">
          <div className="feature-grid">
            <div>
              <p className="feature-muted">Full name</p>
              <strong>{show(account.fullName)}</strong>
            </div>

            <div>
              <p className="feature-muted">Phone</p>
              <strong>{show(account.phone)}</strong>
            </div>

            <div>
              <p className="feature-muted">Email</p>
              <strong>{show(account.recoveryEmail)}</strong>
            </div>

            <div>
              <p className="feature-muted">Role</p>
              <strong>{show(account.role)}</strong>
            </div>

            <div>
              <p className="feature-muted">Account ID</p>
              <strong>{show(account.id)}</strong>
            </div>
          </div>
        </div>
      ) : null}

      <p className="feature-muted">
        Update your name and contact details in{' '}
        <button
          className="link-button"
          type="button"
          onClick={() => onNavigate?.('account')}
        >
          Account settings
        </button>.
      </p>
    </FeaturePage>
  )
}
