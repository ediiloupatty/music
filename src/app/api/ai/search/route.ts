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

    const systemPrompt = `You are Zenify AI, a music recommendation ENGINE for a personal music library.
The user types a mood, vibe, theme, genre, activity, or artist (in Indonesian or English).
Your ONLY job is to SELECT matching songs from the library below and return their ids.
You are NOT a chatbot — never reply conversationally, always return song ids.

TRACK LIBRARY:
${trackList}

RESPOND WITH VALID JSON ONLY. No markdown, no text before or after the JSON:
{"trackIds": ["<id>", "<id>"], "message": "<one short sentence>"}

GUIDELINES:
1. ALWAYS try to return matching songs (max 10). For mood queries, infer the mood from genre and lyrics — e.g. "lagu sedih" -> songs with sad/heartbreak lyrics or mellow/ballad genres; "lagu semangat" -> upbeat/energetic songs.
2. Use the EXACT id values from the library (the part after "id="). NEVER invent or modify ids.
3. Order trackIds with the best match first.
4. "message" is ONE short, friendly sentence in the user's language (e.g. "Ini beberapa lagu sedih buat kamu 🎧"). Do NOT explain your reasoning.
5. Only return an empty trackIds array if truly nothing fits — then briefly suggest what to try.`;

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

    // Validate that returned trackIds actually exist
    const validIds = new Set(rows.map((t) => t.id));
    trackIds = trackIds.filter((id) => validIds.has(id));

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
