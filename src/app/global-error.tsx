"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 520, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: "#8892A4", fontSize: 14, margin: "8px 0 20px 0" }}>
            The error has been reported to our team. You can try again.
          </p>
          {error.digest && <div style={{ fontSize: 11, color: "#5A6478", marginBottom: 20, fontFamily: "monospace" }}>ref: {error.digest}</div>}
          <button onClick={reset} style={{ padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
