import type { Lead } from "@prisma/client";
import { computeConfidence, getConfidenceTier } from "@/lib/parser/normalize";

export interface ExportMeta {
  exportedAt?: Date;
  jobId?: string;
  projectId?: string;
  listId?: string;
  statusFilter?: string;
  tagFilter?: string;
  categoryFilter?: string;
  sourceFilter?: string;
  searchFilter?: string;
  followUpFilter?: string;
  totalLeads?: number;
}

export type LeadExportView = {
  companyName: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  sourceName: string;
  contactChannels: string;
  confidenceTier: string;
  confidence: string;
  confidenceSignals: string;
  confidenceWarnings: string;
  status: string;
  notes: string;
  sourceUrl: string;
  createdAt: string;
};

export type ExportOverview = {
  sourceBreakdown: Record<string, number>;
  tierBreakdown: Record<"HIGH" | "MEDIUM" | "LOW", number>;
};

export function getLeadContactChannels(lead: Pick<Lead, "phone" | "email" | "website">) {
  const channels: string[] = [];
  if (lead.phone) channels.push("Telefon");
  if (lead.email) channels.push("E-Mail");
  if (lead.website) channels.push("Website");
  return channels;
}

export function buildLeadExportView(lead: Lead): LeadExportView {
  const quality = computeConfidence(lead);
  const storedTier = getConfidenceTier(lead.confidence);
  const channels = getLeadContactChannels(lead);

  return {
    companyName: lead.companyName,
    website: lead.website ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    category: lead.category ?? "",
    sourceName: lead.sourceName ?? "",
    contactChannels: channels.join(", "),
    confidenceTier: storedTier,
    confidence:
      typeof lead.confidence === "number"
        ? lead.confidence.toFixed(2)
        : quality.score.toFixed(2),
    confidenceSignals: quality.signals.join(" | "),
    confidenceWarnings: quality.warnings.join(" | "),
    status: lead.status,
    notes: lead.notes ?? "",
    sourceUrl: lead.sourceUrl ?? "",
    createdAt: lead.createdAt.toISOString().split("T")[0],
  };
}

export function summarizeLeadsForExport(leads: Lead[]): ExportOverview {
  const sourceBreakdown: Record<string, number> = {};
  const tierBreakdown: ExportOverview["tierBreakdown"] = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const lead of leads) {
    const tier = getConfidenceTier(lead.confidence);
    tierBreakdown[tier] += 1;

    const sources = (lead.sourceName ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!sources.length) {
      sourceBreakdown.unbekannt = (sourceBreakdown.unbekannt ?? 0) + 1;
      continue;
    }

    for (const source of sources) {
      sourceBreakdown[source] = (sourceBreakdown[source] ?? 0) + 1;
    }
  }

  return { sourceBreakdown, tierBreakdown };
}
