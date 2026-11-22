<template>
  <span>
    <v-autocomplete
      ref="autoComplete"
      v-model="inputValue"
      label="Search for a client"
      clearable
      placeholder="Search for a client"
      :items="clientsList"
      :loading="clientsListLoading"
      item-text="name"
      :filter="() => true"
      item-value="id"
      :no-data-text="
        clientsListLoading === false && searchInput && searchInput.length > 0
          ? 'No Results found'
          : clientsListLoading
          ? 'Loading'
          : 'Search something'
      "
      :search-input.sync="searchInput"
      @keydown="fetchClients(searchInput)"
      @change="onChange"
    ></v-autocomplete>
  </span>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  onMounted,
  useRouter,
  watch,
} from '@nuxtjs/composition-api'
import { omit } from 'lodash'
import useApi from '~/services/useApi'
import useClientRecords from '~/services/useClientRecords'

let timeout: any

export default defineComponent({
  props: {
    value: { type: [String, Number], default: undefined },
    urlQueryParam: {
      type: String,
      default: 'client',
    },
  },
  setup(props, { emit }) {
    const { urlQueryParam } = props
    const router = useRouter()
    const clientsListLoading = ref(false)
    const searchInput = ref(router.currentRoute.query.client_name)
    const clientsList = ref<any>([])
    const autoComplete = ref()
    const { get } = useApi()
    const { clientById } = useClientRecords()

    const inputValue = ref()

    const fetchClients = () => {
      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        if (searchInput.value) {
          clientsListLoading.value = true
          const res = await get(
            `/clients?name=${searchInput.value}&limit=100`,
            {
              withCredentials: true,
            }
          )
          clientsList.value = res.data.data.result
          clientsListLoading.value = false
        }
      }, 300)
    }

    const fetchSelectedClient = (id: string | number) => {
      clientsListLoading.value = true
      clientById(id)
        .then((resp) => {
          const fetchedClient = omit(resp.data.data, [
            'locations',
            'status',
            'staff',
            'account_manager',
          ])
          clientsList.value = [fetchedClient as any]
          inputValue.value = +id
        })
        .finally(() => {
          clientsListLoading.value = false
        })
    }

    onMounted(() => {
      const id = router.currentRoute.query[urlQueryParam]
      if (typeof id === 'string' && id) fetchSelectedClient(id)
    })

    if (process.env.SHOWCASE_MODE === 'true') {
      watch(
        () => props.value,
        (id) => {
          if (id && Number(id) !== inputValue.value) fetchSelectedClient(id)
        },
        { immediate: true }
      )
    }

    const onChange = () => {
      const client = clientsList.value.find(
        (c: any) => c.id === inputValue.value
      )
      emit('input', inputValue.value)
      emit('change', inputValue.value, client)
    }

    watch(searchInput, () => {
      if (!searchInput.value) {
        clientsList.value = []
      }
    })

    return {
      clientsListLoading,
      searchInput,
      clientsList,
      fetchClients,
      inputValue,
      autoComplete,
      onChange,
    }
  },
})
</script>
