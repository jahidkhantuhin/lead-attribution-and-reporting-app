import { pageNames, reportPages } from '~/shared/PageNames'

export interface ISidebarItem {
  constructor: Function
  title: String
  scope?: String | null
  icon?: String
  link?: String
  show?: Boolean
  children?: Array<ISidebarItem>
}
const LeftMenuItems: ISidebarItem[] = [
  {
    title: pageNames.dashboard,
    link: '/',
    scope: null,
    icon: 'mdi-home',
  },
  {
    title: pageNames.reports,
    link: '',
    scope: 'view reports',
    icon: 'mdi-chart-box-outline',
    children: [
      {
        title: 'All Reports',
        link: '/reports',
        scope: 'view reports',
        icon: 'mdi-view-grid-outline',
      },
      ...Object.values(reportPages).map(({ title, link, icon }) => ({
        title,
        link,
        icon,
        scope: 'view reports',
      })),
    ],
  },
  {
    title: pageNames.clients,
    link: '/client-records',
    scope: 'view client records',
    icon: 'mdi-earth',
  },
  {
    title: pageNames.sites,
    link: '/site-records',
    scope: 'view site records',
    icon: 'mdi-web',
  },
  {
    title: pageNames.locationSetup,
    link: '/location-settings',
    scope: 'view location settings',
    icon: 'mdi-earth',
  },
  {
    title: pageNames.vpn,
    link: '/vpn-setup',
    scope: 'view vpn setup',
    icon: 'mdi-earth',
  },
  {
    title: pageNames.locations,
    link: '/all-locations',
    scope: 'view all active locations',
    icon: 'mdi-earth',
  },
  {
    title: pageNames.users,
    link: '/users',
    scope: 'view users',
    icon: 'mdi-account-group',
  },

  {
    title: pageNames.profile,
    link: '/profile',
    scope: 'view profile',
    icon: 'mdi-account',
  },
]

export default (user: any) => {
  if (
    user &&
    user.role === 'super admin' &&
    LeftMenuItems.filter((c: ISidebarItem) => c.link === '/settings').length ===
      0
  ) {
    LeftMenuItems.push({
      title: pageNames.settings,
      link: '/settings',
      scope: 'manage settings',
      icon: 'mdi-cog',
    })
  } else if (
    user?.hasScope?.('vpn access') &&
    !user.hasScope('create report')
  ) {
    return LeftMenuItems.filter(
      (c: ISidebarItem) => c.link === '/vpn-setup' || c.link === '/profile'
    )
  }
  // else if (
  //   !user.hasScope('create report') || !user.hasScope('vpn access')) {
  //     return LeftMenuItems.filter((c: ISidebarItem) => c.link === '/vpn-setup' || c.link === '/profile')
  //   }
  return LeftMenuItems
}
