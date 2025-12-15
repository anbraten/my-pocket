<template>
  <button :type="type" :class="buttonClasses" v-bind="$attrs">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset';
    variant?: Variant;
    size?: Size;
    block?: boolean;
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    block: false,
  }
);

const variantClasses: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-600',
  secondary:
    'bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700',
  ghost:
    'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md',
  md: 'text-sm px-4 py-2 rounded-md',
  lg: 'text-base px-6 py-3 rounded-lg',
};

const buttonClasses = computed(() => [
  'font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0',
  variantClasses[props.variant] ?? variantClasses.primary,
  sizeClasses[props.size] ?? sizeClasses.md,
  props.block ? 'w-full' : '',
]);
</script>
