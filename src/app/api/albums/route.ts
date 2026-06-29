import { NextResponse } from "next/server";
import { getAlbums } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const albums = await getAlbums();
    return NextResponse.json({ albums }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
