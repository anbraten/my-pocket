import { computed, onMounted, watch } from 'vue';

type Theme = 'dark' | 'light';

const THEME_KEY = 'my-pocket-theme';

const isTheme = (value: string | null): value is Theme =>
  value === 'dark' || value === 'light';

export const useTheme = () => {
  const theme = useState<Theme>('ui-theme', () => 'dark');
  const hydrated = useState('ui-theme-hydrated', () => false);

  const applyTheme = (value: Theme) => {
    if (process.client) {
      document.documentElement.dataset.theme = value;
    }
  };

  if (process.client && !hydrated.value) {
    const stored = localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) {
      theme.value = stored;
    }
    hydrated.value = true;
  }

  onMounted(() => {
    applyTheme(theme.value);
  });

  watch(
    theme,
    (value) => {
      if (!process.client) return;
      localStorage.setItem(THEME_KEY, value);
      applyTheme(value);
    },
    { immediate: process.client }
  );

  const setTheme = (value: Theme) => {
    theme.value = value;
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  };

  const isDark = computed(() => theme.value === 'dark');

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
};
