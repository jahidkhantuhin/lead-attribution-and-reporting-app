<script setup lang="ts">
import { pageNames } from '~/constants'
import { dayRange, filterId } from '~/services/report-filters'
import { formatReportRange, getReportRange } from '~/services/report-period'
import {
  buildSiteWorkbook,
  scoreLabel,
  siteColumns,
  siteListRow,
  siteStatus,
} from '~/services/site-records'
import type { Pagination, RecordSummary } from '~/types/api'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.sites
useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: title, to: '', disabled: true },
  ],
})
const { $services } = useNuxtApp()
const session = useSessionStore()
const {
  open,
  loading: exporting,
  url,
  notice,
  copy,
  exportReport,
} = useReportExport()
const route = useRoute()
const router = useRouter()
const showFilters = ref(false)
const tableView = ref(false)
const limit = ref(20)
const page = ref(1)
const pagination = ref<Pagination>({ current_page: 1, per_page: 20, total: 0 })
const allowed = computed(() => session.isAllowed('create report'))
const busy = ref(false)
const failed = ref(false)
const sites = ref<ReturnType<typeof siteListRow>[]>([])
const plugins = ref<RecordSummary[]>([])
const themes = ref<RecordSummary[]>([])
const activeId = ref<string>()
const active = computed(() =>
  sites.value.find((site) => String(site.id) === activeId.value),
)
const defaultDates = () => Object.values(getReportRange('last_month'))
const filters = reactive({
  name: '',
  status: null as string | null,
  date: defaultDates(),
  plugin: null as number | null,
  theme: null as number | null,
  speed_score: [0, 100],
})
const applied = ref({ ...filters })
const appliedDates = computed(() => ({
  date_start: applied.value.date[0] || '',
  date_end: applied.value.date[1] || '',
}))
const pageCount = computed(() =>
  Math.max(1, Math.ceil(pagination.value.total / limit.value)),
)
const sorts = ref<Array<{ key: string; order?: boolean | 'asc' | 'desc' }>>([])
const statusSlot = 'item.status'
const siteSlot = 'item.siteURL'
const clientSlot = 'item.clientName'

let sequence = 0
async function loadSites() {
  const request = ++sequence
  busy.value = true
  failed.value = false
  url.value = ''
  applied.value = {
    ...filters,
    date: [...filters.date],
    speed_score: [...filters.speed_score],
  }
  const { name, status, plugin, theme, speed_score } = applied.value
  try {
    const { data } = await $services.sites.list({
      ...appliedDates.value,
      name,
      status,
      plugin,
      theme,
      speed_score_min: speed_score[0],
      speed_score_max: speed_score[1],
      limit: limit.value,
      page: page.value,
    })
    if (request !== sequence) return
    sites.value = data.data.result.map(siteListRow)
    pagination.value = data.data.pagination
    if (!sites.value.some((site) => String(site.id) === activeId.value))
      activeId.value = sites.value[0] ? String(sites.value[0].id) : undefined
  } catch {
    if (request === sequence) {
      failed.value = true
      sites.value = []
    }
  } finally {
    if (request === sequence) busy.value = false
  }
}

async function apply(resetPage = true) {
  if (resetPage) page.value = 1
  await router.replace({
    query: {
      page: page.value,
      itemsPerPage: limit.value,
      date: filters.date.filter(Boolean),
      name: filters.name || undefined,
      status: filters.status ?? undefined,
      plugin: filters.plugin ?? undefined,
      theme: filters.theme ?? undefined,
      speed_score: filters.speed_score,
      sort_by: sorts.value[0]?.key,
      sorting: sorts.value[0]?.order === 'desc' ? 'desc' : undefined,
    },
  })
  await loadSites()
}

async function clear() {
  Object.assign(filters, {
    name: '',
    status: null,
    date: defaultDates(),
    plugin: null,
    theme: null,
    speed_score: [0, 100],
  })
  sorts.value = []
  await apply()
}
async function updatePage(value: number) {
  page.value = value
  await apply(false)
}
async function updateLimit(value: number) {
  limit.value = value
  await apply()
}
async function updateSort(value: typeof sorts.value) {
  sorts.value = value
  await apply(false)
}
const copyCurrent = () => copy(window.location.href)
const upload = () => {
  const user = session.authenticatedUser
  return exportReport(
    buildSiteWorkbook(
      sites.value,
      appliedDates.value,
      [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    ),
  )
}
const chips = computed(() =>
  [
    applied.value.name ? 'Search: ' + applied.value.name : '',
    applied.value.status ? 'Status: ' + siteStatus(applied.value.status) : '',
    applied.value.plugin
      ? 'Plugin: ' +
        (plugins.value.find((item) => Number(item.id) === applied.value.plugin)
          ?.name ?? applied.value.plugin)
      : '',
    applied.value.theme
      ? 'Theme: ' +
        (themes.value.find((item) => Number(item.id) === applied.value.theme)
          ?.name ?? applied.value.theme)
      : '',
    applied.value.speed_score[0] !== 0 || applied.value.speed_score[1] !== 100
      ? 'Score: ' + applied.value.speed_score.join('–')
      : '',
  ].filter(Boolean),
)

onMounted(async () => {
  if (!allowed.value) return
  const q = route.query
  page.value = filterId(q.page) ?? 1
  limit.value = filterId(q.itemsPerPage) ?? 20
  filters.name = typeof q.name === 'string' ? q.name : ''
  filters.status = typeof q.status === 'string' ? q.status : null
  filters.plugin = filterId(q.plugin)
  filters.theme = filterId(q.theme)
  if (dayRange(q.date).length) filters.date = dayRange(q.date)
  if (
    Array.isArray(q.speed_score) &&
    q.speed_score.length === 2 &&
    q.speed_score.every((value) => Number.isFinite(Number(value)))
  )
    filters.speed_score = q.speed_score.map(Number)
  if (typeof q.sort_by === 'string')
    sorts.value = [
      { key: q.sort_by, order: q.sorting === 'desc' ? 'desc' : 'asc' },
    ]
  const [pluginList, themeList] = await Promise.allSettled([
    $services.sites.plugins(),
    $services.sites.themes(),
    loadSites(),
  ])
  if (pluginList.status === 'fulfilled')
    plugins.value = pluginList.value.data.data
  if (themeList.status === 'fulfilled') themes.value = themeList.value.data.data
})
</script>

<template>
  <v-alert
    v-if="!allowed"
    type="warning"
    text="You are not authorized to view website records."
  />
  <div v-else class="workspace-report-stack">
    <v-card flat class="report-filter-card">
      <h2>Find sites</h2>
      <v-form @submit.prevent="apply()">
        <div class="kpi-filters">
          <v-text-field
            v-model="filters.name"
            label="Search sites"
            prepend-inner-icon="mdi-magnify"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-select
            v-model="filters.status"
            label="Status"
            :items="[
              { title: 'Active', value: 'active' },
              { title: 'Inactive', value: 'inactive' },
            ]"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
          <ReportsDateRange
            v-model="filters.date"
            :presets="[
              'Last week',
              'This week',
              'This month',
              'Last month',
              'This year',
              'Last year',
            ]"
          />
          <div class="report-result-actions">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-filter-variant"
              :aria-expanded="showFilters"
              @click="showFilters = !showFilters"
              >Filters</v-btn
            >
            <v-btn type="submit" color="primary" :loading="busy">Apply</v-btn>
          </div>
        </div>
        <div v-if="showFilters" class="kpi-filters">
          <v-autocomplete
            v-model="filters.plugin"
            :items="plugins"
            item-title="name"
            item-value="id"
            label="Plugin"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-autocomplete
            v-model="filters.theme"
            :items="themes"
            item-title="name"
            item-value="id"
            label="Theme"
            clearable
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-range-slider
            v-model="filters.speed_score"
            label="Mobile speed score"
            :min="0"
            :max="100"
            :step="1"
            thumb-label
            hide-details
          />
        </div>
      </v-form>
      <div
        v-if="chips.length"
        class="report-result-actions mt-3"
        aria-label="Applied filters"
      >
        <v-chip v-for="chip in chips" :key="chip" size="small">{{
          chip
        }}</v-chip>
        <v-btn variant="text" size="small" @click="clear">Clear filters</v-btn>
      </div>
    </v-card>
    <v-card flat :loading="busy">
      <header class="report-result-heading">
        <div>
          <h2>Website Directory</h2>
          <p>
            {{ pagination.total }}
            {{ pagination.total === 1 ? 'site' : 'sites' }}
          </p>
          <p v-if="appliedDates.date_start">
            {{
              formatReportRange(
                appliedDates.date_start,
                appliedDates.date_end || appliedDates.date_start,
              )
            }}
          </p>
        </div>
        <div class="report-result-actions">
          <v-btn
            variant="outlined"
            size="small"
            @click="tableView = !tableView"
            >{{ tableView ? 'View inspector' : 'View table' }}</v-btn
          >
          <v-btn
            variant="outlined"
            size="small"
            prepend-icon="mdi-link"
            @click="copyCurrent"
            >Copy link</v-btn
          >
          <v-btn
            v-if="sites.length"
            color="primary"
            size="small"
            prepend-icon="mdi-google-drive"
            :loading="exporting"
            @click="upload"
            >{{ url ? 'View export' : 'Export to Drive' }}</v-btn
          >
        </div>
      </header>
      <v-card-text v-if="failed">Website records are unavailable.</v-card-text>
      <v-card-text v-else-if="!sites.length && !busy"
        >No sites match these filters.</v-card-text
      >
      <div v-else-if="tableView" class="report-table-panel">
        <v-data-table-server
          :headers="siteColumns"
          :items="sites"
          :items-length="pagination.total"
          :page="page"
          :items-per-page="limit"
          :items-per-page-options="[20, 50, 100, 500]"
          :sort-by="sorts"
          :loading="busy"
          @update:page="updatePage"
          @update:items-per-page="updateLimit"
          @update:sort-by="updateSort"
        >
          <template #[siteSlot]="{ item }"
            ><NuxtLink :to="'/site-records/' + item.id">{{
              item.siteURL
            }}</NuxtLink></template
          >
          <template #[clientSlot]="{ item }"
            ><NuxtLink :to="'/site-records/' + item.id">{{
              item.clientName
            }}</NuxtLink></template
          >
          <template #[statusSlot]="{ item }"
            ><v-chip size="small">{{
              siteStatus(item.status)
            }}</v-chip></template
          >
        </v-data-table-server>
      </div>
      <div v-else-if="active" class="report-table-panel site-inspector-layout">
        <div>
          <h3>Site inspector</h3>
          <v-list density="compact">
            <v-list-item
              v-for="site in sites"
              :key="site.id"
              :title="site.siteURL"
              :subtitle="site.clientName || 'Unassigned'"
              :active="activeId === String(site.id)"
              @click="activeId = String(site.id)"
            >
              <template #append
                ><strong>{{
                  scoreLabel(site.avg_mobile_score)
                }}</strong></template
              >
            </v-list-item>
          </v-list>
        </div>
        <SitesInspectorDetail :site="active" :dates="appliedDates" />
      </div>
      <v-card-actions v-if="!tableView && pageCount > 1" class="justify-end"
        ><v-pagination
          :model-value="page"
          :length="pageCount"
          :total-visible="5"
          @update:model-value="updatePage"
      /></v-card-actions>
    </v-card>
    <ReportsExportDialog
      v-model="open"
      :url="url"
      :loading="exporting"
      @copy="copy"
    />
    <v-snackbar
      :model-value="Boolean(notice)"
      @update:model-value="notice = ''"
      >{{ notice }}</v-snackbar
    >
  </div>
</template>

<style scoped>
.site-inspector-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 12px;
}
@media (max-width: 760px) {
  .site-inspector-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
