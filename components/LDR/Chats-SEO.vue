<template>
  <div>
    <v-data-table
      class="elevation-1 data-table"
      :headers="chatsHeader"
      :items-per-page="10"
      :footer-props="{
        itemsPerPageOptions: [10, 25, 50, 100],
      }"
      :no-data-text="`No Chats`"
      :items="items"
      :disable-filtering="true"
    >
      <template #item.lead.phone="props">
        <span> {{ props.item.lead.phone | usPhone }}</span>
      </template>
      <template #item.lead.lead_source="props">
        <span style="text-transform: capitalize">
          {{ props.item.lead.lead_source }}</span
        >
      </template>
      <template #item.referrer="props">
        <truncate-text
          :text="props.item.referrer"
          title="Referrer"
          show-text="Show Link"
          :button="true"
          :url="true"
        ></truncate-text>
      </template>
      <template #item.chat_date="props">
        <formatted-date :date="props.item.chat_date"></formatted-date>
      </template>
      <template #item.chat="{ item }">
        <v-btn
          small
          title="Chat Transcript"
          @click="
            currentChat = item
            chatDialog = true
          "
        >
          Chat Transcript
        </v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="chatDialog" width="500">
      <v-card>
        <v-card-title class=""> Chat </v-card-title>

        <div v-if="currentChat">
          <v-card-text
            v-if="currentChat.chat"
            style="height: 350px; overflow: auto"
          >
            <ul class="chat-ul">
              <li
                v-for="(chat, key) in currentChat.chat.split('\n')"
                :key="key"
              >
                {{ chat }}
              </li>
            </ul>
          </v-card-text>
          <v-card-text v-else> Chat is empty. </v-card-text>
        </div>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            text
            @click="
              chatDialog = false
              currentChat = null
            "
          >
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@nuxtjs/composition-api'
import { ldrSeoChatsColumns } from '~/utils/reports-upload/ldr/columns'

import FormattedDate from '~/components/FormattedDate.vue'
import TruncateText from '~/components/TruncateText.vue'

export default defineComponent({
  components: {
    FormattedDate,
    TruncateText,
  },
  props: {
    items: {
      type: Array,
      default: () => [],
      required: true,
    },
  },
  setup() {
    const currentChat = ref(null)
    const chatDialog = ref(false)
    return {
      chatsHeader: ldrSeoChatsColumns(),
      currentChat,
      chatDialog,
    }
  },
})
</script>
