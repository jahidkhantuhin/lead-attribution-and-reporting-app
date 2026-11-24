<template>
  <v-data-table
    class="elevation-1 data-table"
    :headers="allReportsHeader"
    no-data-text="No leads in this view."
    :items-per-page="10"
    :footer-props="{
      itemsPerPageOptions: [10, 25, 50, 100],
    }"
    :item-class="callItemClass"
    :sort-by="['timestamp']"
    :sort-desc="[true]"
    :items="allReportsList"
    :search="search"
  >
    <template #item.phone="props">
      <span>{{ props.item.phone ? formatPhone(props.item.phone) : '—' }}</span>
    </template>
    <template #item.email="props">
      <span>{{ props.item.email || '—' }}</span>
    </template>
    <template #item.timestamp="props">
      <formatted-date
        :timezone="props.item.timezone"
        :date="props.item.datetime"
      ></formatted-date>
    </template>
    <template #item.name="{ item }">
      <strong class="lead-record-name">{{
        item.name || 'Unnamed lead'
      }}</strong>
    </template>
    <template #item.type="props">
      <WorkspaceBadge :value="props.item.type" kind="lead-type" />
    </template>
  </v-data-table>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'

import WorkspaceBadge from '~/components/WorkspaceBadge.vue'
import { usPhone } from '~/plugins/usPhone'
import { ldrAllColumns } from '~/utils/reports-upload/ldr/columns'

export default defineComponent({
  components: { WorkspaceBadge },
  props: {
    search: { type: String, default: '' },
    allReportsList: {
      type: Array,
      default: () => [],
    },
    callItemClass: {
      type: Function,
      required: true,
      default: () => {},
    },
  },
  setup() {
    return { allReportsHeader: ldrAllColumns(), formatPhone: usPhone }
  },
})
</script>
