import { isAxiosError, type AxiosInstance } from 'axios'
import type { Envelope, SessionPayload } from '../types/api'

const sanctumHeaders = {
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

export function createAuthService(
  api: AxiosInstance,
  showcaseSession?: () => SessionPayload,
) {
  async function fetchUser() {
    if (showcaseSession) return showcaseSession()
    const { data } = await api.get<Envelope<SessionPayload>>('/user?noswal', {
      headers: sanctumHeaders,
    })
    return data.data
  }

  return {
    fetchUser,
    async requestPasswordReset(email: string) {
      if (showcaseSession) return
      await api.get('/sanctum/csrf-cookie', { headers: sanctumHeaders })
      await api.post('/password-reset', { email }, { headers: sanctumHeaders })
    },
    async resetPassword(body: {
      email: string
      token: string
      password: string
      password_confirmation: string
    }) {
      if (showcaseSession) return
      await api.post('reset', body, { headers: sanctumHeaders })
    },
    async login(credentials: { email: string; password: string }) {
      if (!showcaseSession) {
        await api.get('/sanctum/csrf-cookie', { headers: sanctumHeaders })
        await api.post('/login', credentials, { headers: sanctumHeaders })
      }
      return fetchUser()
    },
    async logout() {
      if (showcaseSession) return
      try {
        await api.post('/logout', null, { headers: sanctumHeaders })
      } catch (error) {
        // Auth Next clears the local session even when the logout request fails.
        if (!isAxiosError(error)) throw error
      }
    },
  }
}
