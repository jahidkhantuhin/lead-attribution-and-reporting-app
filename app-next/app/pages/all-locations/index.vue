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
const sortColumns = [
  { key: 'name', label: 'Location' },
  { key: 'id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
] as const
type SortKey = (typeof sortColumns)[number]['key']
const sortKey = computed(
  () => sortColumns.find(({ key }) => key === route.query.sort_by)?.key,
)
const descending = computed(() => route.query.sorting === 'desc')
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const rows = ref<DirectoryEntry[]>([])
const selectedId = ref<RecordId>()
const total = ref(0)
const busy = ref(false)
const failed = ref(false)
let pending = 0
const tableRows = computed(() => {
  const key = sortKey.value
  if (!key) return rows.value
  return [...rows.value].sort(
    (a, b) =>
      collator.compare(String(a[key] ?? ''), String(b[key] ?? '')) *
      (descending.value ? -1 : 1),
  )
})
function sortBy(key: SortKey) {
  return router.replace({
    query: {
      ...route.query,
      sort_by: key,
      sorting: sortKey.value === key && !descending.value ? 'desc' : 'asc',
    },
  })
}
function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return undefined
  return descending.value ? 'descending' : 'ascending'
}
const selected = computed(
  () => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0],
)
const detail = ref<DirectoryEntry>()
const detailLoading = ref(false)
const detailFailed = ref(false)
watch(
  [() => selected.value?.id, table, allowed],
  async ([id, tableView, canView], _, cleanup) => {
    detail.value = undefined
    detailLoading.value = id != null && !tableView && canView
    detailFailed.value = false
    if (id == null || tableView || !canView) return
    let active = true
    cleanup(() => {
      active = false
    })
    try {
      const { data } = await $services.locations.byId(id)
      if (active) detail.value = data.data
    } catch {
      if (active) detailFailed.value = true
    } finally {
      if (active) detailLoading.value = false
    }
  },
)
const inspected = computed(
  () => selected.value && { ...selected.value, ...detail.value },
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
function fieldText(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}
function relatedName(value: unknown) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  if ('name' in value && typeof value.name === 'string') return value.name
  if ('fullname' in value && typeof value.fullname === 'string')
    return value.fullname
  return [
    'first_name' in value && fieldText(value.first_name),
    'last_name' in value && fieldText(value.last_name),
  ]
    .filter(Boolean)
    .join(' ')
}
const inspectorFields = computed(() => {
  const row = inspected.value
  if (!row) return []
  return [
    { label: 'Location ID', value: row.id },
    { label: 'Status', value: row.status && statusLabel(row.status) },
    {
      label: 'Client',
      value: relatedName(row.client) || (!recordUrl(row) ? 'Unassigned' : ''),
    },
    { label: 'Account manager', value: relatedName(row.account_manager) },
    {
      label: 'Reporting email',
      value: fieldText(row.reporting_mail) || row.email,
    },
    { label: 'Phone', value: row.phone_number },
    {
      label: 'Address',
      value: [row.address, row.city, row.state, row.zipcode || row.zip]
        .map(fieldText)
        .filter(Boolean)
        .join(', '),
    },
    { label: 'Website', value: row.website },
    { label: 'Source', value: fieldText(row.source) },
    {
      label: 'Last updated',
      value: row.updated_at ? dateLabel(row.updated_at) : '',
    },
  ].filter(({ value }) => value !== '' && value != null)
})
function recordUrl(row: DirectoryEntry) {
  const owner = row.client
  const id =
    owner && typeof owner === 'object' && 'id' in owner
      ? (owner.id ?? row.client_id)
      : row.client_id
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
  [applied, () => route.query.itemsPerPage, () => route.query.page, allowed],
  async ([name, itemsPerPage, currentPage, canView]) => {
    const request = ++pending
    if (!canView) return
    search.value = name
    const size = Number(itemsPerPage)
    limit.value = [20, 50, 100, 500].includes(size) ? size : 20
    page.value = Math.max(1, Math.floor(Number(currentPage)) || 1)
    busy.value = true
    failed.value = false
    try {
      const { data } = await $services.locations.list({
        name: name || undefined,
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
          <th
            v-for="column in sortColumns"
            :key="column.key"
            scope="col"
            :aria-sort="ariaSort(column.key)"
          >
            <v-btn
              size="small"
              variant="text"
              class="px-1 text-none"
              @click="sortBy(column.key)"
            >
              {{ column.label }}
              <v-icon
                v-if="sortKey === column.key"
                end
                :icon="descending ? 'mdi-arrow-down' : 'mdi-arrow-up'"
              />
            </v-btn>
          </th>
          <th scope="col">Created</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in tableRows" :key="row.id">
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
      <v-sheet v-if="inspected" border rounded class="pa-4">
        <h3 class="text-h6 mb-3">{{ inspected.name }}</h3>
        <v-progress-linear
          v-if="detailLoading"
          indeterminate
          aria-label="Loading location details"
          class="mb-3"
        />
        <p v-else-if="detailFailed" role="status" class="mb-3">
          Additional location details are unavailable.
        </p>
        <RecordsRecordFacts :fields="inspectorFields" />
        <v-btn
          v-if="recordUrl(inspected)"
          :to="recordUrl(inspected)"
          variant="tonal"
          color="primary"
          class="mt-4"
          >Open full location record</v-btn
        >
        <v-btn
          v-else-if="!detailLoading && !detailFailed"
          :to="{
            path: '/location-settings/add',
            query: { id: inspected.id, name: inspected.name },
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
