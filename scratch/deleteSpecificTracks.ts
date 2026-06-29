import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "music";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function queryD1(sql: string, params: any[] = []) {
  const dbId = process.env.D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    }
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error("Failed to execute D1 query: " + JSON.stringify(data.errors));
  }

  return data.result[0].results;
}

async function main() {
  try {
    console.log("Fetching matching tracks from D1...");
    const tracks: any[] = await queryD1(
      "SELECT * FROM tracks WHERE title LIKE '%Jumping Machine%' OR title LIKE '%Senja Sudut Kota%'"
    );
    console.log(`Found ${tracks.length} matching tracks:`, tracks.map(t => t.title));

    for (const track of tracks) {
      // 1. Delete audio file from R2
      if (track.file_url) {
        const urlParts = track.file_url.split("/");
        const filename = urlParts.slice(3).join("/"); // Get everything after domain
        if (filename) {
          console.log(`Deleting R2 object: ${filename}`);
          try {
            await r2Client.send(
              new DeleteObjectCommand({
                Bucket: bucketName,
                Key: decodeURIComponent(filename),
              })
            );
          } catch (e) {
            console.error(`Failed to delete R2 object ${filename}:`, e);
          }
        }
      }

      // 2. Delete cover file from R2
      if (track.cover_url) {
        const urlParts = track.cover_url.split("/");
        const filename = urlParts[urlParts.length - 1];
        if (filename) {
          console.log(`Deleting R2 object (cover): ${filename}`);
          try {
            await r2Client.send(
              new DeleteObjectCommand({
                Bucket: bucketName,
                Key: decodeURIComponent(filename),
              })
            );
          } catch (e) {
            console.error(`Failed to delete cover ${filename}:`, e);
          }
        }
      }

      // 3. Delete from D1
      console.log(`Deleting from D1 tracks table: ${track.title} (${track.id})`);
      await queryD1("DELETE FROM tracks WHERE id = ?", [track.id]);
      await queryD1("DELETE FROM favorites WHERE track_id = ?", [track.id]);
    }

    console.log("Deletion complete!");
  } catch (error) {
    console.error("Error during deletion:", error);
  }
}

main();
