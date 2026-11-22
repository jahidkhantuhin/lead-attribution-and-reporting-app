<template>
  <section class="site-detail" aria-label="Selected site">
    <div class="site-detail-heading">
      <div>
        <h2>{{ site.clientName || details.name || site.siteURL }}</h2>
        <p>{{ site.siteURL }}</p>
      </div>
      <workspace-badge :value="site.status" />
    </div>
    <dl class="site-score-grid">
      <div><dt>Mobile score</dt><dd>{{ formatScore(site.avg_mobile_score) }}</dd></div>
      <div><dt>Desktop score</dt><dd>{{ formatScore(site.avg_desktop_score) }}</dd></div>
    </dl>
    <h3>Performance trend</h3>
    <apexchart v-if="trend.length" type="line" height="190" :options="chartOptions" :series="series" />
    <p v-else class="site-detail-muted">{{ loading ? 'Loading performance…' : 'No performance data for this period.' }}</p>
    <h3>Updates</h3>
    <ul v-if="updates.length" class="site-updates">
      <li v-for="update in updates" :key="update.key"><span>{{ update.name }}</span><workspace-badge value="update_available" /></li>
    </ul>
    <p v-else class="site-detail-muted">{{ loading ? 'Checking updates…' : detailFailed ? 'Update information is unavailable.' : 'No plugin or theme updates listed.' }}</p>
    <v-btn text color="primary" :to="'/site-records/' + site.id">Open full site record</v-btn>
  </section>
</template>

<script>
import { computed, defineComponent, ref, watch } from '@nuxtjs/composition-api'
import VueApexCharts from 'vue-apexcharts'
import useApi from '~/services/useApi'
import useSiteRecords from '~/services/useSiteRecords'
import { readDisplayDate } from '~/utils/dateFormat'

export function formatScore(value) {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—'
  return Math.round(Number(value))
}

export default defineComponent({
  components: { apexchart: VueApexCharts },
  props: { site: { type: Object, required: true }, start: String, end: String },
  setup(props, { root }) {
    const { siteById } = useSiteRecords()
    const { get } = useApi()
    const details = ref({})
    const trend = ref([])
    const loading = ref(false)
    const detailFailed = ref(false)
    let requestId = 0

    watch(() => [props.site.id, props.start, props.end], async ([id, start, end]) => {
      const request = ++requestId
      loading.value = true
      detailFailed.value = false
      trend.value = []
      const [detail, graph] = await Promise.allSettled([
        siteById(id),
        get('/sites/' + id + '/graph', { date_start: start, date_end: end }),
      ])
      if (request !== requestId) return
      details.value = detail.status === 'fulfilled' ? detail.value.data.data || {} : {}
      detailFailed.value = detail.status === 'rejected'
      const rows = graph.status === 'fulfilled' ? graph.value.data.data : []
      trend.value = Array.isArray(rows) ? rows : []
      loading.value = false
    }, { immediate: true })

    const updates = computed(() => ['plugins', 'themes'].flatMap(type => {
      const items = details.value[type]
      return Array.isArray(items) ? items.filter(item => Number(item.is_update_available) === 1)
        .map(item => ({ key: type + ':' + item.name, name: item.name })) : []
    }))
    const chartOptions = computed(() => ({
      chart: { toolbar: { show: false }, animations: { enabled: false } },
      theme: { mode: root.$vuetify.theme.dark ? 'dark' : 'light' },
      colors: ['#008c7d', '#4164dc'],
      stroke: { width: 2 },
      xaxis: { categories: trend.value.map(row => readDisplayDate(row.date)?.date.format('MMM D') || row.date), tickAmount: 4 },
      legend: { position: 'top' },
    }))
    const series = computed(() => [
      { name: 'Mobile', data: trend.value.map(row => row.summary?.mobile_score ?? null) },
      { name: 'Desktop', data: trend.value.map(row => row.summary?.desktop_score ?? null) },
    ])

    return { chartOptions, detailFailed, details, formatScore, loading, series, trend, updates }
  },
})
</script>

<style scoped>
.site-detail {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
}
.site-detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.site-detail-heading h2 {
  font-size: 1.25rem;
  overflow-wrap: anywhere;
}
.site-detail-heading p,
.site-detail-muted {
  color: var(--workspace-muted);
  overflow-wrap: anywhere;
}
.site-score-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.site-score-grid div {
  padding: 10px 12px;
  border: 1px solid var(--workspace-border);
  border-radius: 8px;
  background: var(--workspace-subtle);
}
.site-score-grid dt {
  color: var(--workspace-muted);
  font-size: .875rem;
}
.site-score-grid dd {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 720;
}
.site-updates {
  padding: 0 !important;
  list-style: none;
}
.site-updates li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--workspace-border);
}
</style>
