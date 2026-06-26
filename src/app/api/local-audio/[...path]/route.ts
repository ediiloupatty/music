import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import path from "path";

// Streams the local example songs from src/eample-song so they're playable
// without copying the (large) FLAC files into /public. Supports HTTP Range
// requests so the player can seek. MOCK MODE only — used by the generated
// mock data's file_url (/api/local-audio/<folder>/<file>).
const BASE = path.join(process.cwd(), "src", "eample-song");

const MIME: Record<string, string> = {
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = path.normalize(path.join(BASE, ...segments));

  // Prevent path traversal outside the songs directory.
  if (!filePath.startsWith(BASE)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    const start = match ? parseInt(match[1], 10) : 0;
    const end = match && match[2] ? parseInt(match[2], 10) : size - 1;
    const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
    return new NextResponse(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}
