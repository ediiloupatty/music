import { NextResponse } from "next/server";
import { getPlaylists, queryD1, initializeD1Tables } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initializeD1Tables();
    const [playlists, counts] = await Promise.all([
      getPlaylists(),
      queryD1("SELECT category, COUNT(*) as count FROM tracks GROUP BY category"),
    ]);

    const countMap: Record<string, number> = {};
    for (const row of counts as { category: string; count: number }[]) {
      countMap[row.category] = row.count;
    }

    const playlistsWithCount = playlists.map((pl) => ({
      ...pl,
      trackCount: countMap[pl.name] ?? 0,
    }));

    return NextResponse.json({ playlists: playlistsWithCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
