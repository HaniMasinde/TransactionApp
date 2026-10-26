import { useState } from 'react'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { resetPassword } from '../services/authService.js'

const passwordPolicy = 'Use 8–40 characters with at least one letter, one number, and one special character.'

export default function ResetPasswordPage({ token, onLogin, onForgotPassword, onHome }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!token) {
      setError('This password reset link is missing its token. Request a new link and try again.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset your password. Request a new link and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="ACCOUNT RECOVERY"
      title={success ? 'Password updated' : 'Choose a new password'}
      description={success
        ? 'Your password has been reset. Sign in with your new password.'
        : 'Create a new password for your account.'}
      onHome={onHome}
    >
      {success ? (
        <button className="primary-button auth-submit" type="button" onClick={onLogin}>
          Back to sign in
        </button>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {!token && (
            <p className="auth-error" role="alert">
              This reset link is missing its token. Request a new link to continue.
            </p>
          )}
          <label htmlFor="reset-password">New password</label>
          <PasswordInput
            id="reset-password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="Enter a new password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            minLength={8}
            maxLength={40}
            required
          />
          <label htmlFor="reset-password-confirm">Confirm new password</label>
          <PasswordInput
            id="reset-password-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Enter the new password again"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            minLength={8}
            maxLength={40}
            required
          />
          <p className="password-requirements">{passwordPolicy}</p>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {submitting && <p className="auth-status" role="status">Updating your password…</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting || !token}>
            {submitting ? 'Updating…' : 'Reset password'}
          </button>
        </form>
      )}
      {!success && (
        <p className="auth-footnote">
          Need a new link?{' '}
          <button type="button" className="link-button" onClick={onForgotPassword}>Request another reset link</button>
          {' · '}
          <button type="button" className="link-button" onClick={onLogin}>Return to sign in</button>
        </p>
      )}
    </AuthLayout>
  )
}
