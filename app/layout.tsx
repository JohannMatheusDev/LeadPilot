import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: { default: "LeadPilot", template: "%s · LeadPilot" },
  description: "Prospecção de empresas locais para quem vende sites.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0f0d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-fundo font-sans text-texto">{children}</body>
    </html>
  );
}
