<script setup lang="ts">
import { reportPages } from '~/constants'
import { dayRange, demoDays, filterId } from '~/services/report-filters'
import {
  displayDuration,
  paymentExport,
  paymentHeaders,
  paymentRows,
  type PaymentReport,
} from '~/services/payment-report'
import type { Envelope, UserRecord } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = reportPages.payments.title
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
const { $api, $services } = useNuxtApp()
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
const scorers = ref<UserRecord[]>([])
const loadingScorers = ref(false)
const busy = ref(false)
const loaded = ref(false)
const failed = ref(false)
const scorerId = ref<number | null>(null)
const dates = ref<string[]>([])
const selected = ref<{ id: number; from: string; to: string }>()
const report = ref<PaymentReport>({ ratings: [], pay_rate: 0 })
const canReport = computed(
  () => session.isAllowed('create report') || !session.isAllowed('vpn access'),
)
const canApply = computed(
  () =>
    scorerId.value !== null &&
    !!dates.value[0] &&
    (!dates.value[1] || dates.value[1] >= dates.value[0]),
)
const scorer = computed(() =>
  scorers.value.find(({ id }) => String(id) === String(selected.value?.id)),
)
const calculated = computed(() => paymentRows(report.value))
const callDurationSlot = 'item.total_call_duration'
const ratingDurationSlot = 'item.total_rating_time'
const summary = computed(() => [
  { label: 'Total payment', value: calculated.value.total.total },
  { label: 'Calls reviewed', value: calculated.value.total.total_calls },
  { label: 'Rating time', value: calculated.value.total.total_rating_time },
  { label: 'Hourly rate', value: calculated.value.total.pay_rate },
])
const lastUpdated = computed(() => {
  const stamp = report.value.cache?.created_at
  return stamp ? new Date(stamp).toLocaleString('en-US') : ''
})

async function fetchPayment() {
  if (!selected.value) return
  const { id, from, to } = selected.value
  busy.value = true
  failed.value = false
  url.value = ''
  report.value = { ratings: [], pay_rate: 0 }
  try {
    const { data } = await $api.get<Envelope<PaymentReport>>('/reports', {
      params: { type: 'payment', user_id: id, from, to },
    })
    if (data.data.ratings) report.value = data.data
  } catch {
    failed.value = true
  } finally {
    busy.value = false
    loaded.value = true
  }
}

async function apply(updateUrl = true) {
  const [from, to] = dates.value
  if (!canApply.value || !from || scorerId.value === null) return
  selected.value = { id: scorerId.value, from, to: to || from }
  if (updateUrl)
    await router.replace({
      query: { user_id: scorerId.value, dates: dates.value.filter(Boolean) },
    })
  await fetchPayment()
}

const copyCurrent = () => copy(window.location.href)

async function upload() {
  if (!selected.value) return
  const user = session.authenticatedUser
  await exportReport(
    paymentExport(calculated.value.rows, {
      scorer: String(scorer.value?.fullname ?? ''),
      from: selected.value.from,
      to: selected.value.to,
      author: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    }),
  )
}

onMounted(async () => {
  if (!canReport.value) return
  loadingScorers.value = true
  const loadScorers = $services.users
    .list({ sort_by: 'first_name:asc', role: 'call scorer', limit: 200 })
    .then(({ data }) => {
      scorers.value = data.data.result
    })
    .catch(() => {
      notice.value = 'Unable to load call scorers.'
    })
    .finally(() => {
      loadingScorers.value = false
    })
  const id = filterId(route.query.user_id)
  const selectedDays = dayRange(route.query.dates)
  if (id && selectedDays.length) {
    scorerId.value = id
    dates.value = selectedDays
  } else if (config.showcaseMode) {
    scorerId.value = 3
    dates.value = demoDays()
  }
  await Promise.all([loadScorers, apply(false)])
})
</script>

<template>
  <v-alert
    v-if="!canReport"
    type="warning"
    text="You are not authorized to view this report."
  />
  <div v-else class="workspace-report-stack payment-report">
    <v-card flat class="report-filter-card">
      <h2>Report filters</h2>
      <div class="payment-filters">
        <v-autocomplete
          v-model="scorerId"
          :items="scorers"
          :loading="loadingScorers"
          item-title="fullname"
          item-value="id"
          label="Call scorer"
          clearable
          density="compact"
          variant="outlined"
          hide-details
        />
        <ReportsDateRange
          v-model="dates"
          :presets="[
            'This week',
            'Last week',
            'Last 14 days',
            'Last month',
            'This year',
          ]"
        />
        <v-btn
          color="primary"
          :loading="busy"
          :disabled="!canApply"
          @click="apply()"
          >Apply</v-btn
        >
      </div>
    </v-card>
    <v-card flat>
      <header class="report-result-heading">
        <div>
          <h2>{{ scorer?.fullname || 'Report details' }}</h2>
          <p v-if="selected">{{ selected.from }} to {{ selected.to }}</p>
          <p v-if="lastUpdated">Updated {{ lastUpdated }}</p>
        </div>
        <div v-if="loaded" class="report-result-actions">
          <v-btn
            v-if="!failed"
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
            @click="fetchPayment"
            >Reload</v-btn
          >
          <v-btn
            v-if="report.ratings.length"
            size="small"
            color="primary"
            prepend-icon="mdi-google-drive"
            @click="upload"
            >{{ url ? 'View export' : 'Export to Drive' }}</v-btn
          >
        </div>
      </header>
      <v-card-text v-if="busy" role="status"
        ><v-skeleton-loader
          type="table-heading, table-row-divider, table-row-divider"
      /></v-card-text>
      <v-card-text v-else-if="!report.ratings.length" class="text-center">
        <v-icon icon="mdi-clipboard-text-outline" size="28" />
        <h3>
          {{
            !loaded
              ? 'Generate a payment report'
              : failed
                ? 'Report unavailable'
                : 'No results for this period'
          }}
        </h3>
        <p>
          {{
            !loaded
              ? 'Select a scorer and dates, then apply the filters.'
              : failed
                ? 'Reload the report to try again.'
                : 'Try a different scorer or date range.'
          }}
        </p>
      </v-card-text>
      <template v-else>
        <dl class="payment-metrics">
          <div v-for="metric in summary" :key="metric.label">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metric.value }}</dd>
          </div>
        </dl>
        <div class="report-table-panel">
          <h3>Payment by client</h3>
          <v-data-table
            :headers="paymentHeaders"
            :items="calculated.rows"
            items-per-page="-1"
            hide-default-footer
            class="payment-table"
          >
            <template #[callDurationSlot]="{ item }">{{
              displayDuration(item.total_call_duration)
            }}</template>
            <template #[ratingDurationSlot]="{ item }">{{
              displayDuration(item.total_rating_time)
            }}</template>
          </v-data-table>
        </div>
      </template>
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
