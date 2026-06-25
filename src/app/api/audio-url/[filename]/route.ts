import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!referer || !referer.includes(host || "")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { filename } = await params;
  const key = decodeURIComponent(filename);

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "music",
      Key: key,
    });
    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
