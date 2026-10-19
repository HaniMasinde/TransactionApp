const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
const tokenKey = 'gather.accessToken'

export function saveAccessToken(token) { window.sessionStorage.setItem(tokenKey, token) }
export function clearAccessToken() { window.sessionStorage.removeItem(tokenKey) }
export function hasAccessToken() { return Boolean(window.sessionStorage.getItem(tokenKey)) }

export async function apiRequest(path, options = {}) {
  const token = window.sessionStorage.getItem(tokenKey)
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `API request failed (${response.status})`)
    error.status = response.status
    error.code = data.code
    throw error
  }
  return data
}
