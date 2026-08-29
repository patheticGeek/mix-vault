import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import Providers from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/components/ThemeProvider";
import { APP_DESC, APP_TITLE } from "@/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESC,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="classic">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#23232a" />
        {/* Applies the visitor's stored skin/theme before first paint, so
            reloading doesn't flash the default "classic" theme first. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static script sourced from our own THEME_INIT_SCRIPT constant, not user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base-100 text-base-content`}
      >
        <Providers>
          <Navbar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
