/**
 * Currency-aware money handling.
 *
 * Every money column in the DB (invoices.grand_total, journal_entry_lines.debit/credit,
 * expenses.amount, daily_sales.amount, etc.) is stored as a BIGINT in that row's
 * currency's "minor unit" — NOT always cents. UGX has 0 minor-unit digits (there is
 * no sub-shilling denomination in practice), so UGX 37,500 is stored as 37500, not
 * 3750000. USD/SSP/KES etc. have 2 minor-unit digits, so USD 37.50 is stored as 3750,
 * same as before.
 *
 * This file is the single source of truth for that mapping. Never hardcode "/ 100"
 * or "* 100" against a money column — always go through toMinorUnits/toMajorUnits
 * so the conversion is correct for whatever currency that row is actually in.
 */

// ISO 4217 minor unit digits. Extend as needed — this list covers the currencies
// Axis orgs currently use or are likely to bill in (East Africa + USD).
const MINOR_UNIT_DIGITS: Record<string, number> = {
  UGX: 0, // Ugandan Shilling — no sub-unit in everyday use
  RWF: 0, // Rwandan Franc
  XOF: 0, // West African CFA franc
  XAF: 0, // Central African CFA franc
  JPY: 0,
  KES: 2, // Kenyan Shilling
  TZS: 2, // Tanzanian Shilling
  SSP: 2, // South Sudanese Pound
  USD: 2,
  EUR: 2,
  GBP: 2,
};

const DEFAULT_MINOR_UNIT_DIGITS = 2;

export function getMinorUnitDigits(currencyCode: string): number {
  const code = currencyCode?.toUpperCase();
  return MINOR_UNIT_DIGITS[code] ?? DEFAULT_MINOR_UNIT_DIGITS;
}

/** Convert a major-unit amount (e.g. 37500 UGX, 37.5 USD) the user typed into
 * the integer minor-unit value that should be stored in the DB for that currency. */
export function toMinorUnits(majorAmount: number, currencyCode: string): number {
  const digits = getMinorUnitDigits(currencyCode);
  return Math.round(majorAmount * 10 ** digits);
}

/** Convert a stored minor-unit integer back to a major-unit number for display/math. */
export function toMajorUnits(minorAmount: number, currencyCode: string): number {
  const digits = getMinorUnitDigits(currencyCode);
  return minorAmount / 10 ** digits;
}

/** Format a stored minor-unit amount as a localized currency string.
 * This is the ONE formatter — replaces every local `fmtUGX` copy in the app. */
export function formatMoney(minorAmount: number, currencyCode: string): string {
  const code = currencyCode?.toUpperCase() || "UGX";
  const major = toMajorUnits(minorAmount, code);
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: code,
      minimumFractionDigits: getMinorUnitDigits(code),
      maximumFractionDigits: getMinorUnitDigits(code),
    }).format(major);
  } catch {
    // Intl throws on a currency code it doesn't recognize (e.g. a typo'd
    // custom code) — fall back to a plain prefixed number rather than crash.
    return `${code} ${major.toLocaleString("en-UG", {
      minimumFractionDigits: getMinorUnitDigits(code),
      maximumFractionDigits: getMinorUnitDigits(code),
    })}`;
  }
}

/** Convert an amount from one currency's minor units to another currency's minor
 * units using a given exchange rate (rate = 1 unit of `fromCurrency` in `toCurrency`
 * major units — matches invoices.exchange_rate semantics). Used to bring a
 * foreign-currency invoice into the org's base_currency for ledger posting and
 * dashboard aggregation. */
export function convertMinorUnits(
  minorAmount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return minorAmount;
  const majorInFrom = toMajorUnits(minorAmount, fromCurrency);
  const majorInTo = majorInFrom * exchangeRate;
  return toMinorUnits(majorInTo, toCurrency);
}
