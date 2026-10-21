
import { useState } from 'react'

export default function LoginPage({ onLogin, onRegister }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await onLogin(phone.trim(), password)
    } catch (err) {
      setError(
        err.message ||
          'Unable to sign in. Check your details and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="Gather home">
          <span className="brand-mark">g</span>
          gather<span className="brand-period">.</span>
        </a>

        <span className="eyebrow">WELCOME BACK</span>
        <h1>Sign in to your account</h1>
        <p className="auth-description">
          Access your group contributions and account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-phone">Phone number</label>
          <input
            id="login-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Enter your registered phone number"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button auth-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footnote">
          Don't have an account?{' '}
          <button
            type="button"
            className="link-button"
            onClick={onRegister}
          >
            Create an account
          </button>
        </p>

        <p className="auth-footnote">
          Your account access is managed by your group.
        </p>
      </section>
    </main>
  )
}
