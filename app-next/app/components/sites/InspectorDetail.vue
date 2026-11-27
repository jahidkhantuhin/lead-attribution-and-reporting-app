<script setup lang="ts">
import moment from 'moment'
import type { ApexOptions } from 'apexcharts'
import {
  scoreLabel,
  type siteListRow,
  siteStatus,
  type SiteDay,
  type SiteRecord,
} from '~/services/site-records'
import type { DateRange } from '~/types/api'

const props = defineProps<{
  site: ReturnType<typeof siteListRow>
  dates: DateRange
}>()
const { $services } = useNuxtApp()
const details = ref<SiteRecord>()
const rows = ref<SiteDay[]>([])
const loading = ref(false)
const failed = ref(false)
let request = 0

watch(
  () => [props.site.id, props.dates.date_start, props.dates.date_end],
  async () => {
    const current = ++request
    loading.value = true
    rows.value = []
    details.value = undefined
    const [detail, trend] = await Promise.allSettled([
      $services.sites.byId(props.site.id),
      $services.sites.graph(props.site.id, { ...props.dates }),
    ])
    if (request !== current) return
    if (detail.status === 'fulfilled') details.value = detail.value.data.data
    if (trend.status === 'fulfilled') rows.value = trend.value.data.data
    failed.value = detail.status === 'rejected'
    loading.value = false
  },
  { immediate: true },
)

const updates = computed(() =>
  [
    ...(Array.isArray(details.value?.plugins) ? details.value.plugins : []),
    ...(details.value?.themes ?? []),
  ].filter((item) => Number(item.is_update_available) === 1),
)
const options = computed<ApexOptions>(() => ({
  colors: ['#008c7d', '#4164dc'],
  stroke: { width: 2 },
  xaxis: {
    categories: rows.value.map(({ date }) =>
      moment(date, 'YYYY-MM-DD', true).format('MMM D'),
    ),
    tickAmount: 4,
  },
}))
const series = computed(() => [
  {
    name: 'Mobile',
    data: rows.value.map(({ summary }) => summary.mobile_score ?? null),
  },
  {
    name: 'Desktop',
    data: rows.value.map(({ summary }) => summary.desktop_score ?? null),
  },
])
</script>

<template>
  <section class="site-inspector-detail" aria-label="Selected site">
    <header class="report-result-heading">
      <div>
        <h2>{{ site.clientName || details?.name || site.siteURL }}</h2>
        <p>{{ site.siteURL }}</p>
      </div>
      <v-chip size="small">{{ siteStatus(site.status) }}</v-chip>
    </header>
    <dl class="payment-metrics">
      <div>
        <dt>Mobile score</dt>
        <dd>{{ scoreLabel(site.avg_mobile_score) }}</dd>
      </div>
      <div>
        <dt>Desktop score</dt>
        <dd>{{ scoreLabel(site.avg_desktop_score) }}</dd>
      </div>
    </dl>
    <div class="report-table-panel">
      <h3>Performance trend</h3>
      <WorkspaceChart
        v-if="rows.length"
        label="Mobile and desktop score trend"
        type="line"
        :height="190"
        :options="options"
        :series="series"
      />
      <p v-else>
        {{
          loading
            ? 'Loading performance…'
            : 'No performance data for this period.'
        }}
      </p>
      <h3>Updates</h3>
      <v-list v-if="updates.length" density="compact">
        <v-list-item
          v-for="item in updates"
          :key="item.name"
          :title="item.name"
          subtitle="Update available"
        />
      </v-list>
      <p v-else>
        {{
          loading
            ? 'Checking updates…'
            : failed
              ? 'Update information is unavailable.'
              : 'No plugin or theme updates listed.'
        }}
      </p>
      <v-btn variant="text" color="primary" :to="'/site-records/' + site.id"
        >Open full site record</v-btn
      >
    </div>
  </section>
</template>
