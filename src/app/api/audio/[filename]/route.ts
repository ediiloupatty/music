import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const bucketName = process.env.R2_BUCKET_NAME || "music";

  // Anti-Hotlinking & IDM Protection
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  
  // Allow only requests coming from our own domain
  if (!referer || !referer.includes(host || "")) {
    return new NextResponse("Forbidden: Direct downloads are not allowed.", { status: 403 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Convert the AWS SDK stream to a Web ReadableStream
    const stream = response.Body.transformToWebStream();

    const headers = new Headers();
    // Obfuscate content type to prevent IDM from easily detecting it as audio
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", "inline; filename=\"stream.dat\"");
    
    if (response.ContentLength) headers.set("Content-Length", response.ContentLength.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    headers.set("Pragma", "no-cache");

    return new NextResponse(stream, { headers });
  } catch (error: any) {
    console.error("Error streaming audio:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
