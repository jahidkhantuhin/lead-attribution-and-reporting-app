<script setup lang="ts">
import { validatePassword } from '~/services/team-member'
import { safeAuthRedirect } from '~/services/auth-routing'

const props = defineProps<{ kind: 'login' | 'reset' | 'social' }>()
const route = useRoute()
const router = useRouter()
const { $auth } = useNuxtApp()
const { login, store } = useSession()
const showcase = useRuntimeConfig().public.showcaseMode
const recovery = ref(false)
const email = ref(
  typeof route.query.email === 'string' ? route.query.email : '',
)
const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : '',
)
const password = ref('')
const confirmation = ref('')
const busy = ref(false)
const notice = ref('')
const failed = ref(false)
const title = computed(() =>
  props.kind === 'social'
    ? 'Google sign-in'
    : props.kind === 'reset'
      ? 'Reset password'
      : recovery.value
        ? 'Recover your password'
        : 'Sign in',
)
const validEmail = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
)
const valid = computed(() =>
  props.kind === 'reset'
    ? validEmail.value &&
      !!token.value &&
      validatePassword(password.value) === true &&
      /[$@#&^!]/.test(password.value) &&
      password.value === confirmation.value
    : validEmail.value && (recovery.value || !!password.value),
)
const destination = computed(() =>
  safeAuthRedirect(
    route.query.redirect,
    store.isAllowed('create report') ? '/' : '/reports',
  ),
)
useHead({ title })

function toggleRecovery() {
  recovery.value = !recovery.value
  password.value = ''
  notice.value = ''
  failed.value = false
}

async function submit() {
  if (!valid.value || busy.value) return
  busy.value = true
  failed.value = false
  notice.value = ''
  try {
    if (props.kind === 'reset') {
      await $auth.resetPassword({
        email: email.value.trim(),
        token: token.value,
        password: password.value,
        password_confirmation: confirmation.value,
      })
      password.value = confirmation.value = ''
      notice.value = showcase
        ? 'Showcase password reset completed.'
        : 'Password reset completed. You can now sign in.'
    } else if (recovery.value) {
      await $auth.requestPasswordReset(email.value.trim())
      notice.value = showcase
        ? 'Showcase recovery completed. No email was sent.'
        : 'If the address is registered, check your inbox for a reset link.'
    } else {
      await login({ email: email.value.trim(), password: password.value })
      await router.replace(destination.value)
    }
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main>
      <div class="auth-shell">
        <v-card class="auth-card pa-5 pa-sm-8" variant="flat">
          <p class="text-subtitle-2 font-weight-bold mb-2">LeadLens</p>
          <h1 class="text-h5 mb-4">{{ title }}</h1>
          <template v-if="kind === 'social'">
            <v-alert type="info" variant="tonal" class="mb-4">{{
              showcase
                ? 'The showcase uses a synthetic session and does not connect to Google.'
                : 'Google sign-in is unavailable in this version. Sign in with your email and password.'
            }}</v-alert>
            <v-btn :to="showcase ? destination : '/login'" color="primary">{{
              showcase ? 'Open showcase' : 'Back to sign in'
            }}</v-btn>
          </template>
          <template v-else>
            <v-alert
              v-if="notice"
              type="success"
              variant="tonal"
              class="mb-4"
              role="status"
              >{{ notice }}</v-alert
            >
            <v-alert v-if="failed" type="error" variant="tonal" class="mb-4">{{
              recovery
                ? 'Could not request a recovery email. Try again.'
                : kind === 'reset'
                  ? 'Could not reset the password. Check the link or request a new one.'
                  : 'Could not sign in. Check your email and password.'
            }}</v-alert>
            <v-alert
              v-if="kind === 'reset' && !token"
              type="warning"
              variant="tonal"
              class="mb-4"
              >This reset link is missing its token. Request a new link from the
              sign-in page.</v-alert
            >
            <v-form :disabled="busy" @submit.prevent="submit">
              <v-text-field
                v-model="email"
                label="Email address"
                type="email"
                autocomplete="email"
                density="compact"
                required
              />
              <v-text-field
                v-if="!recovery"
                v-model="password"
                :label="kind === 'reset' ? 'New password' : 'Password'"
                type="password"
                :autocomplete="
                  kind === 'reset' ? 'new-password' : 'current-password'
                "
                density="compact"
                required
              />
              <v-text-field
                v-if="kind === 'reset'"
                v-model="confirmation"
                label="Confirm new password"
                type="password"
                autocomplete="new-password"
                density="compact"
                required
              />
              <p v-if="kind === 'reset'" class="text-caption mb-3">
                Use at least 8 characters, including upper and lowercase
                letters, a number, and one of $ @ # &amp; ^ !.
              </p>
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  type="submit"
                  color="primary"
                  :loading="busy"
                  :disabled="!valid"
                  >{{ recovery ? 'Send reset link' : title }}</v-btn
                >
                <v-btn
                  v-if="kind === 'login'"
                  variant="text"
                  :disabled="busy"
                  @click="toggleRecovery"
                  >{{
                    recovery ? 'Back to sign in' : 'Forgot password?'
                  }}</v-btn
                >
                <v-btn v-else to="/login" variant="text">Back to sign in</v-btn>
              </div>
              <v-btn
                v-if="showcase && kind === 'login' && !recovery"
                :to="destination"
                variant="text"
                class="mt-3"
                >Open showcase</v-btn
              >
            </v-form>
          </template>
        </v-card>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-shell {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 1rem;
  background: rgb(var(--v-theme-background));
}
.auth-card {
  width: min(100%, 30rem);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 1rem;
}
</style>
