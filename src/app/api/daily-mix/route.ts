import { NextResponse } from "next/server";
import { getTracksByCategory, getDailyMixes } from "@/lib/cloudflare";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [session, allTracks] = await Promise.all([
      auth(),
      getTracksByCategory(null),
    ]);
    const userEmail = session?.user?.email || null;
    const mixes = await getDailyMixes(userEmail, allTracks);

    // Strip full track objects from coverTracks to keep payload small;
    // we only need id + cover_url + title + artist for the card covers.
    const payload = mixes.map((m) => ({
      ...m,
      coverTracks: m.coverTracks.map((t) => ({
        id: t.id,
        cover_url: t.cover_url,
        title: t.title,
        artist: t.artist,
        category: t.category,
      })),
    }));

    return NextResponse.json({ mixes: payload });
  } catch (error) {
    console.error("Error generating daily mixes:", error);
    return NextResponse.json({ mixes: [] }, { status: 500 });
  }
}
