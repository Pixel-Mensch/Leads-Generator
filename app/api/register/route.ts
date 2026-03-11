import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80).optional(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "E-Mail bereits registriert" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: normalizedEmail, name: name ?? null, passwordHash },
        select: { id: true, email: true, name: true, plan: true, role: true },
      });

      await tx.project.create({
        data: { name: "Mein erstes Projekt", userId: createdUser.id },
      });

      return createdUser;
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("[POST /api/register]", err);
    return NextResponse.json(
      { error: "Registrierung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
