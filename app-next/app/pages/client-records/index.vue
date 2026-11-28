<script setup lang="ts">
import { pageNames } from '~/constants'
import { statusLabel, type ClientRecord } from '~/services/client-records'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.clients
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
const results = ref<ClientRecord[]>([])
const statuses = ref<Record<string, string>>({})
const name = ref<string | null>('')
const status = ref<string | null>(null)
const itemsPerPage = ref(20)
const page = ref(1)
const total = ref(0)
const table = ref(false)
const selected = ref<ClientRecord>()
const busy = ref(false)
const failed = ref(false)
let pending = 0

const options = computed(() =>
  Object.entries(statuses.value).map(([title, value]) => ({ title, value })),
)
const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / itemsPerPage.value)),
)

function clientUrl(client: ClientRecord) {
  return '/client-records/' + client.id
}

function manageName(client: ClientRecord) {
  return [client.account_manager?.first_name, client.account_manager?.last_name]
    .filter(Boolean)
    .join(' ')
}

function clearFilters() {
  name.value = ''
  status.value = null
  return apply()
}

function changeLimit(limit: number) {
  itemsPerPage.value = limit
  return apply()
}

function apply(nextPage = 1) {
  return router.push({
    query: {
      ...route.query,
      name: name.value?.trim() || undefined,
      status: status.value || undefined,
      itemsPerPage: String(itemsPerPage.value),
      page: String(nextPage),
    },
  })
}

watch(
  () => route.query,
  async (query) => {
    const request = ++pending
    name.value = typeof query.name === 'string' ? query.name : ''
    status.value = typeof query.status === 'string' ? query.status : null
    const limit = Number(query.itemsPerPage)
    itemsPerPage.value = [20, 50, 100, 500].includes(limit) ? limit : 20
    page.value = Math.max(1, Math.floor(Number(query.page)) || 1)
    const sortBy = typeof query.sort_by === 'string' ? query.sort_by : 'name'
    const sorting = query.sorting === 'desc' ? 'desc' : 'asc'
    busy.value = true
    failed.value = false
    try {
      const { data } = await $services.clients.list({
        name: name.value || undefined,
        status: status.value || undefined,
        account_manager:
          typeof query.account_manager === 'string'
            ? query.account_manager
            : undefined,
        sort_by: sortBy + ':' + sorting,
        sorting,
        page: page.value,
        limit: itemsPerPage.value,
      })
      if (request !== pending) return
      results.value = data.data.result
      selected.value =
        results.value.find((client) => client.id === selected.value?.id) ??
        results.value[0]
      total.value = data.data.pagination.total
    } catch {
      if (request !== pending) return
      results.value = []
      selected.value = undefined
      total.value = 0
      failed.value = true
    } finally {
      if (request === pending) busy.value = false
    }
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    statuses.value = (await $services.clients.statuses()).data.data
  } catch {
    statuses.value = {}
  }
})
</script>

<template>
  <v-card flat class="pa-4">
    <v-form class="directory-filters" @submit.prevent="apply()">
      <v-text-field
        v-model="name"
        label="Client name"
        density="compact"
        hide-details
        clearable
      />
      <v-select
        v-model="status"
        :items="options"
        label="Status"
        density="compact"
        hide-details
        clearable
      />
      <v-btn type="submit" color="primary">Apply filters</v-btn>
      <v-btn variant="text" @click="clearFilters">Clear filters</v-btn>
    </v-form>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 my-4">
      <h2 class="text-h6">
        {{ total }} {{ total === 1 ? 'client' : 'clients' }}
      </h2>
      <v-btn to="/client-records/add" color="primary">Add client</v-btn>
      <v-btn variant="outlined" @click="table = !table">{{
        table ? 'View inspector' : 'View table'
      }}</v-btn>
    </div>
    <v-progress-linear v-if="busy" indeterminate />
    <v-alert v-else-if="failed" type="error"
      >Could not load client records.</v-alert
    >
    <v-alert v-else-if="!results.length" type="info" variant="tonal"
      >No clients match the filters.</v-alert
    >
    <v-table v-else-if="table" density="compact">
      <thead>
        <tr>
          <th scope="col">Client</th>
          <th scope="col">Status</th>
          <th scope="col">Account manager</th>
          <th scope="col">Locations</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in results" :key="client.id">
          <td>
            <NuxtLink :to="clientUrl(client)">{{ client.name }}</NuxtLink>
          </td>
          <td>
            <v-chip v-if="client.status" size="small" variant="tonal">{{
              statusLabel(client.status)
            }}</v-chip>
          </td>
          <td>{{ manageName(client) || '—' }}</td>
          <td>{{ client.num_of_locations ?? '—' }}</td>
        </tr>
      </tbody>
    </v-table>
    <div v-else class="directory-inspector">
      <v-list density="compact">
        <v-list-item
          v-for="client in results"
          :key="client.id"
          :title="client.name"
          :active="client.id === selected?.id"
          @click="selected = client"
        />
      </v-list>
      <v-sheet v-if="selected" border rounded class="pa-4">
        <h3 class="text-h6 mb-3">{{ selected.name }}</h3>
        <RecordsRecordFacts
          :fields="[
            {
              label: 'Status',
              value: selected.status && statusLabel(selected.status),
            },
            { label: 'Account manager', value: manageName(selected) },
            { label: 'Email', value: selected.email },
            { label: 'Locations', value: selected.num_of_locations },
          ]"
        />
        <v-btn
          :to="clientUrl(selected)"
          color="primary"
          variant="tonal"
          class="mt-4"
          >Open client record</v-btn
        >
      </v-sheet>
    </div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mt-4">
      <v-select
        :model-value="itemsPerPage"
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
.directory-filters,
.directory-inspector {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 800px) {
  .directory-filters {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto auto;
    align-items: center;
  }
  .directory-inspector {
    grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr);
  }
}
</style>
