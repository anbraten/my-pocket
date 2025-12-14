export type SupportedCurrency = 'USD' | 'EUR';

export type CurrencyOption = {
  value: SupportedCurrency;
  label: string;
  symbol: string;
};

const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
];

const isSupportedCurrency = (value: string): value is SupportedCurrency =>
  CURRENCY_OPTIONS.some((option) => option.value === value);

export const useCurrency = () => {
  const currency = useState<SupportedCurrency>('currency', () => 'USD');
  const hasHydrated = useState('currency-hydrated', () => false);

  if (process.client && !hasHydrated.value) {
    const stored = localStorage.getItem('my-pocket-currency');
    if (stored && isSupportedCurrency(stored)) {
      currency.value = stored;
    }
    hasHydrated.value = true;
  }

  const setCurrency = (next: SupportedCurrency) => {
    currency.value = next;
    if (process.client) {
      localStorage.setItem('my-pocket-currency', next);
    }
  };

  const locale = computed(() => CURRENCY_LOCALES[currency.value]);
  const formatter = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currency.value,
      })
  );

  const formatCurrency = (
    value: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    if (!options) return formatter.value.format(value);

    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: currency.value,
      ...options,
    }).format(value);
  };

  return {
    currency,
    setCurrency,
    formatCurrency,
    currencyOptions: CURRENCY_OPTIONS,
  };
};
