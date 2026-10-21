import { apiRequest } from './apiClient.js'

export async function getPendingMembers() {
  const result = await apiRequest('/admin/pending-members')
  return Array.isArray(result.members) ? result.members : []
}

export function approveMember(id) {
  return apiRequest(
    `/admin/members/${encodeURIComponent(id)}/approve`,
    { method: 'PATCH' },
  )
}

export function rejectMember(id) {
  return apiRequest(
    `/admin/members/${encodeURIComponent(id)}/reject`,
    { method: 'PATCH' },
  )
}