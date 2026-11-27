<script setup lang="ts">
import { reportPages, reportViews } from '~/constants'
import {
  dayRange,
  demoDays,
  filterId,
  reportDate,
} from '~/services/report-filters'
import {
  generateKPIDailyReport,
  generateKPIMonthlyReport,
  groupKpiMonths,
  KPIColumnSections,
} from '~/services/kpi-report'
import { formatReportRange } from '~/services/report-period'
import type { KpiReport, RecordSummary } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = reportPages.location.title
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: 'Reporting Hub', to: '/reports' },
    { text: title, to: '', disabled: true },
  ],
})
const session = useSessionStore()
const { $services } = useNuxtApp()
const { public: config } = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const {
  open,
  loading: exporting,
  url,
  notice,
  exportReport,
  copy,
} = useReportExport()
const clients = ref<RecordSummary[]>([])
const locations = ref<RecordSummary[]>([])
const clientId = ref<number | null>(null)
const locationId = ref<number | null>(null)
const dates = ref<string[]>([])
const group = ref<'daily' | 'month'>('month')
const result = ref<KpiReport>()
const resultGroup = ref<'daily' | 'month'>('month')
const resultDates = ref<string[]>([])
const busy = ref(false)
const failed = ref(false)
const canReport = computed(
  () => session.isAllowed('create report') || !session.isAllowed('vpn access'),
)
const canApply = computed(
  () =>
    clientId.value !== null &&
    locationId.value !== null &&
    (!dates.value[1] || !dates.value[0] || dates.value[1] >= dates.value[0]),
)
const locationName = computed(
  () =>
    result.value?.locations
      .map(({ name }) => name)
      .filter(Boolean)
      .join(', ') ?? '',
)
const resultNames = computed(() =>
  [result.value?.client.name, locationName.value].filter(Boolean).join(' · '),
)
const dateLabel = computed(() => {
  const [from, to] = resultDates.value
  return from ? formatReportRange(from, to || from) : 'All available dates'
})
const headerColumns = computed(() => [
  resultGroup.value === 'daily'
    ? KPIColumnSections.dates.dailyColumn
    : KPIColumnSections.dates.monthColumn,
  ...KPIColumnSections.leads,
  ...KPIColumnSections.adwords,
  ...KPIColumnSections.fb,
  ...KPIColumnSections.score,
])
const headers = computed(() =>
  headerColumns.value.map((column) => ({
    title: column.text,
    key: column.value,
    minWidth: column.width,
    sortable: false,
  })),
)
const sections = computed(() => {
  if (!result.value) return []
  const { summary } = result.value
  if (Array.isArray(summary)) {
    return [
      {
        year: '',
        rows: [...summary].sort((first, second) =>
          second.date.localeCompare(first.date),
        ),
      },
    ]
  }
  return groupKpiMonths(summary)
})

let locationRequest = 0
async function loadLocations() {
  const request = ++locationRequest
  locations.value = []
  if (!clientId.value) return
  try {
    const { data } = await $services.locations.byClient(clientId.value)
    if (request === locationRequest) locations.value = data.data.result
  } catch {
    if (request === locationRequest) notice.value = 'Unable to load locations.'
  }
}

async function changeClient() {
  locationId.value = null
  await loadLocations()
  if (locationId.value === null) {
    const first = [...locations.value].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? ''),
    )[0]
    locationId.value = filterId(first?.id)
  }
}

async function fetchReport() {
  if (!canApply.value || clientId.value === null || locationId.value === null)
    return
  const type = group.value
  const [from, to] = dates.value
  const end = to || from || reportDate()
  busy.value = true
  failed.value = false
  url.value = ''
  result.value = undefined
  try {
    const { data } = await $services.reports.kpi({
      date_start: from || undefined,
      date_end: end,
      client_id: clientId.value,
      location_ids: [locationId.value],
      type,
    })
    if (
      !data.data.summary ||
      (type === 'daily' && !Array.isArray(data.data.summary))
    ) {
      failed.value = true
      return
    }
    result.value = {
      ...data.data,
      locations: Object.values(data.data.locations || {}),
    }
    resultGroup.value = type
    resultDates.value = [from || '', end]
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}

async function apply() {
  const target = {
    query: {
      client_id: clientId.value,
      location_ids: locationId.value,
      dates: dates.value.filter(Boolean).length
        ? dates.value.filter(Boolean)
        : 'all',
      type: group.value,
    },
  }
  if (router.resolve(target).fullPath === route.fullPath) await fetchReport()
  else await router.replace(target)
}

async function readFilters() {
  const query = route.query
  clientId.value = filterId(query.client_id) ?? (config.showcaseMode ? 1 : null)
  locationId.value =
    filterId(query.location_ids) ?? (config.showcaseMode ? 1 : null)
  dates.value =
    query.dates === 'all'
      ? []
      : query.dates
        ? dayRange(query.dates)
        : config.showcaseMode
          ? demoDays()
          : [
              reportDate(new Date(new Date().getFullYear() - 2, 0, 1)),
              reportDate(),
            ]
  group.value = query.type === 'daily' ? 'daily' : 'month'
  await Promise.all([loadLocations(), fetchReport()])
}

const copyCurrent = () => copy(window.location.href)
async function upload() {
  if (!result.value) return
  const user = session.authenticatedUser
  const create =
    resultGroup.value === 'daily'
      ? generateKPIDailyReport
      : generateKPIMonthlyReport
  await exportReport(
    create({
      client: { name: result.value.client.name || '' },
      location: locationName.value,
      user: {
        fullname: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
      },
      summary: result.value.summary,
      filters: { dates: resultDates.value },
    }),
  )
}

onMounted(async () => {
  if (!canReport.value) return
  await Promise.all([
    $services.clients
      .list({ limit: -1 })
      .then(({ data }) => {
        clients.value = data.data.result
      })
      .catch(() => {
        notice.value = 'Unable to load clients.'
      }),
    readFilters(),
  ])
})
watch(
  () => route.fullPath,
  () => {
    if (canReport.value) return readFilters()
  },
)
</script>

<template>
  <v-alert
    v-if="!canReport"
    type="warning"
    text="You are not authorized to view this report."
  />
  <div v-else class="workspace-report-stack">
    <v-card flat class="report-filter-card">
      <h2>Report filters</h2>
      <div class="kpi-filters">
        <v-autocomplete
          v-model="clientId"
          :items="clients"
          item-title="name"
          item-value="id"
          label="Client"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="changeClient"
        />
        <v-autocomplete
          v-model="locationId"
          :items="locations"
          :disabled="!clientId"
          item-title="name"
          item-value="id"
          label="Location"
          variant="outlined"
          density="compact"
          hide-details
        />
        <ReportsDateRange
          v-model="dates"
          :presets="[
            'Last month',
            'This year',
            'Last 2 years',
            'All available dates',
          ]"
        />
        <v-select
          v-model="group"
          :items="[
            { title: 'Day', value: 'daily' },
            { title: 'Month', value: 'month' },
          ]"
          label="Group by"
          variant="outlined"
          density="compact"
          hide-details
        />
        <v-btn
          color="primary"
          :disabled="!canApply"
          :loading="busy"
          @click="apply"
          >Apply filters</v-btn
        >
      </div>
    </v-card>
    <v-card v-if="busy" flat role="status" aria-label="Loading location KPIs">
      <v-card-text
        ><v-skeleton-loader
          type="table-heading, table-row-divider, table-row-divider"
      /></v-card-text>
    </v-card>
    <v-card v-else-if="result" flat>
      <header class="report-result-heading">
        <div>
          <h2>
            {{
              resultGroup === 'daily' ? reportViews.daily : reportViews.monthly
            }}
          </h2>
          <p v-if="resultNames">{{ resultNames }}</p>
          <p>{{ dateLabel }}</p>
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
      <section
        v-for="section in sections"
        :key="section.year"
        class="report-table-panel"
      >
        <h3 v-if="section.year">{{ section.year }}</h3>
        <v-data-table
          :headers="headers"
          :items="section.rows"
          :items-per-page="-1"
          hide-default-footer
        />
      </section>
      <v-card-text v-if="!sections.length"
        >No KPI results for this period.</v-card-text
      >
    </v-card>
    <v-card v-else flat>
      <header class="report-result-heading">
        <div>
          <h2>{{ failed ? 'Report unavailable' : 'Generate a KPI report' }}</h2>
          <p>
            {{
              failed
                ? 'Apply the filters again to retry.'
                : 'Choose a client and location to see performance.'
            }}
          </p>
        </div>
      </header>
    </v-card>
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
