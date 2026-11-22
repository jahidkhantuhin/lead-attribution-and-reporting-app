<template>
  <v-alert prominent type="success">
    <v-row align="center">
      <v-col class="grow"> Report generated successfully. </v-col>
    </v-row>
  </v-alert>
</template>
<script>
import { defineComponent } from '@vue/composition-api'

export default defineComponent({
  props: {
    scorer: { type: String, default: undefined },
    date: { type: String, default: undefined },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  setup(_props) {
    return {}
  },
})
</script>
