"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

type User = { email: string; name?: string | null; plan?: string } | null;

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-500",
  PRO: "bg-blue-100 text-blue-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
};

export default function NavUser({ user }: { user: User }) {
  if (!user) {
    return (
      <Link href="/login" className="text-sm text-blue-600 hover:underline">
        Anmelden
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user.plan && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[user.plan] ?? PLAN_BADGE.FREE}`}>
          {user.plan}
        </span>
      )}
      <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[140px]">
        {user.name ?? user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Abmelden
      </button>
    </div>
  );
}
