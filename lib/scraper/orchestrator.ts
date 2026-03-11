/**
 * Job Orchestrator
 * Runs a SearchJob: selects source(s), scrapes, deduplicates, persists leads.
 *
 * In "both" mode: partial success is allowed.
 * If one source fails, the other source's results are still saved.
 */

import { db } from "@/lib/db";
import { JobStatus } from "@prisma/client";
import { scrapeOverpass } from "./sources/overpass";
import { scrapeGelbeSeiten } from "./sources/gelbeseiten";
import { deduplicateLeads } from "./deduplicator";
import { computeConfidence } from "@/lib/parser/normalize";
import type { RawLead } from "./sources/overpass";

export type ScraperSource = "overpass" | "gelbeseiten" | "both";

export async function runJob(jobId: string): Promise<void> {
  const job = await db.searchJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Job nicht gefunden: ${jobId}`);
  if (job.status === "RUNNING") throw new Error("Job läuft bereits");

  await db.searchJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", error: null },
  });

  try {
    const maxResults = parseInt(process.env.SCRAPE_MAX_RESULTS ?? "50", 10);
    const radiusKm = job.radius ?? 5;
    const source = job.source as ScraperSource;

    let rawLeads: RawLead[] = [];
    const sourceErrors: string[] = [];

    // ── Fetch from each requested source ──────────────────────────────────
    if (source === "overpass" || source === "both") {
      try {
        const results = await scrapeOverpass(job.query, job.location, radiusKm, maxResults);
        rawLeads.push(...results);
        console.log(`[Job ${jobId}] Overpass: ${results.length} Rohtreffer`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Job ${jobId}] Overpass Fehler: ${msg}`);
        if (source === "overpass") throw err; // single source: hard fail
        sourceErrors.push(`Overpass: ${msg}`);
      }
    }

    if (source === "gelbeseiten" || source === "both") {
      try {
        const results = await scrapeGelbeSeiten(job.query, job.location, maxResults);
        rawLeads.push(...results);
        console.log(`[Job ${jobId}] Gelbe Seiten: ${results.length} Rohtreffer`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Job ${jobId}] Gelbe Seiten Fehler: ${msg}`);
        if (source === "gelbeseiten") throw err; // single source: hard fail
        sourceErrors.push(`GelbeSeiten: ${msg}`);
      }
    }

    // If "both" mode and ALL sources failed, treat as hard failure
    if (source === "both" && rawLeads.length === 0 && sourceErrors.length > 0) {
      throw new Error(sourceErrors.join("; "));
    }

    // ── Deduplicate across sources ─────────────────────────────────────────
    rawLeads = deduplicateLeads(rawLeads);
    console.log(`[Job ${jobId}] Nach Deduplizierung: ${rawLeads.length} eindeutige Leads`);

    // Recalculate confidence after potential merge (fields may have changed)
    for (const lead of rawLeads) {
      lead.confidence = computeConfidence(lead).score;
    }

    // ── Filter against already-stored leads for this job ──────────────────
    const existing = await db.lead.findMany({
      where: { jobId },
      select: { companyName: true, phone: true, website: true },
    });
    const existingDomains = new Set(
      existing
        .map((l) => {
          try { return new URL(l.website ?? "").hostname.replace(/^www\./, ""); }
          catch { return null; }
        })
        .filter(Boolean)
    );
    const existingPhones = new Set(
      existing.map((l) => l.phone?.replace(/\D/g, "")).filter(Boolean)
    );
    const existingNames = new Set(existing.map((l) => l.companyName.toLowerCase().trim()));

    const toInsert = rawLeads.filter((l) => {
      const domain = (() => {
        try { return l.website ? new URL(l.website).hostname.replace(/^www\./, "") : null; }
        catch { return null; }
      })();
      const phone = l.phone?.replace(/\D/g, "");
      if (domain && existingDomains.has(domain)) return false;
      if (phone && phone.length >= 7 && existingPhones.has(phone)) return false;
      if (existingNames.has(l.companyName.toLowerCase().trim())) return false;
      return true;
    });

    // ── Persist ───────────────────────────────────────────────────────────
    if (toInsert.length > 0) {
      await db.lead.createMany({
        data: toInsert.map((l) => ({ ...l, jobId })),
        skipDuplicates: true,
      });
    }

    const insertedCount = toInsert.length;
    console.log(`[Job ${jobId}] Gespeichert: ${insertedCount} neue Leads`);

    // Build error note if partial success in "both" mode
    const errorNote = sourceErrors.length > 0
      ? `Teilweise Fehler: ${sourceErrors.join("; ")}`
      : null;

    await db.searchJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        totalFound: insertedCount, // actual DB inserts, not raw array length
        error: errorNote,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    await db.searchJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: message },
    });
    throw err;
  }
}
