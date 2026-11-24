<template>
  <restricted-component permission="create user">
    <div class="record-editor">
      <user-form
        title="Add team member"
        scope="admin"
        @cancel="$router.push('/users/')"
        @done="onCreate"
      />
    </div>
  </restricted-component>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  useRouter,
  useStore,
} from '@nuxtjs/composition-api'
import { IBreadcrumbs } from '@/store'
import { pageNames } from '~/shared/PageNames'

import UserForm from '~/components/forms/UserForm.vue'
import RestrictedComponent from '~/components/RestrictedComponent.vue'

export default defineComponent({
  components: {
    UserForm,
    RestrictedComponent,
  },
  middleware: 'isAuthenticated',
  setup() {
    const store = useStore()
    const router = useRouter()

    const busy = ref(false)

    // set the page breadcrumbs
    const breadcrumbs: IBreadcrumbs[] = [
      {
        text: `Dashboard`,
        to: `/`,
      },
      {
        text: pageNames.users,
        to: `/users`,
      },
      {
        text: `Add`,
        to: '/users/add',
      },
    ]

    const pageTitle = 'Add Team Member'

    store.dispatch('setPageHeading', { pageTitle, breadcrumbs })

    const onCreate = () => {
      router.replace('/users')
    }

    return {
      busy,
      onCreate,
    }
  },
  head: {
    title: 'Add Team Member',
  },
})
</script>
