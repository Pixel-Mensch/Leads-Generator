export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /login and /register (public auth pages)
     * - /api/auth (next-auth handler)
     * - /api/register (public registration)
     * - /_next (Next.js internals)
     * - /public (static files)
     */
    "/((?!login|register|api/auth|api/register|_next|favicon.ico|.*\\.svg).*)",
  ],
};
