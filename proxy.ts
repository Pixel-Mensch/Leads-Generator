export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /api (API routes handle auth in their route handlers)
     * - /login and /register (public auth pages)
     * - /_next (Next.js internals)
     * - /public (static files)
     */
    "/((?!api|login|register|_next|favicon.ico|.*\\.svg).*)",
  ],
};
