<template>
  <span v-if="range" class="workspace-date-range">
    <v-icon small aria-hidden="true">mdi-calendar-range</v-icon>
    <span>
      <time :datetime="range.first">{{ range.startLabel }}</time
      ><template v-if="range.endLabel"
        >–<time :datetime="range.last">{{ range.endLabel }}</time></template
      >
    </span>
    <span class="workspace-date-zone"
      >{{ range.days }} {{ range.days === 1 ? 'day' : 'days' }}</span
    >
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'
import { formatDateRange } from '~/utils/dateFormat'

export default defineComponent({
  props: {
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  setup(props) {
    return { range: computed(() => formatDateRange(props.start, props.end)) }
  },
})
</script>
