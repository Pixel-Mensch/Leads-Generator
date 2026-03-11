"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Source = "overpass" | "gelbeseiten" | "both";

export default function SearchPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    query: "",
    location: "",
    radius: 5,
    source: "overpass" as Source,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create job
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Fehler beim Erstellen des Jobs");
      }
      const job = await res.json();

      // Trigger job
      await fetch(`/api/jobs/${job.id}/run`, { method: "POST" });

      router.push(`/?jobId=${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Neue Suche</h1>
      <p className="text-sm text-gray-500 mb-6">
        Öffentlich auffindbare Unternehmensdaten nach Branche und Ort sammeln.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branche / Stichwort
          </label>
          <input
            type="text"
            required
            placeholder="z. B. Restaurant, Zahnarzt, Kfz-Werkstatt"
            value={form.query}
            onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
          <input
            type="text"
            required
            placeholder="z. B. Berlin, München, Hamburg"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radius (km)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.radius}
            onChange={(e) => setForm((f) => ({ ...f, radius: parseInt(e.target.value, 10) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quelle</label>
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as Source }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="overpass">OpenStreetMap (kostenlos, ToS-konform)</option>
            <option value="gelbeseiten">Gelbe Seiten (DE)</option>
            <option value="both">Beide Quellen kombinieren</option>
          </select>
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
          {loading ? "Suche wird gestartet…" : "Suche starten"}
        </button>
      </form>
    </div>
  );
}
