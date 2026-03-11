"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(
        typeof data.error === "string"
          ? data.error
          : "Registrierung fehlgeschlagen."
      );
      setLoading(false);
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Leads Scraper</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Konto erstellen</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name (optional)
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              E-Mail
            </label>
            <input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Passwort <span className="text-gray-400 font-normal">(min. 8 Zeichen)</span>
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? "Registrieren…" : "Konto erstellen"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Bereits registriert?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
