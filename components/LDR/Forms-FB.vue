<template>
  <div>
    <v-data-table
      class="elevation-1 data-table"
      :headers="facebookHeader"
      :items-per-page="10"
      :footer-props="{
        itemsPerPageOptions: [10, 25, 50, 100],
      }"
      :no-data-text="`No Facebook Leads`"
      :items="items"
      :disable-filtering="true"
    >
      <template #item.lead.phone_number="props">
        <span> {{ props.item.lead.phone_number | usPhone }}</span>
      </template>
      <template #item.date="props">
        <formatted-date :date="props.item.date"></formatted-date>
      </template>
      <template #item.phone_number="props">
        <span v-if="props.item && props.item.lead">
          {{ props.item.lead.phone_number | usPhone }}
        </span>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'
import { ldrFbFormsColumns } from '~/utils/reports-upload/ldr/columns'

import FormattedDate from '~/components/FormattedDate.vue'

export default defineComponent({
  components: {
    FormattedDate,
  },
  props: {
    items: {
      type: Array,
      default: () => [],
      required: true,
    },
  },
  setup() {
    return {
      facebookHeader: ldrFbFormsColumns(),
    }
  },
})
</script>
