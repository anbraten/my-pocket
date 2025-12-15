<template>
  <component :is="as" :class="cardClasses" v-bind="$attrs">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'default' | 'muted' | 'danger';

const props = withDefaults(
  defineProps<{
    as?: string;
    variant?: Variant;
    padding?: string;
  }>(),
  {
    as: 'section',
    variant: 'default',
    padding: 'p-6',
  }
);

const variantClasses: Record<Variant, string> = {
  default:
    'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800',
  muted:
    'bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800',
  danger: 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900',
};

const cardClasses = computed(() => [
  'rounded-lg transition-colors',
  props.padding,
  variantClasses[props.variant] ?? variantClasses.default,
]);
</script>
