<template>
  <button :type="type" :class="buttonClasses" v-bind="$attrs">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
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
  primary:
    'bg-[var(--accent)] text-[var(--accent-fg)] border border-transparent hover:bg-[var(--accent-strong)]',
  secondary:
    'bg-[var(--surface-card)] border border-[var(--surface-border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
  ghost:
    'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
  danger:
    'bg-rose-600/90 border border-rose-500/50 text-white hover:bg-rose-600',
  subtle:
    'bg-[var(--surface-muted)] border border-transparent text-[var(--text-primary)] hover:border-[var(--surface-border-strong)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-2 rounded-xl',
  md: 'text-sm px-4 py-3 rounded-2xl',
  lg: 'text-base px-5 py-4 rounded-3xl',
};

const buttonClasses = computed(() => [
  'font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-0 active:translate-y-0.5 transform',
  variantClasses[props.variant] ?? variantClasses.primary,
  sizeClasses[props.size] ?? sizeClasses.md,
  props.block ? 'w-full' : '',
]);
</script>
