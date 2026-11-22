<template>
  <formatted-date
    :date="date"
    :timezone="timezone"
    :format-string="formatString"
  />
</template>

<script>
import { defineComponent } from '@vue/composition-api'
import defaultTimezone from '~/utils/defaultTimezone'
import { onlyDay } from '~/utils/dateFormat'

export default defineComponent({
  props: {
    date: { type: [String, Number], default: undefined },
    timezone: { type: [String, Boolean], default: defaultTimezone },
    formatString: { type: String, default: onlyDay },
  },
})
</script>
