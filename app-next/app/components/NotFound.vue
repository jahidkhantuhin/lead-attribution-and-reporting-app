<script setup lang="ts">
defineProps<{ recovering?: boolean }>()
</script>

<template>
  <v-card color="transparent" flat class="py-6">
    <component :is="recovering ? 'h1' : 'h2'" class="text-h4 px-4">
      Page not found.
    </component>
    <v-card-text class="text-body-1">
      The page may have moved or the address may be incorrect.
    </v-card-text>
    <v-card-actions class="px-4">
      <v-btn
        v-if="recovering"
        color="primary"
        variant="tonal"
        @click="clearError({ redirect: '/' })"
      >
        Home page
      </v-btn>
      <v-btn v-else to="/" color="primary" variant="tonal">Home page</v-btn>
    </v-card-actions>
  </v-card>
</template>
