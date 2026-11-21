<template>
  <formatted-date :date="date" :timezone="timezone" :format-string="formatString" />
</template>

<script>
import { defineComponent } from '@vue/composition-api'
import defaultTimezone from '~/utils/defaultTimezone'
import { Only_Day } from '~/utils/dateFormat'

export default defineComponent({
  props: {
    date: [String, Number],
    timezone: { type: [String, Boolean], default: defaultTimezone },
    formatString: { type: String, default: Only_Day },
  },
})
</script>
