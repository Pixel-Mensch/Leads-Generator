"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Registrierung fehlgeschlagen."
        );
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Registrierung aktuell nicht moeglich. Bitte erneut versuchen.");
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
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="mt-2 text-sm text-gray-600">
            Richte deinen Workspace fuer Projekte, Lead-Listen und Exporte ein.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/70 bg-white/90 p-6 shadow-sm backdrop-blur"
        >
          <div>
            <label
              htmlFor="register-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name (optional)
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-Mail
            </label>
            <input
              id="register-email"
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
              htmlFor="register-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Passwort <span className="font-normal text-gray-400">(min. 8 Zeichen)</span>
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            {loading ? "Konto wird erstellt..." : "Konto erstellen"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Bereits registriert?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
