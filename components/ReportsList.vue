<template>
  <v-row :justify="justify">
    <v-col
      v-for="report in availableReports"
      :key="report.link"
      cols="12"
      md="4"
    >
      <v-card class="workspace-report-card" hover link nuxt :to="report.link">
        <v-toolbar flat>
          <v-toolbar-title class="text--primary font-weight-bold">
            {{ report.title }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <span v-if="report.icon" class="workspace-report-icon"
            ><v-icon small>{{ report.icon }}</v-icon></span
          >
        </v-toolbar>
        <v-card-text class="text--primary min-height">{{
          report.details
        }}</v-card-text>
        <v-card-actions>
          <v-list-item class="grow">
            <v-row justify="end">
              <span class="workspace-report-action"> Open </span>
            </v-row>
          </v-list-item>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent, computed, useContext } from '@nuxtjs/composition-api'
import { pageNames, reportPages } from '~/shared/PageNames'
import { IReportPageItem } from '~/shared/Types'

export default defineComponent({
  props: {
    justify: {
      type: String,
      required: false,
      default: 'left',
    },
  },
  setup() {
    const { $auth } = useContext()
    const nonAccountManagerUserRole = computed(
      () => $auth.user?.role === 'user'
    )
    const shortcuts: IReportPageItem[] = [
      {
        title: pageNames.clients,
        details: 'Browse client accounts and their records.',
        link: '/client-records',
        icon: 'mdi-domain',
      },
      {
        title: pageNames.sites,
        details: 'Browse tracked websites and their details.',
        link: '/site-records',
        icon: 'mdi-web',
      },
      {
        title: pageNames.locationSetup,
        details: 'Find locations that still need a client assignment.',
        link: '/location-settings',
        icon: 'mdi-map-marker-alert-outline',
      },
      {
        title: pageNames.locations,
        details: 'Browse active client locations.',
        link: '/all-locations',
        icon: 'mdi-map-marker-outline',
      },
    ]
    const vpn = {
      title: pageNames.vpn,
      details: 'Set up VPN access.',
      link: '/vpn-setup',
      icon: 'mdi-shield-lock-outline',
    }
    const availableReports = computed(() =>
      nonAccountManagerUserRole.value
        ? [vpn]
        : [...Object.values(reportPages), ...shortcuts, vpn]
    )

    return { availableReports }
  },
})
</script>

<style scoped>
.min-height {
  min-height: 110px;
}
</style>
