<template>
  <record-inspector :records="sites" :loading="loading" title="Site inspector">
    <template #name="{ record }">{{ record.siteURL }}</template>
    <template #subtitle="{ record }">{{ record.clientName || 'Unassigned' }}</template>
    <template #metric="{ record }"><strong>{{ formatScore(record.avg_mobile_score) }}</strong></template>
    <template #detail="{ record }">
      <site-inspector-detail :key="record.id" :site="record" :start="start" :end="end" />
    </template>
  </record-inspector>
</template>

<script>
import { defineComponent } from '@nuxtjs/composition-api'
import RecordInspector from '~/components/RecordInspector.vue'
import SiteInspectorDetail, { formatScore } from './SiteInspectorDetail.vue'

export default defineComponent({
  components: { RecordInspector, SiteInspectorDetail },
  props: {
    sites: { type: Array, required: true },
    loading: Boolean,
    start: String,
    end: String,
  },
  setup() {
    return { formatScore }
  },
})
</script>
