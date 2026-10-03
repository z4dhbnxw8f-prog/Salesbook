export const currencyCodes = ["GMD", "EUR", "GBP", "USD", "NGN", "CAD", "AUD"] as const;
export type CurrencyCode = typeof currencyCodes[number];

export const currencyNames: Record<CurrencyCode, string> = {
 GMD: "Gambian dalasi",
 EUR: "Euro",
 GBP: "British pound",
 USD: "US dollar",
 NGN: "Nigerian naira",
 CAD: "Canadian dollar",
 AUD: "Australian dollar",
};