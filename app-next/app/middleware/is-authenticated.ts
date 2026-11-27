import { isAxiosError } from 'axios'
import { loginRedirect } from '../services/auth-routing'
import { useSessionStore } from '../stores/session'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const session = useSessionStore()
  if (session.isAuthenticated) return

  try {
    const user = await useNuxtApp().$auth.fetchUser()
    if (user) {
      session.setUser(user)
      return
    }
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error
  }
  return navigateTo(loginRedirect(to.fullPath))
})
