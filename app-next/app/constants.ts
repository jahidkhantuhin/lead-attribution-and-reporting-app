export const pageNames = {
  dashboard: 'Dashboard',
  reports: 'Reporting Hub',
  clients: 'Client Directory',
  sites: 'Website Directory',
  locationSetup: 'Location Setup Queue',
  vpn: 'VPN Access',
  locations: 'Active Locations',
  users: 'Team Members',
  profile: 'My Profile',
  settings: 'Workspace Settings',
}

export const reportPages = {
  attribution: {
    title: 'Lead Attribution',
    link: '/reports/lead-details-report',
    icon: 'mdi-source-branch',
    details:
      'See which channels bring in leads and drill into individual calls, chats, and forms.',
  },
  client: {
    title: 'Client Performance',
    link: '/reports/client-overview',
    icon: 'mdi-domain',
    details:
      'Review lead activity across client locations and compare reporting periods.',
  },
  location: {
    title: 'Location KPIs',
    link: '/reports/kpi',
    icon: 'mdi-chart-box-outline',
    details:
      'Track daily and monthly performance for a selected client location.',
  },
  trends: {
    title: 'Lead Trends',
    link: '/reports/statistics',
    icon: 'mdi-chart-line',
    details: 'Explore how lead activity changes over time.',
  },
  payments: {
    title: 'Scorer Payments',
    link: '/reports/payment-report',
    icon: 'mdi-cash-multiple',
    details:
      'Review scored calls, rating time, and the amount payable to each scorer.',
  },
}

export const reportViews = {
  overview: 'Lead Overview',
  sources: 'Channel Breakdown',
  activity: 'Lead Activity',
  daily: 'Daily Performance',
  monthly: 'Monthly Performance',
}
