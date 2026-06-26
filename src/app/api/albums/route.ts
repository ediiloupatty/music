import { NextResponse } from "next/server";
import { getAlbums, initializeD1Tables } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeD1Tables();
    const albums = await getAlbums();
    return NextResponse.json({ albums });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
