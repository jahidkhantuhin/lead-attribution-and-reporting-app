<template>
  <div>
    <div>
      <UnauthorizedUser v-if="nonAccountManagerUserRole" />
    </div>
    <div v-if="!nonAccountManagerUserRole" class="payment-report">
      <v-card flat class="payment-panel payment-controls">
        <h2>Report filters</h2>
        <payment-report-filters
          :call-scorers-loading="callScorersLoading"
          :headers="headers"
          :call-scorers="callScorers"
          :loading="generatingPaymentReportLoading"
          @search="handleGenerateReport"
        />
      </v-card>

      <v-card flat class="payment-panel">
        <header class="payment-heading">
          <div>
            <h2>
              {{
                (selectedCallScorer && selectedCallScorer.fullname) ||
                'Report details'
              }}
            </h2>
            <p v-if="selectedFilters.from">
              {{ selectedFilters.from }} to {{ selectedFilters.to }}
            </p>
            <p
              v-if="
                loaded && paymentReport.cache && paymentReport.cache.created_at
              "
            >
              Updated
              <formatted-date
                :timezone="false"
                :date="paymentReport.cache.created_at"
              />
            </p>
          </div>
          <div v-if="loaded" class="payment-actions">
            <v-btn
              v-if="generatingPaymentReportSuccess"
              outlined
              small
              @click="copyReportLink"
            >
              <v-icon left small>mdi-link</v-icon> Copy link
            </v-btn>
            <v-btn outlined small @click="fetchPaymentReport">
              <v-icon left small>mdi-refresh</v-icon> Reload
            </v-btn>
            <v-btn
              v-if="
                generatingPaymentReportSuccess && paymentReport.ratings.length
              "
              color="primary"
              depressed
              small
              @click="uploadReport"
            >
              <v-icon left small>mdi-google-drive</v-icon>
              {{ googleDocLink ? 'View export' : 'Export to Drive' }}
            </v-btn>
          </div>
        </header>
        <v-card-text
          v-if="generatingPaymentReportLoading"
          role="status"
          aria-label="Loading report"
        >
          <v-skeleton-loader
            type="table-heading, table-row-divider, table-row-divider"
          />
        </v-card-text>
        <v-card-text
          v-else-if="
            !loaded ||
            !generatingPaymentReportSuccess ||
            !paymentReport.ratings.length
          "
          class="payment-empty"
        >
          <v-icon size="28">mdi-clipboard-text-outline</v-icon>
          <h3>
            {{
              !loaded
                ? 'Generate a payment report'
                : generatingPaymentReportSuccess
                ? 'No results for this period'
                : 'Report unavailable'
            }}
          </h3>
          <p>
            {{
              !loaded
                ? 'Select a scorer and dates, then apply the filters.'
                : generatingPaymentReportSuccess
                ? 'Try a different scorer or date range.'
                : 'Reload the report to try again.'
            }}
          </p>
        </v-card-text>
        <template v-else>
          <dl class="payment-metrics">
            <div v-for="metric in summary" :key="metric.label">
              <dt>{{ metric.label }}</dt>
              <dd>{{ metric.value }}</dd>
            </div>
          </dl>
          <payment-report-detail :report="computedReport" />
        </template>
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
                  <a v-bind="attrs" @click="copy" v-on="on">
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
  defineComponent,
  ref,
  useStore,
  onMounted,
  computed,
  onBeforeMount,
  useRouter,
  useContext,
} from '@nuxtjs/composition-api'
import { pageNames, reportPages } from '~/shared/PageNames'
import PaymentReportFilters from '~/components/PaymentReportFilters.vue'

import PaymentReportDetail from '~/components/PaymentReportDetail.vue'
import useAxios from '~/plugins/useAxios'
import { IBreadcrumbs } from '~/store'
import useUsers from '~/services/useUsers'
import { CALL_SCORER_ROLE } from '~/utils/UserEnums'
import FormattedDate from '~/components/FormattedDate.vue'
import secondsToHHMMSS from '~/utils/secondsToHHMMSS'
import swalMixin, { showToast } from '~/utils/swalMixin'
import generatePaymentReport from '~/utils/reports-upload/payment-report'
import UnauthorizedUser from '~/components/UnauthorizedUser.vue'

const totalsSkeleton = {
  name: 'Totals',
  total_calls: 0,
  total_call_duration: 0,
  total_rating_time: 0,
  pay_rate: 0,
  total: 0,
}

export default defineComponent({
  components: {
    PaymentReportFilters,
    PaymentReportDetail,
    FormattedDate,
    UnauthorizedUser,
  },
  // middleware: 'isAuthenticated',
  setup(_props, { parent }) {
    const store = useStore()
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('create report') && $auth.hasScope('vpn access')
    )
    const payRate = ref(0)
    const axios = useAxios()
    const paymentReport = ref({
      ratings: [],
      cache: {},
    })
    const selectedFilters = ref({
      user_id: null,
      from: '',
      to: '',
    })
    const generatingPaymentReportLoading = ref(false)
    const generatingPaymentReportSuccess = ref(false)
    const loaded = ref(false)
    const headers = ref([])
    const $swal = swalMixin((parent as any).$swal as any)

    const callScorers = ref([])
    const callScorersLoading = ref(true)

    const { list } = useUsers()
    const router = useRouter()

    const copyReportLink = () => {
      window.navigator.clipboard.writeText(
        `${window.location.origin}${router.currentRoute.fullPath}`
      )
      showToast($swal, {
        title: 'Link copied to clipboard',
      })
    }
    const copy = () => {
      window.navigator.clipboard.writeText(googleDocLink.value)
      showToast($swal, {
        title: 'Copied to clipboard',
      })
    }

    const computedReport = computed(() => {
      const totals = { ...totalsSkeleton }
      const rows = paymentReport.value.ratings.map((rating: any) => {
        const amount = (
          payRate.value *
          (rating.total_rating_time / 3600)
        ).toFixed(2)
        totals.total_calls += Number(rating.total_calls)
        totals.total_call_duration += Number(rating.total_call_duration)
        totals.total_rating_time += Number(rating.total_rating_time)
        totals.total += Number(amount)

        return {
          ...rating,
          pay_rate: `$${payRate.value}`,
          total: `$${amount}`,
          total_call_duration: secondsToHHMMSS(rating.total_call_duration),
          total_rating_time: secondsToHHMMSS(rating.total_rating_time),
        }
      })

      return [
        ...rows,
        {
          ...totals,
          total: `$${totals.total.toFixed(2)}`,
          pay_rate: `$${payRate.value}`,
          total_call_duration: secondsToHHMMSS(totals.total_call_duration),
          total_rating_time: secondsToHHMMSS(totals.total_rating_time),
        },
      ]
    })

    const summary = computed(() => {
      const total = computedReport.value[computedReport.value.length - 1]
      return [
        { label: 'Total payment', value: total.total },
        { label: 'Calls reviewed', value: total.total_calls },
        { label: 'Rating time', value: total.total_rating_time },
        { label: 'Hourly rate', value: total.pay_rate },
      ]
    })

    const getUsers = () => {
      callScorersLoading.value = true
      list({
        sort_by: 'first_name:asc',
        role: CALL_SCORER_ROLE,
        limit: 200,
      })
        .then((res) => {
          callScorers.value = res.data.data.result
        })
        .finally(() => {
          callScorersLoading.value = false
        })
    }

    onBeforeMount(() => {
      getUsers()
    })

    const selectedCallScorer = computed(() => {
      if (selectedFilters && (selectedFilters as any).value.user_id) {
        const userid = (selectedFilters as any).value.user_id
        return (callScorers as any).value.find((c: any) => {
          return c.id === userid
        })
      } else {
        return ''
      }
    })

    const fetchPaymentReport = () => {
      googleDocLink.value = ''
      reportUploaded.value = false
      paymentReport.value = { ratings: [], cache: {} }
      generatingPaymentReportLoading.value = true
      generatingPaymentReportSuccess.value = true
      loaded.value = false
      axios
        .get(
          `/reports?type=payment&user_id=${selectedFilters.value.user_id}&from=${selectedFilters.value.from}&to=${selectedFilters.value.to}`,
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${(store.state as any).cred.cred}`,
            },
          }
        )
        .then((res: any) => {
          generatingPaymentReportLoading.value = false
          generatingPaymentReportSuccess.value = true
          loaded.value = true
          if (res.data && res.data && res.data.data && res.data.data.ratings) {
            paymentReport.value = res.data.data
            payRate.value = res.data.data.pay_rate
          }
        })
        .catch((_e: any) => {
          generatingPaymentReportLoading.value = false
          generatingPaymentReportSuccess.value = false
          loaded.value = true
        })
    }
    const handleGenerateReport = (filters: any) => {
      selectedFilters.value = {
        user_id: filters.user_id,
        from: filters.dates[0],
        to: filters.dates[1] ? filters.dates[1] : filters.dates[0],
      }
      fetchPaymentReport()
    }

    const uploadReportLoading = ref(false)
    const googleDocLink = ref('')
    const reportLoadingDialog = ref(false)
    const reportUploaded = ref(false)

    const uploadReport = () => {
      if (reportUploaded.value === true) {
        reportLoadingDialog.value = true
        return
      }

      uploadReportLoading.value = true
      reportLoadingDialog.value = true
      axios
        .post(
          '/reports/upload',
          generatePaymentReport(computedReport, {
            scorer: selectedCallScorer,
            filters: selectedFilters,
            user: (store as any).state.auth.user,
          }) as any,
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
    }

    // const uploadReport = () => {

    // if (reportUploaded.value === true) {
    //   reportLoadingDialog.value = true
    //   return
    // }

    // uploadReportLoading.value = true
    // reportLoadingDialog.value = true
    // axios
    //   .post(
    //     '/reports/reports/upload',
    //     {
    //       type: 'payment-report',
    //       from: selectedFilters.value.from,
    //       to: selectedFilters.value.to,
    //       user_id: selectedFilters.value.user_id,
    //       ratings: computedReport.value,
    //     },
    //     {
    //       withCredentials: true,
    //     }
    //   )
    //   .then((res) => {
    //     googleDocLink.value = res.data?.data?.url
    //     reportUploaded.value = true
    //   })
    //   .catch(() => {
    //     uploadReportLoading.value = false
    //     reportLoadingDialog.value = false
    //   })
    //   .finally(() => {
    //     uploadReportLoading.value = false
    //   })
    // }

    onMounted(() => {
      const breadcrumbs: IBreadcrumbs[] = [
        {
          text: 'Dashboard',
          to: '/',
        },
        {
          text: pageNames.reports,
          to: '/reports',
        },
        {
          text: reportPages.payments.title,
          to: '#',
          disabled: true,
        },
      ]

      store.dispatch('setPageHeading', {
        pageTitle: reportPages.payments.title,
        breadcrumbs,
      })
    })

    return {
      payRate,
      paymentReport,
      selectedFilters,
      generatingPaymentReportLoading,
      generatingPaymentReportSuccess,
      loaded,
      headers,
      fetchPaymentReport,
      handleGenerateReport,
      callScorers,
      computedReport,
      summary,

      selectedCallScorer,

      uploadReportLoading,
      googleDocLink,
      reportLoadingDialog,
      reportUploaded,
      uploadReport,
      copy,
      copyReportLink,
      callScorersLoading,
      nonAccountManagerUserRole,
    }
  },
  head: {
    title: reportPages.payments.title,
  },
})
</script>

<style scoped>
.payment-report {
  display: grid;
  gap: 18px;
  padding-block: 20px;
}

.payment-report .payment-panel {
  min-width: 0;
  background: var(--workspace-surface);
  border: 1px solid var(--workspace-border);
  color: var(--workspace-ink);
}

.payment-controls,
.payment-heading {
  padding: clamp(16px, 2.5vw, 24px);
}

.payment-heading,
.payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.payment-heading {
  justify-content: space-between;
  gap: 16px;
}

.payment-report h2 {
  font-size: 1.25rem;
  font-weight: 700;
}

.payment-report p {
  margin: 4px 0 0;
  color: var(--workspace-muted);
}

.payment-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  gap: 10px;
  padding: 0 clamp(16px, 2.5vw, 24px) 16px;
}

.payment-metrics div {
  padding: 14px;
  border: 1px solid var(--workspace-border);
  border-radius: 12px;
  background: var(--workspace-subtle);
}

.payment-metrics div:first-child {
  background: var(--workspace-tint);
}

.payment-metrics dt {
  color: var(--workspace-muted);
  font-size: 0.875rem;
}

.payment-metrics dd {
  margin-top: 4px;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.payment-empty {
  padding: 30px 16px 40px;
  text-align: center;
}

.payment-empty h3 {
  margin-top: 8px;
  color: var(--workspace-ink);
}
</style>
