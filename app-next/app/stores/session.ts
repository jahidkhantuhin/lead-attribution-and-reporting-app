import { defineStore } from 'pinia'
import type { SessionPayload } from '../types/api'

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as SessionPayload | null,
    accessToken: null as string | null,
  }),
  getters: {
    isAuthenticated: ({ user }) => user !== null,
    authenticatedUser: ({ user }) => user?.data ?? user ?? null,
    roles: ({ user }) => {
      const role = user?.data?.role ?? user?.role
      return typeof role === 'string'
        ? [role]
        : (role?.map(({ name }) => name) ?? null)
    },
    permissions: ({ user }) => user?.scope ?? [],
    userProfilePicture: ({ user }) => {
      const value = (user?.meta ?? user?.data?.meta)?.find(
        ({ name }) => name === 'profile_picture',
      )?.value
      return typeof value === 'string' ? value : ''
    },
    isAllowed:
      ({ user }) =>
      (name: string) =>
        !name || Boolean(user?.scope?.includes(name)),
  },
  actions: {
    setUser(user: SessionPayload) {
      this.user = user
    },
    clear() {
      this.user = null
      this.accessToken = null
    },
  },
})
