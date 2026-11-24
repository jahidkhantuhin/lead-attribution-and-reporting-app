<template>
  <span class="required-fields-note">
    <span class="required-fields-mark" aria-hidden="true">*</span>
    <span>Fields marked with an asterisk are required.</span>
  </span>
</template>

<style scoped>
.required-fields-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  color: var(--workspace-muted);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.required-fields-mark {
  display: grid;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 6px;
  background: var(--workspace-tint);
  color: var(--workspace-blue);
  font-weight: 700;
}
</style>
