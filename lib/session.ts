/**
 * Session helpers for API routes.
 * Always call requireAuth() at the top of protected route handlers.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectivePlan } from "@/lib/limits";
import { NextResponse } from "next/server";

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    plan: string;
  };
};

export async function requireAuth(): Promise<
  | { session: AuthSession; error: null }
  | { session: null; error: NextResponse }
> {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      ),
    };
  }

  const currentUser = await db.user.findUnique({
    where: { id: authSession.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      planExpiresAt: true,
      isActive: true,
    },
  });

  if (!currentUser) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Session ungueltig" },
        { status: 401 }
      ),
    };
  }

  if (!currentUser.isActive) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Konto deaktiviert" },
        { status: 403 }
      ),
    };
  }

  return {
    session: {
      user: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        plan: getEffectivePlan(currentUser.plan, currentUser.planExpiresAt),
      },
    },
    error: null,
  };
}
