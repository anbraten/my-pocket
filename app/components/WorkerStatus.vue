<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="visible"
      class="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg shadow-black/10 select-none"
      :class="isDone
        ? 'bg-emerald-500 text-white'
        : 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'"
    >
      <!-- spinner while running -->
      <svg
        v-if="!isDone"
        class="h-3 w-3 animate-spin shrink-0"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          class="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor" stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <!-- checkmark when done -->
      <svg
        v-else
        class="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>

      <span>{{ isDone ? 'Patterns updated' : 'Analyzing transactions…' }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { isComputingRecurring } = useTransactions();

const isDone = ref(false);
const visible = ref(false);

let doneTimer: ReturnType<typeof setTimeout> | null = null;

watch(isComputingRecurring, (computing, wasComputing) => {
  if (computing) {
    // Worker started — show the pill immediately.
    if (doneTimer) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }
    isDone.value = false;
    visible.value = true;
  } else if (wasComputing) {
    // Worker just finished — flash "Done" for 2 s then hide.
    isDone.value = true;
    doneTimer = setTimeout(() => {
      visible.value = false;
      isDone.value = false;
      doneTimer = null;
    }, 2000);
  }
});
</script>
