import { apiRequest } from './apiClient.js'

export async function getMembers() {
  const result = await apiRequest('/members')
  return Array.isArray(result.members) ? result.members : []
}

export async function getMyAccount() {
  const result = await apiRequest('/members/me')
  return result.member
}

export async function updateMyAccount(details) {
  const result = await apiRequest('/members/me', {
    method: 'PATCH',
    body: JSON.stringify(details),
  })
  return result.member
}
