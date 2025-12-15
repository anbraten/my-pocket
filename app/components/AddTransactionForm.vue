<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-black dark:text-white mb-2">
        Description
      </label>
      <UiInput
        v-model="form.description"
        placeholder="e.g., Coffee at Starbucks"
        required
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-black dark:text-white mb-2"
        >Amount</label
      >
      <UiInput
        v-model.number="form.amount"
        type="number"
        step="0.01"
        placeholder="0.00"
        :prefix="currencySymbol"
        required
      />
      <div class="mt-2 flex gap-2">
        <UiButton
          type="button"
          :variant="form.isExpense ? 'danger' : 'secondary'"
          size="sm"
          class="flex-1"
          @click="form.isExpense = true"
        >
          💸 Expense
        </UiButton>
        <UiButton
          type="button"
          :variant="!form.isExpense ? 'primary' : 'secondary'"
          size="sm"
          class="flex-1"
          @click="form.isExpense = false"
        >
          💰 Income
        </UiButton>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-black dark:text-white mb-2">
        Category
      </label>
      <UiSelect v-model="form.category" :options="categoryOptions" required />
    </div>

    <div>
      <label class="block text-sm font-medium text-black dark:text-white mb-2"
        >Date</label
      >
      <UiInput v-model="form.date" type="date" :max="today" required />
    </div>

    <div class="flex gap-3 pt-2">
      <UiButton
        type="button"
        variant="ghost"
        class="flex-1"
        @click="$emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton type="submit" class="flex-1">Add Transaction</UiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { CATEGORY_ICONS } from '~/utils/categories';
import type { Category } from '~/types';
import { CURRENCY_OPTIONS } from '~/composables/useCurrency';

const emit = defineEmits<{
  close: [];
}>();

const { addTransaction, categorizeTransaction } = useTransactions();
const { currency } = useCurrency();

const categories: Category[] = [
  'groceries',
  'dining',
  'transport',
  'entertainment',
  'utilities',
  'shopping',
  'health',
  'income',
  'transfer',
  'other',
];

const categoryOptions = computed(() =>
  categories.map((cat) => ({
    label: `${CATEGORY_ICONS[cat]} ${
      cat.charAt(0).toUpperCase() + cat.slice(1)
    }`,
    value: cat,
  }))
);

const currencySymbol = computed(
  () =>
    CURRENCY_OPTIONS.find((option) => option.value === currency.value)
      ?.symbol ?? '$'
);

const today = new Date().toISOString().split('T')[0];

const form = reactive({
  description: '',
  amount: 0,
  category: 'other' as Category,
  date: today,
  isExpense: true,
});

watch(
  () => form.description,
  (newDesc) => {
    if (newDesc.length > 3) {
      form.category = categorizeTransaction(newDesc);
    }
  }
);

const handleSubmit = () => {
  const amount = form.isExpense
    ? -Math.abs(form.amount)
    : Math.abs(form.amount);

  addTransaction({
    description: form.description,
    amount,
    category: form.category,
    date: new Date(form.date),
    merchant: form.description.split(' ').slice(0, 3).join(' '),
  });

  emit('close');
};
</script>
