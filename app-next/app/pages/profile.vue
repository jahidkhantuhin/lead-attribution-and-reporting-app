<script setup lang="ts">
import { pageNames } from '~/constants'
import { validatePassword } from '~/services/team-member'

definePageMeta({ middleware: 'is-authenticated' })
const title = pageNames.profile
useHead({ title })
const { $services, $auth, $api } = useNuxtApp()
const session = useSessionStore()
const user = computed(() => session.authenticatedUser)
const name = computed(() =>
  [user.value?.first_name, user.value?.last_name].filter(Boolean).join(' '),
)
const initials = computed(() =>
  [user.value?.first_name, user.value?.last_name]
    .map((part) => part?.charAt(0))
    .join('')
    .toUpperCase(),
)
const allowed = computed(() => session.isAllowed('view profile'))
const dialog = ref<'edit' | 'photo' | null>(null)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const file = ref<File>()
const preview = ref('')
const fields = reactive({
  first: '',
  last: '',
  current: '',
  password: '',
  confirmation: '',
})
const form = ref<{ validate: () => Promise<{ valid: boolean }> }>()
const required = (value: string) =>
  Boolean(value.trim()) || 'This field is required.'
useWorkspaceStore().setPageHeading({
  pageTitle: title,
  breadcrumbs: [
    {
      text: 'Dashboard',
      to: session.isAllowed('create report') ? '/' : '/reports',
    },
    { text: title, to: '', disabled: true },
  ],
})

function open(kind: 'edit' | 'photo') {
  error.value = ''
  notice.value = ''
  Object.assign(fields, {
    first: user.value?.first_name ?? '',
    last: user.value?.last_name ?? '',
    current: '',
    password: '',
    confirmation: '',
  })
  file.value = undefined
  dialog.value = kind
}

watch(file, (next, _old, cleanup) => {
  preview.value = ''
  error.value = ''
  if (!next) return
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(next.type) ||
    next.size > 5 * 1024 * 1024
  ) {
    error.value = 'Choose a JPEG, PNG, or WebP image up to 5 MB.'
    return
  }
  const url = URL.createObjectURL(next)
  preview.value = url
  cleanup(() => URL.revokeObjectURL(url))
})
watch(dialog, (value) => {
  if (value) return
  file.value = undefined
  Object.assign(fields, { current: '', password: '', confirmation: '' })
})

async function saveProfile() {
  const id = user.value?.id
  if (!allowed.value || id == null || busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (!(await form.value?.validate())?.valid) return
    await $services.users.update({
      id,
      first_name: fields.first.trim(),
      last_name: fields.last.trim(),
      old_password: fields.current,
      ...(fields.password
        ? {
            password: fields.password,
            password_confirmation: fields.confirmation,
          }
        : {}),
    })
    session.setUser(await $auth.fetchUser())
    dialog.value = null
    notice.value = 'Profile updated.'
  } catch {
    error.value =
      'Could not update your profile. Check your current password and try again.'
  } finally {
    busy.value = false
  }
}

async function savePhoto() {
  if (!allowed.value || !preview.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const image = new Image()
    image.src = preview.value
    await image.decode()
    const size = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 320
    const context = canvas.getContext('2d')
    if (!context || !size) throw new Error('Image unavailable')
    context.fillStyle = 'white'
    context.fillRect(0, 0, 320, 320)
    context.drawImage(
      image,
      (image.naturalWidth - size) / 2,
      (image.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      320,
      320,
    )
    await $api.put('/meta/profile_picture', {
      meta_name: 'profile_picture',
      meta_value: canvas.toDataURL('image/jpeg', 0.8),
    })
    session.setUser(await $auth.fetchUser())
    dialog.value = null
    notice.value = 'Profile photo updated.'
  } catch {
    error.value =
      'Could not save the profile photo. Choose a valid image and try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="d-grid ga-4">
    <v-alert v-if="!allowed" type="warning" variant="tonal"
      >You do not have access to Profile.</v-alert
    >
    <template v-else>
      <v-alert
        v-if="notice"
        type="success"
        variant="tonal"
        closable
        @click:close="notice = ''"
        >{{ notice }}</v-alert
      >
      <v-card flat class="pa-4">
        <div class="d-flex flex-wrap align-center ga-4">
          <v-avatar color="primary" size="64">
            <v-img
              v-if="session.userProfilePicture"
              :src="session.userProfilePicture"
              alt="Profile photo"
            />
            <span v-else aria-hidden="true" class="text-h6">{{
              initials
            }}</span>
          </v-avatar>
          <div class="profile-identity flex-grow-1">
            <h2 class="text-h5">{{ name }}</h2>
            <p v-if="user?.email">{{ user.email }}</p>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              color="primary"
              :disabled="user?.id == null"
              @click="open('edit')"
              >Edit profile</v-btn
            >
            <v-btn variant="outlined" @click="open('photo')"
              >Change photo</v-btn
            >
          </div>
        </div>
      </v-card>
      <div class="profile-grid">
        <v-card flat class="pa-4">
          <h2 class="text-h6 mb-3">Account details</h2>
          <RecordsRecordFacts
            :fields="[
              { label: 'Full name', value: name },
              {
                label: 'Email address',
                value: typeof user?.email === 'string' ? user.email : undefined,
              },
              { label: 'Role', value: session.roles?.join(', ') },
              {
                label: 'Status',
                value:
                  user?.status == null
                    ? undefined
                    : ['1', 'active'].includes(String(user.status))
                      ? 'Active'
                      : ['0', 'inactive'].includes(String(user.status))
                        ? 'Disabled'
                        : String(user.status),
              },
            ]"
          />
        </v-card>
        <v-card flat class="pa-4">
          <h2 class="text-h6 mb-3">Permissions</h2>
          <ul v-if="session.permissions.length" class="permissions">
            <li v-for="permission in session.permissions" :key="permission">
              {{ permission }}
            </li>
          </ul>
          <p v-else>No permissions listed.</p>
        </v-card>
      </div>
      <v-dialog
        :model-value="!!dialog"
        :persistent="busy"
        max-width="560"
        aria-labelledby="profile-dialog-title"
        @update:model-value="!$event && (dialog = null)"
      >
        <v-card class="pa-4">
          <h2 id="profile-dialog-title" class="text-h6 mb-4">
            {{ dialog === 'edit' ? 'Edit profile' : 'Change profile photo' }}
          </h2>
          <v-form
            v-if="dialog === 'edit'"
            ref="form"
            :disabled="busy"
            @submit.prevent="saveProfile"
          >
            <v-text-field
              v-model="fields.first"
              label="First name"
              autocomplete="given-name"
              :rules="[required]"
              density="compact"
            />
            <v-text-field
              v-model="fields.last"
              label="Last name"
              autocomplete="family-name"
              :rules="[required]"
              density="compact"
            />
            <v-text-field
              v-model="fields.current"
              label="Current password"
              autocomplete="current-password"
              type="password"
              :rules="[required]"
              density="compact"
            />
            <v-text-field
              v-model="fields.password"
              label="New password (optional)"
              autocomplete="new-password"
              type="password"
              :rules="[(value: string) => !value || validatePassword(value)]"
              density="compact"
            />
            <v-text-field
              v-model="fields.confirmation"
              label="Confirm new password"
              autocomplete="new-password"
              type="password"
              :rules="[
                (value: string) =>
                  value === fields.password || 'Passwords must match.',
              ]"
              density="compact"
            />
            <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{
              error
            }}</v-alert>
            <div class="d-flex justify-end flex-wrap ga-2">
              <v-btn variant="text" :disabled="busy" @click="dialog = null"
                >Cancel</v-btn
              >
              <v-btn color="primary" type="submit" :loading="busy"
                >Save changes</v-btn
              >
            </div>
          </v-form>
          <template v-else>
            <v-file-input
              v-model="file"
              label="Choose image"
              accept="image/jpeg,image/png,image/webp"
              :disabled="busy"
              density="compact"
            />
            <v-img
              v-if="preview"
              :src="preview"
              alt="Square crop preview"
              cover
              aspect-ratio="1"
              width="180"
              class="mx-auto mb-4 rounded"
            />
            <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{
              error
            }}</v-alert>
            <div class="d-flex justify-end flex-wrap ga-2">
              <v-btn variant="text" :disabled="busy" @click="dialog = null"
                >Cancel</v-btn
              >
              <v-btn
                color="primary"
                :disabled="!preview"
                :loading="busy"
                @click="savePhoto"
                >Save photo</v-btn
              >
            </div>
          </template>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  gap: 1rem;
}
.profile-identity {
  overflow-wrap: anywhere;
}
.permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.permissions li {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 0.5rem;
  padding: 0.25rem 0.5rem;
}
</style>
