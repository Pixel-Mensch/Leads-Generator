import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";

const UpdateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  notes: z.string().max(2000).optional(),
  contactedAt: z.string().datetime().optional().nullable(),
  listId: z.string().cuid().optional().nullable(),
});

async function getOwnedLead(leadId: string, userId: string) {
  return db.lead.findFirst({
    where: { id: leadId, job: { userId } },
    include: { job: { select: { query: true, location: true, source: true, userId: true } } },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const lead = await getOwnedLead(id, session.user.id);
    if (!lead) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    return NextResponse.json(lead);
  } catch (err) {
    console.error("[GET /api/leads/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const owned = await getOwnedLead(id, session.user.id);
    if (!owned) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const body = await req.json();
    const parsed = UpdateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.contactedAt !== undefined) {
      data.contactedAt = parsed.data.contactedAt ? new Date(parsed.data.contactedAt) : null;
    }
    if (parsed.data.listId !== undefined) data.listId = parsed.data.listId;

    const lead = await db.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (err) {
    console.error("[PATCH /api/leads/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const owned = await getOwnedLead(id, session.user.id);
    if (!owned) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    await db.lead.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/leads/[id]]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
