import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://487bb407defdb914c093b508d73e8fe1.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: "cce28331e0bf0ab18af10b3c340dc36b",
    secretAccessKey: "e7b28a75cacb823b1c17e07f0346419e90a1a8fb7cd10cb941da0f0df60d456e",
  },
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: "music",
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["Accept-Ranges", "Content-Range", "Content-Encoding", "Content-Length"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  try {
    const response = await client.send(command);
    console.log("CORS set successfully:", response);
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}

setCors();

