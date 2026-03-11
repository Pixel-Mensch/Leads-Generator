"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const registered = searchParams.get("registered") === "1";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-Mail oder Passwort falsch.");
        return;
      }

      if (!result?.ok) {
        setError("Anmeldung aktuell nicht moeglich. Bitte erneut versuchen.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Anmeldung aktuell nicht moeglich. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Leads Generator
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Willkommen zurueck
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Melde dich an, um Projekte, Suchlaeufe und Exporte weiterzubearbeiten.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur"
        >
          {registered && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Konto erstellt. Du kannst dich jetzt direkt anmelden.
            </p>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-Mail
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Passwort
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Anmeldung laeuft..." : "Anmelden"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
