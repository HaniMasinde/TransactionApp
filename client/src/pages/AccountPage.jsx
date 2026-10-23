import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { changePassword } from '../services/authService.js'
import { getMyAccount, updateMyAccount } from '../services/memberService.js'
import useAutoDismiss from '../hooks/useAutoDismiss.js'

export default function AccountPage({ onAccountUpdated }) {
  const [account, setAccount] = useState(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useAutoDismiss(error, setError)
  useAutoDismiss(success, setSuccess)
  useAutoDismiss(passwordError, setPasswordError)
  useAutoDismiss(passwordSuccess, setPasswordSuccess)

  useEffect(() => {
    let active = true

    getMyAccount()
      .then(result => {
        if (!active) return
        setAccount(result)
        setFullName(result.fullName || '')
        setPhone(result.phone || '')
        setRecoveryEmail(result.recoveryEmail || '')
      })
      .catch(requestError => {
        if (active) setError(requestError.message || 'Unable to load your account.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const updated = await updateMyAccount({
        fullName: fullName.trim(),
        phone: phone.trim(),
        recoveryEmail: recoveryEmail.trim(),
      })

      setAccount(updated)
      setFullName(updated.fullName || '')
      setPhone(updated.phone || '')
      setRecoveryEmail(updated.recoveryEmail || '')
      onAccountUpdated?.(updated)
      setSuccess('Your account settings have been saved.')
    } catch (requestError) {
      setError(requestError.message || 'Unable to save your account settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }

    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9\s]/.test(newPassword)) {
      setPasswordError('Use a password with a letter, a number, and a special character.')
      return
    }

    setPasswordSaving(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(result.message || 'Your password has been changed.')
    } catch (requestError) {
      setPasswordError(requestError.message || 'Unable to change your password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const hasProfileChanges = Boolean(
    account && (
      fullName !== (account.fullName || '') ||
      phone !== (account.phone || '') ||
      recoveryEmail !== (account.recoveryEmail || '')
    ),
  )
  const hasPasswordChanges = Boolean(
    currentPassword || newPassword || confirmPassword,
  )

  return (
    <>
      <PageHeader
        eyebrow="PERSONAL"
        title="Account settings"
        description="Update the contact details for your account."
      />

      <section className="content-card account-card">
        <div className="account-card-heading">
          <div>
            <h2>Profile information</h2>
            <p>Your changes are saved to your Gather account.</p>
          </div>
          {account?.role && (
            <span className="account-role-badge">{account.role}</span>
          )}
        </div>

        {error && <p className="app-error" role="alert">{error}</p>}
        {success && <p className="account-success" role="status">{success}</p>}

        {loading ? (
          <p className="empty-state" aria-live="polite">Loading account details…</p>
        ) : account ? (
          <form className="account-form" onSubmit={handleSubmit}>
            <label htmlFor="account-full-name">
              Full name
              <input
                id="account-full-name"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={event => setFullName(event.target.value)}
                minLength={2}
                maxLength={150}
                required
              />
            </label>

            <label htmlFor="account-phone">
              Phone number
              <input
                id="account-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={event => setPhone(event.target.value)}
                minLength={9}
                maxLength={24}
                required
              />
            </label>

            <label htmlFor="account-recovery-email">
              Recovery email
              <input
                id="account-recovery-email"
                name="recoveryEmail"
                type="email"
                autoComplete="email"
                value={recoveryEmail}
                onChange={event => setRecoveryEmail(event.target.value)}
                maxLength={254}
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={saving || !hasProfileChanges}>
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>
          </form>
        ) : !error ? (
          <p className="empty-state">Account details are unavailable.</p>
        ) : null}
      </section>

      <section className="content-card account-card password-card">
        <div className="account-card-heading">
          <div>
            <h2>Change password</h2>
            <p>Confirm your current password, then choose a new one.</p>
          </div>
        </div>

        {passwordError && <p className="app-error" role="alert">{passwordError}</p>}
        {passwordSuccess && <p className="account-success" role="status">{passwordSuccess}</p>}

        <form className="account-form" onSubmit={handlePasswordSubmit}>
          <label htmlFor="current-password">
            Current password
            <PasswordInput
              id="current-password"
              name="currentPassword"
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              maxLength={128}
              required
            />
          </label>

          <label htmlFor="new-password">
            New password
            <PasswordInput
              id="new-password"
              name="newPassword"
              autoComplete="new-password"
              placeholder="Create a new password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={40}
              required
            />
          </label>

          <p className="password-change-hint">8–40 characters, including a letter, a number, and a special character.</p>

          <label htmlFor="confirm-new-password">
            Confirm new password
            <PasswordInput
              id="confirm-new-password"
              name="confirmNewPassword"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              minLength={8}
              maxLength={40}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={passwordSaving || !hasPasswordChanges}>
            {passwordSaving ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </section>
    </>
  )
}
