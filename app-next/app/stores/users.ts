import { defineStore } from 'pinia'
import type { Fields, Pagination, RecordId, UserRecord } from '../types/api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [] as UserRecord[],
    selected: null as UserRecord | null,
    pagination: { current_page: 1, per_page: 20, total: 0 } as Pagination,
    fetchLoading: false,
    singleFetchLoading: false,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
  }),
  getters: {
    usersWithFullName: ({ users }) =>
      users.map((user) => ({
        full_name: `${user.first_name} ${user.last_name}`,
        ...user,
      })),
  },
  actions: {
    async fetchUsers(filters?: Fields) {
      this.fetchLoading = true
      try {
        const { data } = await useNuxtApp().$services.users.list(filters)
        this.users = data.data.result
        this.pagination = data.data.pagination
      } finally {
        this.fetchLoading = false
      }
    },
    async fetchSingle(id: RecordId) {
      this.singleFetchLoading = true
      try {
        const { data } = await useNuxtApp().$services.users.byId(id)
        this.selected = data.data
        return data
      } finally {
        this.singleFetchLoading = false
      }
    },
    async createUser(fields: Fields) {
      this.createLoading = true
      try {
        return await useNuxtApp().$services.users.create(fields)
      } finally {
        this.createLoading = false
      }
    },
    async updateUser(fields: Fields & { id: RecordId }) {
      this.updateLoading = true
      try {
        return await useNuxtApp().$services.users.update(fields)
      } finally {
        this.updateLoading = false
      }
    },
    async deleteUser(id: RecordId) {
      this.deleteLoading = true
      try {
        return await useNuxtApp().$services.users.remove(id)
      } finally {
        this.deleteLoading = false
      }
    },
  },
})
