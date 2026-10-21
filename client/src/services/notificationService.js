import { apiRequest } from './apiClient.js'

export async function getNotifications() {
  const result = await apiRequest('/notifications')

  if (Array.isArray(result.notifications)) {
    return result.notifications
  }

  if (Array.isArray(result.items)) return result.items

  return []
}

export async function getUnreadNotificationCount() {
  const result = await apiRequest('/notifications/unread-count')

  return Number(
    result.count ??
    result.unreadCount ??
    result.unread_count ??
    0,
  )
}

export function markNotificationRead(id) {
  return apiRequest(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  )
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all', {
    method: 'PATCH',
  })
}