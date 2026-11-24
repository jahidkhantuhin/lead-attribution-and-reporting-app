<template>
  <div>
    <!-- Report Table -->
    <v-data-table
      :headers="tableHeaders"
      :items="rows"
      :items-per-page="100"
      :fixed-header="true"
      :footer-props="{
        itemsPerPageOptions: [100, 200, 500, -1],
        itemsPerPage: -1,
      }"
      :sort-by="['date_start']"
      :sort-desc="[true]"
      :disable-pagination="true"
      :disable-filtering="true"
      hide-default-footer
      class="v-table-compact kpi-table"
    >
      <template #item.date="{ item }">
        <span>
          <formatted-date
            format-string="ddd, MMM DD, YYYY"
            :date="item.date"
          ></formatted-date>
        </span>
      </template>
      <template #item.adwords_clicks="{ item }">
        <span class="kpi-value kpi-value--search">{{
          item.adwords_clicks
        }}</span>
      </template>
      <template #item.fb_clicks="{ item }">
        <span class="kpi-value kpi-value--social">{{ item.fb_clicks }}</span>
      </template>
      <template #item.fb_conversions="{ item }">
        <span class="kpi-value kpi-value--social">
          <abbr :title="item.fb_conversions">{{ item.fb_conversions }}</abbr>
        </span>
      </template>
      <template #item.conversion_percentage="{ item }">
        <span>
          <abbr :title="item.conversion_percentage">{{
            item.conversion_percentage
          }}</abbr>
        </span>
      </template>
      <template #item.fb_impressions="{ item }">
        <span class="kpi-value kpi-value--social">{{
          item.fb_impressions
        }}</span>
      </template>
      <template #item.adwords_impressions="{ item }">
        <span class="kpi-value kpi-value--search">{{
          item.adwords_impressions
        }}</span>
      </template>
      <template #item.adwords_avg_cost="{ item }">
        <span> ${{ new Number(item.adwords_avg_cost).toFixed(2) }} </span>
      </template>
      <template #item.total_conversions="{ item }">
        <span>
          <abbr :title="item.total_conversions">{{
            new Number(item.total_conversions).toFixed(2)
          }}</abbr>
        </span>
      </template>
      <template #item.total_cost="{ item }">
        <span>
          <abbr :title="`$${item.total_cost}`"
            >${{ new Number(item.total_cost).toFixed(2) }}</abbr
          >
        </span>
      </template>
      <template #item.adwords_avg_cpc="{ item }">
        <span> ${{ new Number(item.adwords_avg_cpc).toFixed(2) }} </span>
      </template>
      <template #item.total_cpl="{ item }">
        <span>
          <abbr :title="`$${item.total_cpl}`"
            >${{ new Number(item.total_cpl).toFixed(2) }}</abbr
          >
        </span>
      </template>
      <template #item.adwords_cpl="{ item }">
        <span class="kpi-value kpi-value--search">
          <abbr :title="`$${item.adwords_cpl}`"
            >${{ new Number(item.adwords_cpl).toFixed(2) }}</abbr
          >
        </span>
      </template>
      <template #item.fb_cpl="{ item }">
        <span class="kpi-value kpi-value--social">
          <abbr :title="`$${item.fb_cpl}`"
            >${{ new Number(item.fb_cpl).toFixed(2) }}</abbr
          >
        </span>
      </template>
      <template #item.adwords_cost="{ item }">
        <span class="kpi-value kpi-value--search">
          <abbr :title="`$${item.adwords_cost}`"
            >${{ new Number(item.adwords_cost).toFixed(2) }}
          </abbr>
        </span>
      </template>
      <template #item.total_adwords_cpc="{ item }">
        <span class="kpi-value kpi-value--search">
          <abbr :title="`$${item.total_adwords_cpc}`"
            >${{
              item.total_adwords_cpc
                ? new Number(item.total_adwords_cpc).toFixed(2)
                : 0
            }}
          </abbr>
        </span>
      </template>
      <template #item.adwords_conversions="{ item }">
        <span class="kpi-value kpi-value--search">
          <abbr :title="item.adwords_conversions">
            {{ item.adwords_conversions }}
          </abbr>
        </span>
      </template>
      <template #item.fb_avg_cost="{ item }">
        <span class="kpi-value kpi-value--social">
          <abbr :title="`$${item.fb_avg_cost}`">
            ${{ new Number(item.fb_avg_cost).toFixed(2) }}
          </abbr>
        </span>
      </template>
      <template #item.fb_avg_cpc="{ item }">
        <span class="kpi-value kpi-value--social">
          <abbr :title="`$${item.fb_avg_cpc}`">
            ${{ new Number(item.fb_avg_cpc).toFixed(2) }}
          </abbr>
        </span>
      </template>
      <template #item.fb_cost="{ item }">
        <span class="kpi-value kpi-value--social">
          <abbr :title="`$${item.fb_cost}`">
            ${{ new Number(item.fb_cost).toFixed(2) }}
          </abbr>
        </span>
      </template>
      <template #item.total_booked="{ item }">
        <span :style="`color: ${item.colors.booked_color}`">
          {{ item.total_booked }}
        </span>
      </template>

      <template #item.total_irrelevant="{ item }">
        <span :style="`color: ${item.colors.irrelevant_color}`">
          {{ item.total_irrelevant }}
        </span>
      </template>
      <template #item.total_missed="{ item }">
        <span :style="`color: ${item.colors.missed_color}`">
          {{ item.total_missed }}
        </span>
      </template>
      <template #item.total_not_booked="{ item }">
        <span :style="`color: ${item.colors.not_booked_color}`">
          {{ item.total_not_booked }}
        </span>
      </template>
      <template #item.total_voice_mail_booking="{ item }">
        <span :style="`color: ${item.colors.voice_mail_booking}`">
          {{ item.total_voice_mail_booking }}
        </span>
      </template>
    </v-data-table>
    <!-- Report Table -->
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@nuxtjs/composition-api'
import FormattedDate from '~/components/FormattedDate.vue'
import { KPIColumnSections } from '~/utils/reports-upload/kpi'

export default defineComponent({
  components: {
    FormattedDate,
  },
  props: {
    rows: {
      type: Array,
      default: () => [],
    },
    mode: {
      required: true,
      type: String,
      default: '',
    },
  },
  setup(props) {
    const dateColumn = computed(() => {
      if (props.mode === 'day') {
        return KPIColumnSections.dates.dailyColumn
      } else {
        return KPIColumnSections.dates.monthColumn
      }
    })

    const tableHeaders = computed(() => {
      return [
        dateColumn.value,
        ...KPIColumnSections.leads,
        ...KPIColumnSections.adwords,
        ...KPIColumnSections.fb,
        ...KPIColumnSections.score,
      ]
    })

    return {
      tableHeaders,
    }
  },
})
</script>
<style lang="scss">
.kpi-table {
  .kpi-value {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 6px;
    background: var(--workspace-tint);
    color: var(--workspace-ink);
  }

  .kpi-value--search {
    background: var(--workspace-subtle);
    border: 1px solid var(--workspace-border);
  }

  .v-data-table__wrapper {
    overflow-x: auto;
  }

  thead:not(.v-data-table-header-mobile) th:first-child,
  tbody
    tr:not(.v-data-table__mobile-table-row, .v-data-table__empty-wrapper)
    td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--workspace-surface);
  }

  tbody tr:hover:not(.v-data-table__mobile-table-row) td:first-child {
    background: var(--workspace-tint);
  }
}
</style>
