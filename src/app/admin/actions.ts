"use server";

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, queryD1, initializeD1Tables } from "@/lib/cloudflare";
import { revalidatePath } from "next/cache";
import * as mm from "music-metadata";
import { cleanTitle } from "@/lib/cleanTitle";

export async function uploadTrackAction(formData: FormData) {
  try {
    // 1. Get form data
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const file = formData.get("file") as File;

    if (!title || !category || !file || file.size === 0) {
      return { success: false, error: "Missing required fields" };
    }

    // 2. Upload file to R2
    const bucketName = process.env.R2_BUCKET_NAME || "zenify";
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFilename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Provide the public URL (Assume public bucket mapping)
    // Note: R2 requires a custom domain or public bucket URL for direct access
    const publicR2Url = process.env.R2_PUBLIC_URL || `https://pub-xxxxxxxx.r2.dev`;
    const fileUrl = `${publicR2Url}/${uniqueFilename}`;

    // Extract metadata
    let finalTitle = cleanTitle(title); // fallback: cleaned filename
    let artist = null;
    let coverUrl = null;
    let lyrics = null;
    let album = null;
    let year = null;
    let genre = null;
    let duration = null;
    let bitDepth = null;
    let sampleRate = null;

    try {
      const metadata = await mm.parseBuffer(buffer, file.type);
      const c = metadata.common;
      const f = metadata.format;

      // Prefer embedded title over filename — embedded tags are already clean
      if (c.title) finalTitle = c.title;
      if (c.artist) artist = c.artist;
      if (c.album) album = c.album;
      if (c.year) year = c.year;
      if (c.genre && c.genre.length > 0) genre = c.genre[0];
      if (f.duration) duration = Math.round(f.duration);
      if (f.bitsPerSample) bitDepth = f.bitsPerSample;
      if (f.sampleRate) sampleRate = f.sampleRate;

      if (c.lyrics && c.lyrics.length > 0) {
        lyrics = c.lyrics.map((l: any) => l.text).join('\n\n');
      }

      if (c.picture && c.picture.length > 0) {
        const picture = c.picture[0];
        const coverExt = picture.format.split('/')[1] || 'jpg';
        const coverFilename = `cover_${Date.now()}-${Math.random().toString(36).substring(7)}.${coverExt}`;

        await r2Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: coverFilename,
            Body: picture.data,
            ContentType: picture.format,
          })
        );
        coverUrl = `/api/cover/${coverFilename}`;
      }
    } catch (metaErr) {
      console.warn("Failed to extract metadata:", metaErr);
    }

    // 3. Save metadata to D1
    await initializeD1Tables();

    const trackId = crypto.randomUUID();
    await queryD1(
      `INSERT INTO tracks (id, title, category, file_url, artist, cover_url, lyrics, album, year, genre, duration, bit_depth, sample_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [trackId, finalTitle, category, fileUrl, artist, coverUrl, lyrics, album, year, genre, duration, bitDepth, sampleRate]
    );

    revalidatePath("/");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    console.error("Upload error:", error);
    return { success: false, error: error.message || "An error occurred during upload" };
  }
}

export async function updateTrackAction(
  id: string,
  data: { title?: string; artist?: string; category?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) { fields.push("title = ?"); params.push(cleanTitle(data.title.trim())); }
    if (data.artist !== undefined) { fields.push("artist = ?"); params.push(data.artist.trim() || null); }
    if (data.category !== undefined) { fields.push("category = ?"); params.push(data.category.trim()); }

    if (!fields.length) return { success: true };

    params.push(id);
    await queryD1(`UPDATE tracks SET ${fields.join(", ")} WHERE id = ?`, params);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// One-shot cleanup: re-apply cleanTitle to every stored title and persist the
// ones that change. Fixes legacy rows like "01 Kasih Aba Aba" saved before
// title cleaning existed.
export async function recleanAllTitlesAction(): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    const rows = await queryD1(`SELECT id, title FROM tracks`) as { id: string; title: string }[];
    let updated = 0;
    for (const row of rows) {
      const cleaned = cleanTitle(row.title);
      if (cleaned !== row.title) {
        await queryD1(`UPDATE tracks SET title = ? WHERE id = ?`, [cleaned, row.id]);
        updated++;
      }
    }
    if (updated > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return { success: true, updated };
  } catch (error: any) {
    console.error("Re-clean error:", error);
    return { success: false, error: error.message || "Failed to re-clean titles" };
  }
}

// Backfill duration for tracks uploaded before duration was extracted. Called
// from the player once the audio element reports its duration. Lightweight,
// metadata-only — no auth gate needed.
export async function saveDurationAction(trackId: string, duration: number): Promise<{ success: boolean }> {
  try {
    if (!trackId || !Number.isFinite(duration) || duration <= 0) return { success: false };
    await queryD1(`UPDATE tracks SET duration = ? WHERE id = ? AND (duration IS NULL OR duration = 0)`, [Math.round(duration), trackId]);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function deleteTrackAction(trackId: string, fileUrl: string) {
  try {
    const bucketName = process.env.R2_BUCKET_NAME || "music";
    
    // Extract filename from fileUrl
    const urlParts = fileUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (filename) {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: filename,
        })
      );
    }

    await queryD1(`DELETE FROM tracks WHERE id = ?`, [trackId]);
    await queryD1(`DELETE FROM favorites WHERE track_id = ?`, [trackId]); // Clean up favorites too

    revalidatePath("/");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    console.error("Delete error:", error);
    return { success: false, error: error.message || "An error occurred during deletion" };
  }
}
