import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { COOKIE_NAME, DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(COOKIE_NAME)?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(cookieValue || "")
    ? (cookieValue as Locale)
    : DEFAULT_LOCALE;

  const messages = (await import(`./messages/${locale}.json`)).default;
  return { locale, messages };
});
