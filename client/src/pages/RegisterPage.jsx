
import { useState } from 'react'
import { registerAccount } from '../services/authService.js'
import AuthLayout from '../components/AuthLayout.jsx'

export default function RegisterPage({ onLogin, onHome }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await registerAccount({
        fullName: fullName.trim(),
        phone: phone.trim(),
        recoveryEmail: recoveryEmail.trim(),
        password,
      })

      setSuccess(
        result?.message ||
          'Registration submitted. Your account may require group approval before you can sign in.',
      )
      setFullName('')
      setPhone('')
      setRecoveryEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="GET STARTED"
      title="Create your account"
      description="Register to access your group's contributions and activities."
      onHome={onHome}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Enter your full name"
            value={fullName}
            onChange={event => setFullName(event.target.value)}
            required
          />

          <label htmlFor="register-phone">Phone number</label>
          <input
            id="register-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            required
          />

          <label htmlFor="register-email">Recovery email</label>
          <input
            id="register-email"
            name="recoveryEmail"
            type="email"
            autoComplete="email"
            placeholder="Enter your recovery email"
            value={recoveryEmail}
            onChange={event => setRecoveryEmail(event.target.value)}
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />

          <label htmlFor="register-confirm-password">
            Confirm password
          </label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            required
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="auth-success" role="status">
              {success}
            </p>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
      </form>

      <p className="auth-footnote">
        Already registered?{' '}
        <button
          type="button"
          className="link-button"
          onClick={onLogin}
        >
          Sign in
        </button>
      </p>
    </AuthLayout>
  )
}
