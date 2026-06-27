import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/cloudflare";

// Redirect to a signed R2 URL so the BROWSER fetches each cover directly from
// R2 (the *.r2.cloudflarestorage.com endpoint, which the ISP doesn't block).
// Catch-all so object keys with folders (e.g. "covers/album x.jpg") work.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params;
  const key = (filename || []).join("/");
  const bucketName = process.env.R2_BUCKET_NAME || "music";

  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    // Cache the redirect briefly (< presign expiry of 3600s) so the browser
    // remembers the R2 target without re-hitting this route every time. The
    // real long-term caching lives on the R2 object's own Cache-Control header
    // (set at upload time), which governs the cached image bytes.
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=600" },
    });
  } catch (error) {
    return new NextResponse("Not Found", { status: 404 });
  }
}
