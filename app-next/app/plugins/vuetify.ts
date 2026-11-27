import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.min.css'

export default defineNuxtPlugin(({ vueApp }) => {
  vueApp.use(
    createVuetify({
      icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
      display: { mobileBreakpoint: 1264 },
      theme: {
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#2457D6',
              secondary: '#087D73',
              success: '#147354',
              error: '#B92E46',
            },
          },
        },
      },
    }),
  )
})
