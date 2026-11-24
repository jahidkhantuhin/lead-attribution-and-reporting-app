<template>
  <div class="workspace-report-grid">
    <nuxt-link
      v-for="report in availableReports"
      :key="report.link"
      :to="report.link"
      class="workspace-report-card"
    >
      <span class="workspace-report-icon" aria-hidden="true">
        <v-icon small>{{ report.icon }}</v-icon>
      </span>
      <div class="workspace-report-copy">
        <h3>{{ report.title }}</h3>
        <p>{{ report.details }}</p>
      </div>
      <v-icon small class="workspace-report-arrow" aria-hidden="true">
        mdi-arrow-right
      </v-icon>
    </nuxt-link>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, useContext } from '@nuxtjs/composition-api'
import { pageNames, reportPages } from '~/shared/PageNames'
import { IReportPageItem } from '~/shared/Types'

export default defineComponent({
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
