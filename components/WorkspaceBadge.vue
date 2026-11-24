<template>
  <span
    class="workspace-badge"
    :class="'workspace-badge--' + presentation.tone"
  >
    {{ presentation.label }}
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'

type Tone = 'neutral' | 'positive' | 'warning' | 'negative' | 'info' | 'accent'

const statuses: Record<string, [string, Tone]> = {
  '1': ['Active', 'positive'],
  '0': ['Inactive', 'neutral'],
  true: ['Active', 'positive'],
  false: ['Inactive', 'neutral'],
  active: ['Active', 'positive'],
  inactive: ['Inactive', 'neutral'],
  paying_client: ['Paying client', 'positive'],
  trial_client: ['Trial client', 'warning'],
  ex_client: ['Former client', 'neutral'],
  update_available: ['Update available', 'warning'],
  up_to_date: ['Up to date', 'neutral'],
  booked: ['Booked', 'positive'],
  live_answer_booked: ['Booked', 'positive'],
  live_answer_lead_booked: ['Booked', 'positive'],
  not_booked: ['Not booked', 'warning'],
  live_answer_not_booked: ['Not booked', 'warning'],
  live_answer_lead_not_booked: ['Not booked', 'warning'],
  missed: ['Missed', 'negative'],
  no_answer_hangup: ['No answer', 'negative'],
  confirmed_appointment: ['Confirmed', 'positive'],
  voice_mail: ['Voicemail', 'info'],
  unscored: ['Unscored', 'neutral'],
  no_status_available: ['Unscored', 'neutral'],
}

const roles: Record<string, [string, Tone]> = {
  super_admin: ['Super admin', 'accent'],
  admin: ['Admin', 'info'],
  account_manager: ['Account manager', 'positive'],
  call_scorer: ['Call scorer', 'warning'],
  user: ['User', 'neutral'],
}

const leadTypes: Record<string, [string, Tone]> = {
  call: ['Call', 'info'],
  chat: ['Chat', 'positive'],
  email: ['Form', 'neutral'],
  facebook: ['Facebook', 'accent'],
}

const labelSets = { status: statuses, role: roles, 'lead-type': leadTypes }

export default defineComponent({
  props: {
    value: { type: [String, Number, Boolean, Object], default: null },
    kind: { type: String, default: 'status' },
  },
  setup(props) {
    const presentation = computed(() => {
      const value: unknown = props.value
      const record =
        typeof value === 'object' && value
          ? (value as Record<string, unknown>)
          : null
      const raw = record
        ? record.key ?? record.value ?? record.label ?? record.name
        : value
      const text = raw == null ? '' : String(raw).trim()
      const key = text.toLowerCase().replace(/[\s-]+/g, '_')
      const labels = labelSets[props.kind as keyof typeof labelSets] || statuses
      const known =
        Object.prototype.hasOwnProperty.call(labels, key) && labels[key]
      const readable = text
        .replace(/_/g, ' ')
        .replace(/^./, (letter) => letter.toUpperCase())
      return {
        label: known ? known[0] : readable || 'Unknown',
        tone: known ? known[1] : 'neutral',
      }
    })
    return { presentation }
  },
})
</script>
