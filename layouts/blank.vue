<template>
  <v-app class="auth-shell">
    <v-main>
      <div class="auth-grid">
        <aside class="auth-brand-panel">
          <div class="workspace-brand">
            <span class="workspace-brand-mark"><v-icon small>mdi-chart-box-outline</v-icon></span>
            Foundation
          </div>
          <div class="auth-brand-copy">
            <p>Lead attribution<br />and reporting</p>
            <span>Track calls, chats, and form submissions across client locations.</span>
          </div>
          <div class="auth-chart" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </aside>
        <div class="auth-panel"><nuxt /></div>
      </div>
    </v-main>
    <!-- Version number -->
    <Version />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'
import Version from '@/components/parts/Version.vue'

export default defineComponent({
  components: { Version },
  setup() {
    return {}
  },
})
</script>
