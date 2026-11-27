<script setup lang="ts">
import { reportPages } from '~/constants'
import {
  comparisonPerformance,
  field,
  isComparison,
  performanceColumns,
  performanceExport,
  periodRange,
  standardPerformance,
  type PerformanceMode,
  type PerformanceReport,
} from '~/services/client-performance'
import { dayRange, demoDays, filterId } from '~/services/report-filters'
import { formatReportRange } from '~/services/report-period'
import type { Envelope, Fields, UserRecord } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = reportPages.client.title
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: 'Reporting Hub', to: '/reports' },
    { text: title, to: '', disabled: true },
  ],
})
const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const { public: config } = useRuntimeConfig()
const { $api, $services } = useNuxtApp()
const {
  open,
  loading: exporting,
  url,
  notice,
  exportReport,
  copy,
} = useReportExport()
const comparing = ref(false)
const channel = ref<'all' | 'organic' | 'paid'>('all')
const status = ref('active')
const manager = ref<number | null>(null)
const managers = ref<UserRecord[]>([])
const dates = ref<string[]>([])
const reference = ref('')
const comparison = ref('')
const search = ref('')
const loading = ref(false)
const failed = ref(false)
const response = ref<PerformanceReport>()
const applied = ref<{
  comparing: boolean
  reference: string
  comparison: string
  dates: string[]
  manager: number | null
}>({
  comparing: false,
  reference: '',
  comparison: '',
  dates: [],
  manager: null,
})

const allowed = computed(
  () => session.isAllowed('create report') || !session.isAllowed('vpn access'),
)
const canApply = computed(() =>
  comparing.value
    ? Boolean(reference.value && comparison.value)
    : Boolean(
        dates.value[0] && (!dates.value[1] || dates.value[1] >= dates.value[0]),
      ),
)
const tableTitle = computed(() =>
  channel.value === 'organic'
    ? 'Organic Search Performance'
    : channel.value === 'paid'
      ? 'Paid Search Performance'
      : title,
)
const resultPeriod = computed(() => {
  if (applied.value.comparing)
    return (
      applied.value.reference + ' compared with ' + applied.value.comparison
    )
  const [from, to] = applied.value.dates
  return from ? formatReportRange(from, to || from) : ''
})
const mode = computed<PerformanceMode>(() =>
  applied.value.comparing
    ? channel.value === 'organic'
      ? 'organicComparison'
      : 'comparison'
    : channel.value === 'organic'
      ? 'organic'
      : 'standard',
)
const columns = computed(() =>
  performanceColumns(mode.value).filter(
    ({ value }) =>
      !applied.value.manager || !value.includes('account_manager_id'),
  ),
)
const headers = computed(() =>
  columns.value.map(({ text, value, width, ...options }, index) => ({
    title: text,
    key: value || 'spacer-' + index,
    value: value || 'spacer-' + index,
    minWidth: width,
    sortable: 'sortable' in options && options.sortable === true,
  })),
)
const rows = computed<Fields[]>(() =>
  (response.value?.summary ?? []).flatMap((row) => {
    if (isComparison(row))
      return [
        comparisonPerformance(
          row.ref_month,
          row.comp_month,
          applied.value.reference,
          applied.value.comparison,
        ),
      ]
    return [standardPerformance(row, applied.value.dates)]
  }),
)
const rowName = (row: Fields) =>
  String(field(row, 'location.name') ?? row.client ?? '')
const visibleRows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const name = rowName(row).toLowerCase()
    return (
      (!term || name.includes(term)) &&
      (channel.value === 'all' ||
        name.includes('seo') === (channel.value === 'organic'))
    )
  })
})
const updated = computed(() => {
  const stamp = response.value?.cache?.cache?.created_at
  return stamp ? new Date(stamp).toLocaleString('en-US') : ''
})
const locationSlot = 'item.location.name'
const clientSlot = 'item.client'
const actionsSlot = 'item.actions'
const links = (row: Fields, report: 'attribution' | 'location') => {
  const filterDates = applied.value.comparing
    ? periodRange(applied.value.reference)
    : applied.value.dates
  return {
    path: reportPages[report].link,
    query: {
      ...(report === 'attribution'
        ? { client: String(row.client_id) }
        : { client_id: String(row.client_id), type: 'month' }),
      location_ids: String(row.location_id),
      dates: filterDates,
    },
  }
}
const clientLink = (row: Fields) =>
  `/client-records/${row.client_id}/locations/${row.location_id}`

function loadUrl() {
  const query = route.query
  comparing.value = Boolean(query.comparing_report)
  channel.value = query.seo_report ? 'organic' : 'all'
  status.value = query.status === 'inactive' ? 'inactive' : 'active'
  manager.value = filterId(query.account_manager_id)
  dates.value = query.dates
    ? dayRange(query.dates)
    : config.showcaseMode
      ? demoDays()
      : []
  reference.value = typeof query.ref_month === 'string' ? query.ref_month : ''
  comparison.value =
    typeof query.comp_month === 'string' ? query.comp_month : ''
}

async function syncUrl() {
  await router.replace({
    query: {
      status: status.value,
      account_manager_id: manager.value ?? undefined,
      dates: dates.value.filter(Boolean),
      ref_month: reference.value || undefined,
      comp_month: comparison.value || undefined,
      comparing_report: comparing.value ? '1' : undefined,
      seo_report: channel.value === 'organic' ? '1' : undefined,
    },
  })
}

async function fetchReport(updateUrl = true) {
  if (!canApply.value || loading.value) return
  loading.value = true
  failed.value = false
  url.value = ''
  const filters = {
    comparing: comparing.value,
    reference: reference.value,
    comparison: comparison.value,
    dates: [...dates.value],
    manager: manager.value,
  }
  try {
    if (updateUrl) await syncUrl()
    const { data } = await $api.get<Envelope<PerformanceReport>>(
      '/clients/leads',
      {
        params: {
          ...(filters.comparing
            ? { ref_month: filters.reference, comp_month: filters.comparison }
            : { date_start: filters.dates[0], date_end: filters.dates[1] }),
          status: status.value,
          account_manager_id: filters.manager,
        },
      },
    )
    if (!Array.isArray(data.data?.summary))
      throw new Error('Report response missing summary')
    response.value = data.data
    applied.value = filters
  } catch {
    response.value = undefined
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function changeChannel(value: typeof channel.value) {
  channel.value = value
  search.value = ''
  url.value = ''
  await syncUrl()
}
const copyCurrent = () => copy(window.location.href)
const upload = () => {
  const user = session.authenticatedUser
  return exportReport(
    performanceExport(
      visibleRows.value,
      mode.value,
      applied.value.dates,
      [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    ),
  )
}

onMounted(async () => {
  if (!allowed.value) return
  loadUrl()
  const request = $services.users
    .list({ sort_by: 'first_name:asc', role: 'account manager', limit: 200 })
    .then(({ data }) => {
      managers.value = data.data.result
    })
    .catch(() => {
      notice.value = 'Unable to load account managers.'
    })
  await Promise.all([request, fetchReport(false)])
})
</script>

<template>
  <v-alert
    v-if="!allowed"
    type="warning"
    text="You are not authorized to view this report."
  />
  <div v-else class="workspace-report-stack">
    <v-card flat class="report-filter-card">
      <div class="report-result-actions">
        <h2>Report filters</h2>
        <v-spacer />
        <v-switch
          v-model="comparing"
          label="Compare periods"
          density="compact"
          hide-details
        />
      </div>
      <div class="kpi-filters">
        <v-select
          v-model="status"
          :items="[
            { title: 'Paying', value: 'active' },
            { title: 'Non-paying', value: 'inactive' },
          ]"
          label="Client status"
          variant="outlined"
          density="compact"
          hide-details
        />
        <v-autocomplete
          v-model="manager"
          :items="managers"
          item-title="fullname"
          item-value="id"
          label="Account manager"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
        <template v-if="comparing">
          <v-text-field
            v-model="reference"
            type="month"
            label="Reference month"
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-text-field
            v-model="comparison"
            type="month"
            label="Comparison month"
            variant="outlined"
            density="compact"
            hide-details
          />
        </template>
        <ReportsDateRange
          v-else
          v-model="dates"
          :presets="[
            'Last week',
            'This week',
            'This month',
            'Last month',
            'This year',
            'Last year',
          ]"
        />
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!canApply"
          @click="fetchReport()"
          >Apply filters</v-btn
        >
      </div>
    </v-card>
    <v-card v-if="loading" flat
      ><v-card-text
        ><v-skeleton-loader
          type="table-heading, table-row-divider, table-row-divider" /></v-card-text
    ></v-card>
    <v-card v-else-if="response" flat>
      <header class="report-result-heading">
        <div>
          <h2>{{ tableTitle }}</h2>
          <p>{{ resultPeriod }}</p>
          <p v-if="updated">Updated {{ updated }}</p>
        </div>
        <div class="report-result-actions">
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-link"
            @click="copyCurrent"
            >Copy link</v-btn
          >
          <v-btn
            size="small"
            color="primary"
            prepend-icon="mdi-google-drive"
            @click="upload"
            >{{ url ? 'View export' : 'Export to Drive' }}</v-btn
          >
        </div>
      </header>
      <div class="report-table-panel">
        <div class="report-result-actions report-search-tools">
          <v-btn
            v-if="channel === 'all'"
            color="primary"
            @click="changeChannel('organic')"
            >Organic search</v-btn
          >
          <v-btn v-else color="primary" @click="changeChannel('all')"
            >All channels</v-btn
          >
          <v-btn
            v-if="!applied.comparing && channel !== 'paid'"
            color="primary"
            @click="changeChannel('paid')"
            >Paid search</v-btn
          >
          <v-text-field
            v-model="search"
            label="Search clients"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
          />
        </div>
        <v-data-table
          :headers="headers"
          :items="visibleRows"
          :items-per-page="100"
          :items-per-page-options="[100, 200, 500, -1]"
          no-data-text="No client results for this report."
        >
          <template #[locationSlot]="{ item }"
            ><NuxtLink :to="clientLink(item)">{{
              rowName(item)
            }}</NuxtLink></template
          >
          <template #[clientSlot]="{ item }"
            ><NuxtLink :to="clientLink(item)">{{
              rowName(item)
            }}</NuxtLink></template
          >
          <template #[actionsSlot]="{ item }">
            <v-menu>
              <template #activator="{ props }"
                ><v-btn v-bind="props" size="small" variant="outlined"
                  >Links</v-btn
                ></template
              >
              <v-list density="compact">
                <v-list-item
                  :to="links(item, 'attribution')"
                  target="_blank"
                  :title="reportPages.attribution.title"
                />
                <v-list-item
                  :to="links(item, 'location')"
                  target="_blank"
                  :title="reportPages.location.title"
                />
              </v-list>
            </v-menu>
          </template>
        </v-data-table>
      </div>
    </v-card>
    <v-card v-else flat
      ><v-card-text>{{
        failed
          ? 'Report unavailable. Apply the filters again to retry.'
          : 'Supply filters to generate the report.'
      }}</v-card-text></v-card
    >
    <ReportsExportDialog
      v-model="open"
      :loading="exporting"
      :url="url"
      @copy="copy"
    />
    <v-snackbar
      :model-value="Boolean(notice)"
      @update:model-value="notice = ''"
      >{{ notice }}</v-snackbar
    >
  </div>
</template>

<style scoped>
.report-search-tools {
  margin-bottom: 12px;
}
.report-search-tools .v-input {
  min-width: 150px;
}
</style>
