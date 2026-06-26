import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/cloudflare";

// Redirect to a signed R2 URL so the BROWSER fetches each cover directly from
// R2 (the *.r2.cloudflarestorage.com endpoint, which the ISP doesn't block).
// This loads many covers in parallel and reliably — unlike proxying every byte
// through this single server, which failed under load on an unstable network.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const bucketName = process.env.R2_BUCKET_NAME || "music";

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: decodeURIComponent(filename),
    });
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    return new NextResponse("Not Found", { status: 404 });
  }
}
