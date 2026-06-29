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

    // Build a track list for the AI prompt. CRITICAL: include the id on every
    // line — the AI must return these exact ids, so it has to see them.
    const trackList = rows
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
4. Order trackIds with the best match first (max 10 tracks).
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
