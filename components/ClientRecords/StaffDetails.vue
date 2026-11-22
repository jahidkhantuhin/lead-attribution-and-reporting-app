<template>
  <v-card :loading="loading" v-bind="cardProps">
    <v-card-title>
      <span>{{ staffData.name }}</span>
      <v-spacer></v-spacer>
      <v-btn
        v-if="showAllButton"
        color="white"
        :to="`/client-records/${clientId}/`"
        class="mr-3"
      >
        Show all staff
      </v-btn>
      <v-btn
        color="primary"
        :to="`/client-records/${clientId}/staff/${staffData.id}/edit`"
      >
        Edit
      </v-btn>
    </v-card-title>
    <v-card-text>
      <table>
        <thead>
          <tr v-if="staffData.name">
            <th>Name</th>
            <td>
              {{ staffData.name }}
              &nbsp;
              <a @click="copy(staffData.name)">
                <v-icon style="font-size: 14px"> mdi-content-copy </v-icon>
              </a>
            </td>
          </tr>
          <tr v-if="staffData.email">
            <th>Email</th>
            <td>
              {{ staffData.email }}
              &nbsp;
              <a @click="copy(staffData.email)">
                <v-icon style="font-size: 14px"> mdi-content-copy </v-icon>
              </a>
            </td>
          </tr>
          <tr v-if="staffData.phone_number">
            <th>Phone Number</th>
            <td>
              {{ staffData.phone_number }}
              &nbsp;
              <a @click="copy(staffData.phone_number)">
                <v-icon style="font-size: 14px"> mdi-content-copy </v-icon>
              </a>
            </td>
          </tr>
          <tr v-if="staffData.designation">
            <th>Role</th>
            <td>
              <workspace-badge :value="staffData.designation" kind="role" />

              &nbsp;
              <a @click="copy(staffData.designation)">
                <v-icon style="font-size: 14px"> mdi-content-copy </v-icon>
              </a>
            </td>
          </tr>
          <tr v-if="staffData && staffData.client">
            <th>Client</th>
            <td>
              {{ staffData.client.name }}

              &nbsp;
              <a @click="copy(staffData.client.name)">
                <v-icon style="font-size: 14px"> mdi-content-copy </v-icon>
              </a>
            </td>
          </tr>
          <tr v-if="staffData.updated_at">
            <th>Last Updated</th>
            <td>
              <formatted-date :date="staffData.updated_at" />
            </td>
          </tr>
        </thead>
      </table>
    </v-card-text>
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

<style lang="scss" scoped>
table {
  width: 100%;
  border: 1px solid var(--workspace-border);
  border-radius: 11px;
  border-spacing: 0;

  td,
  th {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--workspace-border);
    overflow-wrap: anywhere;
  }

  th {
    width: 32%;
    color: var(--workspace-muted);
    background: var(--workspace-subtle);
    font-weight: 650;
  }

  tr:last-child td,
  tr:last-child th {
    border-bottom: 0;
  }
}
</style>
