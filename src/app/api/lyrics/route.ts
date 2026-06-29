import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
// lrclib's search endpoint currently responds in ~8-13s. Give the whole
// multi-tier lookup room to finish instead of letting the platform cut the
// function off mid-fetch (default is as low as 10s on some plans).
export const maxDuration = 45;

// Per-request timeout for each lrclib call. Measured latencies: /api/get ~8s,
// /api/search ~8-13s. 5s (the previous value) aborted almost every call before
// lrclib answered, which is why lyrics stopped showing. 12s catches the vast
// majority while still bailing on a genuinely hung request.
const LRCLIB_TIMEOUT_MS = 12000;

const HEADERS = {
  "User-Agent": "Zenify Cloud Player (https://github.com/ediiloupatty/Zenify)",
};

const HIT_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const MISS_CACHE = "no-store, no-cache, must-revalidate, proxy-revalidate";

type LrcItem = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
};

type Query = { title: string; artist: string; duration: number };

// Normalize for comparison: lowercase, strip diacritics + punctuation, collapse
// whitespace. So "Café (Remastered)" and "cafe remastered" compare equal.
function norm(s: string | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Decide whether a search result is plausibly the SAME song as the query.
// This is the guard that stops lrclib's fuzzy search from returning a totally
// different track (e.g. searching "Hello" and getting "Ghost Riders in the Sky").
function accept(item: LrcItem, q: Query): boolean {
  if (item.instrumental) return false;
  const t = norm(item.trackName);
  const a = norm(item.artistName);
  const qt = norm(q.title);
  const qa = norm(q.artist);

  const titleExact = !!qt && t === qt;
  const titleRel = !!qt && (t.includes(qt) || qt.includes(t));
  const artistExact = !!qa && a === qa;
  const artistRel = !!qa && (a.includes(qa) || qa.includes(a));

  const durKnown = q.duration > 0 && (item.duration ?? 0) > 0;
  const durDiff = durKnown ? Math.abs((item.duration as number) - q.duration) : Infinity;

  // Duration is known and clearly a different length -> different song/version.
  if (durKnown && durDiff > 8) return false;
  // Near-identical length + the title is at least related -> strong match.
  if (durKnown && durDiff <= 3 && titleRel) return true;
  // No decisive duration signal: require real textual agreement.
  return titleExact || (titleRel && (artistExact || artistRel));
}

// Rank accepted candidates so we pick the closest, preferring synced lyrics.
function score(item: LrcItem, q: Query): number {
  const t = norm(item.trackName);
  const a = norm(item.artistName);
  const qt = norm(q.title);
  const qa = norm(q.artist);

  let s = 0;
  if (t === qt) s += 5;
  else if (t.includes(qt) || qt.includes(t)) s += 2;
  if (qa && a === qa) s += 3;
  else if (qa && (a.includes(qa) || qa.includes(a))) s += 1;
  if (q.duration > 0 && (item.duration ?? 0) > 0) {
    s += Math.max(0, 4 - Math.abs((item.duration as number) - q.duration));
  }
  if (item.syncedLyrics) s += 2;
  return s;
}

// Choose the best lyrics string (synced preferred) from a search response, or
// null if nothing clears the accuracy guard — better no lyrics than wrong ones.
function pickBest(results: unknown, q: Query): string | null {
  if (!Array.isArray(results)) return null;
  const cands = (results as LrcItem[]).filter((r) => accept(r, q));
  if (cands.length === 0) return null;
  cands.sort((x, y) => score(y, q) - score(x, q));

  if (cands[0].syncedLyrics) return cands[0].syncedLyrics;
  const synced = cands.find((c) => c.syncedLyrics && c.syncedLyrics.length > 0);
  if (synced?.syncedLyrics) return synced.syncedLyrics;
  return cands[0].plainLyrics || null;
}

async function lrclibFetch(url: string): Promise<unknown | null> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(LRCLIB_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function hit(lyrics: string) {
  return NextResponse.json({ syncedLyrics: lyrics }, { headers: { "Cache-Control": HIT_CACHE } });
}
function miss(status = 200) {
  return NextResponse.json({ syncedLyrics: null }, { status, headers: { "Cache-Control": MISS_CACHE } });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const artist = searchParams.get("artist") || "";
  const title = searchParams.get("title") || "";
  const duration = Math.round(Number(searchParams.get("duration")) || 0);

  const effectiveTitle = title || q;
  if (!effectiveTitle) {
    return NextResponse.json({ error: "Missing query or title" }, { status: 400 });
  }

  const query: Query = { title: effectiveTitle, artist, duration };

  try {
    // 1. Exact match via /api/get. Passing duration makes lrclib return the
    //    version that actually matches this track's length, which is the single
    //    biggest accuracy win. If it 404s, the search tiers below recover it.
    if (artist && title) {
      const params = new URLSearchParams({ artist_name: artist, track_name: title });
      if (duration > 0) params.set("duration", String(duration));
      const data = (await lrclibFetch(`https://lrclib.net/api/get?${params}`)) as LrcItem | null;
      const lyrics = data?.syncedLyrics || data?.plainLyrics;
      if (lyrics) return hit(lyrics);
    }

    // 2. Search by artist + title, then filter/rank by duration + name match.
    const searchQuery = artist ? `${artist} ${title}` : effectiveTitle;
    const tier2 = pickBest(
      await lrclibFetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`),
      query
    );
    if (tier2) return hit(tier2);

    // 3. Last resort: search by title only (artist string may be the culprit).
    //    The accuracy guard still applies, so a wrong-song hit is rejected.
    if (artist) {
      const tier3 = pickBest(
        await lrclibFetch(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`),
        query
      );
      if (tier3) return hit(tier3);
    }

    return miss();
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return miss();
  }
}
