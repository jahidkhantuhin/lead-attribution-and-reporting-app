<template>
  <div class="site-inspector">
    <section class="site-results" :aria-label="title + ' results'">
      <button
        v-for="site in records"
        :key="site.id"
        type="button"
        class="site-result"
        :aria-pressed="selected && String(selected.id) === String(site.id)"
        @click="select(site)"
      >
        <span class="site-result-name"
          ><strong><slot name="name" :record="site" /></strong
          ><small><slot name="subtitle" :record="site" /></small
        ></span>
        <span class="site-result-meta"
          ><slot name="metric" :record="site" /><workspace-badge
            :value="site.status"
        /></span>
      </button>
      <p v-if="!records.length && !loading" class="site-empty">
        No records match these filters.
      </p>
    </section>

    <v-dialog
      v-if="mobile"
      v-model="open"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar flat
          ><v-toolbar-title>{{ title }}</v-toolbar-title
          ><v-spacer /><v-btn
            icon
            :aria-label="'Close ' + title.toLowerCase()"
            @click="open = false"
            ><v-icon>mdi-close</v-icon></v-btn
          ></v-toolbar
        >
        <slot v-if="selected && open" name="detail" :record="selected" />
      </v-card>
    </v-dialog>
    <slot v-else-if="selected" name="detail" :record="selected" />
    <p v-else-if="!mobile && records.length" class="site-empty">
      Select a record to see its details.
    </p>
  </div>
</template>

<script>
import { computed, defineComponent, ref, watch } from '@nuxtjs/composition-api'

export default defineComponent({
  props: {
    records: { type: Array, required: true },
    title: { type: String, required: true },
    loading: Boolean,
  },
  setup(props, { root }) {
    const selectedId = ref(null)
    const open = ref(false)
    const mobile = computed(() => root.$vuetify.breakpoint.width < 800)
    const selected = computed(
      () =>
        props.records.find(
          (site) => String(site.id) === String(selectedId.value)
        ) || (!mobile.value ? props.records[0] : null)
    )
    const select = (site) => {
      selectedId.value = site.id
      if (mobile.value) open.value = true
    }

    watch(selected, (site) => {
      if (!site) open.value = false
    })
    watch(mobile, (isMobile) => {
      if (!isMobile) open.value = false
    })

    return { mobile, open, select, selected }
  },
})
</script>

<style scoped>
.site-inspector {
  display: grid;
  grid-template-columns: minmax(252px, 1fr) minmax(0, 1.45fr);
  gap: 16px;
  padding: 16px;
}
.site-results {
  min-width: 0;
}
.site-result {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 6px;
  border: 1px solid var(--workspace-border);
  border-radius: 9px;
  color: var(--workspace-ink);
  text-align: left;
}
.site-result:hover,
.site-result[aria-pressed='true'] {
  background: var(--workspace-tint);
  border-color: var(--workspace-blue);
}
.site-result-name {
  min-width: 0;
  overflow-wrap: anywhere;
}
.site-result-name small {
  display: block;
  color: var(--workspace-muted);
}
.site-result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.site-empty {
  padding: 16px;
  color: var(--workspace-muted);
}
@media (max-width: 799px) {
  .site-inspector {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
