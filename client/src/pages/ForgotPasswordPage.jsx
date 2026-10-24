import { useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import { requestPasswordReset } from '../services/authService.js'

export default function ForgotPasswordPage({ onLogin, onHome }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await requestPasswordReset(email.trim())
      setMessage(result.message || 'If an account with that email exists, you will receive password reset instructions shortly.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to request a password reset. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      description="Enter the recovery email saved on your account. We’ll send a reset link if it matches."
      onHome={onHome}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="recovery-email">Recovery email</label>
        <input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your recovery email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          maxLength={254}
          required
        />
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="auth-success" role="status">{message}</p>}
        <button className="primary-button auth-submit" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="auth-footnote">
        Remembered your password?{' '}
        <button type="button" className="link-button" onClick={onLogin}>Back to sign in</button>
      </p>
    </AuthLayout>
  )
}
