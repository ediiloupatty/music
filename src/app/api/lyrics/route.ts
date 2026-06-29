import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
      headers: {
        "User-Agent": "Zenify Cloud Player (https://github.com/example/zenify)"
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ syncedLyrics: null }, { status: 200 });
    }

    const data = await res.json();
    
    // Find the first result that has synced lyrics
    const syncedResult = Array.isArray(data) ? data.find((item: any) => item.syncedLyrics && item.syncedLyrics.length > 0) : null;

    if (syncedResult) {
      return NextResponse.json({ syncedLyrics: syncedResult.syncedLyrics }, {
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      });
    }

    const plainResult = Array.isArray(data) ? data.find((item: any) => item.plainLyrics && item.plainLyrics.length > 0) : null;

    if (plainResult) {
      return NextResponse.json({ syncedLyrics: plainResult.plainLyrics }, {
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      });
    }

    return NextResponse.json({ syncedLyrics: null }, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json({ syncedLyrics: null }, { status: 200 });
  }
}
