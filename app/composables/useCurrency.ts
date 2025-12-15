import { useLocalStorage } from '@vueuse/core';

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

export const useCurrency = () => {
  const currency = useLocalStorage<SupportedCurrency>('currency', 'USD');

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
    formatCurrency,
    currencyOptions: CURRENCY_OPTIONS,
  };
};
