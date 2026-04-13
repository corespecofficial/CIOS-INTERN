"use client";

/**
 * Regional pricing engine.
 * 1. Detect country via Geolocation permission → reverse-geocode (primary).
 * 2. Fall back to IP-based geolocation (no permission needed).
 * 3. Final fallback: browser locale / timezone heuristic.
 * 4. Fetch real-time FX rates from frankfurter.app (free, no key) and cache 1h.
 */

export interface RegionInfo { country: string; currency: string; symbol: string; region: string }

const COUNTRY_TO_CURRENCY: Record<string, { currency: string; symbol: string; region: string }> = {
  NG: { currency: "NGN", symbol: "₦",   region: "Nigeria" },
  GH: { currency: "GHS", symbol: "₵",   region: "Ghana" },
  KE: { currency: "KES", symbol: "KSh", region: "Kenya" },
  ZA: { currency: "ZAR", symbol: "R",   region: "South Africa" },
  EG: { currency: "EGP", symbol: "E£",  region: "Egypt" },
  US: { currency: "USD", symbol: "$",   region: "United States" },
  CA: { currency: "CAD", symbol: "C$",  region: "Canada" },
  GB: { currency: "GBP", symbol: "£",   region: "United Kingdom" },
  IE: { currency: "EUR", symbol: "€",   region: "Ireland" },
  DE: { currency: "EUR", symbol: "€",   region: "Germany" },
  FR: { currency: "EUR", symbol: "€",   region: "France" },
  ES: { currency: "EUR", symbol: "€",   region: "Spain" },
  IT: { currency: "EUR", symbol: "€",   region: "Italy" },
  NL: { currency: "EUR", symbol: "€",   region: "Netherlands" },
  IN: { currency: "INR", symbol: "₹",   region: "India" },
  PK: { currency: "PKR", symbol: "₨",   region: "Pakistan" },
  AE: { currency: "AED", symbol: "AED", region: "United Arab Emirates" },
  SA: { currency: "SAR", symbol: "SAR", region: "Saudi Arabia" },
  AU: { currency: "AUD", symbol: "A$",  region: "Australia" },
  NZ: { currency: "NZD", symbol: "NZ$", region: "New Zealand" },
  JP: { currency: "JPY", symbol: "¥",   region: "Japan" },
  SG: { currency: "SGD", symbol: "S$",  region: "Singapore" },
  BR: { currency: "BRL", symbol: "R$",  region: "Brazil" },
  MX: { currency: "MXN", symbol: "Mex$",region: "Mexico" },
  PH: { currency: "PHP", symbol: "₱",   region: "Philippines" },
  ID: { currency: "IDR", symbol: "Rp",  region: "Indonesia" },
  TR: { currency: "TRY", symbol: "₺",   region: "Turkey" },
  CN: { currency: "CNY", symbol: "¥",   region: "China" },
};

const FX_CACHE_KEY = "cios.fx.rates.v2";
const REGION_CACHE_KEY = "cios.region.v2";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface FXCache { timestamp: number; base: string; rates: Record<string, number> }

function readCache<T>(key: string, maxAge: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; v: T };
    if (Date.now() - parsed.t > maxAge) return null;
    return parsed.v;
  } catch { return null; }
}
function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })); } catch {}
}

/** Fetch real-time FX rates with 1h cache. Base USD. */
export async function getFxRates(): Promise<Record<string, number>> {
  const cached = readCache<FXCache>(FX_CACHE_KEY, CACHE_TTL);
  if (cached) return cached.rates;
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD");
    const data = await res.json();
    if (!data?.rates) throw new Error("no rates");
    const rates: Record<string, number> = { USD: 1, ...data.rates };
    writeCache<FXCache>(FX_CACHE_KEY, { timestamp: Date.now(), base: "USD", rates });
    return rates;
  } catch {
    // Last-ditch fallback — approximate rates so the UI never breaks
    return FALLBACK_RATES;
  }
}

const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1480, GHS: 13.5, KES: 129, ZAR: 18.5, EGP: 48,
  CAD: 1.36, INR: 83.5, PKR: 280, AED: 3.67, SAR: 3.75, AUD: 1.52, NZD: 1.65,
  JPY: 150, SGD: 1.35, BRL: 5.15, MXN: 18, PHP: 57, IDR: 15700, TRY: 34, CNY: 7.25,
};

/** Detect country via Geolocation → reverse-geocode. Returns null on denial/failure. */
async function detectViaGeolocation(): Promise<string | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 8000);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(timeout);
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3`, {
            headers: { "Accept-Language": "en" },
          });
          const data = await res.json();
          const cc = (data?.address?.country_code as string | undefined)?.toUpperCase();
          resolve(cc || null);
        } catch { resolve(null); }
      },
      () => { clearTimeout(timeout); resolve(null); },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60_000 },
    );
  });
}

/** IP-based detection — no permission needed. */
async function detectViaIP(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const cc = (data?.country_code as string | undefined)?.toUpperCase();
    return cc || null;
  } catch { return null; }
}

/** Heuristic fallback from timezone or locale. */
function detectViaLocale(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Lagos") || tz.includes("Africa/Lagos")) return "NG";
    if (tz.includes("Nairobi")) return "KE";
    if (tz.includes("Accra")) return "GH";
    if (tz.includes("Cairo")) return "EG";
    if (tz.includes("Johannesburg")) return "ZA";
    if (tz.includes("Europe/London")) return "GB";
    if (tz.includes("Europe/")) return "DE";
    if (tz.includes("Asia/Kolkata")) return "IN";
    if (tz.includes("Asia/Dubai")) return "AE";
    if (tz.includes("Australia/")) return "AU";
    if (tz.includes("America/Toronto")) return "CA";
    if (tz.includes("America/")) return "US";
  } catch {}
  return null;
}

function fromCountry(cc: string): RegionInfo {
  const meta = COUNTRY_TO_CURRENCY[cc];
  if (meta) return { country: cc, ...meta };
  return { country: cc, currency: "USD", symbol: "$", region: cc };
}

export interface DetectOptions { askPermission?: boolean }

/** Top-level: detect region with full fallback chain. */
export async function detectRegion(opts: DetectOptions = {}): Promise<RegionInfo> {
  const cached = readCache<RegionInfo>(REGION_CACHE_KEY, CACHE_TTL);
  if (cached && !opts.askPermission) return cached;

  let cc: string | null = null;
  if (opts.askPermission) cc = await detectViaGeolocation();
  if (!cc) cc = await detectViaIP();
  if (!cc) cc = detectViaLocale();
  const info = fromCountry(cc || "US");
  writeCache<RegionInfo>(REGION_CACHE_KEY, info);
  return info;
}

export function clearRegionCache() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(REGION_CACHE_KEY); } catch {}
}

/** PPP-adjusted multipliers so Nigeria / Africa / South Asia get local-first pricing. */
export const PPP_MULTIPLIER: Record<string, number> = {
  NG: 0.25, GH: 0.30, KE: 0.30, EG: 0.35, ZA: 0.55,
  IN: 0.30, PK: 0.25, PH: 0.40, ID: 0.35,
  BR: 0.55, MX: 0.55, TR: 0.45,
};
export function getPPPMultiplier(countryCode: string): number {
  return PPP_MULTIPLIER[countryCode] ?? 1.0;
}

/** Convert USD → local currency with PPP discount applied before FX. */
export function convertPrice(usdPrice: number, region: RegionInfo, rates: Record<string, number>): number {
  const ppp = getPPPMultiplier(region.country);
  const rate = rates[region.currency] || 1;
  return usdPrice * ppp * rate;
}

export function formatLocalPrice(usdPrice: number, region: RegionInfo, rates: Record<string, number>): string {
  const local = convertPrice(usdPrice, region, rates);
  const rounded = local >= 100000 ? Math.round(local / 1000) * 1000
    : local >= 10000 ? Math.round(local / 500) * 500
    : local >= 1000 ? Math.round(local / 50) * 50
    : local >= 100 ? Math.round(local / 5) * 5
    : Math.round(local);
  return `${region.symbol}${rounded.toLocaleString()}`;
}
