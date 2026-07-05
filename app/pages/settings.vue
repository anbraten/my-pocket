<template>
  <div class="space-y-6">
    <header>
      <p class="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Preferences</p>
      <h1 class="text-2xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>
    </header>

    <nav class="flex gap-1 bg-stone-100 dark:bg-stone-800/80 rounded-full p-1 w-fit">
      <NuxtLink
        v-for="item in settingsNav"
        :key="item.path"
        :to="item.path"
        class="px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-150"
        :class="route.path === item.path
          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <NuxtPage />

    <p class="text-center text-xs text-stone-500 dark:text-stone-400">
      MyPocket runs entirely on your device — no accounts, no servers.
    </p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const settingsNav = [
  { path: '/settings/general', label: 'General' },
  { path: '/settings/data', label: 'Data' },
  { path: '/settings/accounts', label: 'Accounts' },
  { path: '/settings/advanced', label: 'Advanced' },
];
</script>
