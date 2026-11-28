import vuetify from 'vite-plugin-vuetify'

const env = process.env

const legacyApiUrls = {
  development: env.BASE_URL_DEVELOPMENT,
  staging: env.BASE_URL_STAGING,
  production: env.BASE_URL_PRODUCTION,
}

const selectedApiUrl = Object.entries(legacyApiUrls).find(
  ([environment]) => environment === env.NODE_ENV,
)?.[1]
const showcaseMode = env.SHOWCASE_MODE !== 'false'
const recordPlayers = {
  development: 'http://localhost:3000/player',
  staging: 'https://ca-dev.wm4d.com/player',
  production: 'https://ca.wm4d.com/player',
}
const recordingPlayer = Object.entries(recordPlayers).find(
  ([environment]) => environment === env.NODE_ENV,
)?.[1]

export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/workspace.css', '~/assets/lead-report.css'],
  vite: { plugins: [vuetify({ autoImport: true })] },
  nitro: {
    prerender: {
      routes: [
        '/',
        '/reports',
        '/reports/payment-report',
        '/reports/client-overview',
        '/reports/lead-details-report',
        '/reports/kpi',
        '/reports/statistics',
        '/data-mining',
        '/search',
        '/site-records',
        '/client-records',
        '/client-records/add',
        ...(showcaseMode
          ? [
              ...[1, 2, 3].flatMap((id) => [
                '/client-records/' + id,
                '/client-records/' + id + '/edit',
                '/client-records/' + id + '/locations/add',
                '/client-records/' + id + '/locations/' + id + '/edit',
                '/client-records/' + id + '/staff/add',
                '/client-records/' + id + '/staff/' + id + '/edit',
                '/client-records/' + id + '/locations/' + id,
                '/client-records/' + id + '/staff/' + id,
              ]),
              '/client-records/1/locations/4',
              '/client-records/1/locations/4/edit',
            ]
          : []),
        ...(showcaseMode
          ? [1, 2, 3, 4].map((id) => '/site-records/' + id)
          : []),
        '/404',
      ],
    },
  },
  modules: ['@nuxt/eslint', '@pinia/nuxt'],
  app: {
    head: {
      titleTemplate: '%s - LeadLens',
      link: [{ rel: 'icon', href: '/favicon.png' }],
      htmlAttrs: { lang: 'en' },
    },
  },
  runtimeConfig: {
    public: {
      showcaseMode,
      recordingPlayer: showcaseMode ? '' : (recordingPlayer ?? ''),
      apiBaseUrl: showcaseMode
        ? 'https://showcase.example.test'
        : (selectedApiUrl ?? ''),
    },
  },
  typescript: { strict: true },
})
