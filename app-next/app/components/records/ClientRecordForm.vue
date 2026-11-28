<script setup lang="ts">
import { VSelect, VTextarea, VTextField } from 'vuetify/components'
import { pageNames } from '~/constants'
import {
  recordFields,
  recordLabels,
  validateRecordField,
  type RecordKind,
} from '~/services/record-form'
import type { Fields } from '~/types/api'

const props = defineProps<{ kind: RecordKind; editing?: boolean }>()
const route = useRoute()
const router = useRouter()
const { $services } = useNuxtApp()
const service = $services[props.kind]
const clientId = String(route.params.client_id ?? '')
const id = String(
  (props.kind === 'clients'
    ? route.params.client_id
    : route.params.record_id) ?? '',
)
const clientUrl = clientId ? '/client-records/' + clientId : '/client-records'
const recordUrl =
  props.kind === 'clients' ? clientUrl : clientUrl + '/' + props.kind + '/' + id
const cancelUrl = props.editing ? recordUrl : clientUrl
const label = recordLabels[props.kind]
const title = (props.editing ? 'Edit ' : 'Add ') + label
const fields =
  props.kind === 'locations' && props.editing
    ? [
        ...recordFields.locations,
        {
          key: 'comment',
          label: 'Change comment',
          required: true,
          type: 'textarea' as const,
        },
      ]
    : recordFields[props.kind]
const data = reactive<Fields>({})
const options = reactive<
  Record<string, { title: string; value: string | number }[]>
>({})
const loading = ref(true)
const unavailable = ref(false)
const saving = ref(false)
const error = ref('')
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>()

useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: pageNames.clients, to: '/client-records' },
    { text: title, to: '', disabled: true },
  ],
})

onMounted(async () => {
  try {
    const [record, managers, statuses] = await Promise.all([
      props.editing ? service.byId(id) : undefined,
      props.kind !== 'staff'
        ? $services.users.list({
            role: 'account manager',
            sort_by: 'first_name:asc',
            limit: 200,
          })
        : undefined,
      props.kind === 'locations' ? $services.clients.statuses() : undefined,
    ])
    const existing = record?.data.data
    if (props.editing && !existing) throw new Error('Missing record')
    for (const field of fields) {
      const value = existing?.[field.key]
      data[field.key] =
        typeof value === 'string' || typeof value === 'number' ? value : null
    }
    if (props.kind === 'locations') {
      data.zip ??= existing?.zipcode ?? null
      if (
        typeof data.website === 'string' &&
        !/^https?:\/\//i.test(data.website)
      )
        data.website = 'https://' + data.website
    }
    options.account_manager_id =
      managers?.data.data.result.map((user) => ({
        title: [user.first_name, user.last_name].filter(Boolean).join(' '),
        value: user.id,
      })) ?? []
    options.status =
      props.kind === 'clients'
        ? [
            { title: 'Active', value: 'active' },
            { title: 'Inactive', value: 'inactive' },
          ]
        : Object.entries(statuses?.data.data ?? {}).map(([title, value]) => ({
            title,
            value,
          }))
    if (
      props.kind === 'clients' &&
      typeof data.status === 'string' &&
      !options.status.some(({ value }) => value === data.status)
    ) {
      options.status.push({
        title: data.status.replaceAll('_', ' '),
        value: data.status,
      })
    }
  } catch {
    unavailable.value = true
  } finally {
    loading.value = false
  }
})

async function save() {
  if (saving.value || loading.value || unavailable.value) return
  saving.value = true
  error.value = ''
  try {
    if (!(await form.value?.validate())?.valid) return
    const body = { ...data }
    if (props.kind !== 'clients') body.client_id = Number(clientId)
    const response = props.editing
      ? await service.update({ ...body, id: Number(id) })
      : await service.create(body)
    await router.push(
      props.editing
        ? recordUrl
        : props.kind === 'clients'
          ? '/client-records/' + response.data.data.id
          : clientUrl,
    )
  } catch {
    error.value = 'Could not save this record. Check the fields and try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-card flat class="pa-4">
    <h2 class="text-h6 mb-4">{{ title }}</h2>
    <v-progress-linear v-if="loading" indeterminate />
    <v-alert v-else-if="unavailable" type="error" variant="tonal"
      >Could not load this form.</v-alert
    >
    <v-form v-else ref="form" :disabled="saving" @submit.prevent="save">
      <div class="record-form-fields">
        <template v-for="field in fields" :key="field.key">
          <component
            :is="
              field.type === 'select'
                ? VSelect
                : field.type === 'textarea'
                  ? VTextarea
                  : VTextField
            "
            v-model="data[field.key]"
            :label="field.label + (field.required ? ' *' : '')"
            :items="options[field.key]"
            :rules="[
              (value: unknown) =>
                (props.kind === 'clients' && data.status === 'inactive') ||
                validateRecordField(field, value),
            ]"
            :aria-required="field.required || undefined"
            variant="outlined"
            density="compact"
          />
        </template>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{
        error
      }}</v-alert>
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <span class="text-caption">* Required fields</span>
        <div class="d-flex ga-2">
          <v-btn :to="cancelUrl" :disabled="saving" variant="text"
            >Cancel</v-btn
          >
          <v-btn type="submit" :loading="saving" color="primary">{{
            editing ? 'Save changes' : 'Add ' + label.toLowerCase()
          }}</v-btn>
        </div>
      </div>
    </v-form>
  </v-card>
</template>

<style scoped>
.record-form-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  column-gap: 1rem;
}
</style>
