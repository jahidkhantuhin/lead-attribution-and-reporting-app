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

export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/workspace.css'],
  vite: { plugins: [vuetify({ autoImport: true })] },
  nitro: { prerender: { routes: ['/', '/reports', '/search', '/404'] } },
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
      apiBaseUrl: showcaseMode
        ? 'https://showcase.example.test'
        : (selectedApiUrl ?? ''),
    },
  },
  typescript: { strict: true },
})
