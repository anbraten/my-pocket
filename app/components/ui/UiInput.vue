<template>
  <div class="relative">
    <span
      v-if="prefix"
      class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400"
    >
      {{ prefix }}
    </span>
    <input
      :type="type"
      :value="modelValue"
      @input="onInput"
      class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
      :class="inputClass"
      v-bind="attrs"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

type Size = 'sm' | 'md' | 'lg';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    modelModifiers?: Record<string, boolean>;
    type?: string;
    size?: Size;
    prefix?: string;
  }>(),
  {
    type: 'text',
    size: 'md',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined];
}>();

const attrs = useAttrs();

const sizeMap: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-5 py-4 text-base',
};

const inputClass = computed(() => [
  sizeMap[props.size] ?? sizeMap.md,
  props.prefix ? 'pl-10 pr-4' : 'px-4 pr-4',
]);

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value: string | number = target.value;

  if (props.modelModifiers?.trim) {
    value = value.toString().trim();
  }

  if (props.type === 'number' || props.modelModifiers?.number) {
    value = value === '' ? '' : Number(value);
  }

  emit('update:modelValue', value === '' ? '' : value);
};
</script>
