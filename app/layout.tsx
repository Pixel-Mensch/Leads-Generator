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
  title: "Leads Generator",
  description: "B2B Lead Generator fuer oeffentlich verfuegbare Unternehmensdaten",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-50 antialiased`}
      >
        <nav className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                LG
              </span>
              <span>Leads Generator</span>
            </Link>

            {session?.user && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link href="/" className="text-slate-600 hover:text-slate-900">
                  Leads
                </Link>
                <Link href="/projects" className="text-slate-600 hover:text-slate-900">
                  Projekte
                </Link>
                <Link href="/search" className="text-slate-600 hover:text-slate-900">
                  Neue Suche
                </Link>
              </div>
            )}

            <div className="ml-auto">
              <NavUser user={session?.user ?? null} />
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
