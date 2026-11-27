<script setup lang="ts">
import type { ApexOptions } from 'apexcharts'
import { reportPages } from '~/constants'
import {
  buildTrends,
  trendExport,
  type TrendReport,
} from '~/services/lead-trends'
import { dayRange } from '~/services/report-filters'
import { formatReportRange } from '~/services/report-period'
import { date } from '~/showcase/fixtures'
import type { Envelope } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = reportPages.trends.title
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
const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { public: config } = useRuntimeConfig()
const {
  open,
  loading: exporting,
  url,
  notice,
  exportReport,
  copy,
} = useReportExport()
const dates = ref<string[]>([])
const response = ref<TrendReport>({})
const loading = ref(false)
const loaded = ref(false)
const failure = ref(false)
const allowed = computed(
  () => session.isAllowed('create report') || !session.isAllowed('vpn access'),
)
const graph = computed(() => buildTrends(response.value))
const label = computed(() =>
  dates.value[0]
    ? formatReportRange(dates.value[0], dates.value[1] || dates.value[0])
    : '',
)
const formatMonth = (value: string) => {
  const month = new Date(value + '-01T00:00:00Z')
  return Number.isNaN(month.getTime())
    ? value
    : month.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
}
const options = computed<ApexOptions>(() => ({
  colors: [
    '#3263DE',
    '#098779',
    '#7458C7',
    '#C05C30',
    '#2679A4',
    '#A34473',
    '#53652A',
    '#865C39',
    '#50658E',
  ],
  chart: { zoom: { enabled: false } },
  stroke: { curve: 'straight', width: 2.5 },
  markers: { size: 0, hover: { size: 5 } },
  xaxis: {
    categories: graph.value.months,
    labels: { formatter: (value) => formatMonth(String(value)) },
  },
}))

let activeRequest = 0
async function apply(range: string[], updateUrl: boolean) {
  const [date_start, date_end] = range
  if (!date_start || !date_end || date_end < date_start) return
  const request = ++activeRequest
  loading.value = true
  failure.value = false
  url.value = ''
  try {
    if (updateUrl) await router.replace({ query: { dates: range } })
    const { data } = await $api.get<Envelope<TrendReport>>('/reports/data', {
      params: { date_start, date_end },
    })
    if (request === activeRequest) {
      response.value = data.data
      loaded.value = true
    }
  } catch {
    if (request === activeRequest) failure.value = true
  } finally {
    if (request === activeRequest) loading.value = false
  }
}

async function update(range: string[]) {
  dates.value = range
  await apply(range, true)
}

const copyCurrent = () => copy(window.location.href)
const upload = () => exportReport(trendExport(graph.value.rows))
onMounted(async () => {
  if (!allowed.value) return
  const fromUrl = dayRange(route.query.dates)
  dates.value = fromUrl.length
    ? fromUrl
    : config.showcaseMode
      ? [date(-150), date()]
      : []
  await apply(dates.value, false)
})
</script>

<template>
  <v-alert
    v-if="!allowed"
    type="warning"
    text="You are not authorized to view this report."
  />
  <v-card v-else flat class="workspace-chart-card" :loading="loading">
    <v-card-title class="workspace-chart-heading">
      <span>{{ title }}</span>
      <ReportsDateRange
        :model-value="dates"
        :presets="['This year', 'Last year', 'Last 2 years', 'Last 5 years']"
        @update:model-value="update"
      />
      <div v-if="loaded" class="workspace-period-controls">
        <v-btn
          icon="mdi-link"
          aria-label="Copy link to this report"
          @click="copyCurrent"
        />
        <v-btn
          :loading="exporting"
          icon="mdi-upload"
          aria-label="Upload to Google Drive"
          @click="upload"
        />
      </div>
    </v-card-title>
    <v-card-text v-if="label">{{ label }}</v-card-text>
    <v-card-text>
      <v-alert v-if="failure" type="error" text="Unable to load lead trends." />
      <WorkspaceChart
        v-else
        label="Lead activity and call outcomes over time"
        :height="365"
        type="line"
        :series="graph.series"
        :options="options"
      />
    </v-card-text>
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
  </v-card>
</template>
