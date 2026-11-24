<template>
  <div>
    <v-data-table
      class="elevation-1 data-table"
      :headers="formsHeader"
      :items-per-page="10"
      :footer-props="{
        itemsPerPageOptions: [10, 25, 50, 100],
      }"
      :no-data-text="`No Forms`"
      :items="items"
      :disable-filtering="true"
    >
      <template #item.lead.phone="props">
        <span> {{ props.item.lead.phone | usPhone }}</span>
      </template>
      <template #item.lead.page_visited="props">
        <truncate-text
          :text="props.item.lead.page_visited"
          title="Show URL"
          :url="true"
          show-text="Show URL"
          :button="true"
        ></truncate-text>
      </template>
      <template #item.leademail="props">
        <span>{{ props.item.lead.email }}</span>
      </template>
      <template #item.date="props">
        <formatted-date :date="props.item.date"></formatted-date>
      </template>
      <template #item.lead.message="{ item }">
        <truncate-text
          :text="item && item.lead && item.lead.message"
          title="Lead Message"
          :url="false"
          :quotes="true"
          show-text="Lead Message"
          :button="true"
        ></truncate-text>
      </template>
    </v-data-table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'
import { ldrPpcFormsColumns } from '~/utils/reports-upload/ldr/columns'

import FormattedDate from '~/components/FormattedDate.vue'
import TruncateText from '~/components/TruncateText.vue'

export default defineComponent({
  components: {
    FormattedDate,
    TruncateText,
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
      formsHeader: ldrPpcFormsColumns(),
    }
  },
})
</script>
