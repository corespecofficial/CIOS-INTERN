import type { Metadata, Viewport } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";
import { PWAProvider } from "@/components/pwa-provider";
import { SentryUser } from "@/components/sentry-user";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const LOGO_OG = "https://res.cloudinary.com/detsk6uql/image/upload/w_1200,h_630,c_fill,g_auto,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";
const LOGO_180 = "https://res.cloudinary.com/detsk6uql/image/upload/w_180,h_180,c_fill,g_auto,r_max,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";
const LOGO_32  = "https://res.cloudinary.com/detsk6uql/image/upload/w_32,h_32,c_fill,g_auto,r_max,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";
const LOGO_16  = "https://res.cloudinary.com/detsk6uql/image/upload/w_16,h_16,c_fill,g_auto,r_max,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.netlify.app"),
  title: { default: "CIOS — Trained African talent for verified companies", template: "%s · CIOS" },
  description:
    "CIOS is the platform behind the COSPRONOS Internship Program — where trained African interns get hired by verified companies worldwide.",
  keywords: ["CIOS", "COSPRONOS", "internship", "AI", "platform", "Corespec", "talent", "hiring", "recruitment", "Africa"],
  manifest: "/manifest.webmanifest",
  applicationName: "CIOS",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CIOS" },
  icons: {
    icon: [
      { url: LOGO_16, sizes: "16x16", type: "image/png" },
      { url: LOGO_32, sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: LOGO_180, sizes: "180x180", type: "image/png" }],
    shortcut: [LOGO_32],
  },
  openGraph: {
    type: "website",
    siteName: "CIOS — COSPRONOS × Corespec",
    title: "Trained African talent for verified companies",
    description:
      "Every candidate has a public performance record. Real projects, real attendance, real skills — verified.",
    images: [{ url: LOGO_OG, width: 1200, height: 630, alt: "CIOS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CIOS — Trained talent, verified companies",
    description:
      "The platform behind the COSPRONOS Internship Program.",
    images: [LOGO_OG],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E1A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = LOCALE_LABELS[locale]?.dir || "ltr";
  return (
    <ClerkProvider>
      <html
        lang={locale}
        dir={dir}
        className={`${nunito.variable} ${spaceGrotesk.variable} h-full`}
        data-theme="dark"
        suppressHydrationWarning
      >
        <head>
          {/* Pre-paint theme bootstrap — runs before React hydrates */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('cios-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
            }}
          />
        </head>
        <body className="min-h-full antialiased font-[family-name:var(--font-nunito)]" suppressHydrationWarning>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
          <PWAProvider />
          <SentryUser />
          <Toaster
            position="top-right"
            toastOptions={{
              className: "cios-toast",
              style: {
                background: "var(--bg-secondary, #1a1f2e)",
                color: "var(--text-primary, #fff)",
                border: "1px solid var(--border-default, rgba(255,255,255,0.08))",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
