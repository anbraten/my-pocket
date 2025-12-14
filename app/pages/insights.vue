<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Smart Insights</h1>

    <!-- Insights Cards -->
    <div class="space-y-4">
      <div
        v-for="insight in insights"
        :key="insight.timestamp.getTime()"
        :class="insightCardClass(insight.severity)"
        class="rounded-2xl p-5 shadow-sm"
      >
        <div class="flex items-start space-x-3">
          <span class="text-2xl">{{ insightIcon(insight.type) }}</span>
          <div class="flex-1">
            <div class="font-medium mb-1" :class="insightTitleClass(insight.severity)">
              {{ insightTitle(insight.type) }}
            </div>
            <div :class="insightTextClass(insight.severity)">
              {{ insight.message }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="insights.length === 0" class="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-sm text-center">
        <div class="text-4xl mb-4">🔍</div>
        <p class="text-gray-500 dark:text-gray-400">Add more transactions to see insights</p>
      </div>
    </div>

    <!-- Anomalies -->
    <div v-if="anomalies.length > 0" class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <span class="mr-2">⚠️</span>
        Unusual Spending
      </h2>
      <div class="space-y-3">
        <div
          v-for="transaction in anomalies"
          :key="transaction.id"
          class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
        >
          <div class="flex items-center space-x-3 flex-1 min-w-0">
            <span class="text-xl">{{ CATEGORY_ICONS[transaction.category] }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ transaction.description }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDate(transaction.date) }}
              </div>
            </div>
          </div>
          <div class="text-sm font-bold text-orange-600 dark:text-orange-400 ml-2">
            ${{ Math.abs(transaction.amount).toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Recurring Payments -->
    <div v-if="recurringPayments.length > 0" class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
        <span class="mr-2">🔄</span>
        Recurring Payments
      </h2>
      <div class="space-y-3">
        <div
          v-for="payment in recurringPayments"
          :key="payment.merchant"
          class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <div class="flex items-center space-x-3 flex-1">
            <span class="text-xl">{{ CATEGORY_ICONS[payment.category] }}</span>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ payment.merchant }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {{ payment.frequency }} • {{ (payment.confidence * 100).toFixed(0) }}% confidence
              </div>
            </div>
          </div>
          <div class="text-right ml-2">
            <div class="text-sm font-bold text-gray-900 dark:text-white">
              ${{ payment.amount.toFixed(2) }}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              per {{ payment.frequency === 'monthly' ? 'month' : payment.frequency === 'weekly' ? 'week' : 'year' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown Chart -->
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Spending by Category</h2>
      <div class="space-y-3">
        <div
          v-for="stat in categoryStats"
          :key="stat.category"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span class="text-lg">{{ CATEGORY_ICONS[stat.category] }}</span>
              <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">
                {{ stat.category }}
              </span>
            </div>
            <span class="text-sm font-bold text-gray-900 dark:text-white">
              ${{ stat.total.toFixed(0) }}
            </span>
          </div>
          <div class="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              :style="{ width: `${stat.percentage}%`, backgroundColor: CATEGORY_COLORS[stat.category] }"
              class="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
            ></div>
          </div>
        </div>

        <div v-if="categoryStats.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No spending data yet
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { CATEGORY_ICONS, CATEGORY_COLORS } from '~/utils/categories'
import type { Insight } from '~/types'

const { categoryStats, generateInsights, detectAnomalies, detectRecurringPayments } = useTransactions()

const insights = computed(() => generateInsights())
const anomalies = computed(() => detectAnomalies())
const recurringPayments = computed(() => detectRecurringPayments())

const formatDate = (date: Date) => {
  return format(date, 'MMM d, yyyy')
}

const insightIcon = (type: string) => {
  switch (type) {
    case 'anomaly': return '⚠️'
    case 'recurring': return '🔄'
    case 'trend': return '📈'
    case 'achievement': return '🎉'
    default: return '💡'
  }
}

const insightTitle = (type: string) => {
  switch (type) {
    case 'anomaly': return 'Unusual Activity'
    case 'recurring': return 'Subscription Detected'
    case 'trend': return 'Spending Trend'
    case 'achievement': return 'Achievement'
    default: return 'Insight'
  }
}

const insightCardClass = (severity?: string) => {
  switch (severity) {
    case 'warning': return 'bg-orange-50 dark:bg-orange-900/20'
    case 'success': return 'bg-green-50 dark:bg-green-900/20'
    default: return 'bg-blue-50 dark:bg-blue-900/20'
  }
}

const insightTitleClass = (severity?: string) => {
  switch (severity) {
    case 'warning': return 'text-orange-900 dark:text-orange-100'
    case 'success': return 'text-green-900 dark:text-green-100'
    default: return 'text-blue-900 dark:text-blue-100'
  }
}

const insightTextClass = (severity?: string) => {
  switch (severity) {
    case 'warning': return 'text-orange-700 dark:text-orange-200 text-sm'
    case 'success': return 'text-green-700 dark:text-green-200 text-sm'
    default: return 'text-blue-700 dark:text-blue-200 text-sm'
  }
}
</script>
