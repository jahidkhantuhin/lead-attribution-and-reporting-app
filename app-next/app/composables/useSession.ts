import { useSessionStore } from '../stores/session'

export function useSession() {
  const store = useSessionStore()
  const { $auth } = useNuxtApp()
  const { public: config } = useRuntimeConfig()

  return {
    store,
    async login(credentials: { email: string; password: string }) {
      store.setUser(await $auth.login(credentials))
    },
    async logout() {
      await $auth.logout()
      if (!config.showcaseMode) store.clear()
    },
  }
}
