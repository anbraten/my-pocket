<template>
  <div
    class="min-h-screen text-white pb-32 transition-colors duration-500"
    :style="backgroundStyle"
  >
    <div class="max-w-6xl mx-auto px-4 lg:px-8 pt-10 space-y-8">
      <header
        class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div class="space-y-2">
          <h1
            class="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--text-primary)]"
          >
            MyPocket
          </h1>
        </div>

        <nav
          class="hidden md:flex items-center gap-2 rounded-2xl p-1 bg-[var(--surface-card)] border border-[var(--surface-border)]"
        >
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border border-transparent"
            :class="
              isActive(item.path)
                ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] border-[var(--surface-border-strong)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            "
          >
            <span>{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </header>

      <NuxtPage />
    </div>

    <button
      class="fixed bottom-28 right-6 md:right-10 h-14 w-14 rounded-2xl bg-[var(--accent)] text-[var(--accent-fg)] border border-transparent flex items-center justify-center text-3xl shadow-none hover:bg-[var(--accent-strong)] transition-transform duration-200 transform hover:-translate-y-0.5"
      @click="showAddTransaction = true"
      aria-label="Add transaction"
    >
      ➕
    </button>

    <!-- Bottom Navigation -->
    <nav
      class="fixed bottom-0 left-0 right-0 safe-area-inset-bottom backdrop-blur-xl bg-[var(--surface-card)] border-t border-[var(--surface-border)] md:hidden"
    >
      <div
        class="flex justify-around items-center h-20 max-w-4xl mx-auto px-4 py-2"
      >
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium"
          :class="[
            isActive(item.path)
              ? 'text-[var(--text-primary)]'
              : 'text-[var(--text-muted)]',
            'transition-colors',
          ]"
        >
          <span class="text-2xl">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Add Transaction Modal -->
    <Teleport to="body" v-if="showAddTransaction">
      <div
        class="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <div
          class="bg-[var(--surface-card)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 space-y-4 animate-slide-up border border-[var(--surface-border)]"
          @click.stop
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-[var(--text-primary)]">
              Add Transaction
            </h2>
            <button
              @click="showAddTransaction = false"
              class="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl"
            >
              ✕
            </button>
          </div>

          <AddTransactionForm @close="showAddTransaction = false" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const showAddTransaction = ref(false);
const route = useRoute();

const navItems = [
  { path: '/', label: 'Overview', icon: '📊' },
  { path: '/transactions', label: 'Transactions', icon: '📄' },
  { path: '/subscriptions', label: 'Subscriptions', icon: '🔄' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

const isActive = (path: string) => route.path === path;

const backgroundStyle = computed(() => ({
  backgroundImage:
    'linear-gradient(to bottom, var(--bg-top), var(--bg-mid), var(--bg-bottom))',
  backgroundColor: 'var(--bg-bottom)',
  color: 'var(--text-primary)',
}));
</script>
