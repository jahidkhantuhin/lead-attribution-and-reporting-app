import { createApiClient } from '../services/client'
import { createServices } from '../services/api'
import { createAuthService } from '../services/auth'
import { isLegacyAuthRoute, loginRedirect } from '../services/auth-routing'
import { createShowcaseApi } from '../showcase/api'
import { useSessionStore } from '../stores/session'

export default defineNuxtPlugin(() => {
  const { public: config } = useRuntimeConfig()
  const router = useRouter()
  const session = useSessionStore()
  const showcase = config.showcaseMode ? createShowcaseApi() : undefined
  if (showcase) session.setUser(showcase.session())

  const api = createApiClient({
    baseURL: config.apiBaseUrl,
    showcaseAdapter: showcase?.adapter,
    accessToken: () => session.accessToken,
    onUnauthorized: () => {
      session.clear()
      const path = router.currentRoute.value.fullPath
      if (!isLegacyAuthRoute(path)) void router.push(loginRedirect(path))
    },
  })
  const auth = createAuthService(api, showcase?.session)

  return { provide: { api, services: createServices(api), auth } }
})
