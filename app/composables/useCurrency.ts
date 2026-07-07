import { useLocalStorage } from '@vueuse/core';

export type SupportedCurrency = 'EUR' | 'USD';

export type CurrencyOption = {
  value: SupportedCurrency;
  label: string;
  symbol: string;
};

const CURRENCY_LOCALES: Record<SupportedCurrency, string> = {
  EUR: 'de-DE',
  USD: 'en-US',
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
];

export function useCurrency() {
  const currency = useLocalStorage<SupportedCurrency>(
    'my-pocket:currency',
    'EUR',
  );

  const locale = computed(() => CURRENCY_LOCALES[currency.value]);
  const formatter = computed(
    () =>
      new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currency.value,
      }),
  );

  function formatCurrency(
    value: number,
    options?: Intl.NumberFormatOptions,
  ): string {
    if (!options) return formatter.value.format(value);

    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: currency.value,
      ...options,
    }).format(value);
  }

  return {
    currency,
    formatCurrency,
    currencyOptions: CURRENCY_OPTIONS,
  };
}
