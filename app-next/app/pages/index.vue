<script setup lang="ts">
import type { ApexOptions } from 'apexcharts'
import type { Envelope } from '~/types/api'
import {
  formatReportRange,
  getReportRange,
  type ReportPeriod,
} from '~/services/report-period'

interface LeadDay {
  date: string
  summary: { calls: number; chats: number; emails: number }
}

definePageMeta({ middleware: 'is-authenticated' })
useHead({ title: 'Dashboard' })
useWorkspaceStore().setPageHeading({
  pageTitle: 'Dashboard',
  breadcrumbs: [
    { text: 'Dashboard', to: '/', disabled: true },
    { text: 'Home', to: '/', disabled: true },
  ],
})

const session = useSessionStore()
const { $api } = useNuxtApp()
const canReport = computed(() => session.isAllowed('create report'))
const currentPeriod = ref<ReportPeriod>('this_week')
const periods: Array<{ label: string; value: ReportPeriod }> = [
  { label: 'This week', value: 'this_week' },
  { label: 'Last week', value: 'last_week' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
]
const dates = computed(() => getReportRange(currentPeriod.value))
const days = ref<LeadDay[]>([])
const loading = ref(true)
const error = ref(false)
const reportPeriod = computed(() =>
  formatReportRange(dates.value.date_start, dates.value.date_end),
)
const chartSeries = computed(() => [
  { name: 'Calls', data: days.value.map((day) => day.summary.calls) },
  { name: 'Chats', data: days.value.map((day) => day.summary.chats) },
  { name: 'Web Forms', data: days.value.map((day) => day.summary.emails) },
])
const metrics = computed(() =>
  chartSeries.value.map(({ name, data }) => ({
    label: name,
    value: data
      .reduce((total, count) => total + (Number(count) || 0), 0)
      .toLocaleString('en-US'),
  })),
)
const dateLabel = (value: string, includeMonth: boolean) => {
  const date = new Date(value + 'T00:00:00Z')
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    day: 'numeric',
    ...(includeMonth ? { month: 'short' } : {}),
  }).format(date)
}
const chartOptions = computed<ApexOptions>(() => ({
  colors: ['#4F79EB', '#139D87', '#956DDD'],
  plotOptions: { bar: { columnWidth: '62%', borderRadius: 5 } },
  responsive: [
    {
      breakpoint: 600,
      options: {
        xaxis: {
          labels: { formatter: (value: string) => dateLabel(value, false) },
        },
      },
    },
  ],
  xaxis: {
    categories: days.value.map(({ date }) => date),
    labels: { formatter: (value) => dateLabel(String(value), true) },
  },
}))

async function fetchLeadSummary(period: ReportPeriod) {
  currentPeriod.value = period
  loading.value = true
  error.value = false
  try {
    const { data } = await $api.get<Envelope<LeadDay[]>>('/leads', {
      params: { ...dates.value, graph: 'true' },
    })
    days.value = data.data
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!canReport.value) {
    await navigateTo('/vpn-setup')
    return
  }
  await fetchLeadSummary(currentPeriod.value)
})
</script>

<template>
  <v-row density="compact" class="workspace-dashboard">
    <v-col v-if="canReport" cols="12">
      <section class="workspace-overview" aria-label="Lead activity summary">
        <div class="workspace-overview-heading">
          <h2>Lead activity</h2>
          <p>{{ reportPeriod }}</p>
        </div>
        <dl class="workspace-metrics" :aria-busy="loading">
          <div
            v-for="metric in metrics"
            :key="metric.label"
            class="workspace-metric"
          >
            <dt>{{ metric.label }}</dt>
            <dd>{{ loading ? '—' : metric.value }}</dd>
          </div>
        </dl>
      </section>
    </v-col>
    <v-col v-if="canReport" cols="12">
      <v-card flat class="workspace-chart-card" :loading="loading">
        <v-card-title class="workspace-chart-heading">
          <span>Lead trends</span>
          <div class="workspace-period-controls">
            <v-btn
              v-for="period in periods"
              :key="period.value"
              size="small"
              :variant="currentPeriod === period.value ? 'flat' : 'outlined'"
              :color="currentPeriod === period.value ? 'primary' : undefined"
              :aria-pressed="currentPeriod === period.value"
              :disabled="loading"
              @click="fetchLeadSummary(period.value)"
            >
              {{ period.label }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="error"
            type="error"
            text="Unable to load lead activity."
          />
          <WorkspaceChart
            v-else
            label="Lead trends by day"
            type="bar"
            :options="chartOptions"
            :series="chartSeries"
          />
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" class="workspace-dashboard-reports">
      <h2 class="workspace-section-title">Browse reports</h2>
      <ReportsList />
    </v-col>
  </v-row>
</template>
