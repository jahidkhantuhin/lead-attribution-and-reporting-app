<template>
  <v-navigation-drawer
    v-model="syncOpen"
    app
    dark
    :temporary="!$vuetify.breakpoint.lgAndUp"
    :mobile-breakpoint="1264"
    :width="248"
    class="workspace-sidebar dont-print"
  >
    <!-- User's avatar and details -->
    <template #prepend>
      <nuxt-link to="/" class="workspace-brand">
        <span class="workspace-brand-mark"
          ><v-icon small>mdi-chart-box-outline</v-icon></span
        >
        LeadLens
      </nuxt-link>
      <v-list-item two-line class="workspace-identity">
        <v-icon
          v-if="!$store.getters['users/userProfilePicture']"
          color="primary"
          class="mr-3"
          size="34"
        >
          mdi-account-circle
        </v-icon>
        <user-profile-picture
          v-else
          :height="40"
          :width="40"
          class="mr-1"
          radius="50%"
          :src="$store.getters['users/userProfilePicture']"
        />
        <v-list-item-content>
          <v-list-item-title>{{ userFullname }}</v-list-item-title>
          <v-list-item-subtitle>
            <small>{{ userRole }}</small>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </template>
    <v-divider></v-divider>

    <v-list-item>
      <v-switch
        v-model="darkMode"
        dense
        :label="`Dark Mode: ${darkMode ? `On` : `Off`}`"
        :loading="busy"
      ></v-switch>
    </v-list-item>

    <v-divider></v-divider>
    <!-- Menu items -->
    <v-list nav dense>
      <template v-for="(item, index) in items">
        <!-- single menu item -->
        <v-list-item
          v-if="!item.children || !item.children.length"
          :key="index"
          link
          nuxt
          :to="item.link"
          :exact="item.link === '/'"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!-- items with sub menu -->
        <v-list-group
          v-else
          :key="index"
          v-model="item.active"
          :prepend-icon="item.icon"
          no-action
        >
          <template #activator>
            <v-list-item-content>
              <v-list-item-title v-text="item.title"></v-list-item-title>
            </v-list-item-content>
          </template>

          <v-list-item
            v-for="(child, childIndex) in item.children"
            :key="childIndex"
            link
            nuxt
            :to="child.link"
          >
            <!-- We are not going to show child item icons -->
            <v-list-item-content>
              <v-list-item-title v-text="child.title"></v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list-group>
      </template>

      <!-- The log out button -->
      <v-list-item link @click="logOut()">
        <v-list-item-icon>
          <v-icon>mdi-logout-variant</v-icon>
        </v-list-item-icon>
        <v-list-item-content>
          <v-list-item-title>{{ $t('buttons.logOut') }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  useContext,
} from '@nuxtjs/composition-api'
import { ISidebarItem } from '@/shared/SidebarItems'
import UserProfilePicture from '../UserProfilePicture.vue'
import useAxios from '~/plugins/useAxios'

export default defineComponent({
  components: { UserProfilePicture },
  props: {
    open: {
      type: Boolean,
      default: true,
    },
    items: {
      type: Array as () => ISidebarItem[],
      default: () => [],
    },
  },
  setup(props, { emit, root }) {
    const { $auth } = useContext()
    const $axios = useAxios()

    const busy = ref(false)

    const darkMode = computed({
      get: () => (root as any).$vuetify.theme.dark,
      set: (v) => {
        ;(root as any).$vuetify.theme.dark = v
        busy.value = true
        $axios
          .put(
            '/meta/dark_mode',
            {
              meta_name: `dark_mode`,
              meta_value: v,
            },
            {
              withCredentials: true,
            }
          )
          .finally(() => (busy.value = false))
      },
    })

    // the user

    const userFullname = computed(() =>
      $auth.user ? $auth.user?.first_name + ' ' + $auth.user?.last_name : ''
    )
    const userRole = computed(() =>
      $auth.user ? ($auth.user?.role as string).toUpperCase() : ''
    )

    // the computed v-model for v-navigation-drawer
    const syncOpen = computed({
      get(): boolean {
        return props.open
      },
      set(val: boolean) {
        emit('changed', val)
      },
    })

    const logOut = () => {
      emit('signout')
    }

    return {
      syncOpen,
      logOut,
      userFullname,
      userRole,
      darkMode,
      busy,
    }
  },
})
</script>
