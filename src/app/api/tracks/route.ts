import { NextResponse } from "next/server";
import { getTracksByCategory } from "@/lib/cloudflare";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const tracks = await getTracksByCategory(category);
    return NextResponse.json({ tracks }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
