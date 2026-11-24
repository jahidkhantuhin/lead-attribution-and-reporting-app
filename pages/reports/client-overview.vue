<template>
  <div>
    <client-overview></client-overview>
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'
import { reportPages } from '~/shared/PageNames'
import ClientOverview from '~/components/ClientOverview.vue'

export default defineComponent({
  components: {
    ClientOverview,
  },
  head: { title: reportPages.client.title },
})
</script>
