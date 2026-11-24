<template>
  <div>
    <div>
      <UnauthorizedUser v-if="nonAccountManagerUserRole" />
    </div>
    <div v-if="!nonAccountManagerUserRole" class="workspace-report-stack">
      <v-card flat :loading="busy" class="workspace-filter-panel">
        <v-card-title>Report filters</v-card-title>
        <v-card-text>
          <div class="kpi-filters">
            <client-picker
              v-model="filters.client_id"
              compact
              u-r-l-query-param="client_id"
            />
            <location-picker
              v-model="filters.location_ids"
              compact
              :client="filters.client_id"
              :multiple="false"
            />
            <datepicker
              v-model="filters.dates"
              compact
              :kpi="true"
              :date-help-buttons="[
                'lastMonth',
                'thisYear',
                'last2Years',
                'all',
              ]"
            />
            <v-select
              v-model="filters.type"
              label="Group by"
              :items="[
                { text: 'Day', value: 'daily' },
                { text: 'Month', value: 'month' },
              ]"
              dense
              outlined
              hide-details
            />
            <v-btn
              color="primary"
              depressed
              :loading="busy"
              :disabled="!canRun"
              @click="handleApply"
            >
              Apply filters
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
      <v-card v-if="busy" flat role="status" aria-label="Loading location KPIs">
        <v-card-text>
          <v-skeleton-loader
            type="table-heading, table-row-divider, table-row-divider"
          />
        </v-card-text>
      </v-card>
      <v-card v-else-if="reportLoaded" flat>
        <ReportResultHeading
          :title="
            response.type === 'month' ? reportViews.monthly : reportViews.daily
          "
        >
          <p v-if="response.client.name || locationName.length">
            {{
              [response.client.name, ...locationName]
                .filter(Boolean)
                .join(' · ')
            }}
          </p>
          <DatesAndDiff
            v-if="reportDates.from"
            :start="reportDates.from"
            :end="reportDates.to"
          />
          <p v-if="!reportDates.from">All available dates</p>
          <template #actions>
            <v-btn small outlined @click="copyLink">
              <v-icon small left>mdi-link</v-icon> Copy link
            </v-btn>
            <v-btn
              small
              depressed
              color="primary"
              :loading="uploadReportLoading"
              @click="uploadReport"
            >
              <v-icon small left>mdi-google-drive</v-icon>
              {{ googleDocLink ? 'View export' : 'Export to Drive' }}
            </v-btn>
          </template>
        </ReportResultHeading>
        <KPIMonthly v-if="response.type === 'month'" :response="response" />
        <KPIDaily v-else-if="response.type === 'daily'" :response="response" />
      </v-card>
      <v-card v-else flat>
        <ReportResultHeading
          :title="reportError ? 'Report unavailable' : 'Generate a KPI report'"
        >
          <p>
            {{
              reportError
                ? 'Apply the filters again to retry.'
                : 'Choose a client and location to see performance.'
            }}
          </p>
        </ReportResultHeading>
      </v-card>
      <v-dialog v-model="reportLoadingDialog" persistent width="500">
        <v-expand-transition>
          <v-card v-show="uploadReportLoading">
            <v-card-text class="pt-5">
              <p class="mb-3 text-center">
                {{ $t('message.uploadingToGoogleDrive') }}
              </p>
              <v-progress-linear
                indeterminate
                color="black"
                class="mb-0"
              ></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-expand-transition>
        <v-expand-transition>
          <v-card v-show="reportUploaded">
            <v-card-title class="mb-4"
              >{{ $t('alert.success.driveUpload') }}.</v-card-title
            >
            <v-card-text>
              <span class="google-doc-link">{{ googleDocLink }}</span>
              <v-tooltip bottom>
                <template #activator="{ on, attrs }">
                  <a v-bind="attrs" @click="copyLink(googleDocLink)" v-on="on">
                    <v-icon> mdi-content-copy </v-icon>
                  </a>
                </template>
                <span>Copy</span>
              </v-tooltip>
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" :href="googleDocLink" target="_blank">
                Open File
              </v-btn>
              <v-btn color="yellow" @click="reportLoadingDialog = false">
                Close
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-expand-transition>
      </v-dialog>
      <!-- Upload Dialog -->
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  useStore,
  ref,
  computed,
  useRouter,
  onMounted,
  useRoute,
  watch,
  useContext,
} from '@nuxtjs/composition-api'
import moment from 'moment'
import { pageNames, reportPages, reportViews } from '~/shared/PageNames'

import { IBreadcrumbs } from '~/store'
import ClientPicker from '~/components/forms/ClientPicker.vue'
import LocationPicker from '~/components/forms/LocationPicker.vue'
import Datepicker from '~/components/forms/DatePicker.vue'
import ReportResultHeading from '~/components/ReportResultHeading.vue'
import DatesAndDiff from '~/components/DatesAndDiff.vue'
import swalMixin, { showToast } from '~/utils/swalMixin'
import {
  generateKPIDailyReport,
  generateKPIMonthlyReport,
} from '~/utils/reports-upload/kpi'
import useAxios from '~/plugins/useAxios'
import useKPI from '~/services/useKPI'
import KPIDaily from '~/components/KPI/daily.vue'
import { dates as showcaseDates } from '~/showcase/fixtures'
import KPIMonthly from '~/components/KPI/month.vue'
import UnauthorizedUser from '~/components/UnauthorizedUser.vue'

export default defineComponent({
  components: {
    ClientPicker,
    LocationPicker,
    Datepicker,
    KPIDaily,
    KPIMonthly,
    ReportResultHeading,
    DatesAndDiff,
    UnauthorizedUser,
  },
  // middleware: 'isAuthenticated',
  setup(_props, { parent }) {
    const store = useStore()
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('create report') && $auth.hasScope('vpn access')
    )
    const $swal = swalMixin((parent as any).$swal as any)
    const busy = ref(false)
    const reportLoaded = ref(false)
    const router = useRouter()
    const route = useRoute()
    const { fetchKPI } = useKPI()
    const locationName = ref<string[]>([])
    const reportError = ref(false)
    const reportDates = ref({ from: '', to: '' })
    const filters = ref<{
      dates: Array<string>
      client_id: null | string | number
      location_ids: string | number | null
      type: string
    }>({
      dates: [
        moment().subtract('2', 'year').startOf('year').format('YYYY-MM-DD'),
        moment().endOf('day').format('YYYY-MM-DD'),
      ],
      client_id: null,
      location_ids: null,
      type: 'month',
    })

    const uploadReportLoading = ref(false)
    const googleDocLink = ref('')
    const reportLoadingDialog = ref(false)
    const reportUploaded = ref(false)
    const axios = useAxios()
    const response = ref({
      type: 'month',
      client: {} as any,
      summary: [],
      locations: [] as Array<any>,
      summary_transformed: [] as Array<any>,
      cache: {
        cache: {
          created_at: '',
          expires_at: '',
        },
      },
      date: {
        date_start: '',
        date_end: '',
      },
    })

    const canRun = computed(
      () => !!(filters.value.client_id && filters.value.location_ids)
    )

    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: 'Dashboard',
        to: `/`,
      },
      {
        text: pageNames.reports,
        to: '/reports',
        disabled: false,
      },
      {
        text: reportPages.location.title,
        to: '/reports/kpi',
        disabled: true,
      },
    ]

    const copyLink = (link = window.location.href) => {
      if (typeof link !== 'string') {
        link = window.location.href
      }
      window.navigator.clipboard.writeText(link)
      showToast($swal, {
        title: 'Link copied to clipboard',
      })
    }

    const uploadReport = () => {
      if (reportUploaded.value === true) {
        reportLoadingDialog.value = true
        return
      }
      uploadReportLoading.value = true
      reportLoadingDialog.value = true
      let fn
      if (response.value.type === 'month') {
        fn = generateKPIMonthlyReport
      } else {
        fn = generateKPIDailyReport
      }

      axios
        .post(
          '/reports/upload',
          fn({
            user: (store as any).state.auth.user,
            client: response.value.client,
            summary: response.value.summary,
            filters: { dates: [reportDates.value.from, reportDates.value.to] },
            location: locationName.value.join(', '),
          }),
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${(store.state as any).cred.cred}`,
            },
          }
        )
        .then((res: any) => {
          googleDocLink.value = res.data?.data?.url
          reportUploaded.value = true
        })
        .catch(() => {
          uploadReportLoading.value = false
          reportLoadingDialog.value = false
        })
        .finally(() => {
          uploadReportLoading.value = false
        })
    }

    const fetchReport = () => {
      if (!canRun.value) return
      const { dates, client_id, location_ids, type } = filters.value
      const from = dates[0] || ''
      const to = dates[1] || from || moment().format('YYYY-MM-DD')
      busy.value = true
      reportError.value = false
      reportLoaded.value = false

      fetchKPI({
        date_start: from || undefined,
        date_end: to,
        client_id,
        location_ids: [location_ids],
        type,
      })
        .then(({ data }) => {
          const result = data.data
          const summary = result?.summary
          const hasSummary =
            type === 'daily'
              ? Array.isArray(summary)
              : summary !== null && typeof summary === 'object'

          if (!hasSummary) {
            reportError.value = true
            return
          }

          response.value = { ...result, type, client: result.client || {} }
          reportDates.value = { from, to }
          locationName.value = Object.values(result.locations || {})
            .map((location: any) => location?.name)
            .filter(Boolean)
          googleDocLink.value = ''
          reportUploaded.value = false
          reportLoaded.value = true
        })
        .catch(() => {
          reportError.value = true
        })
        .finally(() => {
          busy.value = false
        })
    }

    const loadFiltersFromURL = () => {
      const query = router.currentRoute.query
      if (query.dates === 'all') {
        filters.value.dates = []
      } else if (query.dates) {
        filters.value.dates = (Array.isArray(query.dates)
          ? query.dates
          : [query.dates]
        ).filter((day): day is string => typeof day === 'string' && !!day)
      }
      if (query.client_id !== undefined) {
        filters.value.client_id = Number(query.client_id) || null
      }
      if (query.location_ids !== undefined) {
        const location = Array.isArray(query.location_ids)
          ? query.location_ids[0]
          : query.location_ids
        filters.value.location_ids = Number(location) || null
      }
      if (query.type === 'daily' || query.type === 'month') {
        filters.value.type = query.type
      }
      fetchReport()
    }

    const handleApply = () => {
      if (!canRun.value || busy.value) return
      const location = {
        query: {
          ...filters.value,
          dates: filters.value.dates.length ? filters.value.dates : 'all',
          client_id: String(filters.value.client_id),
          location_ids: String(filters.value.location_ids),
        },
      }
      if (
        router.resolve(location).route.fullPath === router.currentRoute.fullPath
      ) {
        fetchReport()
        return
      }
      router.replace(location)
    }

    onMounted(() => {
      if (process.env.SHOWCASE_MODE === 'true') {
        filters.value = {
          ...filters.value,
          client_id: 1,
          location_ids: 1,
          dates: showcaseDates(),
        }
      }
      loadFiltersFromURL()
    })

    watch(route, () => {
      loadFiltersFromURL()
    })

    store.dispatch('setPageHeading', {
      pageTitle: reportPages.location.title,
      breadcrumbs,
    })

    return {
      reportLoaded,
      reportError,
      reportDates,
      canRun,
      reportViews,
      busy,
      handleApply,
      copyLink,
      response,
      reportUploaded,
      googleDocLink,
      reportLoadingDialog,
      uploadReportLoading,
      uploadReport,
      filters,
      locationName,
      nonAccountManagerUserRole,
    }
  },
  head: { title: reportPages.location.title },
})
</script>
