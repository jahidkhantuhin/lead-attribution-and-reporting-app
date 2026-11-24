<template>
  <v-row dense class="workspace-dashboard">
    <v-col v-if="!nonAccountManagerUserRole" cols="12">
      <section class="workspace-overview" aria-label="Lead activity summary">
        <div class="workspace-overview-heading">
          <h2>Lead activity</h2>
          <p>{{ reportPeriod }}</p>
        </div>
        <dl class="workspace-metrics" :aria-busy="reportsLoading">
          <div
            v-for="metric in leadMetrics"
            :key="metric.label"
            class="workspace-metric"
          >
            <dt>{{ metric.label }}</dt>
            <dd>{{ reportsLoading ? '—' : metric.value }}</dd>
          </div>
        </dl>
      </section>
    </v-col>
    <v-col v-if="!nonAccountManagerUserRole" cols="12" md="12">
      <v-card flat class="workspace-chart-card" :loading="reportsLoading">
        <v-card-title class="workspace-chart-heading">
          <span>Lead trends</span>
          <div class="workspace-period-controls">
            <v-btn
              v-for="period in periods"
              :key="period.value"
              small
              depressed
              :outlined="currentReport !== period.value"
              :color="currentReport === period.value ? 'primary' : undefined"
              :aria-pressed="currentReport === period.value ? 'true' : 'false'"
              :disabled="reportsLoading"
              @click="setFilters(period.value)"
            >
              {{ period.label }}
            </v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <WorkspaceChart
            label="Lead trends by day"
            type="bar"
            :options="graphOptions"
            :series="graphSeries"
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
import moment from 'moment'
import WorkspaceChart from '~/components/WorkspaceChart.vue'
import ReportsList from '~/components/ReportsList.vue'
import useApi from '~/services/useApi'
import { formatDateRange } from '~/utils/dateFormat'

export default defineComponent({
  components: {
    ReportsList,
    WorkspaceChart,
  },
  middleware: 'isAuthenticated',
  setup() {
    // vuex store
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('create report')
    )
    const router = useRouter()
    const reports = ref([])
    const currentReport = ref('this_week')
    const periods = [
      { label: 'This week', value: 'this_week' },
      { label: 'Last week', value: 'last_week' },
      { label: 'This month', value: 'this_month' },
      { label: 'Last month', value: 'last_month' },
    ]
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
        colors: ['#4F79EB', '#139D87', '#956DDD'],
        plotOptions: { bar: { columnWidth: '62%', borderRadius: 5 } },
        responsive: [
          {
            breakpoint: 600,
            options: {
              xaxis: {
                labels: {
                  formatter: (value: string) =>
                    moment(value, 'YYYY-MM-DD', true).format('D'),
                },
              },
            },
          },
        ],
        xaxis: {
          labels: {
            formatter: (value: string) =>
              moment(value, 'YYYY-MM-DD', true).format('MMM D'),
          },
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
      return range
        ? [range.startLabel, range.endLabel].filter(Boolean).join('–')
        : ''
    })

    const leadMetrics = computed(() =>
      graphSeries.value.map((series) => ({
        label: series.name,
        value: series.data
          .reduce(
            (total: number, count: number) => total + (Number(count) || 0),
            0
          )
          .toLocaleString('en-US'),
      }))
    )

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
      if (nonAccountManagerUserRole.value) router.push('/vpn-setup')
    })

    onMounted(() => {
      if (!nonAccountManagerUserRole.value) fetchLeadSummary()
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
      periods,
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
