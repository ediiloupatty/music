import { runAI } from "@/lib/workersAI";
import { queryD1 } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

type TrackMeta = {
  id: string;
  title: string;
  artist: string | null;
  genre: string | null;
  category: string;
  lyrics: string | null;
};

// ── Mood lexicon (ID + EN) ─────────────────────────────────────────────────
// Used to pre-score tracks BEFORE the AI call. Sending the whole library
// (3000+ songs) blew past the model's context window, so answers came back
// truncated/empty. Instead we shortlist ~120 candidates here and let the AI
// curate from those — and if the AI still fails, the same scoring provides a
// guaranteed fallback list so "lagu sedih" always returns sad songs.
const MOODS: { keys: string[]; terms: string[] }[] = [
  {
    keys: ["sedih", "galau", "patah hati", "sad", "heartbreak", "broken", "nangis", "menangis", "sendu", "melow", "mellow", "kecewa"],
    terms: ["sedih", "galau", "patah hati", "air mata", "menangis", "nangis", "kecewa", "luka", "terluka", "pergi", "tinggalkan", "ditinggal", "perpisahan", "berpisah", "selamat tinggal", "sendiri", "kesepian", "kehilangan", "hilang", "maaf", "sakit", "hancur", "menyerah", "lelah", "sad", "cry", "tears", "broken", "alone", "goodbye", "lonely", "hurt", "pain", "regret", "sorry", "lost"],
  },
  {
    keys: ["semangat", "energik", "enerjik", "workout", "gym", "olahraga", "upbeat", "energetic", "lari", "party", "pesta"],
    terms: ["semangat", "bangkit", "berlari", "lari", "menang", "juara", "api", "bakar", "kuat", "fire", "run", "jump", "alive", "power", "energy", "dance", "party", "rock", "tinggi", "terbang"],
  },
  {
    keys: ["santai", "chill", "tenang", "relax", "calm", "tidur", "sleep", "fokus", "focus", "belajar", "study"],
    terms: ["santai", "tenang", "damai", "pelan", "angin", "senja", "malam", "hujan", "mimpi", "tidur", "calm", "slow", "dream", "night", "rain", "breeze", "peace", "quiet", "soft", "acoustic"],
  },
  {
    keys: ["romantis", "romantic", "cinta", "love", "sayang", "pacar", "jatuh cinta"],
    terms: ["cinta", "sayang", "kasih", "jatuh cinta", "rumah", "bersamamu", "denganmu", "untukmu", "milikmu", "peluk", "cium", "manis", "cantik", "indah", "love", "heart", "kiss", "beautiful", "darling", "baby", "sweet", "forever", "always"],
  },
  {
    keys: ["senang", "happy", "ceria", "bahagia", "fun", "gembira"],
    terms: ["bahagia", "senang", "ceria", "tertawa", "tersenyum", "senyum", "cerah", "matahari", "happy", "smile", "laugh", "sunshine", "good", "fun", "joy", "shine"],
  },
  {
    keys: ["rindu", "kangen", "nostalgia", "kenangan", "miss"],
    terms: ["rindu", "kangen", "kenangan", "ingat", "teringat", "dulu", "masa lalu", "kembali", "pulang", "nostalgia", "miss", "memory", "memories", "remember", "yesterday", "home"],
  },
];

// Score a track against the detected mood terms + raw query words.
function scoreTrack(t: TrackMeta, terms: string[], queryWords: string[]): number {
  const title = (t.title || "").toLowerCase();
  const artist = (t.artist || "").toLowerCase();
  const genre = (t.genre || "").toLowerCase();
  const lyrics = (t.lyrics || "").toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (title.includes(term)) score += 4;
    if (genre.includes(term)) score += 2;
    if (lyrics) {
      // Count occurrences in lyrics (capped) — a song that repeats "rindu"
      // ten times is more on-theme than one passing mention.
      let idx = 0, hits = 0;
      while (hits < 5 && (idx = lyrics.indexOf(term, idx)) !== -1) { hits++; idx += term.length; }
      score += hits;
    }
  }
  // Direct query words matching title/artist always count (e.g. artist search).
  for (const w of queryWords) {
    if (w.length < 3) continue;
    if (title.includes(w)) score += 5;
    if (artist.includes(w)) score += 5;
  }
  return score;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = body?.query?.trim();

    if (!query || typeof query !== "string") {
      return Response.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 }
      );
    }

    // Fetch all tracks metadata from D1
    const rows: TrackMeta[] = await queryD1(
      "SELECT id, title, artist, genre, category, lyrics FROM tracks ORDER BY created_at DESC"
    );

    if (!rows || rows.length === 0) {
      return Response.json({
        trackIds: [],
        message: "Tidak ada lagu di library. Upload lagu dulu via Admin panel.",
      });
    }

    // ── Stage 1: shortlist candidates ────────────────────────────────────
    // Detect which mood buckets the query touches and score every track
    // against their terms. Only the top candidates go into the AI prompt —
    // the full library does not fit in the model's context window.
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
    const terms = MOODS.filter((m) => m.keys.some((k) => lowerQuery.includes(k)))
      .flatMap((m) => m.terms);

    const scored = rows
      .map((t) => ({ t, score: scoreTrack(t, terms, queryWords) }))
      .sort((a, b) => b.score - a.score);

    const CANDIDATE_LIMIT = 120;
    const positive = scored.filter((s) => s.score > 0);
    // Mood/keyword hits first; pad with recent tracks so the AI still has
    // material when the query matches nothing textually (e.g. pure vibes).
    const candidates = [
      ...positive.slice(0, CANDIDATE_LIMIT),
      ...scored.filter((s) => s.score === 0).slice(0, Math.max(0, CANDIDATE_LIMIT - positive.length)),
    ].map((s) => s.t);

    // Build the candidate list for the AI prompt. CRITICAL: include the id on
    // every line — the AI must return these exact ids, so it has to see them.
    const trackList = candidates
      .map((t) => {
        const parts = [`id=${t.id} | "${t.title}"`];
        if (t.artist) parts.push(`by ${t.artist}`);
        if (t.genre) parts.push(`genre: ${t.genre}`);
        if (t.category) parts.push(`playlist: ${t.category}`);
        // Include a slice of lyrics for mood analysis
        if (t.lyrics) {
          const clean = t.lyrics.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, "").trim();
          if (clean) parts.push(`lyrics: "${clean.slice(0, 120)}"`);
        }
        return parts.join(" | ");
      })
      .join("\n");

    const systemPrompt = `You are Zenify AI, an expert, empathetic music curator and recommendation engine for a personal music library.
The user types a mood, vibe, theme, genre, activity, or artist (in Indonesian or English).
Your job is to deeply analyze the user's mood/request, SELECT the most appropriate matching songs from the library below, and provide an engaging, personalized recommendation overview.

TRACK LIBRARY:
${trackList}

RESPOND WITH VALID JSON ONLY. No markdown code blocks around the JSON, no extra text outside the JSON object:
{
  "trackIds": ["<id>", "<id>"],
  "message": "<your personalized recommendation message>"
}

GUIDELINES:
1. Deeply analyze the mood, lyrics, and genre of the tracks. E.g., for "lagu sedih" (sad songs), pick songs with heartbreak/melancholy lyrics or mellow/ballad melodies. For "semangat" (workout/upbeat), choose high-energy tracks.
2. "message": Write a warm, friendly, and engaging recommendation (in Indonesian unless the user wrote in English). Start with an empathetic opening matching their vibe, then highlight 2-3 specific songs from your selection, mentioning their titles and explaining WHY they perfectly fit the user's mood (e.g., highlighting a beautiful lyric snippet, the soothing acoustic melody, or the relatable theme). Gunakan tanda baris baru (\\n) agar rapi jika perlu.
3. Use the EXACT id values from the library (the part after "id="). NEVER invent or modify ids.
4. Order trackIds with the best match first (return 10-15 tracks when enough good matches exist).
5. If truly no songs match, return an empty trackIds array and a polite message suggesting other keywords to try.`;

    const aiResponse = await runAI("@cf/meta/llama-3.1-8b-instruct-fast", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      max_tokens: 768,
      temperature: 0.4,
    });

    const rawResponse = aiResponse.result?.response;
    const responseText: string =
      typeof rawResponse === "string"
        ? rawResponse
        : rawResponse
          ? JSON.stringify(rawResponse)
          : "";

    // Try to extract JSON from the AI response
    let trackIds: string[] = [];
    let message = "";

    try {
      // The AI might wrap JSON in markdown code blocks or add prose around it.
      // Strip code fences, then slice out the JSON object (first { to last }).
      const stripped = responseText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const first = stripped.indexOf("{");
      const last = stripped.lastIndexOf("}");
      const jsonSlice = first !== -1 && last !== -1 ? stripped.slice(first, last + 1) : stripped;

      const parsed = JSON.parse(jsonSlice);
      trackIds = Array.isArray(parsed.trackIds) ? parsed.trackIds : [];
      message = parsed.message || "";
    } catch {
      // If JSON parsing fails, try to extract trackIds from the response text
      // and use the entire response as the message
      message = responseText || "Maaf, AI tidak bisa memproses permintaan ini. Coba lagi ya!";

      // Last resort: scan the raw text for any track ids or titles it mentioned.
      if (responseText) {
        const lowerResp = responseText.toLowerCase();
        const byId = rows.filter((t) => responseText.includes(t.id)).map((t) => t.id);
        const byTitle = rows
          .filter((t) => lowerResp.includes(t.title.toLowerCase()))
          .map((t) => t.id);
        trackIds = Array.from(new Set([...byId, ...byTitle])).slice(0, 10);
      }
    }

    // Validate that returned trackIds actually exist and remove duplicates
    const validIds = new Set(rows.map((t) => t.id));
    trackIds = Array.from(new Set(trackIds.filter((id) => validIds.has(id))));

    // ── Guaranteed, full list ────────────────────────────────────────────
    // The AI's hand-picked tracks come first, then we pad with our own
    // top-scored on-theme songs up to 15 — so "lagu sedih" always yields a
    // proper list of sad songs even when the AI returns few (or zero) picks.
    const RESULT_TARGET = 15;
    if (trackIds.length < RESULT_TARGET && positive.length > 0) {
      const seen = new Set(trackIds);
      for (const s of positive) {
        if (trackIds.length >= RESULT_TARGET) break;
        if (!seen.has(s.t.id)) {
          seen.add(s.t.id);
          trackIds.push(s.t.id);
        }
      }
    }
    if (trackIds.length > 0 && !message) {
      message = "Ini beberapa lagu yang cocok dengan pencarianmu 🎵";
    }

    return Response.json({ trackIds, message });
  } catch (error) {
    console.error("AI Search error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: `AI search failed: ${errMsg}`, trackIds: [], message: "" },
      { status: 500 }
    );
  }
}
