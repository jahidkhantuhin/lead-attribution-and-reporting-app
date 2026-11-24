<template>
  <div class="workspace-report-stack">
    <v-alert v-if="connectedToVpn" type="warning" dense class="mb-0">
      Disconnect from the VPN before adding an IP address.
      <v-btn small text @click="refreshPage">Refresh status</v-btn>
    </v-alert>
    <v-card flat class="workspace-filter-panel">
      <v-card-title>Request VPN access</v-card-title>
      <v-form
        v-model="formValid"
        @submit.prevent="formValid && !connectedToVpn && !busy && submit()"
      >
        <v-card-text class="directory-vpn-fields">
          <v-autocomplete
            v-model="formData.url"
            label="Website"
            clearable
            outlined
            dense
            hide-details="auto"
            :items="clientsList"
            :loading="clientsListLoading"
            item-text="url"
            :filter="() => true"
            item-value="url"
            :search-input.sync="searchInput"
            :rules="rules.url"
            @keydown="fetchClients(searchInput)"
            @change="onChange"
          />
          <v-select
            v-model="formData.number_of_hours"
            label="Access duration"
            :items="numberOfHours"
            :rules="rules.number_of_hours"
            clearable
            outlined
            dense
            hide-details="auto"
          />
          <v-text-field
            v-model="formData.ip"
            label="IP address"
            :rules="rules.ip"
            :clearable="adminUser"
            :readonly="!adminUser"
            outlined
            dense
            hide-details="auto"
          />
          <v-btn
            type="submit"
            depressed
            color="primary"
            :disabled="!formValid || connectedToVpn || busy"
            :loading="busy"
          >
            Request access
          </v-btn>
        </v-card-text>
      </v-form>
    </v-card>
    <v-card :loading="busy" flat>
      <ReportResultHeading title="VPN activity log">
        <p>
          {{ pagination.total }}
          {{ pagination.total === 1 ? 'entry' : 'entries' }}
        </p>
      </ReportResultHeading>
      <v-data-table
        :items="items"
        :headers="tableHeaders"
        :options.sync="tableOptions"
        class="workspace-directory-table"
        no-data-text="No VPN activity to display."
        :footer-props="{
          'items-per-page-options': itemsPerPageOptions,
        }"
        :server-items-length="pagination.total"
        @pagination="handlePaginationChange"
      >
        <template #item.expiry_date="{ item }">
          <formatted-date :date="item.expiry_date" />
        </template>
        <template #item.user.status="{ item }">
          <workspace-badge :value="item.user && item.user.status" />
        </template>
        <template #item.user && item.user.first_name="{ item }">
          <span>
            {{ item.user && item.user.first_name }}
            {{ item.user && item.user.last_name }}
          </span>
        </template>
        <template #item.actions="{ item }">
          <v-menu>
            <template #activator="{ on, attrs }">
              <v-btn small v-bind="attrs" v-on="on"> Actions </v-btn>
            </template>
            <v-list>
              <v-list-item
                title="Remove VPN access"
                @click="handleDeleteIP(item.id)"
              >
                <v-list-item-title>Remove access</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  watch,
  useRouter,
  useStore,
  useRoute,
  onBeforeMount,
  useContext,
  computed,
} from '@nuxtjs/composition-api'
// import swalMixin, { showConfirmDialog, showToast } from '~/utils/swalMixin'
import useClientRecords from '@/services/useClientRecords'

import useLocationRecords from '@/services/useLocationRecords'
import { pageNames } from '~/shared/PageNames'

// import { AM_ROLE } from '~/utils/UserEnums'
// import { Dictionary } from '~/node_modules/@types/lodash'
import FormattedDate from '~/components/FormattedDate.vue'

import useAxios from '~/plugins/useAxios'

// import LocationForm from './LocationForm.vue'
// import StaffForm from './StaffForm.vue'
import swalMixin, { showConfirmDialog, showToast } from '~/utils/swalMixin'
// import useUsers from '~/services/useUsers'
import useApi from '~/services/useApi'
// import useAxios from '~/plugins/useAxios'

let timeout: any

interface Client {
  url?: string
  ip?: string
  location_ids?: any[]
}

export default defineComponent({
  components: {
    FormattedDate,
  },
  middleware: 'isAuthenticated',
  props: {
    id: {
      type: [String, Number],
      default: undefined,
    },
    name: {
      type: [String, Number],
      default: undefined,
    },
  },
  setup(_props, { parent }) {
    const { $auth } = useContext()

    const breadcrumbs = [
      {
        text: `Dashboard`,
        to: `${!$auth.hasScope('create report') ? '/reports' : '/'}`,
        disabled: false,
      },
      {
        text: pageNames.vpn,
        to: `/vpn-setup`,
        disabled: true,
      },
    ]
    const store = useStore()
    const pageTitle = pageNames.vpn
    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    // Added for VPN Activity Log
    const nonAccountManagerUserRole = computed(
      () => !$auth.hasScope('vpn access')
    )
    const axios = useAxios()

    const statusOptions = ref([])
    const statusOptionsLoading = ref(false)

    const loadingAccountManagers = ref(false)
    const route = useRoute()
    // const $swal2 = swalMixin((parent as any).$swal as any)
    const accountManagers = ref<Array<any>>([])
    const itemsPerPageOptions = ref([20, 50, 100, 500])
    const itemsPerPage = ref(itemsPerPageOptions.value[0])
    // const filters = ref<IClientRecordsFilter>(defaultFilterValues)
    const tablePage = ref(1)
    const pagination = ref({
      total: 0,
    })
    const router = useRouter()
    // const store = useStore()
    const { list } = useClientRecords()

    const busy = ref(false)

    const items: any = ref([])

    const tableHeaders = computed(() => {
      return $auth.user?.role === 'super admin'
        ? [
            {
              text: `Actions`,
              align: `start`,
              width: '130px',
              sortable: false,
              value: `actions`,
            },
            {
              text: `User Name`,
              align: `start`,
              sortable: true,
              value: `user.first_name`,
              width: '200px',
            },
            {
              text: `Status`,
              align: `start`,
              sortable: true,
              width: '130px',
              value: `user.status`,
            },

            {
              text: `Site`,
              align: `start`,
              sortable: true,
              width: '130px',
              value: `site.url`,
            },
            {
              text: `IP Address`,
              align: `start`,
              sortable: true,
              width: '160px',
              value: `ip`,
            },
            {
              text: `Expiry Date`,
              align: `start`,
              width: '130px',
              sortable: false,
              value: `expiry_date`,
            },
          ]
        : [
            {
              text: `User Name`,
              align: `start`,
              sortable: true,
              value: `user.first_name`,
              width: '200px',
            },
            {
              text: `Status`,
              align: `start`,
              sortable: true,
              width: '130px',
              value: `user.status`,
            },

            {
              text: `Site`,
              align: `start`,
              sortable: true,
              width: '130px',
              value: `site.url`,
            },
            {
              text: `IP Address`,
              align: `start`,
              sortable: true,
              width: '160px',
              value: `ip`,
            },
            {
              text: `Expiry Date`,
              align: `start`,
              width: '130px',
              sortable: false,
              value: `expiry_date`,
            },
          ]
    })

    // const handleDeleteLocation = (id: any) => {
    //   showConfirmDialog($swal2, {
    //     title: 'Delete Location',
    //     text: 'Are you sure you want to delete this location?',
    //     icon: 'warning',
    //   }).then(async (result: any) => {
    //     if (result.isConfirmed) {
    //       busy.value = true
    //       await deleteLocation(id).finally(() => {
    //         busy.value = false
    //       })
    //       showToast($swal2, {
    //         title: 'Location deleted',
    //         icon: 'success',
    //       })
    //       emit('fetchClient')
    //     }
    //     getClientRecords()
    //   })

    // }
    // set the page breadcrumbs
    // const breadcrumbs = [
    //   {
    //     text: `Dashboard`,
    //     to: `${!$auth.hasScope('create report') ? '/reports' : '/'}`,
    //     disabled: false,
    //   },
    //   {
    //     text: `VPN activity log'`,
    //     to: `/client-records`,
    //     disabled: true,
    //   },
    // ]

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

        // if (tableOptions.value.sortBy[0]) {
        //   filters.value.sort_by =
        //     tableOptions.value.sortBy[0] === 'fullname'
        //       ? 'first_name'
        //       : tableOptions.value.sortBy[0]
        //   filters.value.sorting = tableOptions.value.sortDesc[0]
        //     ? 'desc'
        //     : 'asc'
        // }

        handleFilterApply()
      },
      { deep: true }
    )

    // const pageTitle = `Client Records`

    // store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    const getClientRecords = () => {
      // if (busy.value === false) {
      //   const appliedFilters = {
      //     ...filters.value,
      //     sort_by:
      //       filters.value.sort_by + `:` + filters.value?.sorting?.toLowerCase(),
      //   }

      busy.value = true
      axios
        .get('/vpn-access', {
          params: {
            limit: itemsPerPage.value,
            page: tablePage.value,
          },
          withCredentials: true,
        })
        .then((resp) => {
          items.value = resp.data.data.result
          pagination.value = resp.data.data.pagination
        })
        .finally(() => {
          busy.value = false
        })
      // }
    }

    const handleFilterApply = () => {
      router.push({
        path: router.currentRoute.path,
        query: {
          page: tablePage.value.toString(),
          itemsPerPage: itemsPerPage.value.toString(),
          // ...(filters.value as Dictionary<
          //   string | (string | null)[] | null | undefined
          // >),
        },
      })
      // getClientRecords()
    }
    const loadFiltersFromURL = () => {
      const query = route.value.query
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

      // filters.value = { ...defaultFilterValues, ...query }
      getClientRecords()
    }

    const handlePaginationChange = (e: any) => {
      itemsPerPage.value = e.itemsPerPage === -1 ? 500 : e.itemsPerPage
      // tablePage.value = e.page
      // handleFilterApply()
      // getClientRecords()
    }

    // watch(route, () => {
    //   loadFiltersFromURL()
    //   // getClientRecords()
    // })

    onBeforeMount(() => {
      loadFiltersFromURL()
      // getAccountManagers()
      // getClientRecords()
    })

    // Adding for VPN Setup Form
    // const { $auth } = useContext()
    const adminUser = computed(
      () => $auth.user?.role === 'admin' || $auth.user?.role === 'super admin'
    )
    const refreshPage = () => {
      window.location.reload()
    }
    const connectedToVpn = ref(false)
    const $swal = swalMixin((parent as any).$swal as any)
    const formValid = ref(false)
    // const busy = ref(false)
    const clientStatus = ref(false)
    const isChangingStatus = ref(false)
    // const router = useRouter()
    const clientsListLoading = ref(false)
    const searchInput = ref(router.currentRoute.query.client_name)
    const clientsList = ref<any>([])
    const { get } = useApi()
    const entries = ref<any>([])
    const isLoading = ref(false)
    const search = ref(null)
    const { create } = useLocationRecords()
    // const axios = useAxios()
    const numberOfHours = ref([
      { text: 72, value: 72 },
      { text: 96, value: 96 },
    ])

    watch(search, () => {
      if (entries.length > 0) {
        return
      }
      if (isLoading.value) {
        return
      }

      isLoading.value = true
      list({})
        .then((resp) => {
          entries.value = resp.data.data.result ? resp.data.data.result : []
        })
        .catch((_err) => {})
        .finally(() => (isLoading.value = false))
    })

    const inputValue = ref<Array<string | number> | string | null | number>([])

    const fetchClients = () => {
      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        if (searchInput.value) {
          clientsListLoading.value = true
          const res = await get(
            `/sites?name=${searchInput.value}&date_start=2022-08-01&date_end=2022-08-31`
          )
          clientsList.value = res.data.data.result
          clientsListLoading.value = false
        }
      }, 300)
    }

    const onChange = () => {}

    watch(searchInput, () => {
      if (!searchInput.value) {
        clientsList.value = []
      }
    })

    const locationId = ref(router.currentRoute.query.id)

    const locationName = ref(router.currentRoute.query.name)
    const formData = ref<Client>({})

    const locations = ref([])

    const rules = {
      url: [(v: string | number) => !!v || 'Client is required'],
      ip: [
        (v: string | number) => !!v || 'IP Address is required',
        (v: string) =>
          /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
            v
          ) || 'IP Address must be valid',
      ],
      number_of_hours: [(v: string | number) => !!v || 'Period is required'],

      //   return !!(e.id.length > 0) || 'Location is required'
      // })],
    }

    const locationRemove = (locationIndex: number) => {
      locations.value.splice(locationIndex, 1)
    }

    const submit = () => {
      busy.value = true
      axios
        .post(
          '/vpn-access',
          { ...formData.value },
          {
            withCredentials: true,
          }
        )
        .then((_resp) => {
          loadFiltersFromURL()
          showToast($swal, {
            title: `Request Successfully Sent!`,
          })
        })
        .finally(() => (busy.value = false))
    }
    const submit2 = () => {
      busy.value = true
      create({
        url: formData.value.url,
        location_ids: [locationId.value],
      })
        .then((_resp) => {
          showToast($swal, {
            title: `Location Successfully added!`,
          })

          router.push(`/location-records`)
        })
        .finally(() => (busy.value = false))
    }

    const handleDeleteIP = (id: any) => {
      showConfirmDialog($swal, {
        title: 'Delete IP',
        text: 'Are you sure you want to delete this IP?',
        icon: 'warning',
      }).then(async (result: any) => {
        if (result.isConfirmed) {
          busy.value = true
          await axios
            .delete(`/vpn-access/${id}`, {
              withCredentials: true,
            })
            .finally(() => {
              busy.value = false
            })
          showToast($swal, {
            title: 'IP deleted',
            icon: 'success',
          })
        }
        getClientRecords()
      })
    }

    const isEditing = computed(() => {
      const id = _props.id

      if (id && typeof +id === 'number') {
        return true
      }

      return false
    })
    onBeforeMount(async () => {
      // isLoading.value = true
      await axios
        .get('', { baseURL: 'https://api.ipify.org/?format=json' })
        .then((resp) => {
          // isLoading.value = false
          if (
            resp.data.ip === '34.238.213.152' ||
            resp.data.ip === '54.179.205.95'
          ) {
            connectedToVpn.value = true
          } else {
            connectedToVpn.value = false
          }
          formData.value.ip = resp.data.ip
          // console.log('IP ADDRESS', resp.data.ip)
        })
    })

    return {
      tableOptions,
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
      nonAccountManagerUserRole,
      locations,
      formValid,
      rules,
      formData,
      submit,
      locationRemove,
      isEditing,
      clientStatus,
      isChangingStatus,
      handleDeleteIP,
      // busy,
      clientsListLoading,
      searchInput,
      clientsList,
      fetchClients,
      inputValue,
      onChange,
      entries,
      isLoading,
      search,
      locationId,
      locationName,
      submit2,
      numberOfHours,
      adminUser,
      connectedToVpn,
      refreshPage,
    }
  },
  head: {
    title: pageNames.vpn,
  },
})
</script>
