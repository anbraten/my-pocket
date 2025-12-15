import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';

type Theme = 'dark' | 'light';

export function useTheme() {
  const theme = useLocalStorage<Theme>('my-pocket:theme', 'dark');

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  }

  const isDark = computed(() => theme.value === 'dark');

  return {
    theme,
    isDark,
    toggleTheme,
  };
}
