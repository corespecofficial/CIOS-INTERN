"use client";

import Script from "next/script";

interface Props {
  url: string;
}

export function CalendlyEmbed({ url }: Props) {
  // Append dark-theme params to the Calendly URL
  const embedUrl = (() => {
    try {
      const u = new URL(url);
      u.searchParams.set("hide_event_type_details", "1");
      u.searchParams.set("hide_gdpr_banner", "1");
      u.searchParams.set("background_color", "0A0E1A");
      u.searchParams.set("text_color", "E8EDF5");
      u.searchParams.set("primary_color", "1E88E5");
      return u.toString();
    } catch {
      return url;
    }
  })();

  return (
    <>
      {/* Calendly inline embed */}
      <div
        className="calendly-inline-widget"
        data-url={embedUrl}
        style={{
          minWidth: 320,
          height: 700,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#0A0E1A",
        }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
    </>
  );
}
