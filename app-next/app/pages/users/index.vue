<script setup lang="ts">
import { pageNames } from '~/constants'
import type { RecordId, UserRecord } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.users
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: title, to: '', disabled: true },
  ],
})
const { $services } = useNuxtApp()
const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const allowed = computed(() => session.isAllowed('view users'))
const sizes = [20, 50, 100, 500]
const roleOptions = ref<{ title: string; value: string }[]>([])
const statusOptions = [
  { title: 'Any status', value: 'any' },
  { title: 'Active only', value: 'active' },
  { title: 'Disabled only', value: 'inactive' },
]
const sortOptions = [
  { title: 'Name', value: 'first_name' },
  { title: 'Active status', value: 'status' },
]
const directionOptions = [
  { title: 'Ascending', value: 'asc' },
  { title: 'Descending', value: 'desc' },
]
const filters = reactive({
  role: null as string | null,
  search: null as string | null,
  status: 'active',
  sort: 'first_name',
  direction: 'asc',
})
const page = ref(1)
const size = ref(20)
const total = ref(0)
const users = ref<UserRecord[]>([])
const loading = ref(false)
const failed = ref(false)
const target = ref<UserRecord>()
const saving = ref(false)
const removalError = ref('')
const notice = ref('')
let latest = 0

function fullName(user: UserRecord) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ')
}
function roles(user: UserRecord) {
  return typeof user.role === 'string'
    ? [user.role]
    : (user.role?.map(({ name }) => name) ?? [])
}
function statusLabel(value: unknown) {
  const key = String(value ?? '').toLowerCase()
  if (['1', 'active', 'true'].includes(key)) return 'Active'
  if (['0', 'inactive', 'disabled', 'false'].includes(key)) return 'Disabled'
  return '—'
}
function canDelete(user: UserRecord) {
  const targetRoles = roles(user)
  return (
    session.isAllowed('delete user') &&
    !targetRoles.includes('super admin') &&
    (!targetRoles.includes('admin') || session.roles?.includes('super admin'))
  )
}
async function load() {
  const ticket = ++latest
  if (!allowed.value) return
  failed.value = false
  loading.value = true
  try {
    const { data } = await $services.users.list({
      role: filters.role || undefined,
      search: filters.search || undefined,
      status: filters.status === 'any' ? undefined : filters.status,
      sort_by: filters.sort + ':' + filters.direction,
      sorting: filters.direction,
      page: page.value,
      limit: size.value,
    })
    if (ticket !== latest) return
    users.value = data.data.result
    total.value = data.data.pagination.total
  } catch {
    if (ticket === latest) failed.value = true
  } finally {
    if (ticket === latest) loading.value = false
  }
}
watch(
  [() => route.query, allowed],
  ([query]) => {
    filters.role = typeof query.role === 'string' ? query.role : null
    filters.search = typeof query.search === 'string' ? query.search : null
    filters.status =
      'status' in query
        ? query.status === 'active' || query.status === 'inactive'
          ? query.status
          : 'any'
        : 'active'
    filters.sort = query.sort_by === 'status' ? 'status' : 'first_name'
    filters.direction = query.sorting === 'desc' ? 'desc' : 'asc'
    page.value = Math.max(1, Math.floor(Number(query.page)) || 1)
    size.value =
      sizes.find((option) => option === Number(query.itemsPerPage)) ?? 20
    return load()
  },
  { immediate: true },
)
watch(
  allowed,
  async (canView) => {
    if (!canView) return
    try {
      const { data } = await $services.users.roles()
      roleOptions.value = data.data.map(({ name }) => ({
        title: name,
        value: name,
      }))
    } catch {
      roleOptions.value = []
    }
  },
  { immediate: true },
)
function apply(nextPage = 1, nextSize: RecordId = size.value) {
  return router.push({
    query: {
      role: filters.role || undefined,
      search: filters.search?.trim() || undefined,
      status: filters.status === 'any' ? null : filters.status,
      sort_by: filters.sort,
      sorting: filters.direction,
      page: String(nextPage),
      itemsPerPage: String(nextSize),
    },
  })
}
function requestRemoval(user: UserRecord) {
  target.value = user
  removalError.value = ''
}
async function remove() {
  if (!target.value || saving.value || !canDelete(target.value)) return
  saving.value = true
  removalError.value = ''
  try {
    await $services.users.remove(target.value.id)
    target.value = undefined
    notice.value = 'Team member removed.'
    if (users.value.length === 1 && page.value > 1) await apply(page.value - 1)
    else await load()
  } catch {
    removalError.value = 'Could not remove this team member. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <v-alert v-if="!allowed" type="warning" variant="tonal"
      >You do not have access to team members.</v-alert
    >
    <v-card v-else flat class="pa-4">
      <v-form class="team-filters" @submit.prevent="apply()">
        <v-text-field
          v-model="filters.search"
          label="Search team members"
          density="compact"
          hide-details
          clearable
        />
        <v-select
          v-model="filters.role"
          :items="roleOptions"
          label="Role"
          density="compact"
          hide-details
          clearable
        />
        <v-select
          v-model="filters.status"
          :items="statusOptions"
          label="Status"
          density="compact"
          hide-details
        />
        <v-select
          v-model="filters.sort"
          :items="sortOptions"
          label="Sort by"
          density="compact"
          hide-details
        />
        <v-select
          v-model="filters.direction"
          :items="directionOptions"
          label="Sort order"
          density="compact"
          hide-details
        />
        <div class="d-flex flex-wrap ga-2">
          <v-btn type="submit" color="primary">Apply filters</v-btn>
          <v-btn to="/users" variant="text">Clear filters</v-btn>
        </div>
      </v-form>
      <div
        class="d-flex flex-wrap align-center justify-space-between ga-3 my-4"
      >
        <h2 class="text-h6">
          {{ total }} {{ total === 1 ? 'team member' : 'team members' }}
        </h2>
        <v-select
          :model-value="size"
          :items="sizes"
          label="Per page"
          density="compact"
          hide-details
          class="flex-grow-0"
          @update:model-value="apply(1, $event)"
        />
      </div>
      <v-alert
        v-if="notice"
        class="mb-3"
        type="success"
        variant="tonal"
        closable
        @click:close="notice = ''"
        >{{ notice }}</v-alert
      >
      <v-progress-linear v-if="loading" indeterminate />
      <v-alert v-else-if="failed" type="error" variant="tonal"
        >Could not load team members.</v-alert
      >
      <v-alert v-else-if="!users.length" type="info" variant="tonal"
        >No team members match these filters.</v-alert
      >
      <v-table v-else density="compact">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <th v-if="session.isAllowed('delete user')" scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <th scope="row">{{ fullName(user) }}</th>
            <td>{{ user.email || '—' }}</td>
            <td>
              <v-chip
                v-for="role in roles(user)"
                :key="role"
                size="small"
                color="primary"
                variant="tonal"
                class="me-1 text-capitalize"
                >{{ role }}</v-chip
              >
            </td>
            <td>
              <v-chip
                size="small"
                :color="
                  statusLabel(user.status) === 'Active' ? 'success' : undefined
                "
                variant="tonal"
                >{{ statusLabel(user.status) }}</v-chip
              >
            </td>
            <td v-if="session.isAllowed('delete user')">
              <v-btn
                v-if="canDelete(user)"
                :aria-label="'Remove ' + fullName(user)"
                size="small"
                variant="text"
                @click="requestRemoval(user)"
                >Remove</v-btn
              >
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-pagination
        v-if="total > size"
        :model-value="page"
        :length="Math.ceil(total / size)"
        :total-visible="4"
        @update:model-value="apply"
      />
      <v-dialog
        :model-value="!!target"
        :persistent="saving"
        max-width="440"
        aria-labelledby="remove-member-title"
        @update:model-value="!$event && (target = undefined)"
      >
        <v-card>
          <v-card-title id="remove-member-title"
            >Remove team member?</v-card-title
          >
          <v-card-text>
            Remove {{ target ? fullName(target) : 'this team member' }}?
            <v-alert
              v-if="removalError"
              type="error"
              variant="tonal"
              class="mt-3"
              >{{ removalError }}</v-alert
            >
          </v-card-text>
          <v-card-actions
            ><v-spacer /><v-btn :disabled="saving" @click="target = undefined"
              >Cancel</v-btn
            ><v-btn color="error" :loading="saving" @click="remove"
              >Remove</v-btn
            ></v-card-actions
          >
        </v-card>
      </v-dialog>
    </v-card>
  </div>
</template>

<style scoped>
.team-filters {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 800px) {
  .team-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
  }
}
</style>
