<template>
  <div class="min-h-screen pb-32 transition-colors bg-white dark:bg-black">
    <div class="max-w-6xl mx-auto px-4 lg:px-8 pt-8 space-y-6">
      <header
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <h1 class="text-2xl md:text-3xl font-bold text-black dark:text-white">
          MyPocket
        </h1>

        <nav
          class="hidden md:flex items-center gap-1 rounded-lg p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
        >
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="
              isActive(item.path)
                ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            "
          >
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </header>

      <NuxtPage />
    </div>

    <!-- Bottom Navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 md:hidden"
    >
      <div class="flex justify-around items-center h-16 max-w-4xl mx-auto px-4">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors"
          :class="[
            isActive(item.path)
              ? 'text-black dark:text-white'
              : 'text-neutral-600 dark:text-neutral-400',
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
