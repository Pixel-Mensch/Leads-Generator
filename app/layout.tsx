import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { auth } from "@/lib/auth";
import NavUser from "@/components/NavUser";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leads Scraper",
  description: "B2B Lead Generator - oeffentliche Unternehmensdaten sammeln",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}
      >
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/"
              className="font-semibold text-blue-600 text-lg tracking-tight"
            >
              Leads Scraper
            </Link>
            {session?.user && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  Leads
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Projekte
                </Link>
                <Link
                  href="/search"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Neue Suche
                </Link>
              </div>
            )}
            <div className="ml-auto">
              <NavUser user={session?.user ?? null} />
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
