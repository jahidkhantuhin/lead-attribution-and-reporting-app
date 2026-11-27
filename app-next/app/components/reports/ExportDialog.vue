<script setup lang="ts">
defineProps<{ loading: boolean; url: string }>()
const open = defineModel<boolean>({ required: true })
defineEmits<{ copy: [url: string] }>()
</script>

<template>
  <v-dialog v-model="open" persistent max-width="500">
    <v-card v-if="loading" title="Uploading to Google Drive">
      <v-card-text><v-progress-linear indeterminate /></v-card-text>
    </v-card>
    <v-card v-else title="Report uploaded to Google Drive">
      <v-card-text>
        <span>{{ url }}</span>
        <v-btn
          icon="mdi-content-copy"
          aria-label="Copy export link"
          variant="text"
          @click="$emit('copy', url)"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" :href="url" target="_blank" rel="noopener"
          >Open File</v-btn
        >
        <v-btn @click="open = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
