<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
</script>

<template>
  <v-app class="workspace-app">
    <v-main>
      <v-container class="workspace-content">
        <NotFound v-if="error.statusCode === 404" />
        <template v-else>
          <h1>An error occurred</h1>
          <v-btn @click="clearError({ redirect: '/' })">Home page</v-btn>
        </template>
      </v-container>
    </v-main>
  </v-app>
</template>
