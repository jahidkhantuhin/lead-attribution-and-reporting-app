<template>
  <v-card :loading="loading" v-bind="cardProps">
    <ReportResultHeading :title="staffData.name || 'Staff member details'">
      <workspace-badge
        v-if="staffData.designation"
        :value="staffData.designation"
        kind="role"
      />
      <template #actions>
        <v-btn
          v-if="showAllButton"
          small
          outlined
          :to="`/client-records/${clientId}`"
          >Client record</v-btn
        >
        <v-btn
          v-if="staffData.id"
          small
          depressed
          color="primary"
          :to="`/client-records/${clientId}/staff/${staffData.id}/edit`"
        >
          <v-icon small left>mdi-pencil-outline</v-icon> Edit staff member
        </v-btn>
      </template>
    </ReportResultHeading>
    <RecordFacts
      :fields="[
        { label: 'Name', value: staffData.name, kind: 'copy' },
        { label: 'Email', value: staffData.email, kind: 'copy' },
        { label: 'Phone', value: staffData.phone_number, kind: 'copy' },
        {
          label: 'Client',
          value: staffData.client && staffData.client.name,
          kind: 'copy',
        },
        { label: 'Role', value: staffData.designation, kind: 'copy' },
        { label: 'Last updated', value: staffData.updated_at, kind: 'date' },
      ]"
    >
      <template #copy="{ field }">
        <span>{{ field.value }}</span>
        <v-btn
          icon
          x-small
          :aria-label="`Copy ${field.label}`"
          @click="copy(field.value)"
        >
          <v-icon small>mdi-content-copy</v-icon>
        </v-btn>
      </template>
      <template #date="{ field }">
        <formatted-date :date="field.value" />
      </template>
    </RecordFacts>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, useRoute } from '@nuxtjs/composition-api'
import swalMixin, { showToast } from '~/utils/swalMixin'

export default defineComponent({
  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    showAllButton: {
      type: Boolean,
      default: true,
    },
    staffData: {
      type: Object,
      default: () => ({}),
    },
    cardProps: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(_props, { parent }: any) {
    const $swal = swalMixin(parent.$swal)
    const route = useRoute()
    const clientId = route.value.params.client_id
    const copy = (text: string) => {
      window.navigator.clipboard.writeText(text)

      showToast($swal, {
        title: 'Copied to clipboard',
      })
    }
    return {
      copy,
      clientId,
    }
  },
})
</script>
