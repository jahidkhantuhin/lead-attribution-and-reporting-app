<template>
  <dl class="workspace-record-facts">
    <div v-for="field in visibleFields" :key="field.label">
      <dt>{{ field.label }}</dt>
      <dd>
        <slot :name="field.kind || 'text'" :field="field">{{
          field.value
        }}</slot>
      </dd>
    </div>
  </dl>
</template>

<script>
export default {
  props: {
    fields: { type: Array, required: true },
  },
  computed: {
    visibleFields() {
      return this.fields.filter(
        ({ value }) => value !== null && value !== undefined && value !== ''
      )
    },
  },
}
</script>
