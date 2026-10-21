import { apiRequest } from './apiClient.js'

export function getNextMeeting() {
  return apiRequest('/meetings/next')
}

export function saveNextMeeting({ title, startsAt, description = '', location = null }) {
  return apiRequest('/meetings/next', {
    method: 'PUT',
    body: JSON.stringify({ title, startsAt, description, location }),
  })
}
