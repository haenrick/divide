const BASE = '/api'

export type AppConfig = { mode: 'selfhosted' | 'saas' }
export type Activity = { id: number; name: string; room_token?: string; expires_at?: string; created_at: string }
export type Participant = { id: number; activity_id: number; name: string }
export type Expense = { id: number; activity_id: number; paid_by: number; paid_by_name: string; amount: number; description: string; created_at: string }
export type Balance = { id: number; name: string; paid: number; share: number; net: number }
export type Settlement = { from: string; to: string; amount: number }
export type Balances = { balances: Balance[]; settlements: Settlement[]; total: number }

export class AuthError extends Error {}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  if (res.status === 401) throw new AuthError('Nicht eingeloggt')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  config: {
    get: () => req<AppConfig>('/config'),
  },
  auth: {
    login:  (password: string) => req<void>('/login',  { method: 'POST', body: JSON.stringify({ password }) }),
    logout: ()                 => req<void>('/logout', { method: 'POST' }),
  },
  rooms: {
    create: (name: string, email?: string) => req<Activity>('/rooms', { method: 'POST', body: JSON.stringify({ name, email }) }),
    get:    (token: string) => req<Activity>(`/rooms/${token}`),
  },
  activities: {
    list:   ()             => req<Activity[]>('/activities'),
    create: (name: string) => req<Activity>('/activities',     { method: 'POST',   body: JSON.stringify({ name }) }),
    delete: (id: number)   => req<void>(`/activities/${id}`,   { method: 'DELETE' }),
  },
  participants: {
    list:   (activityId: number)               => req<Participant[]>(`/activities/${activityId}/participants`),
    create: (activityId: number, name: string) => req<Participant>(`/activities/${activityId}/participants`, { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: number)                       => req<void>(`/participants/${id}`, { method: 'DELETE' }),
  },
  expenses: {
    list:   (activityId: number)                                                    => req<Expense[]>(`/activities/${activityId}/expenses`),
    create: (activityId: number, paid_by: number, amount: number, description: string) =>
      req<Expense>(`/activities/${activityId}/expenses`, { method: 'POST', body: JSON.stringify({ paid_by, amount, description }) }),
    delete: (id: number) => req<void>(`/expenses/${id}`, { method: 'DELETE' }),
  },
  balances: {
    get: (activityId: number) => req<Balances>(`/activities/${activityId}/balances`),
  },
}
