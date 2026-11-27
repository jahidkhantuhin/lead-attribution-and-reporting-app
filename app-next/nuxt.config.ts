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
  modules: ['@nuxt/eslint'],
  app: {
    head: {
      title: 'LeadLens',
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
