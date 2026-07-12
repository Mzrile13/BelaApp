import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bela Tracker",
  description: "Praćenje rezultata i naprednih statistika za belot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <footer className="mt-auto px-4 py-5 text-center text-[12px] text-[#7d9587]">
          © {new Date().getFullYear()} Marko Zrilić. Sva prava pridržana.
        </footer>
      </body>
      <Analytics />
      <SpeedInsights />
    </html>
  );
}
