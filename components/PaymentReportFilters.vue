<template>
  <div class="payment-filters">
    <v-autocomplete
      v-model="filters['user_id']"
      :loading="callScorersLoading"
      label="Call scorer"
      item-value="id"
      clearable
      dense
      outlined
      hide-details
      item-text="fullname"
      :items="callScorers"
      @change="push"
    ></v-autocomplete>

    <Datepicker
      v-model="filters['dates']"
      compact
      :date-help-buttons="[
        'thisWeek',
        'lastWeek',
        'last14Days',
        'lastMonth',
        'thisYear',
      ]"
      @change="push"
    ></Datepicker>

    <v-btn
      :disabled="
        !(
          filters['user_id'] > 0 &&
          filters['dates'] &&
          filters['dates'].length > 0
        )
      "
      depressed
      color="primary"
      :loading="loading"
      @click="$emit('search', filters)"
    >
      {{ loading ? 'Loading...' : 'Apply' }}
    </v-btn>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  useRouter,
  onMounted,
} from '@nuxtjs/composition-api'

import Datepicker from '~/components/forms/DatePicker.vue'
import { dates as showcaseDates } from '~/showcase/fixtures'

export default defineComponent({
  components: {
    Datepicker,
  },
  props: {
    callScorersLoading: {
      type: Boolean,
      default: false,
    },
    callScorers: {
      type: Array,
      default: () => [],
    },
    headers: {
      type: Array,
      default: () => [],
    },
    loading: {
      default: false,
      type: Boolean,
      required: true,
    },
  },
  setup(_props, { emit }) {
    const router = useRouter()
    const filters: any = ref({
      dates: [],
      user_id: null,
    })

    const push = () => {
      router.push({
        path: router.currentRoute.path,
        query: filters.value as any,
      })
    }

    const loadFromURL = () => {
      const query: any = router.currentRoute.query
      if (query && query.user_id && query.dates) {
        filters.value = {
          user_id: Number(query.user_id),
          dates: Array.isArray(query.dates) ? query.dates : [query.dates],
        }
        emit('search', filters.value)
      } else if (process.env.SHOWCASE_MODE === 'true') {
        filters.value = { user_id: 3, dates: showcaseDates() }
        emit('search', filters.value)
      }
    }

    onMounted(() => {
      loadFromURL()
    })

    return {
      filters,
      push,
    }
  },
})
</script>

<style scoped>
.payment-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

@media (max-width: 700px) {
  .payment-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
