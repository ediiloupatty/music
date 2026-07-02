import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/cloudflare";

/** Map file extensions to MIME types so the browser always knows the format. */
const MIME: Record<string, string> = {
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".webm": "audio/webm",
  ".opus": "audio/opus",
};

function mimeFromKey(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) return "application/octet-stream";
  return MIME[key.slice(dot).toLowerCase()] || "application/octet-stream";
}

// Redirect to a signed R2 URL so the BROWSER fetches the audio bytes directly
// from R2 (the *.r2.cloudflarestorage.com endpoint, which the ISP doesn't block),
// instead of proxy-streaming every byte through this function. Proxying the full
// 30-100MB FLAC/WAV through the server was burning the host's origin/data
// transfer quota on every play; a redirect sends only a tiny 302 through us and
// lets R2 (free egress) serve the heavy bytes + handle Range requests natively.
//
// Two things the old proxy gave us for free that we preserve here:
//   1. Correct Content-Type — forced via ResponseContentType on the presigned
//      URL, independent of the object's stored metadata.
//   2. CORS-clean playback — REQUIRED because <audio crossOrigin="anonymous">
//      feeds Web Audio (createMediaElementSource). The R2 bucket MUST have a
//      CORS policy allowing this app's origin, or the redirected response is
//      tainted and the audio graph (equalizer/visualizer) outputs silence.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params;
  let key = (filename || []).join("/");
  try {
    key = decodeURIComponent(key);
  } catch {}
  const bucketName = process.env.R2_BUCKET_NAME || "music";

  // Basic referer check — skip for audio since the <audio> element with
  // crossOrigin="anonymous" may send a reduced or empty Referer.
  // We still validate that it's not a completely foreign origin when present.
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (referer && host && !referer.includes(host)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Streaming quality: ?q=320 / ?q=128 selects a pre-transcoded MP3 variant
  // living under the q320/ / q128/ prefix (see scripts/transcode-variants.mjs).
  // If the variant doesn't exist (yet), fall back to the original file so a
  // partially-transcoded library keeps playing everything.
  const q = request.nextUrl.searchParams.get("q");
  if (q === "320" || q === "128") {
    const variantKey = `q${q}/${key.replace(/\.[^./]+$/, "")}.mp3`;
    try {
      await r2Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: variantKey }));
      key = variantKey;
    } catch {
      // Variant missing — serve the original.
    }
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      // Override the response so the browser always sees the right MIME and can
      // cache the bytes long-term, regardless of how the object was uploaded.
      ResponseContentType: mimeFromKey(key),
      ResponseCacheControl: "public, max-age=31536000, immutable",
    });
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // The browser follows this 302 and re-issues its Range request directly to
    // R2, so seeking still works. Cache the redirect itself only briefly (well
    // under the 3600s presign expiry) so we don't hand out stale signed URLs.
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NoSuchKey") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("Error generating signed audio URL from R2:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
