
import { apiRequest } from './apiClient.js'

export async function getTechnicalAdminUsers() {
  const data = await apiRequest('/technical-admin/users')
  return data.users || []
}

export async function updateUserRole(userId, role) {
  return apiRequest(
    `/technical-admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  )
}