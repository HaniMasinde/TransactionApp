import FeaturePage from '../components/FeaturePage.jsx'

function show(value) {
  if (value === undefined || value === null || value === '') {
    return 'Not provided'
  }

  return String(value)
}

export default function ProfilePage({ user, onNavigate }) {
  const fullName =
    user?.fullName ?? user?.full_name ?? user?.name

  const phone =
    user?.phone ?? user?.phoneNumber ?? user?.phone_number

  const email =
    user?.email ??
    user?.recoveryEmail ??
    user?.recovery_email

  const userId =
    user?.id ?? user?.userId ?? user?.user_id

  return (
    <FeaturePage
      title="My account"
      description="Review the account currently signed in to GCMS."
    >
      <div className="feature-card">
        <div className="feature-grid">
          <div>
            <p className="feature-muted">Full name</p>
            <strong>{show(fullName)}</strong>
          </div>

          <div>
            <p className="feature-muted">Phone</p>
            <strong>{show(phone)}</strong>
          </div>

          <div>
            <p className="feature-muted">Email</p>
            <strong>{show(email)}</strong>
          </div>

          <div>
            <p className="feature-muted">Role</p>
            <strong>{show(user?.role)}</strong>
          </div>

          <div>
            <p className="feature-muted">Account ID</p>
            <strong>{show(userId)}</strong>
          </div>
        </div>
      </div>

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
