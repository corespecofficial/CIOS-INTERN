"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { setLocale as setLocaleAction } from "@/app/actions/locale";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("settings");
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Locale>(locale);

  const onChange = (next: Locale) => {
    setValue(next);
    startTransition(async () => {
      const r = await setLocaleAction(next);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(`${LOCALE_LABELS[next].flag} ${LOCALE_LABELS[next].native}`);
      // Force a hard refresh so server components + RTL flip apply cleanly
      setTimeout(() => window.location.reload(), 250);
    });
  };

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>🌐 {t("language")}</div>
      <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 14 }}>{t("languageDescription")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
        {LOCALES.map((l) => {
          const meta = LOCALE_LABELS[l];
          const active = value === l;
          return (
            <button
              key={l}
              onClick={() => onChange(l)}
              disabled={pending}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: active ? "rgba(30,136,229,0.15)" : "transparent",
                border: `1px solid ${active ? "rgba(30,136,229,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 10, cursor: pending ? "not-allowed" : "pointer",
                color: active ? "#1E88E5" : "#E8EDF5",
                fontWeight: 600, fontSize: 13, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 22 }}>{meta.flag}</span>
              <div>
                <div>{meta.native}</div>
                <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}{meta.dir === "rtl" ? " · RTL" : ""}</div>
              </div>
              {active && <span style={{ marginLeft: "auto", color: "#1E88E5" }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
