import { NextResponse } from "next/server";
import { getPlaylists, getCategoryCounts } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [playlists, counts] = await Promise.all([
      getPlaylists(),
      getCategoryCounts(),
    ]);

    const countMap: Record<string, number> = {};
    for (const row of counts as { category: string; count: number }[]) {
      countMap[row.category] = row.count;
    }

    const playlistsWithCount = playlists.map((pl) => ({
      ...pl,
      trackCount: countMap[pl.name] ?? 0,
    }));

    return NextResponse.json({ playlists: playlistsWithCount }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
