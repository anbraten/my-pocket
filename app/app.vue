<template>
  <div class="min-h-screen pb-32 transition-colors bg-stone-200 dark:bg-stone-950">
    <div class="max-w-6xl mx-auto px-4 lg:px-8 pt-8 space-y-6">
      <header class="flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 hover:opacity-80 transition-opacity">
          MyPocket
        </NuxtLink>

        <nav class="hidden md:flex items-center bg-stone-100 dark:bg-stone-800/80 rounded-full p-1 gap-0.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-150"
            :class="
              isActive(item.path)
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </header>

      <NuxtPage />
    </div>

    <WorkerStatus />

    <!-- Bottom Navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-stone-50/95 dark:bg-stone-950/95 border-t border-stone-200 dark:border-stone-800 md:hidden"
    >
      <div class="flex justify-around items-center h-16 max-w-4xl mx-auto px-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors"
          :class="[
            isActive(item.path)
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-stone-500 dark:text-stone-400',
          ]"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { isDark } = useTheme();

const navItems = [
  { path: '/', label: 'Overview', icon: '📊' },
  { path: '/transactions', label: 'Transactions', icon: '📄' },
  { path: '/recurring', label: 'Recurring', icon: '🔄' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

const isActive = (path: string) => route.path === path;

watch(
  () => isDark.value,
  (newVal) => {
    if (!import.meta.client) {
      return;
    }

    if (newVal) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  { immediate: true }
);
</script>
