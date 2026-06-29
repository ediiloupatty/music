import { NextResponse } from "next/server";
import { incrementPlayCount } from "@/lib/cloudflare";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trackId = body?.trackId as string;
    if (!trackId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }
    const session = await auth();
    const userEmail = session?.user?.email || undefined;
    await incrementPlayCount(trackId, userEmail);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
