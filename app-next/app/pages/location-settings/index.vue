<script setup lang="ts">
import { pageNames } from '~/constants'
import { statusLabel, type DirectoryEntry } from '~/services/client-records'
import type { RecordId } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.locationSetup
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: title, to: '', disabled: true },
  ],
})
const route = useRoute()
const router = useRouter()
const { $services } = useNuxtApp()
const session = useSessionStore()
const allowed = computed(() => session.isAllowed('create report'))
const sortOptions = [
  { title: 'Website', value: 'url' },
  { title: 'Location', value: 'name' },
  { title: 'Status', value: 'status' },
  { title: 'Account manager', value: 'account_manager' },
  { title: 'Created', value: 'created_at' },
]
const sizeOptions = [20, 50, 100, 500]
const sort = computed(
  () =>
    sortOptions.find(({ value }) => value === route.query.sort_by)?.value ??
    'url',
)
const descending = computed(() => route.query.sorting === 'desc')
const page = computed(() =>
  Math.max(1, Math.floor(Number(route.query.page)) || 1),
)
const limit = computed(
  () =>
    sizeOptions.find((value) => value === Number(route.query.itemsPerPage)) ??
    20,
)
const rows = ref<DirectoryEntry[]>([])
const total = ref(0)
const loading = ref(false)
const failed = ref(false)
const target = ref<DirectoryEntry>()
const saving = ref(false)
const failure = ref('')
const notice = ref('')
let latest = 0
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
function dateLabel(value: unknown) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(time) ? date.format(time) : '—'
}

async function load() {
  const ticket = ++latest
  if (!allowed.value) return
  loading.value = true
  failed.value = false
  try {
    const { data } = await $services.locations.missingClients({
      sort_by: sort.value + (descending.value ? ':desc' : ':asc'),
      limit: limit.value,
      page: page.value,
    })
    if (ticket !== latest) return
    rows.value = data.data.result
    total.value = data.data.pagination.total
  } catch {
    if (ticket === latest) failed.value = true
  } finally {
    if (ticket === latest) loading.value = false
  }
}

watch([sort, descending, page, limit, allowed], load, { immediate: true })
function change(query: Record<string, RecordId>) {
  return router.push({ query: { ...route.query, page: '1', ...query } })
}
function requestCreation(row: DirectoryEntry) {
  target.value = row
  failure.value = ''
}
async function createClient() {
  if (!target.value || saving.value) return
  saving.value = true
  failure.value = ''
  try {
    await $services.locations.createClient(target.value.id)
    target.value = undefined
    notice.value = 'Request sent for creating a client.'
    await load()
  } catch {
    failure.value = 'Could not create a client for this location. Try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <v-alert v-if="!allowed" type="warning" variant="tonal"
      >You do not have access to location setup.</v-alert
    >
    <v-card v-else flat class="pa-4">
      <div
        class="d-flex flex-wrap justify-space-between align-center ga-3 mb-4"
      >
        <h2 class="text-h6">Locations awaiting a client</h2>
        <v-btn to="/location-settings/add" color="primary"
          >Assign locations</v-btn
        >
      </div>
      <div class="d-flex flex-wrap align-center ga-3 mb-4">
        <v-select
          :model-value="sort"
          :items="sortOptions"
          label="Sort by"
          density="compact"
          hide-details
          @update:model-value="change({ sort_by: $event })"
        />
        <v-btn
          variant="outlined"
          @click="change({ sorting: descending ? 'asc' : 'desc' })"
          >{{ descending ? 'Descending' : 'Ascending' }}</v-btn
        >
        <v-select
          :model-value="limit"
          :items="sizeOptions"
          label="Per page"
          density="compact"
          hide-details
          @update:model-value="change({ itemsPerPage: $event })"
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
        >Could not load the location setup queue.</v-alert
      >
      <v-alert v-else-if="!rows.length" type="info" variant="tonal"
        >No locations are waiting for a client assignment.</v-alert
      >
      <v-table v-else density="compact">
        <thead>
          <tr>
            <th scope="col">Location</th>
            <th scope="col">Status</th>
            <th scope="col">Account manager</th>
            <th scope="col">Website</th>
            <th scope="col">Created</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <th scope="row">{{ row.name }}</th>
            <td>
              <v-chip v-if="row.status" size="small" variant="tonal">{{
                statusLabel(row.status)
              }}</v-chip>
            </td>
            <td>{{ row.account_manager || '—' }}</td>
            <td>{{ row.website || '—' }}</td>
            <td>{{ dateLabel(row.created_at) }}</td>
            <td>
              <div class="d-flex ga-2 py-2">
                <v-btn
                  size="small"
                  variant="tonal"
                  :to="{
                    path: '/location-settings/add',
                    query: { id: row.id, name: row.name },
                  }"
                  >Assign to client</v-btn
                >
                <v-btn size="small" variant="text" @click="requestCreation(row)"
                  >Create new client</v-btn
                >
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
      <v-pagination
        v-if="total > limit"
        :model-value="page"
        :length="Math.ceil(total / limit)"
        :total-visible="4"
        @update:model-value="change({ page: $event })"
      />
      <v-dialog
        :model-value="!!target"
        :persistent="saving"
        max-width="440"
        aria-labelledby="create-client-title"
        @update:model-value="!$event && (target = undefined)"
      >
        <v-card>
          <v-card-title id="create-client-title"
            >Create a new client?</v-card-title
          >
          <v-card-text>
            Create a client for {{ target?.name || 'this location' }}?
            <v-alert v-if="failure" type="error" variant="tonal" class="mt-3">{{
              failure
            }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn :disabled="saving" @click="target = undefined">Cancel</v-btn>
            <v-btn color="primary" :loading="saving" @click="createClient"
              >Create client</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </div>
</template>
