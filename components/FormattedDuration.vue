<template>
  <span class="workspace-duration">{{ label }}</span>
</template>

<script>
import { computed, defineComponent } from '@vue/composition-api'
import { formatDuration } from '~/utils/dateFormat'

export default defineComponent({
  props: { value: { type: [String, Number], default: undefined } },
  setup(props) {
    return { label: computed(() => formatDuration(props.value)) }
  },
})
</script>
