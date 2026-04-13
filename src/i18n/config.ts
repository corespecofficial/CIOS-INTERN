export const LOCALES = ["en", "fr", "pcm", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, { name: string; native: string; flag: string; dir: "ltr" | "rtl" }> = {
  en: { name: "English", native: "English", flag: "🇬🇧", dir: "ltr" },
  fr: { name: "French", native: "Français", flag: "🇫🇷", dir: "ltr" },
  pcm: { name: "Pidgin", native: "Naija Pidgin", flag: "🇳🇬", dir: "ltr" },
  ar: { name: "Arabic", native: "العربية", flag: "🇸🇦", dir: "rtl" },
};

export const COOKIE_NAME = "cios-locale";
