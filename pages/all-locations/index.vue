<template>
  <div>
    <UnauthorizedUser v-if="nonAccountManagerUserRole" />
    <v-row v-if="!nonAccountManagerUserRole" dense class="workspace-directory">
      <v-col cols="12">
        <v-card class="workspace-filter-panel">
          <v-card-title>Find locations</v-card-title>
          <v-card-text class="directory-search-bar">
            <v-text-field
              v-model="filters.name"
              label="Search locations"
              prepend-inner-icon="mdi-magnify"
              dense
              outlined
              hide-details
              clearable
              maxlength="250"
              @keydown.enter.prevent="handleFilterApply(true)"
            >
            </v-text-field>
            <v-btn color="primary" depressed @click="handleFilterApply(true)"
              >Apply</v-btn
            >
          </v-card-text>
          <v-card-actions v-if="appliedName">
            <v-chip small close @click:close="clearSearch"
              >Search: {{ appliedName }}</v-chip
            >
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card :loading="busy">
          <ReportResultHeading :title="pageNames.locations">
            <p>
              {{ pagination.total }}
              {{ pagination.total === 1 ? 'location' : 'locations' }}
            </p>
            <template #actions>
              <v-btn small outlined @click="tableView = !tableView">
                <v-icon small left>{{
                  tableView ? 'mdi-view-list-outline' : 'mdi-table'
                }}</v-icon>
                {{ tableView ? 'View inspector' : 'View table' }}
              </v-btn>
            </template>
          </ReportResultHeading>
          <template v-if="!tableView">
            <record-inspector
              :records="items"
              :loading="busy"
              title="Location inspector"
            >
              <template #name="{ record }">{{ record.name }}</template>
              <template #subtitle="{ record }">{{
                record.city || record.website || ''
              }}</template>
              <template #detail="{ record }">
                <directory-record-detail
                  :key="record.id"
                  :record="record"
                  kind="location"
                />
              </template>
            </record-inspector>
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
            v-else
            :items="items"
            :headers="tableHeaders"
            :options.sync="tableOptions"
            class="workspace-directory-table"
            no-data-text="No active locations match this search."
            :footer-props="{
              'items-per-page-options': itemsPerPageOptions,
            }"
            :server-items-length="pagination.total"
            @pagination="handlePaginationChange"
          >
            <template #item.status="{ item }">
              <workspace-badge :value="item.status" />
            </template>
            <template #item.created_at="{ item }">
              <formatted-date :date="item.created_at"></formatted-date>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
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
  useContext,
  computed,
} from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'

import swalMixin, { showConfirmDialog, showToast } from '~/utils/swalMixin'
import useClientLocations from '~/services/useClientLocations'

import { Dictionary } from '~/node_modules/@types/lodash'
import FormattedDate from '~/components/FormattedDate.vue'

import RecordInspector from '~/components/RecordInspector.vue'
import DirectoryRecordDetail from '~/components/DirectoryRecordDetail.vue'
import UnauthorizedUser from '~/components/UnauthorizedUser.vue'
import useAxios from '~/plugins/useAxios'

interface IClientRecordsFilter {
  account_manager?: string | null
  status?: string | null
  sort_by?: string | null
  sorting?: string | null
  name?: string | null
}

export default defineComponent({
  components: {
    RecordInspector,
    DirectoryRecordDetail,
    FormattedDate,
    UnauthorizedUser,
  },
  // middleware: 'isAuthenticated',
  setup(_props, { parent, emit }) {
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('create report')
    )
    const statusOptions = ref([])
    const statusOptionsLoading = ref(false)
    const { deleteLocation } = useClientLocations()
    const loadingAccountManagers = ref(false)
    const route = useRoute()
    const $swal2 = swalMixin((parent as any).$swal as any)
    const accountManagers = ref<Array<any>>([])
    const itemsPerPageOptions = ref([20, 50, 100, 500])
    const itemsPerPage = ref(itemsPerPageOptions.value[0])
    const axios = useAxios()
    const defaultFilterValues: IClientRecordsFilter = {
      // search: null,
      // status: '',
      sort_by: `name`,
      sorting: 'asc',
      // account_manager: '',
    }
    const filters = ref<IClientRecordsFilter>(defaultFilterValues)
    const tablePage = ref(1)
    const tableView = ref(false)
    const appliedName = ref('')
    const pagination = ref({
      total: 0,
    })
    const pageCount = computed(() =>
      Math.max(1, Math.ceil(pagination.value.total / itemsPerPage.value))
    )
    const router = useRouter()
    const store = useStore()

    const busy = ref(false)

    const items: any = ref([])

    const tableHeaders = ref([
      {
        text: `Location Name`,
        align: `start`,
        sortable: true,
        value: `name`,
        width: '200px',
      },
      {
        text: `ID`,
        align: `start`,
        sortable: true,
        value: `id`,
        width: '130px',
      },
      {
        text: `Status`,
        align: `start`,
        sortable: true,
        width: '130px',
        value: `status`,
      },
      {
        text: `Source`,
        align: `start`,
        sortable: true,
        width: '160px',
        value: `source`,
      },
      {
        text: `Created At`,
        align: `start`,
        sortable: false,
        width: '120px',
        value: `created_at`,
      },
    ])

    const handleDeleteLocation = (id: any) => {
      showConfirmDialog($swal2, {
        title: 'Delete Location',
        text: 'Are you sure you want to delete this location?',
        icon: 'warning',
      }).then(async (result: any) => {
        if (result.isConfirmed) {
          busy.value = true
          await deleteLocation(id).finally(() => {
            busy.value = false
          })
          showToast($swal2, {
            title: 'Location deleted',
            icon: 'success',
          })
          emit('fetchClient')
        }
        getClientRecords()
      })
    }
    // set the page breadcrumbs
    const breadcrumbs = [
      {
        text: `Dashboard`,
        to: `/`,
        disabled: false,
      },
      {
        text: pageNames.locations,
        to: `/all-locations`,
        disabled: true,
      },
    ]

    const sortingOptions = [
      { text: `Ascending`, value: `asc` },
      { text: `Descending`, value: `desc` },
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

        handleFilterApply()
      },
      { deep: true }
    )

    const pageTitle = pageNames.locations

    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    let recordsRequest = 0
    const getClientRecords = () => {
      const request = ++recordsRequest

      busy.value = true
      axios
        .get('/locations', {
          params: {
            name: filters.value.name,
            limit: itemsPerPage.value,
            page: tablePage.value,
          },
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${(store.state as any).cred.cred}`,
          },
        })
        .then((resp) => {
          if (request !== recordsRequest) return
          items.value = resp.data.data.result
          pagination.value = resp.data.data.pagination
        })
        .catch(() => {
          if (request === recordsRequest) {
            items.value = []
            pagination.value = { total: 0 }
          }
        })
        .finally(() => {
          if (request === recordsRequest) busy.value = false
        })
    }

    const handleFilterApply = (resetPage = false) => {
      if (resetPage) tablePage.value = 1
      router.push({
        path: router.currentRoute.path,
        query: {
          page: tablePage.value.toString(),
          itemsPerPage: itemsPerPage.value.toString(),
          ...(filters.value as Dictionary<
            string | (string | null)[] | null | undefined
          >),
        },
      })
      // getClientRecords()
    }

    const clearSearch = () => {
      filters.value.name = ''
      handleFilterApply(true)
    }

    const goToPage = (page: number) => {
      tablePage.value = page
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

      filters.value = { ...defaultFilterValues, ...query }
      appliedName.value = typeof query.name === 'string' ? query.name : ''
      getClientRecords()
    }

    const handlePaginationChange = (e: any) => {
      itemsPerPage.value = e.itemsPerPage === -1 ? 500 : e.itemsPerPage
      // tablePage.value = e.page
      // handleFilterApply()
      // getClientRecords()
    }

    watch(route, () => {
      loadFiltersFromURL()
      // getClientRecords()
    })

    onBeforeMount(() => {
      loadFiltersFromURL()
    })

    onMounted(() => {
      // getClientRecords()
    })

    return {
      pageNames,
      tableOptions,
      tableView,
      appliedName,
      clearSearch,
      tablePage,
      pageCount,
      goToPage,
      statusOptionsLoading,
      statusOptions,
      sortingOptions,
      tableHeaders,
      items,
      getClientRecords,
      busy,
      itemsPerPageOptions,
      pagination,
      handlePaginationChange,
      accountManagers,
      handleFilterApply,
      loadingAccountManagers,
      filters,
      handleDeleteLocation,
      nonAccountManagerUserRole,
    }
  },
  head: {
    title: pageNames.locations,
  },
})
</script>
