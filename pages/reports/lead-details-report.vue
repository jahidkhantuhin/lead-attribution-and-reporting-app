<template>
  <div>
    <UnauthorizedUser v-if="unAuthorizedToPullReport" />
    <div v-else class="lead-report">
      <v-card flat class="lead-report-surface workspace-filter-inline">
        <div class="lead-report-filters">
          <client-picker
            v-model="filters.client"
            compact
            u-r-l-query-param="client"
            @achange="onClientChange"
          />
          <location-picker
            v-model="filters.location_ids"
            compact
            :client="filters.client"
            :show-button="showButton"
          />
          <Datepicker
            v-model="filters.dates"
            compact
            :disabled="!filters.location_ids || !filters.location_ids.length"
            :date-help-buttons="[
              'thisWeek',
              'lastWeek',
              'last14Days',
              'thisMonth',
              'lastMonth',
            ]"
            @achange="push"
            @clear="
              filters.dates = []
              push()
            "
          />
          <v-btn
            :loading="LDRReportLoading"
            :disabled="
              !filters.client ||
              !filters.location_ids ||
              !filters.location_ids.length ||
              !filters.dates.length
            "
            color="primary"
            depressed
            @click="fetchLDRReport"
          >
            Apply filters
          </v-btn>
        </div>
      </v-card>

      <v-card
        v-if="!ready || LDRReportLoading"
        flat
        class="lead-report-surface lead-report-state"
        role="status"
        aria-label="Loading lead report"
      >
        <v-skeleton-loader
          type="table-heading, table-row-divider, table-row-divider"
        />
      </v-card>
      <v-card
        v-else-if="!loaded"
        flat
        class="lead-report-surface lead-report-state"
      >
        <h2>
          {{ reportError ? 'Report unavailable' : 'Generate a lead report' }}
        </h2>
        <p>
          {{
            reportError
              ? 'Apply the filters again to retry.'
              : 'Choose a client, location and date range to get started.'
          }}
        </p>
      </v-card>
      <v-card v-else flat class="lead-report-surface">
        <header class="lead-report-heading">
          <div>
            <h2>
              <nuxt-link :to="`/client-records/${LDRReport.id}`">{{
                LDRReport.name
              }}</nuxt-link>
            </h2>
            <DatesAndDiff
              :start="transformReport.date_start"
              :end="transformReport.date_end"
            />
            <div class="lead-report-locations">
              <nuxt-link
                v-for="{ location } in LDRReport.locations"
                :key="location.id"
                :to="`/client-records/${LDRReport.id}/locations/${location.id}`"
              >
                {{ location.name }}
              </nuxt-link>
            </div>
            <p v-if="reportUpdatedAt" class="lead-report-updated">
              Updated <formatted-date :date="reportUpdatedAt" />
            </p>
          </div>
          <div class="lead-report-actions">
            <v-btn small outlined @click="copyReportLink">
              <v-icon left small>mdi-link</v-icon> Copy link
            </v-btn>
            <v-btn small outlined @click="fetchLDRReport">
              <v-icon left small>mdi-refresh</v-icon> Reload
            </v-btn>
            <v-btn
              small
              depressed
              color="primary"
              :loading="uploadReportLoading"
              @click="uploadReport"
            >
              <v-icon left small>mdi-google-drive</v-icon>
              {{ googleDocLink ? 'View export' : 'Export to Drive' }}
            </v-btn>
          </div>
        </header>

        <div class="lead-report-sections">
          <v-tabs v-model="activeSection" class="lead-section-tabs" hide-slider>
            <v-tab
              ><v-icon left small>mdi-chart-box-outline</v-icon>Lead
              Summary</v-tab
            >
            <v-tab
              ><v-icon left small>mdi-chart-donut</v-icon>Summary by
              Source</v-tab
            >
            <v-tab
              ><v-icon left small>mdi-format-list-bulleted</v-icon>Lead
              Details</v-tab
            >
          </v-tabs>
          <v-tabs-items
            v-model="activeSection"
            class="lead-section-content"
            touchless
          >
            <v-tab-item>
              <LeadReportOverview
                :summary="summary"
                :analytics="computedReport.lead_analytics"
              />
            </v-tab-item>
            <v-tab-item>
              <LeadSourceSummary :report="computedReport" />
            </v-tab-item>
            <v-tab-item class="lead-detail-panel">
              <section class="lead-records">
                <header class="lead-records-heading">
                  <div>
                    <h3>Lead records</h3>
                    <p>
                      {{ detailRows.length }}
                      {{ detailRows.length === 1 ? 'record' : 'records' }}
                    </p>
                  </div>
                  <v-select
                    v-model="detailView"
                    :items="detailViews"
                    label="Lead type and source"
                    dense
                    outlined
                    hide-details
                    class="lead-records-select"
                  />
                </header>
                <LDRAllReports
                  v-if="detailView === 'all'"
                  :call-item-class="callItemClass"
                  :all-reports-list="detailRows"
                />
                <component
                  :is="selectedDetailView.component"
                  v-else
                  :items="detailRows"
                  v-bind="selectedDetailView.calls ? { callItemClass } : {}"
                />
              </section>
            </v-tab-item>
          </v-tabs-items>
        </div>
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
                  <a v-bind="attrs" @click="copy('.google-doc-link')" v-on="on">
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
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  watch,
  defineComponent,
  ref,
  useStore,
  useRouter,
  onMounted,
  useRoute,
  useContext,
} from '@nuxtjs/composition-api'
import { get, sortBy } from 'lodash'
import moment from 'moment-timezone'
import useAxios from '~/plugins/useAxios'
import { IBreadcrumbs } from '~/store'

import FormattedDate from '~/components/FormattedDate.vue'
import DatesAndDiff from '~/components/DatesAndDiff.vue'
import ClientPicker from '~/components/forms/ClientPicker.vue'
import Datepicker from '~/components/forms/DatePicker.vue'

import swalMixin, { showToast } from '~/utils/swalMixin'
import defaultTimezone from '~/utils/defaultTimezone'
import VuetifyColorsPallete from '~/shared/VuetifyColorsPallete'
import getColorForScoredCall, {
  isDateWeekend,
} from '~/utils/getColorForScoredCall'
import { dates as showcaseDates } from '~/showcase/fixtures'
import generateLeadDetailsReport from '~/utils/reports-upload/ldr'

import LocationPicker from '~/components/forms/LocationPicker.vue'

import LDRAllReports from '~/components/LDR/AllReports.vue'
import LeadReportOverview from '~/components/LDR/LeadReportOverview.vue'
import LeadSourceSummary from '~/components/LDR/LeadSourceSummary.vue'

import LDRCallsPPC from '~/components/LDR/Calls-PPC.vue'
import LDRCallsFB from '~/components/LDR/Calls-FB.vue'
import LDRCallsSEO from '~/components/LDR/Calls-SEO.vue'

import LDRChatsPPC from '~/components/LDR/Chats-PPC.vue'
import LDRChatsFB from '~/components/LDR/Chats-FB.vue'
import LDRChatsSEO from '~/components/LDR/Chats-SEO.vue'

import LDRFormsPPC from '~/components/LDR/Forms-PPC.vue'
import LDRFormsFB from '~/components/LDR/Forms-FB.vue'
import LDRFormsSEO from '~/components/LDR/Forms-SEO.vue'

import UnauthorizedUser from '~/components/UnauthorizedUser.vue'

import { callStatus } from '~/plugins/callStatus'
import { callAudio } from '~/plugins/callAudio'

export default defineComponent({
  components: {
    LeadReportOverview,
    LeadSourceSummary,
    FormattedDate,
    DatesAndDiff,
    Datepicker,
    ClientPicker,
    LocationPicker,
    LDRAllReports,

    LDRCallsPPC,
    LDRCallsFB,
    LDRCallsSEO,

    LDRChatsPPC,
    LDRChatsFB,
    LDRChatsSEO,
    LDRFormsPPC,
    LDRFormsFB,
    LDRFormsSEO,
    UnauthorizedUser,
  },

  setup(_props, { parent }) {
    const { $auth } = useContext()
    const unAuthorizedToPullReport = computed(
      () => !$auth.hasScope('create report') && $auth.hasScope('vpn access')
    )
    const store = useStore()
    const showButton = ref(true)

    const filters: any = ref({
      dates: [],
      client: null,
    })

    const allReportsList = ref([])
    const activeSection = ref(0)
    const LDRReport: any = ref({})
    const reportUpdatedAt = computed(
      () =>
        LDRReport.value?.cache?.created_at ??
        LDRReport.value?.cache?.cache?.created_at
    )
    const LDRReportLoading = ref(false)

    const copy = (_element: string) => {
      window.navigator.clipboard.writeText(googleDocLink.value)
      showToast($swal, {
        title: 'Copied to clipboard',
      })
    }

    const loaded = ref(false)
    const ready = ref(false)
    const reportError = ref(false)
    const axios = useAxios()
    const $swal = swalMixin((parent as any).$swal as any)

    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: 'Dashboard',
        to: '/',
      },
      {
        text: 'Reports',
        to: '/reports',
      },
      {
        text: 'LDR',
        to: '#',
        disabled: true,
      },
    ]

    store.dispatch('setPageHeading', {
      pageTitle: 'Lead Details Report',
      breadcrumbs,
    })

    // state

    const summary = computed(() => {
      return {
        calls: {
          total: get(transformReport, 'value.summary.calls.total', 0),
          unique: get(transformReport, 'value.summary.calls.unique', 0),
        },
        emails: {
          total: get(transformReport, 'value.summary.emails.total', 0),
          unique: get(transformReport, 'value.summary.emails.unique', 0),
        },
        chats: {
          total: get(transformReport, 'value.summary.chats.total', 0),
          unique: get(transformReport, 'value.summary.chats.unique', 0),
        },
        facebook_leads: {
          total: get(transformReport, 'value.summary.facebook_leads.total', 0),
          unique: get(
            transformReport,
            'value.summary.facebook_leads.unique',
            0
          ),
        },
      }
    })

    const callItemClass = (item: any, _b: any) => {
      return item.rowColor
    }

    const setallReportsList = () => {
      const { calls, emails, chats, facebook_leads } = get(
        transformReport,
        'value.details',
        {}
      )

      const getDataForAllReports = (item: any, type: string) => {
        if (!item) return null

        switch (type) {
          case 'facebook':
            return {
              type: 'facebook',
              name: item.lead?.name,
              datetime: item.date,
              timestamp: moment(item.date).tz(defaultTimezone).valueOf(),
              rowColorHex: isDateWeekend(item.date)
                ? VuetifyColorsPallete['grey lighten-3']
                : '',
              local_date: item.name,
              campaign: item.campaign,
              timezone: '',
              email: item.lead?.email,
              phone: item.lead?.phone_number,
              procedure: item.procedure,
              location_name: item.location_name,
            }

          case 'call':
            return {
              type: 'call',
              name: item.caller_name,
              datetime: item.call_start,
              timestamp: moment(item.call_start).tz(defaultTimezone).valueOf(),
              rowColorHex: isDateWeekend(item.call_start)
                ? VuetifyColorsPallete['grey lighten-3']
                : '',
              local_date: item.call_start,
              campaign: item.campaign,
              timezone:
                item.campaign == null ? 'US/Eastern' : item.campaign.timezone,
              email: null,
              phone: item.caller_number,
              location_name: item.location_name,
              procedure: item?.score?.procedure?.name,
            }

          case 'email':
            return {
              type: 'email',
              name: item.lead.name,
              datetime: item.date,
              local_date: item.date,
              timestamp: moment(item.date).tz(defaultTimezone).valueOf(),
              rowColorHex: isDateWeekend(item.date)
                ? VuetifyColorsPallete['grey lighten-3']
                : '',
              campaign: item.campaign,
              timezone: null,
              email: item.lead.email,
              phone: item.lead.phone,
              procedure: item?.lead?.procedure,
              location_name: item.location_name,
            }

          case 'chat':
            return {
              type: 'chat',
              name: item.lead.name,
              datetime: item.chat_date,
              timestamp: moment(item.chat_date).tz(defaultTimezone).valueOf(),
              rowColorHex: isDateWeekend(item.chat_date)
                ? VuetifyColorsPallete['grey lighten-3']
                : '',
              campaign: item.campaign,
              local_date: item.chat_date,
              timezone: null,
              email: item.lead.email,
              phone: item.lead.phone,
              procedure: item?.procedure,
              location_name: item.location_name,
            }

          default:
            return null
        }
      }

      // make the mixed array
      let allReports: Array<any> = []

      calls?.forEach((item: any) =>
        allReports?.push(getDataForAllReports(item, `call`))
      )

      emails?.forEach((item: any) =>
        allReports?.push(getDataForAllReports(item, `email`))
      )

      chats?.forEach((item: any) =>
        allReports?.push(getDataForAllReports(item, `chat`))
      )

      facebook_leads?.forEach((item: any) =>
        allReports?.push(getDataForAllReports(item, `facebook`))
      )

      // Avoid null values.

      allReports = allReports.filter((item) => item)

      // @ts-ignore
      allReportsList.value = sortBy(allReports, ['timestamp']).reverse()
    }

    const fetchLDRReport = function () {
      if (
        !filters.value.client ||
        !filters.value.location_ids?.length ||
        !filters.value.dates?.length ||
        LDRReportLoading.value
      )
        return
      router
        .replace({
          query: filters.value,
        })
        .catch(() => {})

      const dateOne = filters.value.dates[0]
      const dateTwo = filters.value.dates[1] ?? filters.value.dates[0]
      googleDocLink.value = ''
      reportUploaded.value = uploadReportLoading.value = false
      LDRReportLoading.value = true

      reportError.value = false
      loaded.value = false
      axios
        .get(`/leads`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${(store.state as any).cred.cred}`,
          },
          params: {
            date_start: `${dateOne}`,
            date_end: `${dateTwo}`,
            location_ids: filters.value.location_ids,
            client_id: filters.value.client,
          },
        })
        .then((resp) => {
          const data = resp.data.data

          if (data) {
            LDRReport.value = data
            loaded.value = true

            setallReportsList()
          } else {
            reportError.value = true
          }
        })
        .catch((e) => {
          reportError.value = true
          const messageFromServer: string = get(
            e,
            'response.data.message',
            e.message
          )
          showToast($swal, {
            title: messageFromServer,
            icon: 'error',
          })
        })
        .finally(() => {
          LDRReportLoading.value = false
        })
    }

    const copyReportLink = () => {
      window.navigator.clipboard.writeText(window.location.href)
      showToast($swal, {
        title: 'Link copied to clipboard',
      })
    }

    /**
     * Handles the change of the datepicker input.
     * If a date range is selected, it automatically rearranges them
     * based on their recentness.
     */
    const uploadReportLoading = ref(false)
    const googleDocLink = ref('')
    const reportLoadingDialog = ref(false)
    const reportUploaded = ref(false)

    const uploadReport = () => {
      try {
        if (reportUploaded.value === true) {
          reportLoadingDialog.value = true
          return
        }

        uploadReportLoading.value = true
        reportLoadingDialog.value = true

        axios
          .post(
            '/reports/upload',
            generateLeadDetailsReport(
              transformReport,
              (store as any).state.auth.user,
              LDRReport.value
            ),
            {
              withCredentials: true,
              headers: {
                Authorization: `Bearer ${(store.state as any).cred.cred}`,
              },
            }
          )
          .then((res) => {
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
      } catch (e) {
        console.error(e.message)
        showToast($swal, {
          title: 'Something went wrong while uploading report to G-Drive',
        })
      }
    }

    const router = useRouter()
    const route = useRoute()

    const push = () => {
      router.push({
        path: '/reports/lead-details-report',
        query: {
          ...router.currentRoute.query,
          ...(filters.value as any),
        },
      })
    }

    const onClientChange = (_id: Number, client: any) => {
      router.push({
        path: router.currentRoute.path,
        query: {
          ...router.currentRoute.query,
          ...(filters.value as any),
          client_name: client ? client.name : '',
          location_ids: [],
        },
      })
    }

    const loadFiltersFromURL = () => {
      const query = router.currentRoute.query
      filters.value = {
        ...filters.value,
        ...query,
        dates:
          typeof query.dates === 'string'
            ? [query.dates]
            : query.dates || filters.value.dates,
        location_ids:
          typeof query.location_ids === 'string'
            ? [query.location_ids]
            : query.location_ids || filters.value.location_ids,
      }
    }

    const transformReport = computed(() => {
      const report: any = {
        date_start: null,
        date_end: null,
        lead_analytics: {
          adwords: {
            clicks: 0,
            conversions: 0,
            impressions: 0,
            total_spend: 0,
          },
          aggregate: {
            clicks: 0,
            conversions: 0,
            cpl: 0,
            impressions: 0,
            total_spend: 0,
            total_unique_leads: 0,
          },
          facebook: {
            clicks: 0,
            conversions: 0,
            impressions: 0,
            total_spend: 0,
          },
        },
        summary: {
          calls: {
            total: 0,
            unique: 0,
          },
          chats: {
            total: 0,
            unique: 0,
          },
          emails: {
            total: 0,
            unique: 0,
          },
          facebook_leads: {
            total: 0,
            unique: 0,
          },
        },
        details: {
          calls: [],
          adwords_calls: [],
          facebook_calls: [],
          seo_calls: [],
          chats: [],
          adwords_chats: [],
          facebook_chats: [],
          seo_chats: [],
          emails: [],
          facebook_leads: [],
          seo_emails: [],
          am: {
            adwords: {
              call_summary: {
                booked: 0,
                irrelevant: 0,
                missed: 0,
                not_booked: 0,
                unscored: 0,
              },
              calls: {
                total: 0,
                unique: 0,
              },
              chats: {
                total: 0,
                unique: 0,
              },
              clicks: 0,
              conversions: 0,
              cpl: 0,
              forms: {
                total: 0,
                unique: 0,
              },
              impressions: 0,
              total_spend: 0,
            },
            facebook: {
              call_summary: {
                booked: 0,
                irrelevant: 0,
                missed: 0,
                not_booked: 0,
                unscored: 0,
              },
              calls: {
                total: 0,
                unique: 0,
              },
              chats: {
                total: 0,
                unique: 0,
              },
              clicks: 0,
              conversions: 0,
              cpl: 0,
              forms: {
                total: 0,
                unique: 0,
              },
              impressions: 0,
              total_spend: 0,
            },
          },
        },
      }

      LDRReport.value?.locations?.forEach((location: any) => {
        report.date_start = location.date_start
        report.date_end = location.date_end

        const adwordsTotalSpend = !location.lead_analytics.adwords
          .account_shared
          ? location.lead_analytics.adwords.total_spend
          : 0
        report.lead_analytics.adwords.total_spend =
          report.lead_analytics.adwords.total_spend + adwordsTotalSpend

        const adwordsClicks = !location.lead_analytics.adwords.account_shared
          ? location.lead_analytics.adwords.clicks
          : 0
        report.lead_analytics.adwords.clicks =
          report.lead_analytics.adwords.clicks + adwordsClicks

        report.lead_analytics.adwords.conversions =
          report.lead_analytics.adwords.conversions +
          location.lead_analytics.adwords.conversions

        const adwordsImpressions = !location.lead_analytics.adwords
          .account_shared
          ? location.lead_analytics.adwords.impressions
          : 0
        report.lead_analytics.adwords.impressions =
          report.lead_analytics.adwords.impressions + adwordsImpressions

        const aggregateClicks = !location.lead_analytics.adwords.account_shared
          ? location.lead_analytics.aggregate.clicks
          : 0
        report.lead_analytics.aggregate.clicks =
          report.lead_analytics.aggregate.clicks + aggregateClicks

        report.lead_analytics.aggregate.conversions =
          report.lead_analytics.aggregate.conversions +
          location.lead_analytics.aggregate.conversions

        report.lead_analytics.aggregate.cpl =
          report.lead_analytics.aggregate.cpl +
          location.lead_analytics.aggregate.cpl

        const aggregateImpressions = !location.lead_analytics.adwords
          .account_shared
          ? location.lead_analytics.aggregate.impressions
          : 0
        report.lead_analytics.aggregate.impressions =
          report.lead_analytics.aggregate.impressions + aggregateImpressions

        const aggregateTotalSpend = !location.lead_analytics.adwords
          .account_shared
          ? location.lead_analytics.aggregate.total_spend
          : 0
        report.lead_analytics.aggregate.total_spend =
          report.lead_analytics.aggregate.total_spend + aggregateTotalSpend

        report.lead_analytics.aggregate.total_unique_leads =
          report.lead_analytics.aggregate.total_unique_leads +
          location.lead_analytics.aggregate.total_unique_leads

        report.lead_analytics.facebook.clicks =
          report.lead_analytics.facebook.clicks +
          location.lead_analytics.facebook.clicks

        report.lead_analytics.facebook.conversions =
          report.lead_analytics.facebook.conversions +
          location.lead_analytics.facebook.conversions

        report.lead_analytics.facebook.impressions =
          report.lead_analytics.facebook.impressions +
          location.lead_analytics.facebook.impressions

        report.lead_analytics.facebook.total_spend =
          report.lead_analytics.facebook.total_spend +
          location.lead_analytics.facebook.total_spend

        report.summary.calls.unique =
          report.summary.calls.unique + location.summary.calls.unique
        report.summary.calls.total =
          report.summary.calls.total + location.summary.calls.total

        report.summary.chats.unique =
          report.summary.chats.unique + location.summary.chats.unique
        report.summary.chats.total =
          report.summary.chats.total + location.summary.chats.total

        report.summary.emails.unique =
          report.summary.emails.unique + location.summary.emails.unique
        report.summary.emails.total =
          report.summary.emails.total + location.summary.emails.total

        report.summary.facebook_leads.unique =
          report.summary.facebook_leads.unique +
          location.summary.facebook_leads.unique
        report.summary.facebook_leads.total =
          report.summary.facebook_leads.total +
          location.summary.facebook_leads.total

        location.details.calls = location.details.calls.map((calls: any) => {
          return {
            location_name: location?.location?.name,
            ...calls,
          }
        })
        location.details.adwords_calls = location.details.adwords_calls.map(
          (adwordsCalls: any) => {
            return {
              location_name: location?.location?.name,
              ...adwordsCalls,
            }
          }
        )
        location.details.facebook_calls = location.details.facebook_calls.map(
          (facebookCalls: any) => {
            return {
              location_name: location?.location?.name,
              ...facebookCalls,
            }
          }
        )
        location.details.seo_calls = location.details.seo_calls
          ? location.details.seo_calls.map((seoCalls: any) => {
              return {
                location_name: location?.location?.name,
                ...seoCalls,
              }
            })
          : []

        location.details.chats = location.details.chats.map((chats: any) => {
          return {
            location_name: location?.location?.name,
            ...chats,
          }
        })
        location.details.adwords_chats = location.details.adwords_chats.map(
          (adwordsChats: any) => {
            return {
              location_name: location?.location?.name,
              ...adwordsChats,
            }
          }
        )
        location.details.facebook_chats = location.details.facebook_chats.map(
          (facebookChats: any) => {
            return {
              location_name: location?.location?.name,
              ...facebookChats,
            }
          }
        )
        location.details.seo_chats = location.details.seo_chats
          ? location.details.seo_chats.map((seoChats: any) => {
              return {
                location_name: location?.location?.name,
                ...seoChats,
              }
            })
          : []

        location.details.emails = location.details.emails.map((emails: any) => {
          return {
            location_name: location?.location?.name,
            ...emails,
          }
        })
        location.details.facebook_leads = location.details.facebook_leads.map(
          (facebookLeads: any) => {
            return {
              location_name: location?.location?.name,
              ...facebookLeads,
            }
          }
        )
        location.details.seo_emails = location.details.seo_emails
          ? location.details.seo_emails.map((seoEmails: any) => {
              return {
                location_name: location?.location?.name,
                ...seoEmails,
              }
            })
          : []

        report.details.calls.push(...(location.details.calls as Array<any>))
        report.details.adwords_calls.push(
          ...(location.details.adwords_calls as Array<any>)
        )
        report.details.facebook_calls.push(
          ...(location.details.facebook_calls as Array<any>)
        )
        report.details.seo_calls.push(
          ...(location.details.seo_calls as Array<any>)
        )

        report.details.chats.push(...(location.details.chats as Array<any>))
        report.details.adwords_chats.push(
          ...(location.details.adwords_chats as Array<any>)
        )
        report.details.facebook_chats.push(
          ...(location.details.facebook_chats as Array<any>)
        )
        report.details.seo_chats.push(
          ...(location.details.seo_chats as Array<any>)
        )

        report.details.emails.push(...(location.details.emails as Array<any>))
        report.details.facebook_leads.push(
          ...(location.details.facebook_leads as Array<any>)
        )
        report.details.seo_emails.push(
          ...(location.details.seo_emails as Array<any>)
        )

        report.details.am.adwords.call_summary.booked =
          report.details.am.adwords.call_summary.booked +
          location.details.am.adwords.call_summary.booked

        report.details.am.adwords.call_summary.irrelevant =
          report.details.am.adwords.call_summary.irrelevant +
          location.details.am.adwords.call_summary.irrelevant

        report.details.am.adwords.call_summary.missed =
          report.details.am.adwords.call_summary.missed +
          location.details.am.adwords.call_summary.missed

        report.details.am.adwords.call_summary.not_booked =
          report.details.am.adwords.call_summary.not_booked +
          location.details.am.adwords.call_summary.not_booked

        report.details.am.adwords.call_summary.unscored =
          report.details.am.adwords.call_summary.unscored +
          location.details.am.adwords.call_summary.unscored

        report.details.am.adwords.calls.total =
          report.details.am.adwords.calls.total +
          location.details.am.adwords.calls.total

        report.details.am.adwords.calls.unique =
          report.details.am.adwords.calls.unique +
          location.details.am.adwords.calls.unique

        report.details.am.adwords.chats.total =
          report.details.am.adwords.chats.total +
          location.details.am.adwords.chats.total

        report.details.am.adwords.chats.unique =
          report.details.am.adwords.chats.unique +
          location.details.am.adwords.chats.unique

        report.details.am.adwords.clicks =
          report.details.am.adwords.clicks + location.details.am.adwords.clicks

        report.details.am.adwords.conversions =
          report.details.am.adwords.conversions +
          location.details.am.adwords.conversions

        report.details.am.adwords.cpl =
          report.details.am.adwords.cpl + location.details.am.adwords.cpl

        report.details.am.adwords.forms.total =
          report.details.am.adwords.forms.total +
          location.details.am.adwords.forms.total

        report.details.am.adwords.forms.unique =
          report.details.am.adwords.forms.unique +
          location.details.am.adwords.forms.unique

        report.details.am.adwords.impressions =
          report.details.am.adwords.impressions +
          location.details.am.adwords.impressions

        // For Facebook

        report.details.am.facebook.call_summary.booked =
          report.details.am.facebook.call_summary.booked +
          location.details.am.facebook.call_summary.booked

        report.details.am.facebook.call_summary.irrelevant =
          report.details.am.facebook.call_summary.irrelevant +
          location.details.am.facebook.call_summary.irrelevant

        report.details.am.facebook.call_summary.missed =
          report.details.am.facebook.call_summary.missed +
          location.details.am.facebook.call_summary.missed

        report.details.am.facebook.call_summary.not_booked =
          report.details.am.facebook.call_summary.not_booked +
          location.details.am.facebook.call_summary.not_booked

        report.details.am.facebook.call_summary.unscored =
          report.details.am.facebook.call_summary.unscored +
          location.details.am.adwords.call_summary.unscored

        report.details.am.facebook.calls.total =
          report.details.am.facebook.calls.total +
          location.details.am.facebook.calls.total

        report.details.am.facebook.calls.unique =
          report.details.am.facebook.calls.unique +
          location.details.am.facebook.calls.unique

        report.details.am.facebook.chats.total =
          report.details.am.facebook.chats.total +
          location.details.am.facebook.chats.total

        report.details.am.facebook.chats.unique =
          report.details.am.facebook.chats.unique +
          location.details.am.facebook.chats.unique

        report.details.am.facebook.clicks =
          report.details.am.facebook.clicks +
          location.details.am.facebook.clicks

        report.details.am.facebook.conversions =
          report.details.am.facebook.conversions +
          location.details.am.facebook.conversions

        report.details.am.facebook.cpl =
          report.details.am.facebook.cpl + location.details.am.facebook.cpl

        report.details.am.facebook.forms.total =
          report.details.am.facebook.forms.total +
          location.details.am.facebook.forms.total

        report.details.am.facebook.forms.unique =
          report.details.am.facebook.forms.unique +
          location.details.am.facebook.forms.unique

        report.details.am.facebook.impressions =
          report.details.am.facebook.impressions +
          location.details.am.facebook.impressions
      })

      const client = { ...LDRReport.value }
      delete client.locations

      report.client = client

      return report
    })

    const computedReport = computed(() => {
      const report = transformReport.value

      if (report && report.details && report.details.calls) {
        report.details.all = allReportsList.value
        report.details.calls = report.details.calls.map((item: any) => {
          item.call_duration = new Date(item.call_duration * 1000)
            .toISOString()
            .substr(11, 8)
          const color = getColorForScoredCall(item)
          item.rowColor = color
          item.rowColorHex = (VuetifyColorsPallete as any)[color]
          item.color = color.split(' ')[0]
          return item
        })
        report.details.adwords_calls = report.details.adwords_calls.map(
          (item: any) => {
            item.call_duration = new Date(item.call_duration * 1000)
              .toISOString()
              .substr(11, 8)
            const color = getColorForScoredCall(item)
            item.rowColor = color
            item.rowColorHex = (VuetifyColorsPallete as any)[color]
            item.color = color.split(' ')[0]
            // item.cs_name = item.score ? item.score.scorer.first_name.charAt(0) + ',' + ' ' + item.score.scorer.last_name : 'No scorer'
            item.cs_name =
              item.score && item.score.scorer && item.score.scorer.first_name
                ? item.score.scorer.first_name.charAt(0) +
                  ',' +
                  ' ' +
                  item.score.scorer.last_name
                : 'No scorer'
            item.call_status =
              item.score && item.score.call_status
                ? callStatus(item.score.call_status)
                : 'No status available'
            // call_url changes based on development stages
            item.call_url =
              item.score && item.call_url
                ? callAudio(item.call_url)
                : item.call_url
            return item
          }
        )

        report.details.facebook_calls = report.details.facebook_calls.map(
          (item: any) => {
            item.call_duration = new Date(item.call_duration * 1000)
              .toISOString()
              .substr(11, 8)
            const color = getColorForScoredCall(item)
            item.rowColor = color
            item.rowColorHex = (VuetifyColorsPallete as any)[color]
            item.color = color.split(' ')[0]
            item.call_status =
              item.score && item.score.call_status
                ? callStatus(item.score.call_status)
                : 'No status available'
            // call_url changes based on development stages
            item.call_url =
              item.score && item.call_url
                ? callAudio(item.call_url)
                : item.call_url
            return item
          }
        )

        report.details.seo_calls = report.details.seo_calls
          ? report.details.seo_calls.map((item: any) => {
              item.call_duration = new Date(item.call_duration * 1000)
                .toISOString()
                .substr(11, 8)
              const color = getColorForScoredCall(item)
              item.rowColor = color
              item.rowColorHex = (VuetifyColorsPallete as any)[color]
              item.color = color.split(' ')[0]
              return item
            })
          : ''

        report.details.emails = report.details.emails.map((item: any) => {
          const isWeekend = isDateWeekend(item.date)
          const color = isWeekend ? VuetifyColorsPallete['grey lighten-3'] : ''
          item.rowColorHex = color
          return item
        })

        report.details.facebook_leads = report.details.facebook_leads.map(
          (item: any) => {
            const isWeekend = isDateWeekend(item.date)
            const color = isWeekend
              ? VuetifyColorsPallete['grey lighten-3']
              : ''
            item.rowColorHex = color
            return item
          }
        )

        report.details.seo_emails = report.details.seo_emails
          ? report.details.seo_emails.map((item: any) => {
              const isWeekend = isDateWeekend(item.date)
              const color = isWeekend
                ? VuetifyColorsPallete['grey lighten-3']
                : ''
              item.rowColorHex = color
              return item
            })
          : ''

        report.details.chats = report.details.chats.map((item: any) => {
          const isWeekend = isDateWeekend(item.chat_date)
          const color = isWeekend ? VuetifyColorsPallete['grey lighten-3'] : ''
          item.rowColorHex = color
          return item
        })

        report.details.adwords_chats = report.details.adwords_chats.map(
          (item: any) => {
            const isWeekend = isDateWeekend(item.chat_date)
            const color = isWeekend
              ? VuetifyColorsPallete['grey lighten-3']
              : ''
            item.rowColorHex = color
            return item
          }
        )

        report.details.facebook_chats = report.details.facebook_chats.map(
          (item: any) => {
            const isWeekend = isDateWeekend(item.chat_date)
            const color = isWeekend
              ? VuetifyColorsPallete['grey lighten-3']
              : ''
            item.rowColorHex = color
            return item
          }
        )

        report.details.seo_chats = report.details.seo_chats
          ? report.details.seo_chats.map((item: any) => {
              const isWeekend = isDateWeekend(item.chat_date)
              const color = isWeekend
                ? VuetifyColorsPallete['grey lighten-3']
                : ''
              item.rowColorHex = color
              return item
            })
          : ''
      }

      return report
    })

    const detailViews = [
      { value: 'all', text: 'All leads' },
      {
        value: 'adwords_calls',
        text: 'Calls · Google Ads',
        component: 'LDRCallsPPC',
        calls: true,
      },
      {
        value: 'facebook_calls',
        text: 'Calls · Facebook',
        component: 'LDRCallsFB',
        calls: true,
      },
      {
        value: 'seo_calls',
        text: 'Calls · SEO',
        component: 'LDRCallsSEO',
        calls: true,
      },
      {
        value: 'adwords_chats',
        text: 'Chats · Google Ads',
        component: 'LDRChatsPPC',
      },
      {
        value: 'facebook_chats',
        text: 'Chats · Facebook',
        component: 'LDRChatsFB',
      },
      { value: 'seo_chats', text: 'Chats · SEO', component: 'LDRChatsSEO' },
      { value: 'emails', text: 'Forms · Google Ads', component: 'LDRFormsPPC' },
      {
        value: 'facebook_leads',
        text: 'Forms · Facebook',
        component: 'LDRFormsFB',
      },
      { value: 'seo_emails', text: 'Forms · SEO', component: 'LDRFormsSEO' },
    ]
    const detailView = ref('all')
    const selectedDetailView = computed(
      () =>
        detailViews.find(({ value }) => value === detailView.value) ||
        detailViews[0]
    )
    const detailRows = computed(() => {
      const key = selectedDetailView.value.value
      const rows =
        key === 'all'
          ? allReportsList.value
          : computedReport.value.details?.[key]
      return Array.isArray(rows) ? rows : []
    })

    onMounted(() => {
      loadFiltersFromURL()

      const query = router.currentRoute.query

      if (process.env.SHOWCASE_MODE === 'true') {
        if (!query.client) filters.value.client = 1
        if (!query.location_ids) filters.value.location_ids = [1]
        if (!query.dates) filters.value.dates = showcaseDates()
        fetchLDRReport()
      } else if (query.client && query.location_ids && query.dates) {
        fetchLDRReport()
      }
      ready.value = true
    })

    watch(route, () => {
      loadFiltersFromURL()
    })

    return {
      transformReport,
      googleDocLink,
      copy,
      reportLoadingDialog,
      uploadReportLoading,
      uploadReport,
      reportUploaded,
      fetchLDRReport,
      loaded,
      LDRReport,
      LDRReportLoading,
      summary,
      activeSection,
      reportError,
      ready,
      detailView,
      detailViews,
      selectedDetailView,
      detailRows,
      callItemClass,
      push,
      filters,
      copyReportLink,
      onClientChange,
      computedReport,
      showButton,
      unAuthorizedToPullReport,
      reportUpdatedAt,
    }
  },
  head: {
    title: 'Lead Details Report',
  },
})
</script>

<style lang="scss" src="~/components/LDR/LDRStyles.scss"></style>
