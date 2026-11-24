<template>
  <span>
    <v-autocomplete
      v-model="inputValue"
      :dense="compact"
      :outlined="compact"
      :hide-details="compact"
      :placeholder="
        (multiple && inputValue.length === 0) || !inputValue
          ? 'Select location'
          : ''
      "
      :prefix="
        (multiple && inputValue.length === 0) || !inputValue
          ? 'Select location'
          : ''
      "
      :style="compact ? undefined : { marginTop: '8px' }"
      no-data-text="Search locations"
      :search-input.sync="searchInput"
      :loading="busy"
      :items="locationList"
      :disabled="!client"
      item-text="name"
      item-value="id"
      small-chips
      deletable-chips
      :multiple="multiple"
      :filter="() => true"
      @change="onChange"
    >
      <v-list-tile
        v-if="locationList.length > 1 && showButton"
        slot="prepend-item"
        class="grey--text"
      >
        <v-btn color="success" @click="selectAll">Select all</v-btn>
      </v-list-tile>
      <v-list-tile
        v-if="locationList.length > 1 && showButton"
        slot="prepend-item"
        class="grey--text ml-2"
      >
        <v-btn color="error" @click="deSelectAll">Deselect all</v-btn>
      </v-list-tile>
    </v-autocomplete>
  </span>
</template>

<script lang="ts">
import {
  defineComponent,
  onBeforeMount,
  ref,
  useRouter,
  watch,
} from '@nuxtjs/composition-api'
import useClientLocations from '~/services/useClientLocations'

export default defineComponent({
  props: {
    compact: {
      type: Boolean,
      default: false,
    },
    client: {
      type: [String, Number],
      default: null,
    },
    multiple: {
      type: [Boolean],
      default: true,
    },
    showButton: {
      type: [Boolean],
      default: false,
    },
  },
  setup(props, { emit }) {
    const searchInput = ref('')
    const busy = ref(false)
    const { clientLocations } = useClientLocations()
    const locationList = ref([])
    const router = useRouter()
    const inputValue = ref<Array<string | number> | string | null | number>([])

    const onChange = () => {
      emit('input', inputValue.value)
      emit('change', inputValue.value)
    }
    const selectAll = () => {
      inputValue.value = [...locationList.value]
    }
    const deSelectAll = () => {
      inputValue.value = []
    }

    const fetchLocations = () => {
      busy.value = true
      clientLocations(props.client)
        .then((res) => {
          locationList.value = res.data?.data?.result
          if (!locationList.value.length) {
            inputValue.value = props.multiple ? [] : null
            onChange()
            return
          }
          const firstOption = (locationList.value.sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          )[0] as any).id
          const selected =
            router.currentRoute.query.location_ids ?? inputValue.value
          const locationFromUrl = (Array.isArray(selected)
            ? selected
            : [selected]
          )
            .filter(Boolean)
            .map((item) => Number(item))
          if (locationList.value.length === 1) {
            inputValue.value = props.multiple ? [firstOption] : firstOption
            onChange()
          } else if (locationList.value.length > 1) {
            inputValue.value = props.multiple
              ? locationFromUrl
              : locationList.value.some(
                  (location: { id: number }) =>
                    location.id === locationFromUrl[0]
                )
              ? locationFromUrl[0]
              : firstOption
            onChange()
            // selectAll()
          }
        })
        .finally(() => {
          busy.value = false
        })
    }

    onBeforeMount(() => {
      if (props.multiple) {
        let locationIds = router.currentRoute.query
          .location_ids as Array<string>

        if (typeof locationIds === 'string') {
          locationIds = [locationIds]
        }

        if (locationIds) {
          inputValue.value = locationIds.map((item) => +item) as Array<
            string | number
          >
        }
      } else {
        const ids = router.currentRoute.query.location_ids
        inputValue.value = Number(Array.isArray(ids) ? ids[0] : ids) || null
      }
      if (process.env.SHOWCASE_MODE === 'true' && props.client) fetchLocations()
    })

    watch(
      () => props.client,
      (newValue, oldValue) => {
        if (
          props.multiple &&
          locationList.value.length > 0 &&
          +newValue === +oldValue
        ) {
          return
        }
        if (
          typeof newValue === 'number' &&
          typeof oldValue === 'number' &&
          oldValue !== newValue
        ) {
          inputValue.value = props.multiple ? [] : null
        }
        if (props.client) {
          fetchLocations()
        } else {
          inputValue.value = props.multiple ? [] : null
          onChange()
        }
      }
    )

    return {
      searchInput,
      locationList,
      inputValue,
      onChange,
      busy,
      selectAll,
      deSelectAll,
    }
  },
})
</script>
