<script setup lang="ts">
import { pageNames } from '~/constants'
import {
  canManageMember,
  memberRoles,
  validatePassword,
} from '~/services/team-member'
import type { Fields, RecordId, UserRecord } from '~/types/api'

const props = defineProps<{ editing?: boolean }>()
const route = useRoute()
const router = useRouter()
const { $services } = useNuxtApp()
const session = useSessionStore()
const id = String(route.params.id ?? '')
const self = computed(
  () => props.editing && id === String(session.authenticatedUser?.id),
)
const title = props.editing ? 'Edit team member' : 'Add team member'
const allowed = computed(() =>
  session.isAllowed(props.editing ? 'update user' : 'create user'),
)
const member = ref<UserRecord>()
const editable = computed(
  () =>
    allowed.value &&
    (!props.editing ||
      (member.value &&
        canManageMember(member.value, session.roles) &&
        (!memberRoles(member.value).includes('super admin') || self.value))),
)
const roleLocked = computed(() =>
  Boolean(member.value && memberRoles(member.value).includes('super admin')),
)
const roles = ref<{ title: string; value: RecordId }[]>([])
const data = reactive({
  firstName: '',
  lastName: '',
  email: '',
  oldPassword: '',
  password: '',
  confirmation: '',
  role: null as RecordId | null,
  payRate: '',
})
const loading = ref(false)
const unavailable = ref(false)
const saving = ref(false)
const confirming = ref(false)
const error = ref('')
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>()
const required = (value: string | null) =>
  Boolean(value?.trim()) || 'This field is required.'
const requiresPayRate = computed(() => Number(data.role) === 4)
const payRateRule = (value: string) =>
  (Number(value) > 0.1 && Number(value) < 99.99) ||
  'Enter a pay rate between 0.10 and 99.99.'
let latest = 0

useHead({ title })
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    { text: 'Dashboard', to: '/' },
    { text: pageNames.users, to: '/users' },
    { text: title, to: '', disabled: true },
  ],
})

watch(
  allowed,
  async (canView) => {
    const request = ++latest
    if (!canView) return
    loading.value = true
    unavailable.value = false
    try {
      const [record, roleResponse] = await Promise.all([
        props.editing ? $services.users.byId(id) : undefined,
        $services.users.roles(),
      ])
      if (request !== latest) return
      roles.value = roleResponse.data.data
        .filter(({ name }) => name !== 'super admin')
        .map(({ name, id }) => ({ title: name, value: id }))
      const existing = record?.data.data
      if (!existing) return
      member.value = existing
      data.firstName = existing.first_name
      data.lastName = existing.last_name
      data.email = typeof existing.email === 'string' ? existing.email : ''
      data.role =
        roles.value.find(
          ({ value, title }) =>
            String(value) === String(existing.role_id) ||
            memberRoles(existing).includes(title),
        )?.value ?? null
      data.payRate = existing.pay_rate == null ? '' : String(existing.pay_rate)
    } catch {
      if (request === latest) unavailable.value = true
    } finally {
      if (request === latest) loading.value = false
    }
  },
  { immediate: true },
)

async function save(confirmed = false) {
  if (!editable.value || saving.value || loading.value || unavailable.value)
    return
  saving.value = true
  error.value = ''
  try {
    if (!(await form.value?.validate())?.valid) return
    if (props.editing && data.password && !confirmed) {
      confirming.value = true
      return
    }
    confirming.value = false
    const body: Fields = {
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.email.trim(),
    }
    if (!roleLocked.value && data.role != null) body.role_id = data.role
    if (requiresPayRate.value) body.pay_rate = Number(data.payRate)
    if (self.value) body.old_password = data.oldPassword
    if (data.password) {
      body.password = data.password
      body.password_confirmation = data.confirmation
    }
    if (props.editing && member.value)
      await $services.users.update({ ...body, id: member.value.id })
    else await $services.users.create(body)
    await router.replace('/users')
  } catch {
    error.value =
      'Could not save this team member. Check the fields and try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <v-alert v-if="!allowed" type="warning" variant="tonal"
      >You do not have permission to {{ editing ? 'edit' : 'add' }} team
      members.</v-alert
    >
    <v-card v-else flat class="pa-4">
      <h2 class="text-h6 mb-4">{{ title }}</h2>
      <v-progress-linear v-if="loading" indeterminate />
      <v-alert v-else-if="unavailable" type="error" variant="tonal"
        >Could not load this form.</v-alert
      >
      <v-alert v-else-if="!editable" type="warning" variant="tonal"
        >You do not have permission to edit this team member.</v-alert
      >
      <v-form v-else ref="form" :disabled="saving" @submit.prevent="save()">
        <div class="team-member-fields">
          <v-text-field
            v-model="data.firstName"
            label="First name"
            maxlength="50"
            autocomplete="given-name"
            :rules="[required]"
            aria-required="true"
            density="compact"
          />
          <v-text-field
            v-model="data.lastName"
            label="Last name"
            maxlength="50"
            autocomplete="family-name"
            :rules="[required]"
            aria-required="true"
            density="compact"
          />
          <v-text-field
            v-model="data.email"
            label="Email address"
            type="email"
            autocomplete="email"
            :rules="[
              (value: string) =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
                'Enter a valid email address.',
            ]"
            aria-required="true"
            density="compact"
          />
          <v-select
            v-if="!roleLocked"
            v-model="data.role"
            :items="roles"
            label="Role"
            :rules="[
              (value: RecordId | null) =>
                editing || value != null || 'Select a role.',
            ]"
            :aria-required="!editing"
            density="compact"
          />
          <v-text-field
            v-if="requiresPayRate"
            v-model="data.payRate"
            label="Pay rate"
            type="number"
            step="0.01"
            :rules="[payRateRule]"
            aria-required="true"
            density="compact"
          />
          <v-text-field
            v-if="self"
            v-model="data.oldPassword"
            label="Current password"
            type="password"
            autocomplete="current-password"
            :rules="[required]"
            aria-required="true"
            density="compact"
          />
          <v-text-field
            v-model="data.password"
            label="New password"
            type="password"
            autocomplete="new-password"
            :rules="[
              (value: string) => (editing && !value) || validatePassword(value),
            ]"
            :aria-required="!editing"
            density="compact"
          />
          <v-text-field
            v-model="data.confirmation"
            label="Confirm new password"
            type="password"
            autocomplete="new-password"
            :rules="[
              (value: string) =>
                value === data.password || 'Passwords must match.',
            ]"
            :aria-required="!!data.password"
            density="compact"
          />
        </div>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{
          error
        }}</v-alert>
        <div class="d-flex justify-end flex-wrap ga-2">
          <v-btn to="/users" variant="text" :disabled="saving">Cancel</v-btn>
          <v-btn type="submit" color="primary" :loading="saving">{{
            editing ? 'Save changes' : 'Add team member'
          }}</v-btn>
        </div>
      </v-form>
    </v-card>
    <v-dialog
      v-model="confirming"
      max-width="440"
      aria-labelledby="team-password-title"
    >
      <v-card>
        <v-card-title id="team-password-title">Change password?</v-card-title>
        <v-card-text>Save the new password for this team member?</v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn @click="confirming = false">Cancel</v-btn
          ><v-btn color="primary" @click="save(true)"
            >Save password</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.team-member-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  column-gap: 1rem;
}
</style>
