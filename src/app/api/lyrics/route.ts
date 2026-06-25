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
        // LRCLib requests a user agent
        "User-Agent": "Zenify Cloud Player (https://github.com/example/zenify)"
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from LRCLib" }, { status: res.status });
    }

    const data = await res.json();
    
    // Find the first result that has synced lyrics
    const syncedResult = data.find((item: any) => item.syncedLyrics && item.syncedLyrics.length > 0);

    if (syncedResult) {
      return NextResponse.json({ syncedLyrics: syncedResult.syncedLyrics });
    }

    return NextResponse.json({ syncedLyrics: null });
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
