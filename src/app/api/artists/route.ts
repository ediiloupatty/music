import { NextResponse } from "next/server";
import { getArtists } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const artists = await getArtists();
    return NextResponse.json({ artists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
