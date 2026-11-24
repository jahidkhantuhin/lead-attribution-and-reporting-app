<template>
  <div>
    <UnauthorizedUser v-if="nonAccountManagerUserRole" />
    <v-row
      v-if="!nonAccountManagerUserRole"
      :class="{
        'my-6': true,
        'site-records': true,
      }"
    >
      <v-col cols="12">
        <v-card class="workspace-filter-panel site-record-controls">
          <v-card-title>Find sites</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="handleFilterApply()">
              <v-row align="center">
                <v-col cols="12" sm="6" lg="4">
                  <v-text-field
                    v-model="filters.name"
                    label="Search sites"
                    append-icon="mdi-magnify"
                    clearable
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="6" sm="3" lg="2">
                  <v-select
                    v-model="filters.status"
                    label="Status"
                    :items="statusOptions"
                    clearable
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="12" sm="6" lg="3">
                  <Datepicker
                    v-model="filters.date"
                    :date-help-buttons="[
                      'lastWeek',
                      'thisWeek',
                      'thisMonth',
                      'lastMonth',
                      'thisYear',
                      'lastYear',
                    ]"
                  />
                </v-col>
                <v-col cols="12" lg="3" class="site-filter-actions">
                  <v-btn
                    outlined
                    color="primary"
                    :aria-expanded="String(showFilters)"
                    @click="showFilters = !showFilters"
                  >
                    <v-icon left small>mdi-filter-variant</v-icon> Filters{{
                      advancedFilterCount
                        ? ' (' + advancedFilterCount + ')'
                        : ''
                    }}
                  </v-btn>
                  <v-btn type="submit" color="primary">Apply</v-btn>
                </v-col>
              </v-row>

              <v-expand-transition>
                <v-row v-show="showFilters">
                  <v-col cols="12" sm="6" md="3">
                    <v-autocomplete
                      v-model="filters.plugin"
                      :items="pluginOptions"
                      label="Plugin"
                      item-text="name"
                      :item-value="(item) => String(item.id)"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="3">
                    <v-autocomplete
                      v-model="filters.theme"
                      :items="themeOptions"
                      label="Theme"
                      item-text="name"
                      :item-value="(item) => String(item.id)"
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-subheader class="px-0">Mobile speed score</v-subheader>
                    <v-range-slider
                      v-model="filters.speed_score"
                      :max="max"
                      :min="min"
                      hide-details
                    >
                      <template #prepend>
                        <v-text-field
                          :value="filters.speed_score[0]"
                          class="workspace-score-bound"
                          type="number"
                          aria-label="Minimum speed score"
                          hide-details
                          @change="$set(filters.speed_score, 0, $event)"
                        />
                      </template>
                      <template #append>
                        <v-text-field
                          :value="filters.speed_score[1]"
                          class="workspace-score-bound"
                          type="number"
                          aria-label="Maximum speed score"
                          hide-details
                          @change="$set(filters.speed_score, 1, $event)"
                        />
                      </template>
                    </v-range-slider>
                  </v-col>
                </v-row>
              </v-expand-transition>
            </v-form>

            <div
              v-if="appliedChips.length"
              class="site-filter-chips"
              aria-label="Applied filters"
            >
              <v-chip
                v-for="chip in appliedChips"
                :key="chip.key"
                small
                close
                @click:close="removeFilter(chip.key)"
                >{{ chip.label }}</v-chip
              >
              <v-btn text small color="primary" @click="clearFilters"
                >Clear filters</v-btn
              >
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col md="12">
        <v-card :loading="busy">
          <v-toolbar flat>
            <v-toolbar-title
              >{{ pagination.total }}
              {{ pagination.total === 1 ? 'site' : 'sites' }}</v-toolbar-title
            >
            <v-spacer></v-spacer>
            <v-btn text small @click="tableView = !tableView">{{
              tableView ? 'Inspector' : 'View table'
            }}</v-btn>
            <v-btn icon title="Copy link to this report" @click="copyLink">
              <v-icon>mdi-link</v-icon>
            </v-btn>
            <v-btn
              v-show="loadedReport"
              icon
              title="Upload to Google Drive"
              :color="googleDocLink ? 'info' : 'normal'"
              @click="uploadReport"
            >
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </v-toolbar>
          <v-toolbar flat>
            <v-card-text class="ml-n4">
              <DatesAndDiff
                :start="appliedFilters.date[0]"
                :end="appliedFilters.date[1]"
              />
            </v-card-text>
          </v-toolbar>
          <template v-if="loadedReport && !tableView">
            <site-record-inspector
              :sites="computedReport"
              :loading="busy"
              :start="appliedFilters.date[0]"
              :end="appliedFilters.date[1]"
            />
            <v-card-actions v-if="pageCount > 1" class="justify-end">
              <v-pagination
                :value="tablePage"
                :length="pageCount"
                :total-visible="5"
                @input="goToPage"
              />
            </v-card-actions>
          </template>
          <v-data-table
            v-if="loadedReport && tableView"
            :items="computedReport"
            :headers="tableHeaders"
            :options.sync="tableOptions"
            :fixed-header="true"
            height="calc(100vh - 318px)"
            class="elevation-1"
            :footer-props="{
              'items-per-page-options': itemsPerPageOptions,
            }"
            :server-items-length="pagination.total"
            @pagination="handlePaginationChange"
          >
            <template #item.siteURL="{ item }">
              <nuxt-link class="site-link" :to="`/site-records/${item.id}`">
                <span>
                  {{ item.siteURL }}
                </span>
              </nuxt-link>
            </template>
            <template #item.clientName="{ item }">
              <nuxt-link class="site-link" :to="`/site-records/${item.id}`">
                <span>
                  {{
                    item.location && item.location.client
                      ? item.location.client
                      : ''
                  }}
                </span>
              </nuxt-link>
            </template>
            <template #item.status="{ item }">
              <workspace-badge :value="item.status" />
            </template>
            <template #item.accountManager="{ item }">
              {{ item.accountManager }}
            </template>
          </v-data-table>
        </v-card>
      </v-col>
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
            <v-card-title class="mb-4">
              {{ $t('alert.success.driveUpload') }}.
            </v-card-title>

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
    </v-row>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  ref,
  watch,
  useRouter,
  useStore,
  useRoute,
  onBeforeMount,
  computed,
  useContext,
} from '@nuxtjs/composition-api'
import useSiteRecords from '@/services/useSiteRecords'
import moment from 'moment'
import { pageNames } from '~/shared/PageNames'

import { Dictionary } from '~/node_modules/@types/lodash'
import generateSiteRecordsReport, {
  siteRecordsColumns,
} from '~/utils/reports-upload/site-records'
import swalMixin, { showToast } from '~/utils/swalMixin'
import useAxios from '~/plugins/useAxios'
import Datepicker from '~/components/forms/DatePicker.vue'
import DatesAndDiff from '~/components/DatesAndDiff.vue'
import SiteRecordInspector from '~/components/SiteRecords/SiteRecordInspector.vue'
import UnauthorizedUser from '~/components/UnauthorizedUser.vue'

interface IClientRecordsFilter {
  sort_by?: string | null
  sorting?: string | null
  date?: any | null
  name?: any | null
  plugin?: any | null
  theme?: any | null
  status?: string | null
  speed_score?: any | null
}

export default defineComponent({
  components: {
    Datepicker,
    DatesAndDiff,
    SiteRecordInspector,
    UnauthorizedUser,
  },
  // middleware: 'isAuthenticated',
  setup(_props, { parent }) {
    // New Update Start
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('create report')
    )
    const pluginOptions = ref()
    const getPluginOptions = () => {
      pluginList().then((resp) => {
        pluginOptions.value = resp.data.data
      })
    }
    const themeOptions = ref()
    const getThemeOptions = () => {
      themeList().then((resp) => {
        themeOptions.value = resp.data.data
      })
    }
    const statusOptions = ref([
      { text: 'Active', value: 'active' },
      { text: 'Inactive', value: 'inactive' },
    ])
    // New Update End
    const route = useRoute()
    const itemsPerPageOptions = ref([20, 50, 100, 500])
    const itemsPerPage = ref(itemsPerPageOptions.value[0])
    const min = ref(0)
    const max = ref(100)
    const defaultFilterValues: IClientRecordsFilter = {
      // sort_by: `url`,
      // sorting: 'asc',
      date: [
        moment().subtract('1', 'month').startOf('month').format('YYYY-MM-DD'),
        moment().subtract('1', 'month').endOf('month').format('YYYY-MM-DD'),
      ],
      name: '',
      plugin: null,
      theme: null,
      // status: 'all',
      speed_score: [0, 100],
    }
    const filters = ref<IClientRecordsFilter>({ ...defaultFilterValues })
    const appliedFilters = ref<IClientRecordsFilter>({ ...defaultFilterValues })
    const showFilters = ref(false)
    const tableView = ref(false)
    const appliedChips = computed(() => {
      const {
        name,
        status,
        plugin,
        theme,
        speed_score: speedScore,
      } = appliedFilters.value
      const optionName = (options: any, id: any) =>
        options?.find((option: any) => String(option.id) === String(id))
          ?.name || id
      return [
        name ? { key: 'name', label: 'Search: ' + name } : null,
        status
          ? {
              key: 'status',
              label: 'Status: ' + (status === 'active' ? 'Active' : 'Inactive'),
            }
          : null,
        plugin
          ? {
              key: 'plugin',
              label: 'Plugin: ' + optionName(pluginOptions.value, plugin),
            }
          : null,
        theme
          ? {
              key: 'theme',
              label: 'Theme: ' + optionName(themeOptions.value, theme),
            }
          : null,
        speedScore &&
        (Number(speedScore[0]) !== 0 || Number(speedScore[1]) !== 100)
          ? { key: 'speed_score', label: 'Score: ' + speedScore.join('–') }
          : null,
      ].filter(Boolean)
    })
    const advancedFilterCount = computed(
      () =>
        appliedChips.value.filter(
          (chip) =>
            chip && ['plugin', 'theme', 'speed_score'].includes(chip.key)
        ).length
    )
    const filterParams = computed(() => {
      return {
        date_start: filters.value.date[0],
        date_end: filters.value.date[1],
        name: filters.value.name,
        plugin: filters.value.plugin,
        theme: filters.value.theme,
        status: filters.value.status,
        speed_score_min: filters.value.speed_score[0],
        speed_score_max: filters.value.speed_score[1],
      }
    })

    const tablePage = ref(1)
    const pagination = ref({
      total: 0,
    })
    const pageCount = computed(() =>
      Math.max(1, Math.ceil(pagination.value.total / itemsPerPage.value))
    )
    const router = useRouter()
    const store = useStore()
    const { list, pluginList, themeList } = useSiteRecords()
    const busy = ref(false)
    const loadedReport = ref(false)
    const uploadReportLoading = ref(false)
    const reportLoadingDialog = ref(false)
    const reportUploaded = ref(false)
    const $swal = swalMixin((parent as any).$swal as any)
    const axios = useAxios()

    const report = ref({
      result: [],
    })

    const computedReport = computed(() => {
      const data = report.value
      return data.result.map((reportItem: any) => {
        reportItem.siteURL = reportItem.url ? reportItem.url : ''
        const client = reportItem?.location?.client
        reportItem.clientName =
          typeof client === 'string' ? client : client?.name || ''
        reportItem.status = reportItem?.status || ''
        reportItem.accountManager =
          reportItem.accountManager ||
          reportItem?.location?.client?.account_manager_id ||
          ''
        const item = {
          ...reportItem,
        }

        return item
      })
    })

    const tableHeaders = ref([...siteRecordsColumns()])

    // set the page breadcrumbs
    const breadcrumbs = [
      {
        text: `Dashboard`,
        to: `/`,
        disabled: false,
      },
      {
        text: pageNames.sites,
        to: `/site-records`,
        disabled: true,
      },
    ]

    const tableOptions = ref<any>({})

    watch(
      tableOptions,
      (v: any) => {
        tablePage.value = v.page
        itemsPerPage.value = v.itemsPerPage

        if (tableOptions.value.sortBy[0]) {
          filters.value.sort_by =
            tableOptions.value.sortBy[0] === 'fullname'
              ? 'first_name'
              : tableOptions.value.sortBy[0]
          filters.value.sorting = tableOptions.value.sortDesc[0]
            ? 'desc'
            : 'asc'
        }

        handleFilterApply(false)
      },
      { deep: true }
    )

    const pageTitle = pageNames.sites

    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    let recordsRequest = 0
    const getSiteRecords = () => {
      const request = ++recordsRequest
      {
        const appliedFilters = {
          ...filterParams.value,
          // sort_by:
          //   filters.value.sort_by + `:` + filters.value?.sorting?.toLowerCase(),
        }
        googleDocLink.value = ''
        reportUploaded.value = false
        busy.value = true
        list({
          ...appliedFilters,
          limit: itemsPerPage.value,
          page: tablePage.value,
        })
          .then((resp) => {
            if (request !== recordsRequest) return
            report.value = resp.data.data ? resp.data.data : []
            resp.data.data.result.map((item: any) => {
              return (
                (item.avg_desktop_score = item.avg_desktop_score
                  ? `${Number(item.avg_desktop_score).toFixed(2)}`
                  : 0),
                (item.avg_desktop_speed_index = item.avg_desktop_speed_index
                  ? `${Number(item.avg_desktop_speed_index).toFixed(2)}`
                  : 0),
                (item.avg_mobile_score = item.avg_mobile_score
                  ? `${Number(item.avg_mobile_score).toFixed(2)}`
                  : 0),
                (item.avg_mobile_speed_index = item.avg_mobile_speed_index
                  ? `${Number(item.avg_mobile_speed_index).toFixed(2)}`
                  : 0),
                (item.avg_server_response_time = item.avg_server_response_time
                  ? `${Number(item.avg_server_response_time).toFixed(2)}`
                  : 0)
              )
            })
            pagination.value = resp.data.data.pagination
            loadedReport.value = true
          })
          .catch(() => {
            if (request === recordsRequest) loadedReport.value = false
          })
          .finally(() => {
            if (request === recordsRequest) busy.value = false
          })
      }
    }

    const handleFilterApply = (resetPage = true) => {
      if (resetPage) tablePage.value = 1
      router
        .push({
          path: router.currentRoute.path,
          query: {
            page: tablePage.value.toString(),
            itemsPerPage: itemsPerPage.value.toString(),
            ...(filters.value as Dictionary<
              string | (string | null)[] | null | undefined
            >),
          },
        })
        ?.catch((error) => {
          if (error.name !== 'NavigationDuplicated') throw error
        })
    }

    const goToPage = (page: number) => {
      tablePage.value = page
      handleFilterApply(false)
    }

    const removeFilter = (key: keyof IClientRecordsFilter) => {
      filters.value = {
        ...appliedFilters.value,
        [key]: defaultFilterValues[key],
      }
      handleFilterApply()
    }

    const clearFilters = () => {
      filters.value = { ...defaultFilterValues }
      handleFilterApply()
    }

    const loadFiltersFromURL = () => {
      const query = { ...route.value.query }
      if (query.page) {
        tablePage.value = +query.page
        delete query.page
      } else {
        tablePage.value = 1
      }

      if (query.itemsPerPage) {
        itemsPerPage.value = +query.itemsPerPage
        delete query.itemsPerPage
      } else {
        itemsPerPage.value = 20
      }

      const dates =
        Array.isArray(query.date) && query.date.length
          ? query.date
          : defaultFilterValues.date
      const scores =
        Array.isArray(query.speed_score) && query.speed_score.length === 2
          ? query.speed_score.map(Number)
          : [0, 100]
      filters.value = {
        ...defaultFilterValues,
        ...query,
        date: dates,
        speed_score: scores,
      }
      appliedFilters.value = { ...filters.value, speed_score: [...scores] }
      getSiteRecords()
    }

    const handlePaginationChange = (e: any) => {
      itemsPerPage.value = e.itemsPerPage === -1 ? 500 : e.itemsPerPage
      // handleFilterApply()
    }

    const googleDocLink = ref('')

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
          generateSiteRecordsReport(computedReport, {
            user: (store as any).state.auth.user,
            filters,
          }),
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

    const copyLink = () => {
      window.navigator.clipboard.writeText(window.location.href)
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

    watch(route, () => {
      loadFiltersFromURL()
      // getSiteRecords()
    })

    onBeforeMount(() => {
      loadFiltersFromURL()
      getPluginOptions()
      getThemeOptions()
    })

    onMounted(() => {})

    return {
      tableOptions,
      tableView,
      showFilters,
      appliedFilters,
      appliedChips,
      advancedFilterCount,
      clearFilters,
      removeFilter,
      tablePage,
      pageCount,
      goToPage,
      tableHeaders,
      getSiteRecords,
      busy,
      itemsPerPageOptions,
      pagination,
      handlePaginationChange,
      handleFilterApply,
      filters,
      report,
      computedReport,
      loadedReport,
      uploadReport,
      uploadReportLoading,
      googleDocLink,
      copy,
      copyLink,
      reportLoadingDialog,
      reportUploaded,
      // New Update Start
      pluginOptions,
      getPluginOptions,
      themeOptions,
      getThemeOptions,
      statusOptions,
      filterParams,
      min,
      max,
      nonAccountManagerUserRole,
      // New Update End
    }
  },
  head: {
    title: pageNames.sites,
  },
})
</script>
<style lang="scss">
.site-link {
  text-decoration: none;
  &:hover {
    text-decoration: underline;
    color: red;
  }
}
.site-records .v-data-table {
  table > tbody > tr > td:nth-child(1),
  table > thead > tr > th:nth-child(1) {
    position: sticky !important;
    position: -webkit-sticky !important;
    left: 0;
    z-index: 4;
    background: white;
  }
  table > tbody > tr {
    &:hover {
      th,
      td {
        background: #eee !important;
      }
    }
  }
  table > thead > tr > th:nth-child(1) {
    z-index: 5;
  }

  // @media (min-width: 768px) {
  //   table > tbody > tr > td:nth-child(2),
  //   table > thead > tr > th:nth-child(2) {
  //     position: sticky !important;
  //     position: -webkit-sticky !important;
  //     left: 340px;
  //     z-index: 4;
  //     background: white;
  //   }
  //   table > thead > tr > th:nth-child(2) {
  //     z-index: 5;
  //   }
  // }
}
.theme--dark {
  .site-records .v-data-table {
    table > tbody > tr > td:nth-child(1),
    table > thead > tr > th:nth-child(1) {
      position: sticky !important;
      position: -webkit-sticky !important;
      left: 0;
      z-index: 4;
      background: rgb(29, 28, 28);
    }
    table > tbody > tr {
      &:hover {
        th,
        td {
          background: rgb(63, 62, 62) !important;
        }
      }
    }
    table > thead > tr > th:nth-child(1) {
      z-index: 5;
    }
  }
}
</style>

<style scoped>
.site-filter-actions,
.site-filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.site-filter-chips {
  padding-top: 8px;
}
</style>
