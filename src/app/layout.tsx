import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "IPL Dashboard - Server-Side Rendered",
  description: "Live IPL cricket dashboard with server-side rendering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full bg-background text-foreground`}
      >
        <nav className="bg-blue-600 dark:bg-blue-700 text-white p-4 shadow-lg border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold hover:text-blue-100 transition-colors">
              IPL Dashboard (SSR)
            </Link>
          </div>
        </nav>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
