import { NextResponse } from "next/server";
import { getArtists, initializeD1Tables } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeD1Tables();
    const artists = await getArtists();
    return NextResponse.json({ artists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
