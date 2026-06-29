import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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

// Proxy-stream from R2 instead of redirecting. This avoids CORS issues
// (crossOrigin="anonymous" on <audio>), guarantees the correct Content-Type,
// and supports Range requests for seeking.
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

  try {
    const range = request.headers.get("range");

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ...(range ? { Range: range } : {}),
    });

    const response = await r2Client.send(command);
    const contentType = mimeFromKey(key);
    const body = response.Body;

    if (!body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Convert the SDK readable stream to a web ReadableStream
    const webStream = body.transformToWebStream();

    // Range response (206)
    if (range && response.ContentRange) {
      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": response.ContentRange,
          "Accept-Ranges": "bytes",
          ...(response.ContentLength != null
            ? { "Content-Length": String(response.ContentLength) }
            : {}),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // Full response (200)
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        ...(response.ContentLength != null
          ? { "Content-Length": String(response.ContentLength) }
          : {}),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const name = error instanceof Error ? error.name : "";
    if (name === "NoSuchKey") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("Error streaming audio from R2:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
