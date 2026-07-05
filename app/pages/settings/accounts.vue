<template>
  <UiCard class="space-y-4">
    <header>
      <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Accounts</p>
      <h2 class="text-xl font-semibold text-stone-900 dark:text-stone-100">Your accounts</h2>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Tag imports and transactions to an account for per-account analytics.
      </p>
    </header>

    <ul v-if="accounts.length > 0" class="space-y-2">
      <li
        v-for="account in accounts"
        :key="account.id"
        class="rounded-lg border border-stone-200 dark:border-stone-700"
      >
        <div class="flex items-center gap-3 px-3 py-2.5">
          <span class="h-3 w-3 rounded-full shrink-0" :style="{ backgroundColor: account.color }" />
          <span class="flex-1 text-sm font-medium text-stone-900 dark:text-stone-100">{{ account.name }}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
            {{ ACCOUNT_TYPE_LABELS[account.type] }}
          </span>
          <button
            class="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
            @click="startEdit(account)"
          >
            Edit
          </button>
          <button
            class="text-xs text-rose-500 hover:text-rose-600 transition-colors"
            @click="removeAccount(account.id)"
          >
            Remove
          </button>
        </div>
        <form
          v-if="editingAccountId === account.id"
          @submit.prevent="saveEdit"
          class="border-t border-stone-200 dark:border-stone-700 px-3 py-3 space-y-3"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <UiInput v-model="editForm.name" placeholder="Account name" required />
            <UiSelect v-model="editForm.type" :options="accountTypeOptions" />
          </div>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="color in ACCOUNT_COLORS"
              :key="color"
              type="button"
              class="h-6 w-6 rounded-full border-2 transition-all"
              :style="{ backgroundColor: color, borderColor: editForm.color === color ? color : 'transparent' }"
              :class="editForm.color === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-stone-900' : 'opacity-70 hover:opacity-100'"
              @click="editForm.color = color"
            />
          </div>
          <div class="flex gap-2">
            <UiButton type="submit" class="flex-1">Save</UiButton>
            <UiButton type="button" variant="secondary" class="flex-1" @click="cancelEdit">Cancel</UiButton>
          </div>
        </form>
      </li>
    </ul>

    <form @submit.prevent="submitNewAccount" class="space-y-3">
      <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Add account</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <UiInput v-model="newAccount.name" placeholder="e.g. Comdirect" required />
        <UiSelect v-model="newAccount.type" :options="accountTypeOptions" />
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="color in ACCOUNT_COLORS"
          :key="color"
          type="button"
          class="h-6 w-6 rounded-full border-2 transition-all"
          :style="{ backgroundColor: color, borderColor: newAccount.color === color ? color : 'transparent' }"
          :class="newAccount.color === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-stone-900' : 'opacity-70 hover:opacity-100'"
          @click="newAccount.color = color"
        />
      </div>
      <UiButton type="submit" block>Add account</UiButton>
    </form>
  </UiCard>
</template>

<script setup lang="ts">
import { ACCOUNT_COLORS, ACCOUNT_TYPE_LABELS } from '~/composables/useAccounts';
import type { AccountType } from '~/types';

const { accounts, addAccount, updateAccount, deleteAccount } = useAccounts();

const editingAccountId = ref<string | null>(null);
const editForm = reactive({ name: '', type: 'checking' as AccountType, color: ACCOUNT_COLORS[0] ?? '#8b5cf6' });

const startEdit = (account: { id: string; name: string; type: AccountType; color: string }) => {
  editingAccountId.value = account.id;
  editForm.name = account.name;
  editForm.type = account.type;
  editForm.color = account.color;
};

const cancelEdit = () => {
  editingAccountId.value = null;
};

const saveEdit = async () => {
  if (!editingAccountId.value || !editForm.name.trim()) return;
  await updateAccount(editingAccountId.value, { name: editForm.name.trim(), type: editForm.type, color: editForm.color });
  editingAccountId.value = null;
};

const newAccount = reactive({
  name: '',
  type: 'checking' as AccountType,
  color: ACCOUNT_COLORS[0] ?? '#8b5cf6',
});

const accountTypeOptions = [
  { label: 'Checking', value: 'checking' },
  { label: 'Savings', value: 'savings' },
  { label: 'Investment', value: 'investment' },
];

const submitNewAccount = async () => {
  if (!newAccount.name.trim()) return;
  await addAccount({ name: newAccount.name.trim(), type: newAccount.type, color: newAccount.color });
  newAccount.name = '';
  newAccount.type = 'checking';
  newAccount.color = ACCOUNT_COLORS[0] ?? '#8b5cf6';
};

const removeAccount = async (id: string) => {
  const account = accounts.value.find((a) => a.id === id);
  const name = account?.name ?? 'this account';
  if (confirm(`Delete "${name}"? All transactions linked to it will also be permanently deleted.`)) {
    if (editingAccountId.value === id) editingAccountId.value = null;
    await deleteAccount(id);
  }
};
</script>
