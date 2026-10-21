import { apiRequest } from './apiClient.js'

export async function registerAccount(details) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  })
}

export async function login(phone, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  })

  return result.user
}

export async function getCurrentUser() {
  const result = await apiRequest('/auth/me')
  return result.user
}

export async function logout() {
  return apiRequest('/auth/logout', { method: 'POST' })
}
