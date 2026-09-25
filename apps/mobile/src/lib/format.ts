export function timeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(savedAt).toLocaleDateString();
}

export function timeAgoLong(savedAt: number): string {
  const s = Math.floor((Date.now() - savedAt) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return "about a year ago";
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type ProductInfo = {
  price?: number;
  priceText?: string;
  currency?: string;
  compareAtPrice?: number;
  brand?: string;
  availability?: string;
};

// Reads the pipeline's product embedJson into typed fields.
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

export function priceLabel(info: ProductInfo): string {
  if (info.price !== undefined) return formatPrice(info.price, info.currency);
  return info.priceText ?? "";
}
