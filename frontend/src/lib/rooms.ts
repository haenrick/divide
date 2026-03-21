export type SavedRoom = { token: string; name: string; visited: string }

const KEY = 'divide_rooms'

export function saveRoom(token: string, name: string) {
  const rooms = getRecentRooms().filter(r => r.token !== token)
  rooms.unshift({ token, name, visited: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(rooms.slice(0, 10)))
}

export function getRecentRooms(): SavedRoom[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function removeRoom(token: string) {
  const rooms = getRecentRooms().filter(r => r.token !== token)
  localStorage.setItem(KEY, JSON.stringify(rooms))
}
