"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_NAME, LOCALES, type Locale } from "@/i18n/config";

export async function setLocale(locale: Locale) {
  if (!(LOCALES as readonly string[]).includes(locale)) return { ok: false as const, error: "Invalid locale" };
  const store = await cookies();
  store.set(COOKIE_NAME, locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
