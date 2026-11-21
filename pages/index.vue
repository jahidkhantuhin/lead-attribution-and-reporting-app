<template>
  <v-row class="workspace-dashboard">
    <v-col v-if="!nonAccountManagerUserRole" cols="12">
      <section class="workspace-overview" aria-label="Lead activity summary">
        <div class="workspace-overview-heading"><h2>Lead activity</h2><p>{{ reportPeriod }}</p></div>
        <dl class="workspace-metrics" :aria-busy="reportsLoading">
          <div v-for="metric in leadMetrics" :key="metric.label" class="workspace-metric">
            <dt>{{ metric.label }}</dt>
            <dd>{{ reportsLoading ? '—' : metric.value }}</dd>
          </div>
        </dl>
      </section>
    </v-col>
    <v-col cols="12" md="12" v-if="!nonAccountManagerUserRole">
      <v-card :loading="reportsLoading">
        <v-card-title class="workspace-chart-heading">
          <span>Lead trends</span>
          <div class="workspace-period-controls">
          <v-btn
            x-small
            class="mr-3"
            elevation="1"
            :color="currentReport == 'this_week' ? 'primary' : 'normal'"
            :disabled="reportsLoading"
            @click="setFilters('this_week')"
            >This Week</v-btn
          >
          <v-btn
            x-small
            class="mr-3"
            elevation="1"
            :color="currentReport == 'last_week' ? 'primary' : 'normal'"
            :disabled="reportsLoading"
            @click="setFilters('last_week')"
            >Last Week</v-btn
          >
          <v-btn
            x-small
            class="mr-3"
            elevation="1"
            :color="currentReport == 'last_month' ? 'primary' : 'normal'"
            :disabled="reportsLoading"
            @click="setFilters('last_month')"
            >Last Month</v-btn
          >
          <v-btn
            x-small
            class="mr-0"
            elevation="1"
            :color="currentReport == 'this_month' ? 'primary' : 'normal'"
            :disabled="reportsLoading"
            @click="setFilters('this_month')"
            >This Month</v-btn
          >
          </div>
        </v-card-title>
        <v-card-text>
          <!-- Graph -->
          <apexchart
            width="100%"
            height="300"
            type="bar"
            :options="graphOptions"
            :series="graphSeries"
          ></apexchart>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col sm="12" class="my-5">
      <h2 class="workspace-section-title">Browse reports</h2>
      <ReportsList justify="start" />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  onMounted,
  ref,
  useContext,
  useStore,
  useRouter,
  onBeforeMount,
} from '@nuxtjs/composition-api'
import { IBreadcrumbs } from '@/store'
import VueApexCharts from 'vue-apexcharts'
import ReportsList from '~/components/ReportsList.vue'
import useApi from '~/services/useApi'
import moment from 'moment'
import { formatDateRange } from '~/utils/dateFormat'

export default defineComponent({
  components: {
    ReportsList,
    apexchart: VueApexCharts,
  },
  middleware: 'isAuthenticated',
  setup() {
    // vuex store
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(() =>
      !$auth.hasScope('create report')
    )
    const router = useRouter()
    const reports = ref([])
    const currentReport = ref('this_week')
    const reportsFilters = ref({
      date_start: moment().startOf('isoWeek').format('YYYY-MM-DD'),
      date_end: moment().endOf('isoWeek').format('YYYY-MM-DD'),
      graph: 'true',
    })
    const reportsLoading = ref(true)
    const store = useStore()
    const { get } = useApi()

    // set the page breadcrumbs
    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: `Dashboard`,
        to: `/`,
        disabled: true,
      },
      {
        text: `Home`,
        to: `/`,
        disabled: true,
      },
    ]

    const pageTitle = `Dashboard`

    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    const userFullName = computed(() => $auth.user?.fullname)

    const fetchLeadSummary = () => {
      reportsLoading.value = true
      get('/leads', reportsFilters.value)
        .then((res) => {
          reports.value = res.data.data
          reportsLoading.value = false
        })
        .finally(() => {
          reportsLoading.value = false
        })
    }

    // graph data
    const graphOptions = computed(() => {
      return {
        colors: ['#3E6BE8', '#11A597', '#876BDB'],
        plotOptions: { bar: { columnWidth: '58%', borderRadius: 4 } },
        legend: { position: 'top', horizontalAlign: 'left' },
        dataLabels: {
          enabled: false,
        },
        chart: {
          id: 'vuechart-leadsummary',
          animations: { enabled: false },
          toolbar: {
            show: false,
          },
        },
        grid: { strokeDashArray: 4 },
        responsive: [{
          breakpoint: 600,
          options: { xaxis: { labels: { formatter: (value: string) => moment(value, 'YYYY-MM-DD', true).format('D') } } },
        }],
        xaxis: {
          labels: { formatter: (value: string) => moment(value, 'YYYY-MM-DD', true).format('MMM D') },
          categories:
            reports &&
            reports.value.map((c: any) => {
              return c.date
            }),
        },
      }
    })

    const graphSeries = computed(() => {
      return [
        {
          name: 'Calls',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return c.summary.calls
            }),
        },
        {
          name: 'Chats',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return c.summary.chats
            }),
        },
        {
          name: 'Web Forms',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return c.summary.emails
            }),
        },
      ]
    })

    const reportPeriod = computed(() => {
      const { date_start, date_end } = reportsFilters.value
      const range = formatDateRange(date_start, date_end)
      return range ? [range.startLabel, range.endLabel].filter(Boolean).join('–') : ''
    })

    const leadMetrics = computed(() => graphSeries.value.map(series => ({
      label: series.name,
      value: series.data.reduce((total: number, count: number) => total + (Number(count) || 0), 0).toLocaleString('en-US'),
    })))

    const setFilters = (val: string) => {
      if (val === 'this_week') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment().startOf('isoWeek').format('YYYY-MM-DD'),
          date_end: moment().endOf('isoWeek').format('YYYY-MM-DD'),
        }
      } else if (val === 'last_week') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment()
            .subtract(1, 'weeks')
            .startOf('isoWeek')
            .format('YYYY-MM-DD'),
          date_end: moment()
            .subtract(1, 'weeks')
            .endOf('isoWeek')
            .format('YYYY-MM-DD'),
        }
      } else if (val === 'this_month') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment().startOf('month').format('YYYY-MM-DD'),
          date_end: moment().endOf('month').format('YYYY-MM-DD'),
        }
      } else if (val === 'last_month') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment()
            .subtract(1, 'months')
            .startOf('month')
            .format('YYYY-MM-DD'),
          date_end: moment()
            .subtract(1, 'months')
            .endOf('month')
            .format('YYYY-MM-DD'),
        }
      }
      currentReport.value = val
      fetchLeadSummary()
    }

    onBeforeMount(() => {
      nonAccountManagerUserRole.value ? router.push('/vpn-setup') : ''
    })

    onMounted(() => {
      !nonAccountManagerUserRole.value ? fetchLeadSummary() : ''
      // nonAccountManagerUserRole.value ? router.push('/vpn-setup') : ''
    })
    

    return {
      userFullName,
      graphOptions,
      graphSeries,
      reportPeriod,
      leadMetrics,
      reportsLoading,
      currentReport,
      moment,
      setFilters,
      nonAccountManagerUserRole,
    }
  },
  head: {
    title: 'Dashboard',
  },
})
</script>
