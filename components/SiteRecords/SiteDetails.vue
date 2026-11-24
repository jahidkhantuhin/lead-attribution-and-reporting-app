<template>
  <div class="workspace-record-stack">
    <div v-if="loading" role="status" aria-label="Loading details">
      <v-expand-transition>
        <v-card>
          <v-card-text>
            <v-skeleton-loader
              type="table-heading, table-row-divider, table-row-divider"
            ></v-skeleton-loader>
          </v-card-text>
        </v-card>
      </v-expand-transition>
    </div>
    <div v-else class="workspace-record-content">
      <v-card flat>
        <ReportResultHeading :title="siteData.name || 'Website details'">
          <p v-if="siteData.url">{{ siteData.url }}</p>
          <template #actions>
            <v-btn small outlined to="/site-records">All websites</v-btn>
          </template>
        </ReportResultHeading>
      </v-card>
      <v-expansion-panels v-model="panel" class="workspace-detail-panels">
        <v-expansion-panel :key="0">
          <v-expansion-panel-header>
            <h2>Website and hosting</h2>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <RecordFacts :fields="websiteFields" class="website-facts">
              <template #badge="{ field }">
                <workspace-badge :value="field.value" />
              </template>
              <template #client="{ field }">
                <nuxt-link v-if="clientLocationPath" :to="clientLocationPath">
                  {{ field.value }}
                </nuxt-link>
                <span v-else>{{ field.value }}</span>
              </template>
            </RecordFacts>
            <RecordFacts
              v-for="(fields, index) in hostingFields"
              :key="index"
              :fields="fields"
              class="website-facts"
            >
              <template #date="{ field }">
                <formatted-date :date="field.value" />
              </template>
            </RecordFacts>
            <v-simple-table
              v-if="siteData.themes && siteData.themes.length"
              dense
              class="workspace-detail-table"
            >
              <template #default>
                <tbody>
                  <tr>
                    <th scope="col">Theme</th>
                    <th scope="col">Version and status</th>
                  </tr>
                  <tr v-for="item in siteData.themes" :key="item.name">
                    <td>{{ item.name }}</td>
                    <td>
                      <div class="workspace-table-values">
                        <span>{{ item.version }}</span>
                        <workspace-badge :value="item.status" />
                        <workspace-badge
                          :value="
                            item.is_update_available === 1
                              ? 'update_available'
                              : 'up_to_date'
                          "
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel :key="1">
          <v-expansion-panel-header>
            <h2>Plugins</h2>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-simple-table class="workspace-detail-table">
              <template #default>
                <tbody>
                  <tr>
                    <th scope="col">Plugin</th>
                    <th scope="col">Version</th>
                    <th scope="col">Update</th>
                    <th scope="col">Status</th>
                  </tr>
                </tbody>
                <tbody v-for="(item, index) in siteData.plugins" :key="index">
                  <tr>
                    <td>{{ item.name }}</td>
                    <td>{{ item.version }}</td>
                    <td>
                      <workspace-badge
                        :value="
                          item.is_update_available === 1
                            ? 'update_available'
                            : 'up_to_date'
                        "
                      />
                    </td>
                    <td><workspace-badge :value="item.status" /></td>
                  </tr>
                </tbody>
              </template>
            </v-simple-table>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel :key="2">
          <v-expansion-panel-header>
            <h2>Speed scores</h2>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <div
              class="workspace-detail-chart"
              :aria-busy="reportsLoading ? 'true' : 'false'"
            >
              <div class="workspace-period-controls">
                <v-btn
                  v-for="period in periods"
                  :key="period.value"
                  small
                  depressed
                  :outlined="currentReport !== period.value"
                  :color="
                    currentReport === period.value ? 'primary' : undefined
                  "
                  :aria-pressed="
                    currentReport === period.value ? 'true' : 'false'
                  "
                  :disabled="reportsLoading"
                  @click="setFilters(period.value)"
                >
                  {{ period.label }}
                </v-btn>
              </div>
              <WorkspaceChart
                label="Website speed scores"
                type="bar"
                :options="graphOptions"
                :series="graphSeries"
              />
            </div>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  onMounted,
  computed,
} from '@nuxtjs/composition-api'
import moment from 'moment'
import WorkspaceChart from '~/components/WorkspaceChart.vue'
import FormattedDate from '~/components/FormattedDate.vue'
import RecordFacts from '~/components/RecordFacts.vue'
import useApi from '~/services/useApi'

export default defineComponent({
  components: {
    FormattedDate,
    RecordFacts,
    WorkspaceChart,
  },
  props: {
    siteData: {
      type: Object,
      default: () => ({}),
    },
    siteID: {
      type: String,
      default: '',
    },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    const panel = ref(0)
    const clientLocationPath = computed(() => {
      const location = props.siteData.location
      return location?.client?.id && location.id
        ? `/client-records/${location.client.id}/locations/${location.id}`
        : ''
    })
    const websiteFields = computed(() => {
      const site = props.siteData
      const client = site.location?.client
      return [
        { label: 'Client', value: client?.name, kind: 'client' },
        { label: 'Client status', value: client?.status, kind: 'badge' },
        { label: 'Client email', value: client?.email },
        { label: 'WordPress version', value: site.wp_version },
        { label: 'IP address', value: site.site_ip },
      ]
    })
    const hostingFields = computed(() =>
      (props.siteData.site_information || []).map((item: any) => [
        {
          label: 'Site URL',
          value: item.url === props.siteData.url ? '' : item.url,
        },
        { label: 'Staging URL', value: item.staging_url },
        { label: 'Registrar', value: item.registrar },
        {
          label: 'Hosting provider',
          value: item.is_cloudways_hosted === 1 ? 'Cloudways' : '',
        },
        { label: 'SSL', value: item.has_ssl },
        { label: 'Created', value: item.created, kind: 'date' },
        { label: 'Expires', value: item.expires, kind: 'date' },
      ])
    )

    const reports = ref([])
    const currentReport = ref('this_week')
    const periods = [
      { value: 'this_week', label: 'This week' },
      { value: 'last_week', label: 'Last week' },
      { value: 'this_month', label: 'This month' },
      { value: 'last_month', label: 'Last month' },
      { value: 'last_six_month', label: 'Last 6 months' },
      { value: 'last_year', label: 'Last year' },
    ]
    const reportsFilters = ref({
      date_start: moment().startOf('isoWeek').format('YYYY-MM-DD'),
      date_end: moment().endOf('isoWeek').format('YYYY-MM-DD'),
    })
    const reportsLoading = ref(true)
    const { get } = useApi()

    const fetchLeadSummary = () => {
      reportsLoading.value = true
      get(`/sites/${props.siteID}/graph`, reportsFilters.value)
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
        colors: [
          '#3263DE',
          '#098779',
          '#7458C7',
          '#C05C30',
          '#2679A4',
          '#A34473',
          '#53652A',
        ],
        plotOptions: { bar: { columnWidth: '66%', borderRadius: 3 } },
        legend: { position: 'top', horizontalAlign: 'left' },
        grid: { strokeDashArray: 4 },
        dataLabels: {
          enabled: false,
        },
        chart: {
          id: 'vuechart-leadsummary',
          toolbar: {
            show: false,
          },
        },
        xaxis: {
          labels: {
            formatter: (value: string) =>
              moment(value, 'YYYY-MM-DD', true).isValid()
                ? moment(value, 'YYYY-MM-DD', true).format('MMM D')
                : value,
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
          name: 'Mobile Score',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.mobile_score).toFixed(2)
            }),
        },
        {
          name: 'Desktop Score',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.desktop_score).toFixed(2)
            }),
        },
        {
          name: 'Mobile Speed',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.mobile_speed_index).toFixed(2)
            }),
        },
        {
          name: 'Desktop Speed',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.desktop_speed_index).toFixed(2)
            }),
        },
        {
          name: 'Server Response Time',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.server_response_time).toFixed(2)
            }),
        },
        {
          name: 'Desktop 1st Contentful Paint',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.desktop_first_contentful_paint).toFixed(2)
            }),
        },
        {
          name: 'Mobile 1st Contentful Paint',
          data:
            reports.value &&
            reports.value.map((c: any) => {
              return Number(c.summary.mobile_first_contentful_paint).toFixed(2)
            }),
        },
      ]
    })

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
      } else if (val === 'last_six_month') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment()
            .subtract(6, 'months')
            .startOf('month')
            .format('YYYY-MM-DD'),
          date_end: moment()
            .subtract('months')
            .endOf('month')
            .format('YYYY-MM-DD'),
        }
      } else if (val === 'last_year') {
        reportsFilters.value = {
          ...reportsFilters.value,
          date_start: moment()
            .subtract(1, 'year')
            .startOf('year')
            .format('YYYY-MM-DD'),
          date_end: moment()
            .subtract(1, 'year')
            .endOf('year')
            .format('YYYY-MM-DD'),
        }
      }
      currentReport.value = val
      fetchLeadSummary()
    }

    onMounted(() => {
      fetchLeadSummary()
    })

    return {
      panel,
      websiteFields,
      hostingFields,
      clientLocationPath,
      // userFullName,
      graphOptions,
      graphSeries,
      reportsLoading,
      currentReport,
      periods,
      moment,
      setFilters,
    }
  },
})
</script>
