import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Eksplicitan stack za slučaj da font uopće ne stigne (`display: swap` je
  // ionako Nextov default, ovo pokriva ostatak).
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  // Mono se koristi samo za nekoliko brojki (rezultat ruke, rejting). Ne
  // zaslužuje <link rel="preload"> koji se natječe s prvim prikazom — neka se
  // dohvati usput, a do tada ga pokriva fallback iznad.
  preload: false,
});

export const metadata: Metadata = {
  title: "Bela Tracker",
  description: "Praćenje rezultata i naprednih statistika za belot",
  appleWebApp: { capable: true, title: "Bela Tracker", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  // Boja adresne trake na mobitelu — inače bijela traka iznad tamne aplikacije.
  themeColor: "#082f24",
  colorScheme: "dark",
  // Sadržaj ide ispod notcha/home-indikatora; donja navigacija sama dodaje razmak.
  viewportFit: "cover",
};

// Godina u podnožju: mijenja se jednom godišnje, pa se računa jednom po
// procesu umjesto pri svakom renderu layouta.
const COPYRIGHT_YEAR = new Date().getFullYear();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      {/* Donji razmak za BottomNav dodaje globals.css, samo kad je navigacija prikazana. */}
      <body className="min-h-full flex flex-col">
        {children}
        <BottomNav />
        <ServiceWorkerRegister />
        <footer className="mt-auto px-4 py-5 text-center text-[12px] text-dim">
          © {COPYRIGHT_YEAR} Marko Zrilić. Sva prava pridržana.
        </footer>
        {/* Moraju biti unutar <body>. Kao braća <body>-ja to je nevaljan HTML
            koji parser preglednika svejedno premjesti u <body>, pa se poslužen
            markup i stvarni DOM raziđu. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
