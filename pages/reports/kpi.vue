<template>
  <div>
    <div>
      <UnauthorizedUser v-if="nonAccountManagerUserRole" />
    </div>
    <div v-if="!nonAccountManagerUserRole">
      <!-- Filters -->
      <v-card elevation="1" :loading="busy" class="workspace-filter-panel">
        <v-card-title>{{ $t('message.filters') }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" xl="2" lg="2" md="2" sm="12" xs="12">
              <client-picker
                v-model="filters.client_id"
                :u-r-l-query-param="'client_id'"
                @change="handleClientChange"
              ></client-picker>
            </v-col>
            <v-col cols="12" xl="3" lg="3" md="3" sm="12" xs="12">
              <location-picker
                v-model="filters.location_ids"
                :client="filters.client_id"
                :multiple="false"
              ></location-picker>
            </v-col>
            <v-col cols="12" xl="3" lg="3" md="3" sm="12" xs="12">
              <datepicker
                v-model="filters.dates"
                :kpi="true"
                :date-help-buttons="[
                  'lastMonth',
                  'thisYear',
                  'last2Years',
                  'all',
                ]"
              ></datepicker>
            </v-col>
            <v-col cols="12" xl="2" lg="2" md="2" sm="12" xs="12">
              <v-select
                v-model="filters.type"
                item-text="label"
                item-value="value"
                :items="[
                  { label: reportViews.daily, value: 'daily' },
                  { label: reportViews.monthly, value: 'month' },
                ]"
                class="mr-5"
                @change="handleViewChange"
              ></v-select>
            </v-col>
            <v-col
              cols="12"
              xl="2"
              lg="2"
              md="2"
              sm="12"
              xs="12"
              align="center"
            >
              <v-btn @click="handleApply">
                <v-icon left>mdi-check</v-icon>
                Apply
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions v-if="reportLoaded">
          <v-spacer></v-spacer>
          <v-btn
            title="Copy link to this report"
            icon
            class="mr-5"
            @click="copyLink"
          >
            <v-icon>mdi-link</v-icon>
          </v-btn>
          <v-btn
            icon
            title="Upload to Google Drive"
            :loading="uploadReportLoading"
            :color="googleDocLink ? 'info' : 'normal'"
            @click="uploadReport"
          >
            <v-icon>mdi-upload</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
      <!-- Filters -->
      <br />
      <!-- Header -->
      <v-expand-transition>
        <v-card v-if="!reportLoaded" class="mb-5">
          <v-card-text>
            {{ $t('message.supplyFilters') }}
          </v-card-text>
        </v-card>
      </v-expand-transition>
      <div v-if="reportLoaded">
        <br />
        <KPIMonthly
          v-if="response.type === 'month'"
          :response="response"
        ></KPIMonthly>
        <KPIDaily
          v-else-if="response.type === 'daily'"
          :response="response"
        ></KPIDaily>
      </div>
      <!-- Upload Dialog -->
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
import { Dictionary } from 'lodash'
import moment from 'moment'
import { pageNames, reportPages, reportViews } from '~/shared/PageNames'

import { IBreadcrumbs } from '~/store'
import ClientPicker from '~/components/forms/ClientPicker.vue'
import LocationPicker from '~/components/forms/LocationPicker.vue'
import Datepicker from '~/components/forms/DatePicker.vue'
import { callColors } from '~/shared/callColors'
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
    const locationName = ref()
    const filters = ref<{
      dates: Array<string>
      client_id: null | string | number
      location_ids: Array<string> | Array<number>
      type: string
    }>({
      dates: [
        moment().subtract('2', 'year').startOf('year').format('YYYY-MM-DD'),
        moment().endOf('day').format('YYYY-MM-DD'),
      ],
      client_id: null,
      location_ids: [],
      type: 'month',
    })
    const selectedClient = ref(null)

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

    const clientSideFilters = ref({
      view: 'Monthly',
      date_start: '',
      date_end: '',
    })

    const report = ref({
      summary: [] as Array<any>,
      summary_transformed: [] as Array<any>,
    })

    // const locationNames = computed(() => {
    //   return response.value?.locations?.map((location) => location[0].name)
    // })

    const trasnformReport = () => {
      // const location_ids = [
      //   ...new Set(response.value.summary.map((item: any) => item.location_id)),
      // ]
      // for (const location of location_ids) {
      //   const obj = {
      //     ...response.value,
      //     summary: response.value.summary
      //       .map((item: any) => {
      //         Object.keys(
      //           omit(item, ['id', 'client_id', 'location_id'])
      //         ).forEach((element) => {
      //           if (!isNaN(item[element])) {
      //             item[element] = parseInt(item[element])
      //           }
      //         })
      //         return {
      //           ...item,
      //           colors: callColors,
      //           timestamp: moment(item.date).add('5', 'minutes').valueOf(),
      //         }
      //       })
      //       .filter((lead) => lead.location_id === location),
      //   }
      //   const range = MomentRange.range(
      //     moment(response.value.date.dateStart).startOf(getRangeName()),
      //     moment(response.value.date.dateEnd).endOf(getRangeName())
      //   ).by(getRangeName() as any)
      //   obj.summary_transformed = Array.from(range)
      //     .map((momentItem) => {
      //       let leads = obj.summary.filter((lead) => {
      //         return moment(lead.timestamp).isBetween(
      //           moment(momentItem.startOf(getRangeName())),
      //           moment(momentItem.endOf(getRangeName()))
      //         )
      //       })
      //       // console.log(leads.map((c) => c.date))
      //       let sum = leads.reduce((previousValue, currentValue) => {
      //         Object.keys(
      //           omit(previousValue, ['id', 'client_id', 'location_id'])
      //         ).forEach((field) => {
      //           if (!isNaN(previousValue[field])) {
      //             previousValue[field] =
      //               previousValue[field] + currentValue[field]
      //           }
      //         })
      //         return previousValue
      //       }, leads[0])
      //       return {
      //         date_start: moment(momentItem.valueOf()),
      //         date_end: moment(momentItem.valueOf()),
      //         date_start_label: moment(
      //           momentItem.startOf(getRangeName())
      //         ).format('YYYY-MMMM-DD'),
      //         date_end_label: moment(momentItem.endOf(getRangeName())).format(
      //           'YYYY-MMMM-DD'
      //         ),
      //         ...sum,
      //       }
      //     })
      //     .filter((c) => c.id)
      //   obj.summary_transformed = sortBy(obj.summary_transformed, [
      //     'dateStart',
      //   ]).reverse()
      //   report.value.summary = [...report.value.summary, ...obj.summary]
      //   report.value.summary_transformed = [
      //     ...report.value.summary_transformed,
      //     ...obj.summary_transformed,
      //   ]
      // }
    }

    const firstDateOfReport = computed(() => {
      return filters.value.dates[0]
    })

    const isWeekly = computed(() => {
      return clientSideFilters.value.view.toLowerCase() === 'weekly'
    })
    const isMonthly = computed(() => {
      return clientSideFilters.value.view.toLowerCase() === 'monthly'
    })
    const isDaily = computed(() => {
      return clientSideFilters.value.view.toLowerCase() === 'daily'
    })

    const handleClientChange = (_id: Number, client: any) => {
      selectedClient.value = client
    }

    googleDocLink.value = ''
    reportUploaded.value = false

    const dateColumn = computed(() => {
      if (isDaily.value) {
        return { text: 'Date', value: 'date', width: '176px' }
      } else if (isWeekly.value) {
        return { text: 'Week', value: 'date', width: '265px' }
      } else if (isMonthly.value) {
        return { text: 'Month', value: 'date', width: '100px' }
      }
    })

    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: 'Dashboard',
        to: `/`,
      },
      {
        text: pageNames.reports,
        to: '/',
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
      if (filters.value.type === 'month') {
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
            filters: filters.value,
            location: locationName.value,
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

    const loadFiltersFromURL = () => {
      filters.value = {
        ...filters.value,
        ...router.currentRoute.query,
      }

      if (
        router.currentRoute.query &&
        typeof filters.value.client_id === 'string'
      ) {
        filters.value.client_id = +filters.value.client_id
      }

      if (
        filters.value.dates &&
        filters.value.client_id &&
        filters.value.location_ids
      ) {
        fetchReport()
      }
    }

    const fetchReport = () => {
      const dateStart = filters.value.dates[0]
      let dateEnd = filters.value.dates[1]

      if (!dateStart && !dateEnd) {
        dateEnd = moment().format('YYYY-MM-DD')
      }

      clientSideFilters.value.view = 'Monthly'
      busy.value = true

      fetchKPI({
        date_start: dateStart,
        date_end: dateEnd,
        client_id: filters.value.client_id,
        location_ids: [filters.value.location_ids],
        type: filters.value.type,
      })
        .then((resp) => {
          report.value.summary = report.value.summary_transformed = []
          response.value = resp.data.data
          response.value.type = filters.value.type
          reportLoaded.value = true
          googleDocLink.value = ''
          reportUploaded.value = false
          const locations = Object.entries(resp.data.data.locations)
          const location = locations.map((item: any) => {
            return item[1]
          })
          const locName = location.map((item: any) => {
            return item.name
          })
          locationName.value = locName

          trasnformReport()
          setTimeout(() => {
            document
              .querySelectorAll('[data-color-span]')
              .forEach((element) => {
                element.className.split(' ').forEach((className) => {
                  element.parentElement?.classList.add(className)
                })
              })
          }, 100)
        })
        .catch(() => {
          reportLoaded.value = false
        })
        .finally(() => {
          busy.value = false
        })
    }

    const handleApply = () => {
      router.replace({
        query: filters.value as Dictionary<
          string | (string | null)[] | null | undefined
        >,
      })

      clientSideFilters.value = {
        view: 'Monthly',
        date_start: filters.value.dates[0] as string,
        date_end: filters.value.dates[1] as string,
      }

      // fetchReport()
    }

    const handleViewChange = () => {
      reportUploaded.value = false
      report.value.summary = report.value.summary_transformed = []
      trasnformReport()
    }

    onMounted(() => {
      if (process.env.SHOWCASE_MODE === 'true') {
        filters.value = {
          ...filters.value,
          client_id: 1,
          location_ids: [1],
          dates: showcaseDates(),
        }
      }
      loadFiltersFromURL()
      handleViewChange()
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
      reportViews,
      isWeekly,
      isMonthly,
      isDaily,
      busy,
      handleApply,
      copyLink,
      response,
      report,
      callColors,
      clientSideFilters,
      reportUploaded,
      googleDocLink,
      reportLoadingDialog,
      uploadReportLoading,
      uploadReport,
      filters,
      handleViewChange,
      firstDateOfReport,
      handleClientChange,
      selectedClient,
      dateColumn,
      locationName,
      nonAccountManagerUserRole,
    }
  },
  head: { title: reportPages.location.title },
})
</script>
<style lang="scss">
.theme--dark {
  .lighten-5 {
    color: rgb(61, 60, 60);
  }
  .kpi-table .v-data-table__wrapper {
    table > thead > tr > th {
      color: rgb(156, 149, 149);
    }
  }
}
</style>
