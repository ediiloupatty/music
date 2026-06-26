import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/cloudflare";

// Redirect to a signed R2 URL (the *.r2.cloudflarestorage.com endpoint, which the
// ISP doesn't block). Catch-all so object keys with folders work.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const { filename } = await params;
  const key = (filename || []).join("/");
  const bucketName = process.env.R2_BUCKET_NAME || "music";

  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!referer || !referer.includes(host || "")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
