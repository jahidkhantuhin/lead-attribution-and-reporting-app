<template>
  <v-form
    v-model="formValid"
    @submit.prevent="formValid && !busy && (locationId ? submit2() : submit())"
  >
    <RecordFormCard title="Assign locations to a client" :loading="busy">
      <v-card-text>
        <v-autocomplete
          ref="autoComplete"
          v-model="formData.client_id"
          dense
          outlined
          hide-details="auto"
          label="Client *"
          clearable
          placeholder="Search for a client *"
          :items="clientsList"
          :loading="clientsListLoading"
          item-text="name"
          :filter="() => true"
          item-value="id"
          :no-data-text="
            clientsListLoading === false &&
            searchInput &&
            searchInput.length > 0
              ? 'No Results found'
              : clientsListLoading
              ? 'Loading'
              : 'Search something'
          "
          :search-input.sync="searchInput"
          :rules="rules.client_id"
          @keydown="fetchClients(searchInput)"
          @change="onChange"
        >
        </v-autocomplete>
      </v-card-text>
      <v-card-text v-if="!locationId">
        <v-autocomplete
          v-model="formData.location_ids"
          dense
          outlined
          hide-details="auto"
          :items="entries"
          :loading="isLoading"
          :search-input.sync="search"
          hide-no-data
          hide-selected
          item-text="name"
          :filter="() => true"
          item-value="id"
          label="Locations *"
          placeholder="Start typing to Search"
          chips
          deletable-chips
          multiple
          clearable
          :rules="rules.location_ids"
        >
        </v-autocomplete>
      </v-card-text>
      <v-card-text v-if="locationId">
        <v-text-field
          dense
          outlined
          hide-details="auto"
          label="Location"
          :value="'' + locationName + ''"
          readonly
        >
        </v-text-field>
      </v-card-text>
      <v-card-actions>
        <RequiredFieldsNote />
        <v-spacer></v-spacer>
        <v-btn :disabled="busy" @click="$emit('cancel')">Cancel</v-btn>
        <v-btn
          :disabled="!formValid || busy"
          :loading="busy"
          color="primary"
          type="submit"
        >
          Assign locations
        </v-btn>
      </v-card-actions>
    </RecordFormCard>
  </v-form>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  useRouter,
  watch,
} from '@nuxtjs/composition-api'
import useLocationRecords from '@/services/useLocationRecords'
import RecordFormCard from './RecordFormCard.vue'
import RequiredFieldsNote from '~/components/RequiredFieldsNote.vue'

import SwalMixin, { showToast } from '~/utils/swalMixin'

import useApi from '~/services/useApi'

let timeout: any

interface Client {
  client_id?: string
  location_ids?: any[]
}

export default defineComponent({
  components: { RecordFormCard, RequiredFieldsNote },
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
    const $swal = SwalMixin((parent as any).$swal as any)
    const formValid = ref(false)
    const busy = ref(false)
    const clientStatus = ref(false)
    const isChangingStatus = ref(false)
    const router = useRouter()
    const clientsListLoading = ref(false)
    const searchInput = ref(router.currentRoute.query.client_name)
    const clientsList = ref<any>([])
    const autoComplete = ref()
    const { get } = useApi()
    const entries = ref<any>([])
    const isLoading = ref(false)
    const search = ref(null)
    const { list, create } = useLocationRecords()

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
      client_id: [(v: string | number) => !!v || 'Client is required'],
      location_ids: [(v: any) => !!v || 'Location is required'],
      // location_ids: [(v: any) => v.map((e: any) => {
      //   return !!(e.id.length > 0) || 'Location is required'
      // })],
    }

    const locationRemove = (locationIndex: number) => {
      locations.value.splice(locationIndex, 1)
    }

    const submit = () => {
      busy.value = true
      create({
        ...formData.value,
      })
        .then((_resp) => {
          showToast($swal, {
            title: `Location Successfully added!`,
          })

          router.push(`/location-settings`)
        })
        .finally(() => (busy.value = false))
    }
    const submit2 = () => {
      busy.value = true
      create({
        client_id: formData.value.client_id,
        location_ids: [locationId.value],
      })
        .then((_resp) => {
          showToast($swal, {
            title: `Location Successfully added!`,
          })

          router.push(`/location-settings`)
        })
        .finally(() => (busy.value = false))
    }

    const isEditing = computed(() => {
      const id = _props.id

      if (id && typeof +id === 'number') {
        return true
      }

      return false
    })

    return {
      locations,
      formValid,
      rules,
      formData,
      submit,
      locationRemove,
      isEditing,
      clientStatus,
      isChangingStatus,
      busy,
      clientsListLoading,
      searchInput,
      clientsList,
      fetchClients,
      inputValue,
      autoComplete,
      onChange,
      entries,
      isLoading,
      search,
      locationId,
      locationName,
      submit2,
    }
  },
})
</script>

<style lang="scss" scoped>
.location-card {
  padding: 20px;
  margin-bottom: 20px;
  .heading {
    color: #898989;
    font-size: 13px;
    font-weight: 400;
    position: relative;
    top: -8px;
  }
}

.form-card {
  padding: 12px 22px;
}

.location-card-create {
  margin-top: 20px;
  padding: 24px 0;
  text-align: center;
  border: 1px solid #f9f9f9;
  cursor: pointer;
  h4 {
    color: #939393;
    font-weight: 400;
  }
  &:hover,
  &:focus {
    border-color: #e6e6e6;
  }
}
</style>
