<template>
  <div class="profile-page">
    <section class="profile-hero" aria-labelledby="profile-name">
      <div class="profile-avatar">
        <img v-if="profilePicture" :src="profilePicture" alt="Profile photo" />
        <span v-else aria-hidden="true">{{ initials }}</span>
      </div>
      <div class="profile-identity">
        <h2 id="profile-name">{{ userData.fullName }}</h2>
        <p v-if="userData.email">{{ userData.email }}</p>
        <workspace-badge v-if="userData.role" :value="userData.role" kind="role" />
      </div>
      <div class="profile-actions">
        <v-btn color="primary" :disabled="!userData.id" @click="showUpdateForm = true">
          <v-icon left small>mdi-pencil-outline</v-icon>
          Edit profile
        </v-btn>
        <v-btn outlined color="primary" @click="showUpdatePictureForm = true">
          <v-icon left small>mdi-camera-outline</v-icon>
          Change photo
        </v-btn>
      </div>
    </section>

    <div class="profile-grid">
      <section class="profile-panel" aria-labelledby="profile-account">
        <h2 id="profile-account">Account details</h2>
        <dl class="profile-fields">
          <div><dt>Full name</dt><dd>{{ userData.fullName }}</dd></div>
          <div><dt>Email address</dt><dd>{{ userData.email || '—' }}</dd></div>
          <div v-if="userData.role">
            <dt>Role</dt><dd><workspace-badge :value="userData.role" kind="role" /></dd>
          </div>
          <div v-if="userData.status != null">
            <dt>Status</dt><dd><workspace-badge :value="userData.status" /></dd>
          </div>
        </dl>
      </section>

      <section class="profile-panel" aria-labelledby="profile-permissions">
        <div class="profile-panel-heading">
          <h2 id="profile-permissions">Permissions</h2>
          <span v-if="permissions.length" class="profile-count">{{ permissions.length }}</span>
        </div>
        <ul v-if="permissions.length" class="profile-permissions">
          <li v-for="permission in permissions" :key="permission">
            <v-icon small aria-hidden="true">mdi-check-circle-outline</v-icon>
            <span>{{ permission }}</span>
          </li>
        </ul>
        <p v-else class="profile-empty">No permissions listed.</p>
      </section>
    </div>

    <v-dialog v-model="showUpdateForm" max-width="560" aria-labelledby="profile-edit-title">
      <v-card class="profile-edit-dialog">
        <v-card-title id="profile-edit-title">Edit profile</v-card-title>
        <user-form
          v-if="showUpdateForm && userData.id"
          scope="profile"
          :userId="userData.id"
          @cancel="showUpdateForm = false"
          @done="finishProfileUpdate"
        />
      </v-card>
    </v-dialog>

    <v-dialog
      v-model="showUpdatePictureForm"
      max-width="460"
      :persistent="uploadingImage"
      aria-labelledby="profile-photo-title"
    >
      <v-card>
        <v-card-title id="profile-photo-title">Change profile photo</v-card-title>
        <v-card-text>
          <v-file-input
            v-if="!selectedImage"
            v-model="selectedFile"
            :disabled="preparingImage"
            :loading="preparingImage"
            accept="image/*"
            label="Choose an image"
            outlined
            dense
            hide-details="auto"
            @change="handleSelectFile"
          />
          <div v-else class="profile-crop">
            <vue-croppie
              ref="croppieRef"
              :enableOrientation="true"
              :boundary="{ width: cropSize, height: cropSize }"
              :viewport="{ width: cropSize - 48, height: cropSize - 48, type: 'circle' }"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="selectedImage" text :disabled="uploadingImage" @click="handleClearPicture">
            Choose another
          </v-btn>
          <v-spacer />
          <v-btn text :disabled="uploadingImage" @click="showUpdatePictureForm = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="uploadingImage"
            :disabled="!cropReady || uploadingImage"
            @click="handleSave"
          >
            Save photo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  ref,
  useContext,
  useStore,
  watch,
} from '@nuxtjs/composition-api'
import UserForm from '~/components/forms/UserForm.vue'

// @ts-ignore
import * as VueCroppie from 'vue-croppie'
import Compressor from 'compressorjs'
import 'croppie/croppie.css'

import { IBreadcrumbs } from '~/store'
import useApi from '~/services/useApi'
import swalMixin, { showToast } from '~/utils/swalMixin'

const pageTitle = 'Profile'

interface ProfileUser {
  id?: number | string
  first_name?: string
  last_name?: string
  fullName?: string
  fullname?: string
  email?: string
  role?: string
  status?: string | number | boolean
  scope?: unknown
}

export default defineComponent({
  props: { user: { type: Object, default: null } },
  components: { UserForm, VueCroppie: VueCroppie.VueCroppieComponent },
  middleware: 'isAuthenticated',
  setup(props, { root, parent }) {
    const { $auth } = useContext()
    const store = useStore()
    const { put } = useApi()
    const $swal = swalMixin((parent as any).$swal)

    const userData = computed(() => {
      const user = (props.user ?? $auth.user ?? {}) as ProfileUser
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
      return { ...user, fullName: fullName || user.fullName || user.fullname || 'Profile' }
    })
    const initials = computed(() => userData.value.fullName.split(/\s+/).slice(0, 2)
      .map((word: string) => word.charAt(0).toUpperCase()).join(''))
    const profilePicture = computed(() => store.getters['users/userProfilePicture'])
    const permissions = computed(() => {
      const scopes = userData.value.scope
      if (!Array.isArray(scopes)) return []
      return [...new Set<string>(scopes.filter(scope => typeof scope === 'string' && scope.trim()))]
        .map(scope => scope.replace(/_/g, ' ').replace(/^./, first => first.toUpperCase()))
    })

    const breadcrumbs: IBreadcrumbs[] = [
      { text: 'Dashboard', to: '/' },
      { text: 'Profile', to: '/profile' },
    ]
    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    const showUpdateForm = ref(false)
    const showUpdatePictureForm = ref(false)
    const uploadingImage = ref(false)
    const preparingImage = ref(false)
    const selectedFile = ref<File | null>(null)
    const selectedImage = ref('')
    const cropReady = ref(false)
    const croppieRef = ref()
    const cropSize = computed(() => (root as any).$vuetify.breakpoint.width < 360 ? 200 : 256)
    let imageRequest = 0

    const finishProfileUpdate = () => {
      showUpdateForm.value = false
      return $auth.fetchUser()
    }

    const handleClearPicture = () => {
      imageRequest++
      selectedFile.value = null
      selectedImage.value = ''
      preparingImage.value = false
      cropReady.value = false
    }

    watch(showUpdatePictureForm, open => {
      if (!open) handleClearPicture()
    })

    const handleSelectFile = async (file: File | null) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        handleClearPicture()
        showToast($swal, { title: 'Please choose an image file.', icon: 'warning' })
        return
      }

      const request = ++imageRequest
      preparingImage.value = true
      try {
        const compressed = await new Promise<Blob>((resolve, reject) => {
          new Compressor(file, { quality: 0.3, success: resolve, error: reject })
        })
        if (request !== imageRequest) return
        if (compressed.size > 500 * 1024) {
          handleClearPicture()
          showToast($swal, { title: 'Choose a smaller image.', icon: 'warning' })
          return
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(compressed)
        })
        if (request !== imageRequest) return
        selectedImage.value = dataUrl
        await nextTick()
        if (request !== imageRequest) return
        await croppieRef.value.bind({ url: dataUrl })
        if (request === imageRequest) cropReady.value = true
      } catch {
        if (request === imageRequest) {
          handleClearPicture()
          showToast($swal, { title: 'Unable to open that image.', icon: 'error' })
        }
      } finally {
        if (request === imageRequest) preparingImage.value = false
      }
    }

    const handleSave = async () => {
      if (!cropReady.value || uploadingImage.value) return
      uploadingImage.value = true
      try {
        const output = await croppieRef.value.result({ format: 'jpeg', circle: false, quality: 0.3 })
        await put('/meta/profile_picture', { meta_name: 'profile_picture', meta_value: output })
        await $auth.fetchUser()
        showUpdatePictureForm.value = false
        showToast($swal, { title: 'Profile photo updated.' })
      } catch {
        showToast($swal, { title: 'Unable to save the profile photo.', icon: 'error' })
      } finally {
        uploadingImage.value = false
      }
    }

    return {
      userData, initials, profilePicture, permissions, showUpdateForm, finishProfileUpdate,
      showUpdatePictureForm, preparingImage, uploadingImage, selectedFile, selectedImage,
      cropReady, cropSize, croppieRef, handleSelectFile, handleClearPicture, handleSave,
    }
  },
  head: { title: pageTitle },
})
</script>

<style lang="scss">
.profile-page {
  max-width: 1080px;
  margin-inline: auto;
}

.profile-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: clamp(18px, 3vw, 32px);
  border: 1px solid var(--workspace-border);
  border-radius: 18px;
  background: linear-gradient(125deg, var(--workspace-tint), var(--workspace-surface) 60%);
  box-shadow: var(--workspace-shadow);
}

.profile-avatar {
  display: grid;
  width: 80px;
  height: 80px;
  place-items: center;
  overflow: hidden;
  border: 3px solid var(--workspace-surface);
  border-radius: 50%;
  background: #2457d6;
  color: white;
  font-size: 1.6rem;
  font-weight: 750;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.profile-identity {
  min-width: 0;
  overflow-wrap: anywhere;
  h2 {
    margin: 0;
    font-size: clamp(1.35rem, 3.8vw, 2rem);
    line-height: 1.15;
    letter-spacing: -.035em;
  }
  p {
    margin: 4px 0 9px;
    color: var(--workspace-muted);
  }
}
.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr);
  gap: 16px;
  margin-top: 16px;
}
.profile-panel {
  min-width: 0;
  padding: clamp(16px, 2.6vw, 24px);
  border: 1px solid var(--workspace-border);
  border-radius: var(--workspace-radius);
  background: var(--workspace-surface);
  box-shadow: var(--workspace-shadow);
  h2 {
    margin: 0 0 12px;
    font-size: 1.1rem;
    letter-spacing: -.015em;
  }
}
.profile-panel-heading {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.profile-count {
  border-radius: 7px;
  padding: 0 6px;
  background: var(--workspace-tint);
  color: var(--workspace-blue);
  font-size: .8125rem;
  font-weight: 700;
}
.profile-fields {
  div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 8px;
    padding: 10px 0;
  }
  div + div { border-top: 1px solid var(--workspace-border); }
  dt {
    color: var(--workspace-muted);
    font-size: .875rem;
  }
  dd {
    min-width: 0;
    margin: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
}
.v-application .profile-permissions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  list-style: none;
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    border: 1px solid var(--workspace-border);
    border-radius: 8px;
    background: var(--workspace-subtle);
    font-size: .875rem;
    overflow-wrap: anywhere;
  }
  .v-icon {
    color: var(--workspace-blue);
    flex-shrink: 0;
  }
}
.profile-empty { color: var(--workspace-muted); }
.v-application.workspace-app .profile-edit-dialog .v-card {
  border: none;
  box-shadow: none !important;
}
.profile-crop {
  max-width: 100%;
  overflow: hidden;
}

@media (max-width: 760px) {
  .profile-grid { grid-template-columns: minmax(0, 1fr); }
  .profile-hero {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 14px;
  }
  .profile-actions { grid-column: 1 / -1; }
}
@media (max-width: 390px) {
  .profile-avatar {
    width: 62px;
    height: 62px;
    font-size: 1.25rem;
  }
  .profile-identity p { font-size: .875rem; }
  .v-application .profile-permissions { grid-template-columns: minmax(0, 1fr); }
}
</style>
