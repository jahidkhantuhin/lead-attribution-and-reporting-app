<template>
  <v-card flat :class="{ 'record-form-card': title }" :loading="loading">
    <ReportResultHeading v-if="title" :title="title" />
    <slot />
  </v-card>
</template>

<script>
import ReportResultHeading from '~/components/ReportResultHeading.vue'

export default {
  components: { ReportResultHeading },
  props: {
    title: { type: String, default: '' },
    loading: { type: Boolean, default: false },
  },
}
</script>
