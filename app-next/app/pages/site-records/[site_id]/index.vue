<script setup lang="ts">
import moment from 'moment'
import type { ApexOptions } from 'apexcharts'
import { pageNames } from '~/constants'
import { getReportRange, type ReportPeriod } from '~/services/report-period'
import {
  siteStatus,
  type SiteDay,
  type SiteRecord,
} from '~/services/site-records'

definePageMeta({ middleware: 'is-authenticated' })
const title = 'Website Details'
useHead({ title })
const shell = useWorkspaceStore()
const route = useRoute()
const { $services } = useNuxtApp()
const site = ref<SiteRecord>()
const days = ref<SiteDay[]>([])
const busy = ref(true)
const failed = ref(false)
const loadingGraph = ref(false)
const panel = ref('hosting')
const id = computed(() => String(route.params.site_id))
const current = ref<ReportPeriod | 'last_six_month' | 'last_year'>('this_week')
const periods = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_six_month', label: 'Last 6 months' },
  { value: 'last_year', label: 'Last year' },
] as const
const client = computed(() => {
  const record = site.value?.location?.client
  return typeof record === 'object' ? record : undefined
})
const fields = computed(() => [
  {
    label: 'Client',
    value: client.value?.name,
    to:
      client.value?.id && site.value?.location?.id
        ? `/client-records/${client.value.id}/locations/${site.value.location.id}`
        : undefined,
  },
  {
    label: 'Client status',
    value: client.value?.status ? siteStatus(client.value.status) : undefined,
  },
  { label: 'Client email', value: client.value?.email },
  { label: 'WordPress version', value: site.value?.wp_version },
  { label: 'IP address', value: site.value?.site_ip },
])
const hosting = computed(() =>
  (site.value?.site_information ?? [])
    .flatMap((item) => [
      {
        label: 'Site URL',
        value: item.url === site.value?.url ? '' : item.url,
      },
      { label: 'Staging URL', value: item.staging_url },
      { label: 'Registrar', value: item.registrar },
      {
        label: 'Hosting provider',
        value: item.is_cloudways_hosted === 1 ? 'Cloudways' : '',
      },
      { label: 'SSL', value: item.has_ssl },
      { label: 'Created', value: item.created },
      { label: 'Expires', value: item.expires },
    ])
    .filter((field) => field.value),
)
const plugins = computed(() =>
  Array.isArray(site.value?.plugins) ? site.value.plugins : [],
)
const options = computed<ApexOptions>(() => ({
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
  grid: { strokeDashArray: 4 },
  xaxis: {
    categories: days.value.map(({ date }) => date),
    labels: {
      formatter: (value) =>
        moment(String(value), 'YYYY-MM-DD', true).isValid()
          ? moment(String(value)).format('MMM D')
          : String(value),
    },
  },
}))
const metrics = [
  ['Mobile Score', 'mobile_score'],
  ['Desktop Score', 'desktop_score'],
  ['Mobile Speed', 'mobile_speed_index'],
  ['Desktop Speed', 'desktop_speed_index'],
  ['Server Response Time', 'server_response_time'],
  ['Desktop 1st Contentful Paint', 'desktop_first_contentful_paint'],
  ['Mobile 1st Contentful Paint', 'mobile_first_contentful_paint'],
] as const
const series = computed(() =>
  metrics.map(([name, key]) => ({
    name,
    data: days.value.map(({ summary }) =>
      Number(Number(summary[key] || 0).toFixed(2)),
    ),
  })),
)

let graphRequest = 0
async function setPeriod(value: typeof current.value) {
  current.value = value
  const request = ++graphRequest
  const dates =
    value === 'last_six_month'
      ? {
          date_start: moment()
            .subtract(6, 'months')
            .startOf('month')
            .format('YYYY-MM-DD'),
          date_end: moment().endOf('month').format('YYYY-MM-DD'),
        }
      : value === 'last_year'
        ? {
            date_start: moment()
              .subtract(1, 'year')
              .startOf('year')
              .format('YYYY-MM-DD'),
            date_end: moment()
              .subtract(1, 'year')
              .endOf('year')
              .format('YYYY-MM-DD'),
          }
        : getReportRange(value)
  loadingGraph.value = true
  try {
    const { data } = await $services.sites.graph(id.value, { ...dates })
    if (request === graphRequest) days.value = data.data
  } catch {
    if (request === graphRequest) days.value = []
  } finally {
    if (request === graphRequest) loadingGraph.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await $services.sites.byId(id.value)
    site.value = data.data
    shell.setPageHeading({
      pageTitle: title,
      breadcrumbs: [
        { text: 'Dashboard', to: '/' },
        { text: pageNames.sites, to: '/site-records' },
        {
          text: 'Details of ' + (site.value.url || site.value.name || ''),
          to: '',
          disabled: true,
        },
      ],
    })
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
  if (site.value) await setPeriod(current.value)
})
</script>

<template>
  <div class="workspace-report-stack">
    <v-card v-if="busy"
      ><v-card-text
        ><v-skeleton-loader
          type="table-heading, table-row-divider" /></v-card-text
    ></v-card>
    <v-alert
      v-else-if="failed"
      type="error"
      text="Website details are unavailable."
    />
    <template v-else-if="site">
      <v-card flat>
        <header class="report-result-heading">
          <div>
            <h2>{{ site.name || 'Website details' }}</h2>
            <p>{{ site.url }}</p>
          </div>
          <v-btn to="/site-records" variant="outlined" size="small"
            >All websites</v-btn
          >
        </header>
      </v-card>
      <v-expansion-panels v-model="panel" variant="accordion">
        <v-expansion-panel value="hosting" title="Website and hosting">
          <v-expansion-panel-text>
            <dl class="site-facts">
              <div
                v-for="field in fields.filter((item) => item.value)"
                :key="field.label"
              >
                <dt>{{ field.label }}</dt>
                <dd>
                  <NuxtLink v-if="field.to" :to="field.to">{{
                    field.value
                  }}</NuxtLink><span v-else>{{ field.value }}</span>
                </dd>
              </div>
              <div v-for="(field, index) in hosting" :key="field.label + index">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
            <v-table v-if="site.themes?.length" density="compact">
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>Version and status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="theme in site.themes" :key="theme.id">
                  <td>{{ theme.name }}</td>
                  <td>
                    {{ theme.version }} · {{ siteStatus(theme.status) }} ·
                    {{
                      Number(theme.is_update_available) === 1
                        ? 'Update available'
                        : 'Up to date'
                    }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel value="plugins" title="Plugins">
          <v-expansion-panel-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Plugin</th>
                  <th>Version</th>
                  <th>Update</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="plugin in plugins" :key="plugin.id">
                  <td>{{ plugin.name }}</td>
                  <td>{{ plugin.version }}</td>
                  <td>
                    {{
                      Number(plugin.is_update_available) === 1
                        ? 'Update available'
                        : 'Up to date'
                    }}
                  </td>
                  <td>{{ siteStatus(plugin.status) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel value="performance" title="Speed scores">
          <v-expansion-panel-text>
            <div class="workspace-period-controls">
              <v-btn
                v-for="period in periods"
                :key="period.value"
                size="small"
                :variant="current === period.value ? 'flat' : 'outlined'"
                :color="current === period.value ? 'primary' : undefined"
                :disabled="loadingGraph"
                @click="setPeriod(period.value)"
                >{{ period.label }}</v-btn
              >
            </div>
            <WorkspaceChart
              label="Website speed scores"
              type="bar"
              :options="options"
              :series="series"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </div>
</template>

<style scoped>
.site-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
  padding-bottom: 16px;
}
.site-facts > div {
  display: grid;
  grid-template-columns: minmax(100px, 2fr) minmax(0, 3fr);
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--workspace-border);
}
.site-facts dt {
  color: var(--workspace-muted);
  font-weight: 600;
}
.site-facts dd {
  overflow-wrap: anywhere;
}
@media (max-width: 700px) {
  .site-facts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
