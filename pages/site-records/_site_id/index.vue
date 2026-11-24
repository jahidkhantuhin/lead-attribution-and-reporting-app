<template>
  <site-details
    :loading="busy"
    :site-data="siteData"
    :site-i-d="siteID"
  ></site-details>
</template>

<script lang="ts">
import {
  defineComponent,
  useRoute,
  useStore,
  ref,
  onMounted,
} from '@nuxtjs/composition-api'
import { pageNames } from '~/shared/PageNames'
import SiteDetails from '~/components/SiteRecords/SiteDetails.vue'

import useSiteRecords from '~/services/useSiteRecords'

export default defineComponent({
  components: {
    SiteDetails,
  },
  setup() {
    const route = useRoute()
    const store = useStore()

    const siteData = ref({})
    const busy = ref(false)

    const { siteById } = useSiteRecords()

    const siteID = route.value.params.site_id
    const clientId = route.value.params.client_id
    const pageTitle = 'Website Details'

    const fetchLocation = () => {
      busy.value = true

      siteById(siteID)
        .then((resp) => {
          siteData.value = resp.data.data

          store.dispatch('setPageHeading', {
            pageTitle,
            breadcrumbs: [
              {
                text: `Dashboard`,
                to: `/`,
                disabled: false,
              },
              {
                text: pageNames.sites,
                to: `/site-records`,
                disabled: false,
              },
              {
                text: 'Details of' + ' ' + (siteData.value as any).url,
                to: ``,
                disabled: true,
              },
            ],
          })
        })
        .finally(() => {
          busy.value = false
        })
    }

    onMounted(() => {
      fetchLocation()
    })

    return {
      siteData,
      busy,
      clientId,
      siteID,
    }
  },
  head: { title: 'Website Details' },
})
</script>
