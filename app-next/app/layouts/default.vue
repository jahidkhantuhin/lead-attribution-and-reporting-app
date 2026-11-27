<script setup lang="ts">
import { pageNames, reportPages } from '~/constants'
import { useDisplay, useTheme } from 'vuetify'

const workspace = useWorkspaceStore()
const { store: session, logout } = useSession()
const { $api } = useNuxtApp()
const { mobile } = useDisplay()
const theme = useTheme()
const drawer = ref(!mobile.value)
const logoutOpen = ref(false)
const busy = ref(false)
const error = ref('')
const route = useRoute()
const darkMode = computed(() => theme.global.name.value === 'dark')

watch(mobile, (isMobile) => {
  drawer.value = !isMobile
})
watch(
  () => route.path,
  () => {
    if (mobile.value) drawer.value = false
  },
)
watch(
  () => session.user?.meta ?? session.user?.data?.meta,
  (meta) => {
    const setting = meta?.find(({ name }) => name === 'dark_mode')
    theme.change(
      setting?.value === '1' || setting?.value === 1 || setting?.value === true
        ? 'dark'
        : 'light',
    )
  },
  { immediate: true },
)

const displayName = computed(() => {
  const user = session.authenticatedUser
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ')
})
const directories = [
  {
    title: pageNames.clients,
    to: '/client-records',
    icon: 'mdi-earth',
    scope: 'view client records',
  },
  {
    title: pageNames.sites,
    to: '/site-records',
    icon: 'mdi-web',
    scope: 'view site records',
  },
  {
    title: pageNames.locationSetup,
    to: '/location-settings',
    icon: 'mdi-earth',
    scope: 'view location settings',
  },
  {
    title: pageNames.vpn,
    to: '/vpn-setup',
    icon: 'mdi-earth',
    scope: 'view vpn setup',
  },
  {
    title: pageNames.locations,
    to: '/all-locations',
    icon: 'mdi-earth',
    scope: 'view all active locations',
  },
  {
    title: pageNames.users,
    to: '/users',
    icon: 'mdi-account-group',
    scope: 'view users',
  },
  {
    title: pageNames.profile,
    to: '/profile',
    icon: 'mdi-account',
    scope: 'view profile',
  },
]
const navigation = computed(() =>
  directories.filter(
    ({ scope, to }) =>
      session.isAllowed(scope) &&
      (!session.isAllowed('vpn access') ||
        session.isAllowed('create report') ||
        ['/vpn-setup', '/profile'].includes(to)),
  ),
)
const quickLinks = [
  { title: 'Dashboard', to: '/', icon: 'mdi-monitor-dashboard' },
  { title: 'Reports', to: '/reports', icon: 'mdi-graph' },
  { title: 'Search', to: '/search', icon: 'mdi-magnify' },
]

async function setDarkMode(enabled: boolean | null) {
  const value = enabled ? '1' : '0'
  theme.change(enabled ? 'dark' : 'light')
  try {
    await $api.put('/meta/dark_mode', {
      meta_name: 'dark_mode',
      meta_value: Boolean(enabled),
    })
    if (session.user) {
      const meta = session.user.meta ?? session.user.data?.meta ?? []
      session.setUser({
        ...session.user,
        meta: [
          ...meta.filter(({ name }) => name !== 'dark_mode'),
          { name: 'dark_mode', value },
        ],
      })
    }
  } catch {
    error.value = 'Unable to save theme preference.'
  }
}

async function signOut() {
  busy.value = true
  try {
    await logout()
    logoutOpen.value = false
    await navigateTo('/login')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-app class="workspace-app">
    <v-navigation-drawer
      v-model="drawer"
      :temporary="mobile"
      :width="248"
      class="workspace-sidebar"
    >
      <template #prepend>
        <NuxtLink to="/" class="workspace-brand">
          <span class="workspace-brand-mark"
            ><v-icon size="small" icon="mdi-chart-box-outline"
          /></span>
          LeadLens
        </NuxtLink>
        <v-list-item
          class="workspace-identity"
          :title="displayName"
          :subtitle="session.roles?.[0]"
        >
          <template #prepend>
            <v-avatar
              v-if="session.userProfilePicture"
              :image="session.userProfilePicture"
            />
            <v-icon v-else icon="mdi-account-circle" size="34" />
          </template>
        </v-list-item>
        <v-divider />
        <v-switch
          class="workspace-theme-switch"
          :model-value="darkMode"
          density="compact"
          hide-details
          :label="darkMode ? 'Dark Mode: On' : 'Dark Mode: Off'"
          @update:model-value="setDarkMode"
        />
        <v-divider />
      </template>
      <v-list density="compact" nav>
        <v-list-item
          to="/"
          exact
          prepend-icon="mdi-home"
          :title="pageNames.dashboard"
        />
        <v-list-group v-if="session.isAllowed('view reports')" value="reports">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-chart-box-outline"
              :title="pageNames.reports"
            />
          </template>
          <v-list-item to="/reports" exact title="All Reports" />
          <v-list-item
            v-for="report in reportPages"
            :key="report.link"
            :to="report.link"
            :title="report.title"
          />
        </v-list-group>
        <v-list-item
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        />
        <v-list-item
          title="Log out"
          prepend-icon="mdi-logout"
          @click="logoutOpen = true"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-toolbar height="68" class="workspace-topbar">
        <h1 class="workspace-page-title">
          {{ workspace.pageTitle || 'LeadLens' }}
        </h1>
        <v-spacer />
        <v-btn
          v-for="item in quickLinks"
          :key="item.to"
          :icon="item.icon"
          :to="item.to"
          :aria-label="item.title"
        />
        <v-app-bar-nav-icon
          aria-label="Toggle navigation"
          @click="drawer = !drawer"
        />
      </v-toolbar>
      <v-container fluid class="workspace-content">
        <v-breadcrumbs
          v-if="workspace.breadcrumbs.length"
          :items="
            workspace.breadcrumbs.map(({ text, ...item }) => ({
              title: text,
              ...item,
            }))
          "
        />
        <slot />
      </v-container>
    </v-main>

    <v-dialog v-model="logoutOpen" max-width="420">
      <v-card title="Log out">
        <v-card-text>Are you sure you want to log out?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="logoutOpen = false">Cancel</v-btn>
          <v-btn color="primary" :loading="busy" @click="signOut"
            >Log out</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-snackbar
      :model-value="Boolean(error)"
      @update:model-value="error = ''"
      >{{ error }}</v-snackbar
    >
  </v-app>
</template>
