import { auth } from "@/auth";

// ─── Admin access control ───────────────────────────────────────────────────
// The admin allow-list is configured via the ADMIN_EMAIL environment variable
// (comma-separated for more than one) rather than hardcoded, so the address is
// NOT committed to the public repo and can differ per environment.
//
// Fail-closed: if ADMIN_EMAIL is unset/empty, NOBODY is treated as an admin.
// Set it in .env, e.g.  ADMIN_EMAIL=you@example.com

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = getAdminEmails();
  return allow.length > 0 && allow.includes(email.trim().toLowerCase());
}

// Server-side guard for admin-only server actions. This is the REAL security
// boundary — a layout only hides the UI, but server actions are callable
// directly, so each mutating admin action must call this first. Throws when the
// caller isn't the configured admin.
export async function assertAdmin(): Promise<void> {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    throw new Error("Forbidden: admin access required");
  }
}
