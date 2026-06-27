import Link from "next/link";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

// Gate the whole /admin section to the configured admin email. This runs on the
// server before the (client) admin page renders. The matching server actions
// are independently guarded with assertAdmin(), so this is defence-in-depth for
// the UI, not the only check.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const email = session?.user?.email;

  if (isAdminEmail(email)) {
    return <>{children}</>;
  }

  const loggedIn = !!session?.user;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 text-center"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="white">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
        </svg>
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black">Access Denied</h1>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
          {loggedIn
            ? "This account doesn't have admin access. Only the site owner can open the admin panel."
            : "You need to sign in with the owner account to access the admin panel."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "var(--accent)", color: "#0a0c11" }}
        >
          Back to Home
        </Link>
        {!loggedIn && (
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-white/5"
            style={{ border: "1px solid var(--border-card)", color: "var(--text-primary)" }}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
