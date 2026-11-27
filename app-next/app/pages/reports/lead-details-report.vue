<script setup lang="ts">
import { reportPages, reportViews } from '~/constants'
import {
  buildLeadReport,
  leadRows,
  type DetailKey,
  type LeadReport,
} from '~/services/lead-attribution'
import {
  leadColumns,
  recordingLink,
  tableLeadRecord,
  workbookCell,
} from '~/services/lead-attribution-table'
import { buildLeadWorkbook } from '~/services/lead-workbook'
import { dayRange, demoDays, filterId } from '~/services/report-filters'
import { formatReportRange } from '~/services/report-period'
import type { Envelope, RecordSummary } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = reportPages.attribution.title
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
const clients = ref<RecordSummary[]>([])
const locations = ref<RecordSummary[]>([])
const clientId = ref<number | null>(null)
const locationIds = ref<number[]>([])
const dates = ref<string[]>([])
const busy = ref(false)
const failed = ref(false)
const report = ref<LeadReport>()
const active = ref('overview')
const view = ref<DetailKey | 'all'>('all')
const search = ref('')
const expanded = ref<ReturnType<typeof leadRows>[number]>()
const openDetail = ref(false)
const allowed = computed(
  () => session.isAllowed('create report') || !session.isAllowed('vpn access'),
)
const canApply = computed(
  () =>
    clientId.value &&
    locationIds.value.length &&
    dates.value[0] &&
    (!dates.value[1] || dates.value[1] >= dates.value[0]),
)
const computedReport = computed(() =>
  report.value ? buildLeadReport(report.value) : undefined,
)
const rows = computed(() =>
  computedReport.value
    ? leadRows(computedReport.value.details, view.value)
    : [],
)
const range = computed(() =>
  computedReport.value?.dateStart
    ? formatReportRange(
        computedReport.value.dateStart,
        computedReport.value.dateEnd,
      )
    : '',
)
const dateText = (value?: string) =>
  value ? new Date(value).toLocaleString('en-US') : '—'
const views: Array<{ title: string; value: DetailKey | 'all' }> = [
  { title: 'All leads', value: 'all' },
  { title: 'Calls · Google Ads', value: 'adwords_calls' },
  { title: 'Calls · Facebook', value: 'facebook_calls' },
  { title: 'Calls · SEO', value: 'seo_calls' },
  { title: 'Chats · Google Ads', value: 'adwords_chats' },
  { title: 'Chats · Facebook', value: 'facebook_chats' },
  { title: 'Chats · SEO', value: 'seo_chats' },
  { title: 'Forms · Google Ads', value: 'emails' },
  { title: 'Forms · Facebook', value: 'facebook_leads' },
  { title: 'Forms · SEO', value: 'seo_emails' },
]
const headers = [
  { title: 'Type', key: 'kind' },
  { title: 'Name', key: 'name' },
  { title: 'Date', key: 'timestamp' },
  { title: 'Location', key: 'location_name' },
  { title: 'Source', key: 'source' },
  { title: 'Email', key: 'email' },
  { title: 'Phone', key: 'phone' },
  { title: 'Procedure', key: 'procedure' },
  { title: 'Details', key: 'actions', sortable: false },
]
const stampSlot = 'item.timestamp'
const actionsSlot = 'item.actions'
const sourceColumns = computed(() => leadColumns(view.value))
const sourceHeaders = computed(() => [
  ...sourceColumns.value.map(({ text, width, sortable }, index) => ({
    title: text,
    key: 'column_' + index,
    minWidth: width,
    sortable,
  })),
  { title: 'Details', key: 'actions', sortable: false },
])
const sourceRows = computed(() =>
  rows.value.map((row) => {
    const record = tableLeadRecord(row, view.value)
    const cells = sourceColumns.value.map((column, index) => {
      const value = workbookCell(column, record, config.recordingPlayer)
      return [
        'column_' + index,
        typeof value === 'number' || typeof value === 'string' ? value : '',
      ] as const
    })
    return { key: row.key, record: row, ...Object.fromEntries(cells) }
  }),
)
const recording = computed(() =>
  recordingLink(expanded.value?.call_url, config.recordingPlayer),
)
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
  locationIds.value = []
  await loadLocations()
}

async function fetchReport(sync = true) {
  const [date_start, dateEnd] = dates.value
  if (!canApply.value || !date_start || busy.value) return
  busy.value = true
  failed.value = false
  try {
    if (sync)
      await router.replace({
        query: {
          ...route.query,
          client: clientId.value,
          location_ids: locationIds.value,
          client_name: clients.value.find(
            ({ id }) => String(id) === String(clientId.value),
          )?.name,
          dates: dates.value.filter(Boolean),
        },
      })
    const { data } = await $api.get<Envelope<LeadReport>>('/leads', {
      params: {
        date_start,
        date_end: dateEnd || date_start,
        location_ids: locationIds.value,
        client_id: clientId.value,
      },
    })
    if (!data.data || !Array.isArray(data.data.locations))
      throw new Error('Lead locations missing')
    report.value = data.data
    url.value = ''
  } catch {
    report.value = undefined
    failed.value = true
  } finally {
    busy.value = false
  }
}

const copyCurrent = () => copy(window.location.href)
function upload() {
  if (!report.value) return
  const user = session.authenticatedUser
  const author = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
  return exportReport(
    buildLeadWorkbook(report.value, author, config.recordingPlayer),
  )
}
function inspect(row: ReturnType<typeof leadRows>[number]) {
  expanded.value = row
  openDetail.value = true
}
onMounted(async () => {
  if (!allowed.value) return
  clientId.value =
    filterId(route.query.client) ?? (config.showcaseMode ? 1 : null)
  const ids = Array.isArray(route.query.location_ids)
    ? route.query.location_ids
    : [route.query.location_ids]
  locationIds.value = ids
    .map(filterId)
    .filter((id): id is number => id !== null)
  if (!locationIds.value.length && config.showcaseMode && clientId.value === 1)
    locationIds.value = [1]
  dates.value = route.query.dates
    ? dayRange(route.query.dates)
    : config.showcaseMode
      ? demoDays()
      : []
  await Promise.all([
    $services.clients
      .list({ limit: -1 })
      .then(({ data }) => {
        clients.value = data.data.result
      })
      .catch(() => {
        notice.value = 'Unable to load clients.'
      }),
    loadLocations(),
    fetchReport(false),
  ])
})
</script>

<template>
  <v-alert
    v-if="!allowed"
    type="warning"
    text="You are not authorized to view this report."
  />
  <div v-else class="workspace-report-stack lead-report">
    <v-card flat class="report-filter-card">
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
          v-model="locationIds"
          :items="locations"
          item-title="name"
          item-value="id"
          label="Locations"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          hide-details
        />
        <ReportsDateRange
          v-model="dates"
          :presets="[
            'This week',
            'Last week',
            'Last 14 days',
            'This month',
            'Last month',
          ]"
        />
        <v-btn
          color="primary"
          :loading="busy"
          :disabled="!canApply"
          @click="fetchReport()"
          >Apply filters</v-btn
        >
      </div>
    </v-card>
    <v-card v-if="busy" flat
      ><v-card-text
        ><v-skeleton-loader
          type="table-heading, table-row-divider, table-row-divider" /></v-card-text
    ></v-card>
    <v-card v-else-if="report && computedReport" flat>
      <header class="report-result-heading">
        <div>
          <h2>
            <NuxtLink :to="'/client-records/' + report.id">{{
              report.name
            }}</NuxtLink>
          </h2>
          <p>{{ range }}</p>
          <v-chip-group>
            <v-chip
              v-for="{ location } in report.locations"
              :key="location.id"
              size="small"
              :to="`/client-records/${report.id}/locations/${location.id}`"
              >{{ location.name }}</v-chip
            >
          </v-chip-group>
          <p v-if="report.cache?.created_at || report.cache?.cache?.created_at">
            Updated
            {{
              dateText(
                report.cache.created_at ?? report.cache.cache?.created_at,
              )
            }}
          </p>
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
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="fetchReport(false)"
            >Reload</v-btn
          >
          <v-btn
            size="small"
            color="primary"
            prepend-icon="mdi-google-drive"
            :loading="exporting"
            @click="upload"
          >
            {{ url ? 'View export' : 'Export to Drive' }}
          </v-btn>
        </div>
      </header>
      <section class="lead-report-sections">
        <v-tabs v-model="active" grow color="primary" class="lead-section-tabs">
          <v-tab value="overview" prepend-icon="mdi-chart-box-outline">{{
            reportViews.overview
          }}</v-tab>
          <v-tab value="sources" prepend-icon="mdi-chart-donut">{{
            reportViews.sources
          }}</v-tab>
          <v-tab value="activity" prepend-icon="mdi-format-list-bulleted">{{
            reportViews.activity
          }}</v-tab>
        </v-tabs>
        <v-tabs-window v-model="active">
          <v-tabs-window-item value="overview">
            <ReportsLeadOverview
              :summary="computedReport.summary"
              :analytics="computedReport.analytics"
            />
          </v-tabs-window-item>
          <v-tabs-window-item value="sources">
            <ReportsLeadSources
              :details="computedReport.details"
              :analytics="computedReport.analytics"
              :sources="computedReport.sources"
            />
          </v-tabs-window-item>
          <v-tabs-window-item value="activity">
            <div class="report-table-panel lead-activity-panel">
              <div class="report-result-heading">
                <div>
                  <h3>Lead records</h3>
                  <p>
                    {{ rows.length }}
                    {{ rows.length === 1 ? 'record' : 'records' }}
                  </p>
                </div>
                <div class="report-result-actions">
                  <v-text-field
                    v-if="view === 'all'"
                    v-model="search"
                    label="Search lead records"
                    prepend-inner-icon="mdi-magnify"
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                  />
                  <v-select
                    v-model="view"
                    :items="views"
                    label="Type and source"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </div>
              </div>
              <v-data-table
                v-if="view === 'all'"
                :headers="headers"
                :items="rows"
                :search="view === 'all' ? search : ''"
                item-value="key"
              >
                <template #[stampSlot]="{ item }">{{
                  dateText(item.timestamp)
                }}</template>
                <template #[actionsSlot]="{ item }"
                  ><v-btn size="small" variant="outlined" @click="inspect(item)"
                    >View details</v-btn
                  ></template
                >
              </v-data-table>
              <v-data-table
                v-else
                :headers="sourceHeaders"
                :items="sourceRows"
                item-value="key"
              >
                <template #[actionsSlot]="{ item }">
                  <v-btn
                    size="small"
                    variant="outlined"
                    @click="inspect(item.record)"
                    >View details</v-btn
                  >
                </template>
              </v-data-table>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </section>
    </v-card>
    <v-card v-else flat
      ><v-card-text
        ><h2>{{ failed ? 'Report unavailable' : 'Generate a lead report' }}</h2>
        <p>
          {{
            failed
              ? 'Apply the filters again to retry.'
              : 'Choose a client, location and date range to get started.'
          }}
        </p></v-card-text
      ></v-card
    >
    <v-dialog v-model="openDetail" max-width="640">
      <v-card v-if="expanded" :title="expanded.name || 'Lead details'">
        <v-card-text>
          <dl class="lead-details-list">
            <dt>Type</dt>
            <dd>{{ expanded.kind }}</dd>
            <dt>Date</dt>
            <dd>{{ dateText(expanded.timestamp) }}</dd>
            <dt>Location</dt>
            <dd>{{ expanded.location_name || '—' }}</dd>
            <dt>Email</dt>
            <dd>{{ expanded.email || '—' }}</dd>
            <dt>Phone</dt>
            <dd>{{ expanded.phone || '—' }}</dd>
            <dt>Procedure</dt>
            <dd>{{ expanded.procedure || '—' }}</dd>
            <dt v-if="expanded.score?.comment">Coaching note</dt>
            <dd v-if="expanded.score?.comment">{{ expanded.score.comment }}</dd>
          </dl>
          <p v-if="expanded.lead?.message">{{ expanded.lead.message }}</p>
          <pre v-if="expanded.chat" class="lead-transcript">{{
            expanded.chat
          }}</pre>
          <v-btn
            v-if="recording"
            :href="recording"
            target="_blank"
            rel="noopener"
            prepend-icon="mdi-play"
            >Play recording</v-btn
          >
        </v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn @click="openDetail = false"
            >Close</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
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
