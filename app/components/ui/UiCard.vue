<template>
  <component :is="as" :class="cardClasses" v-bind="$attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'glass' | 'frosted' | 'danger' | 'bare';

const props = withDefaults(
  defineProps<{
    as?: string;
    variant?: Variant;
    padding?: string;
    shadow?: boolean;
  }>(),
  {
    as: 'section',
    variant: 'glass',
    padding: 'p-6',
    shadow: false,
  }
);

const variantClasses: Record<Variant, string> = {
  glass:
    'bg-[var(--surface-card)] border border-[var(--surface-border)] text-[var(--text-primary)]',
  frosted:
    'bg-[var(--surface-muted)] border border-[var(--surface-border)] text-[var(--text-primary)] backdrop-blur-md',
  danger: 'bg-rose-500/10 border border-rose-400/30 text-[var(--text-primary)]',
  bare: 'bg-transparent border-transparent',
};

const cardClasses = computed(() => [
  'rounded-2xl transition-colors duration-300',
  props.padding,
  props.shadow ? 'shadow-lg' : '',
  variantClasses[props.variant] ?? variantClasses.glass,
]);
</script>
