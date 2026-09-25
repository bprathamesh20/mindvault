// Product metadata lives in item.embedJson (written by the pipeline's
// product extractor): { provider: "product", price, currency, ... }.

export type ProductInfo = {
  price?: number;
  priceText?: string;
  currency?: string;
  compareAtPrice?: number;
  brand?: string;
  availability?: string;
};

export function productInfo(embedJson: unknown): ProductInfo | undefined {
  if (!embedJson || typeof embedJson !== "object") return undefined;
  const e = embedJson as Record<string, unknown>;
  const info: ProductInfo = {
    price: typeof e.price === "number" ? e.price : undefined,
    priceText: typeof e.priceText === "string" ? e.priceText : undefined,
    currency: typeof e.currency === "string" ? e.currency : undefined,
    compareAtPrice:
      typeof e.compareAtPrice === "number" ? e.compareAtPrice : undefined,
    brand: typeof e.brand === "string" ? e.brand : undefined,
    availability:
      typeof e.availability === "string" ? e.availability : undefined,
  };
  if (info.price === undefined && !info.priceText) return undefined;
  return info;
}

// "symbol", not "narrowSymbol": narrow renders USD, AUD, CAD and SGD all as
// a bare "$", which is wrong in a vault that mixes stores and currencies.
// Unknown currency → plain number rather than guessing dollars.
export function formatPrice(amount: number, currency?: string): string {
  const whole = Number.isInteger(amount)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : {};
  try {
    return new Intl.NumberFormat(
      undefined,
      currency
        ? { style: "currency", currency, currencyDisplay: "symbol", ...whole }
        : whole,
    ).format(amount);
  } catch {
    return currency ? `${currency} ${amount}` : String(amount);
  }
}

/** "₹998" / "$140" — falls back to the raw extracted string when the
 * pipeline couldn't reduce the price to a number. */
export function priceLabel(info: ProductInfo): string {
  if (info.price !== undefined) return formatPrice(info.price, info.currency);
  return info.priceText ?? "";
}
