<template>
  <div class="relative">
    <select
      :value="modelValue"
      @change="onChange"
      class="w-full appearance-none bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md pr-10 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
      :class="sizeClass"
      v-bind="attrs"
    >
      <option v-if="placeholder" value="">
        {{ placeholder }}
      </option>
      <template v-if="options.length">
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </template>
      <template v-else>
        <slot />
      </template>
    </select>
    <span
      class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400"
      >⌄</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

type Option = {
  label: string;
  value: string | number;
};

type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    modelModifiers?: Record<string, boolean>;
    options?: Option[];
    placeholder?: string;
    size?: Size;
  }>(),
  {
    options: () => [],
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const attrs = useAttrs();

const sizeMap: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-4 py-4 text-base',
};

const sizeClass = computed(() => sizeMap[props.size] ?? sizeMap.md);

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  let value: string | number = target.value;

  if (props.modelModifiers?.number) {
    value = target.value === '' ? '' : Number(target.value);
  }

  emit('update:modelValue', value);
};
</script>
