<template>
  <v-row dense class="workspace-directory">
    <v-col cols="12">
      <v-card class="workspace-filter-panel">
        <v-form @submit.prevent="handleFilterApply">
          <v-card-title>
            <v-icon left>mdi-filter</v-icon>
            {{ $t('message.filters') }}
          </v-card-title>
          <v-card-text class="directory-user-filters">
            <v-select
              v-model="filters.role"
              dense
              outlined
              hide-details
              :items="roles"
              :item-text="(item) => item.name.replace(/_/g, ' ')"
              :item-value="(item) => item.name"
              :loading="loadingRoles"
              label="Role"
              clearable
            ></v-select>

            <v-text-field
              v-model="filters.search"
              dense
              outlined
              hide-details
              label="Search team members"
              prepend-inner-icon="mdi-magnify"
              clearable
              maxlength="250"
            ></v-text-field>

            <v-select
              v-model="filters.status"
              dense
              outlined
              hide-details
              :items="activeOptions"
              clearable
              label="Status"
            ></v-select>

            <v-select
              v-model="filters.sort_by"
              dense
              outlined
              hide-details
              label="Sort by"
              :items="sortByOptions"
            ></v-select>
            <v-select
              v-model="filters.sorting"
              dense
              outlined
              hide-details
              label="Sort direction"
              :items="sortingOptions"
            ></v-select>
          </v-card-text>
          <v-card-actions>
            <v-btn type="submit" color="primary" depressed>
              <v-icon left>mdi-check</v-icon>
              {{ $t('buttons.apply') }}
            </v-btn>
            <v-btn link nuxt to="/users" plain>Clear</v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card>
        <ReportResultHeading :title="pageNames.users">
          <p>
            {{ pagination.total }}
            {{ pagination.total === 1 ? 'member' : 'members' }}
          </p>
          <template #actions>
            <v-btn small depressed color="primary" nuxt to="/users/add">
              <v-icon small left>mdi-account-plus</v-icon> Add team member
            </v-btn>
          </template>
        </ReportResultHeading>
        <v-data-table
          :loading="busy"
          :options.sync="tableOptions"
          :items="users"
          :headers="tableHeaders"
          :items-per-page="itemsPerPage"
          :page="page"
          :footer-props="{
            'items-per-page-options': itemsPerPageOptions,
          }"
          :server-items-length="pagination.total"
          class="workspace-directory-table"
          no-data-text="No team members match these filters."
          @pagination="handlePaginationChange"
        >
          <template #item.fullname="{ item }">
            <span class="user-name">{{ item.fullname }}</span>
          </template>
          <template #item.role="{ item }">
            <workspace-badge :value="item.role" kind="role" />
          </template>
          <template #item.status="{ item }">
            <workspace-badge :value="item.status" />
          </template>
          <template #item.actions="{ item }">
            <v-menu
              v-if="
                ($store.getters['users/isAllowed']('update user') &&
                  isUserAllowedToEdit(item, $auth.user)) ||
                ($store.getters['users/isAllowed']('delete user') &&
                  isUserAllowedToEdit(item, $auth.user))
              "
            >
              <template #activator="{ on, attrs }">
                <v-btn small outlined v-bind="attrs" v-on="on"> Actions </v-btn>
              </template>
              <v-list>
                <v-list-item
                  v-if="
                    $store.getters['users/isAllowed']('update user') &&
                    isUserAllowedToEdit(item, $auth.user)
                  "
                  :to="`/users/${item.id}/edit`"
                  title="Edit User"
                >
                  <v-list-item-title>Edit</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-if="
                    $store.getters['users/isAllowed']('delete user') &&
                    isUserAllowedToEdit(item, $auth.user)
                  "
                  title="Delete User"
                  @click="handleDeleteUser(item.id)"
                >
                  <v-list-item-title>Delete</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  onBeforeMount,
  ref,
  useRoute,
  useRouter,
  useStore,
  watch,
} from '@nuxtjs/composition-api'
import { IBreadcrumbs } from '@/store'

import useUsers from '@/services/useUsers'
import { pageNames } from '~/shared/PageNames'
import { Dictionary } from '~/node_modules/@types/lodash'

import isUserAllowedToEdit from '~/utils/isUserAllowedToEdit'
import swalMixin, { showConfirmDialog, showToast } from '~/utils/swalMixin'

// we are naming these based on the API requirements
interface IUsersFilter {
  role?: number | null
  search?: string | null
  status?: string | null
  sort_by?: string
  sorting: 'asc' | 'desc'
}

interface IFilterSelectOption {
  text: string
  value: string | number | boolean | null | Array<string | number | boolean>
}

export default defineComponent({
  components: {},
  middleware: 'isAuthenticated',
  setup(_props, { parent }) {
    const itemsPerPageOptions = ref([20, 50, 100, 500])
    const itemsPerPage = ref(itemsPerPageOptions.value[0])
    const page = ref(1)

    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const usersApi = useUsers()
    const busy = ref(false)
    const $swal2 = swalMixin((parent as any).$swal as any)

    // set the page breadcrumbs
    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: `Dashboard`,
        to: `/`,
      },
      {
        text: pageNames.users,
        to: `/users`,
      },
    ]

    const pageTitle = pageNames.users

    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    // filters
    const defaultFilterValus: IUsersFilter = {
      role: null,
      search: null,
      status: 'active',
      sort_by: `first_name`,
      sorting: 'asc',
    }
    const filters = ref<IUsersFilter>(defaultFilterValus)

    const activeOptions: IFilterSelectOption[] = [
      {
        text: `Any`,
        value: null,
      },
      {
        text: `Active Only`,
        value: `active`,
      },
      {
        text: `Disabled Only`,
        value: `inactive`,
      },
    ]

    const sortByOptions: IFilterSelectOption[] = [
      {
        text: `Name`,
        value: `first_name`,
      },
      {
        text: `Active Status`,
        value: `status`,
      },
    ]

    const sortingOptions: IFilterSelectOption[] = [
      { text: `Ascending`, value: `asc` },
      { text: `Descending`, value: `desc` },
    ]

    const handleFilterApply = () => {
      router.push({
        path: router.currentRoute.path,
        query: {
          page: page.value.toString(),
          itemsPerPage: itemsPerPage.value.toString(),
          ...(filters.value as Dictionary<
            string | (string | null)[] | null | undefined
          >),
        },
      })
    }

    // users
    const users = ref([])
    const pagination = ref({
      total: 0,
    })

    const getUsers = () => {
      if (busy.value === false) {
        // first, transform the sort_by filter to use with the
        // axios request
        const appliedFilters = {
          ...filters.value,
          sort_by:
            filters.value.sort_by + `:` + filters.value.sorting.toLowerCase(),
        }
        busy.value = true
        usersApi
          .list({
            ...appliedFilters,
            limit: itemsPerPage.value,
            page: page.value,
          })
          .then((response) => {
            users.value = response.data.data.result
            pagination.value = response.data.data.pagination
          })
          .catch((_error) => {})
          .finally(() => (busy.value = false))
      }
    }

    // roles
    const roles = ref([])
    const loadingRoles = ref(false)

    const getRoles = () => {
      loadingRoles.value = true
      usersApi
        .getRoles()
        .then(
          ({ data }) =>
            (roles.value = data.data.filter(
              // exclude super admin
              (item: { name: string | string[] }) =>
                !item.name.includes('super admin')
            ))
        )
        .catch(({ response }) => console.error(`getRoles error`, response))
        .finally(() => (loadingRoles.value = false))
    }

    // data table
    const tableHeaders = ref([
      {
        text: `Name`,
        align: `start`,
        sortable: true,
        value: `fullname`, // @TODO: change to fullname
      },
      {
        text: `Role`,
        align: `start`,
        sortable: false,
        value: `role`,
      },
      { text: 'Status', value: 'status', sortable: false },
      {
        text: `Actions`,
        align: `middle`,
        sortable: false,
        value: `actions`,
      },
    ])

    const tableOptions = ref<any>({})

    watch(
      tableOptions,
      () => {
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

    const handleDeleteUser = (id: any) => {
      showConfirmDialog($swal2, {
        title: 'Are you sure you want to delete this user?',
        text:
          'This action is permanent. If you delete this user, all of their data will be deleted as well. Are you certain you want to proceed with this action?',
        icon: 'warning',
      }).then(async (result: any) => {
        if (result.isConfirmed) {
          busy.value = true
          await usersApi.deleteUser(id)
          showToast($swal2, {
            title: 'User deleted',
            icon: 'error',
          })
          busy.value = false
          getUsers()
        }
      })
    }

    const handlePaginationChange = (e: any) => {
      itemsPerPage.value = e.itemsPerPage === -1 ? 500 : e.itemsPerPage
      page.value = e.page
      handleFilterApply()
      getUsers()
    }

    const loadFiltersFromURL = () => {
      const query = route.value.query
      if (query.page) {
        page.value = +query.page
        delete query.page
      } else {
        page.value = 1
      }
      if (query.itemsPerPage) {
        itemsPerPage.value = +query.itemsPerPage
        delete query.itemsPerPage
      } else {
        itemsPerPage.value = 20
      }
      filters.value = { ...defaultFilterValus, ...query }
    }

    // others
    watch(route, () => {
      loadFiltersFromURL()
      getUsers()
    })

    onBeforeMount(() => {
      loadFiltersFromURL()
    })

    onMounted(() => {
      getUsers()
      getRoles()
    })

    return {
      pageNames,
      isUserAllowedToEdit,
      filters,
      activeOptions,
      sortByOptions,
      sortingOptions,
      handleFilterApply,
      roles,
      loadingRoles,
      users,
      pagination,
      busy,
      tableHeaders,
      itemsPerPage,
      itemsPerPageOptions,
      tableOptions,
      handleDeleteUser,
      handlePaginationChange,
      page,
    }
  },
  head: {
    title: pageNames.users,
  },
})
</script>

<style scoped>
.user-name {
  /* position: relative;
  top: -6px;
  left: 5px; */
}
</style>
