<script setup lang="ts">
import { pageNames, reportPages } from '~/constants'

const session = useSessionStore()
const shortcuts = [
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
const reports = computed(() =>
  session.roles?.includes('user')
    ? [vpn]
    : [...Object.values(reportPages), ...shortcuts, vpn],
)
</script>

<template>
  <div class="workspace-report-grid">
    <NuxtLink
      v-for="report in reports"
      :key="report.link"
      :to="report.link"
      class="workspace-report-card"
    >
      <span class="workspace-report-icon" aria-hidden="true"
        ><v-icon size="small" :icon="report.icon"
      /></span>
      <div class="workspace-report-copy">
        <h3>{{ report.title }}</h3>
        <p>{{ report.details }}</p>
      </div>
      <v-icon
        size="small"
        class="workspace-report-arrow"
        aria-hidden="true"
        icon="mdi-arrow-right"
      />
    </NuxtLink>
  </div>
</template>
