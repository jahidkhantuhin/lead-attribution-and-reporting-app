<script setup lang="ts">
import { pageNames } from '~/constants'
import { statusLabel, type DirectoryEntry } from '~/services/client-records'
import type { RecordId } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.locations
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
const search = ref<string | null>('')
const limit = ref(20)
const page = ref(1)
const table = ref(false)
const rows = ref<DirectoryEntry[]>([])
const selectedId = ref<RecordId>()
const total = ref(0)
const busy = ref(false)
const failed = ref(false)
let pending = 0
const selected = computed(
  () => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0],
)
const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / limit.value)),
)
const applied = computed(() =>
  typeof route.query.name === 'string' ? route.query.name : '',
)
const formatDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function dateLabel(value: unknown) {
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN
  return Number.isFinite(timestamp) ? formatDate.format(timestamp) : '—'
}
function recordUrl(row: DirectoryEntry) {
  const id = row.client_id
  return typeof id === 'number' || (typeof id === 'string' && id)
    ? '/client-records/' + id + '/locations/' + row.id
    : undefined
}
function apply(nextPage = 1) {
  return router.push({
    query: {
      ...route.query,
      name: search.value?.trim() || undefined,
      page: String(nextPage),
      itemsPerPage: String(limit.value),
    },
  })
}
function clearSearch() {
  search.value = ''
  return apply()
}
function changeLimit(value: number) {
  limit.value = value
  return apply()
}
watch(
  [() => route.query, allowed],
  async ([query, canView]) => {
    const request = ++pending
    if (!canView) return
    search.value = applied.value
    const size = Number(query.itemsPerPage)
    limit.value = [20, 50, 100, 500].includes(size) ? size : 20
    page.value = Math.max(1, Math.floor(Number(query.page)) || 1)
    busy.value = true
    failed.value = false
    try {
      const { data } = await $services.locations.list({
        name: applied.value || undefined,
        limit: limit.value,
        page: page.value,
      })
      if (request !== pending) return
      rows.value = data.data.result
      total.value = data.data.pagination.total
    } catch {
      if (request !== pending) return
      rows.value = []
      total.value = 0
      failed.value = true
    } finally {
      if (request === pending) busy.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <v-alert v-if="!allowed" type="warning" variant="tonal"
    >You do not have access to active locations.</v-alert
  >
  <v-card v-else flat class="pa-4">
    <v-form
      class="d-flex flex-wrap align-center ga-3"
      @submit.prevent="apply()"
    >
      <v-text-field
        v-model="search"
        label="Search locations"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        maxlength="250"
        clearable
      />
      <v-btn type="submit" color="primary">Apply</v-btn>
      <v-btn v-if="applied" variant="text" @click="clearSearch"
        >Clear search</v-btn
      >
    </v-form>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 my-4">
      <h2 class="text-h6">
        {{ total }} {{ total === 1 ? 'location' : 'locations' }}
      </h2>
      <v-btn variant="outlined" @click="table = !table">{{
        table ? 'View inspector' : 'View table'
      }}</v-btn>
    </div>
    <v-progress-linear v-if="busy" indeterminate />
    <v-alert v-else-if="failed" type="error" variant="tonal"
      >Could not load locations.</v-alert
    >
    <v-alert v-else-if="!rows.length" type="info" variant="tonal"
      >No active locations match this search.</v-alert
    >
    <v-table v-else-if="table" density="compact">
      <thead>
        <tr>
          <th scope="col">Location</th>
          <th scope="col">ID</th>
          <th scope="col">Status</th>
          <th scope="col">Source</th>
          <th scope="col">Created</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ row.name }}</td>
          <td>{{ row.id }}</td>
          <td>
            <v-chip v-if="row.status" size="small" variant="tonal">{{
              statusLabel(row.status)
            }}</v-chip>
          </td>
          <td>{{ row.source || '—' }}</td>
          <td>{{ dateLabel(row.created_at) }}</td>
        </tr>
      </tbody>
    </v-table>
    <div v-else class="locations-inspector">
      <v-list density="compact">
        <v-list-item
          v-for="row in rows"
          :key="row.id"
          :title="row.name"
          :subtitle="row.website"
          :active="row.id === selected?.id"
          @click="selectedId = row.id"
        />
      </v-list>
      <v-sheet v-if="selected" border rounded class="pa-4">
        <h3 class="text-h6 mb-3">{{ selected.name }}</h3>
        <RecordsRecordFacts
          :fields="[
            { label: 'Location ID', value: selected.id },
            {
              label: 'Status',
              value: selected.status && statusLabel(selected.status),
            },
            { label: 'Website', value: selected.website },
            { label: 'Phone', value: selected.phone_number },
          ]"
        />
        <v-btn
          v-if="recordUrl(selected)"
          :to="recordUrl(selected)"
          variant="tonal"
          color="primary"
          class="mt-4"
          >Open full location record</v-btn
        >
        <v-btn
          v-else
          :to="{
            path: '/location-settings/add',
            query: { id: selected.id, name: selected.name },
          }"
          variant="tonal"
          color="primary"
          class="mt-4"
          >Assign to client</v-btn
        >
      </v-sheet>
    </div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mt-4">
      <v-select
        :model-value="limit"
        :items="[20, 50, 100, 500]"
        label="Per page"
        density="compact"
        hide-details
        class="flex-grow-0"
        @update:model-value="changeLimit"
      />
      <v-pagination
        v-if="pageCount > 1"
        :model-value="page"
        :length="pageCount"
        :total-visible="4"
        density="compact"
        @update:model-value="apply"
      />
    </div>
  </v-card>
</template>

<style scoped>
.locations-inspector {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 800px) {
  .locations-inspector {
    grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr);
  }
}
</style>
