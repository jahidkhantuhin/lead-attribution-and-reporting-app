import { Plugin } from '@nuxt/types'
import { createShowcaseApi } from '~/showcase/api'

const showcase: Plugin = ({ $axios, store }, inject) => {
  const api = createShowcaseApi()
  const state = { loggedIn: true, user: api.session() }
  store.registerModule('auth', {
    namespaced: true,
    state,
    mutations: {
      refresh(state) { state.user = api.session() },
    },
  })

  const refresh = async () => { store.commit('auth/refresh') }
  inject('auth', {
    get user() { return store.state.auth.user },
    get loggedIn() { return store.state.auth.loggedIn },
    hasScope: (scope: string) => state.user.scope.includes(scope),
    fetchUser: refresh,
    setUserToken: refresh,
    setUser: refresh,
    loginWith: refresh,
    logout: async () => {},
  })

  // Use a request interceptor so even callers with an alternate base URL stay local.
  $axios.onRequest(config => {
    config.adapter = api.adapter as typeof config.adapter
    return config
  })
}

export default showcase
