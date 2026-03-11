/**
 * Session helpers for API routes.
 * Always call requireAuth() at the top of protected route handlers.
 */

import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      ),
    };
  }
  return { session: session as AuthSession, error: null };
}
