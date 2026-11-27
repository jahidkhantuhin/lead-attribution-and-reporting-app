module.exports = {
  root: true,
  ignorePatterns: ['/app-next/**'],
  env: {
    browser: true,
    node: true,
  },
  extends: [
    '@nuxtjs/eslint-config-typescript',
    'prettier',
    'prettier/vue',
    'plugin:prettier/recommended',
    'plugin:nuxt/recommended',
  ],
  plugins: ['prettier'],
  rules: {
    // Vuetify uses dotted names for data-table slots such as item.status.
    'vue/valid-v-slot': ['error', { allowModifiers: true }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    // API payloads retain their original field names.
    camelcase: [
      'error',
      {
        properties: 'never',
        ignoreDestructuring: true,
        allow: [
          'account_manager',
          'sort_by',
          'client_id',
          'location_ids',
          'first_name',
          'last_name',
          'speed_score',
        ],
      },
    ],
  },
}
