"use server";

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, queryD1, initializeD1Tables } from "@/lib/cloudflare";
import { revalidatePath } from "next/cache";
import * as mm from "music-metadata";
import { cleanTitle } from "@/lib/cleanTitle";

// Normalize a text value for duplicate comparison: lowercase, collapse
// whitespace, drop surrounding spaces. Null/empty all map to "".
function normalizeForMatch(value: string | null | undefined): string {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export async function uploadTrackAction(formData: FormData) {
  try {
    // 1. Get form data
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const file = formData.get("file") as File;
    // When the user explicitly confirms, allow re-uploading a known duplicate.
    const allowDuplicate = formData.get("allowDuplicate") === "true";

    if (!title || !category || !file || file.size === 0) {
      return { success: false, error: "Missing required fields" };
    }

    const bucketName = process.env.R2_BUCKET_NAME || "zenify";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extract metadata up front — needed both for the DB row and for the
    //    duplicate check below. Cover art is parsed here but only uploaded to
    //    R2 after we know the track isn't a duplicate (avoids orphan files).
    let finalTitle = cleanTitle(title); // fallback: cleaned filename
    let artist: string | null = null;
    let lyrics: string | null = null;
    let album: string | null = null;
    let year: number | null = null;
    let genre: string | null = null;
    let duration: number | null = null;
    let bitDepth: number | null = null;
    let sampleRate: number | null = null;
    let picture: { format: string; data: Uint8Array } | null = null;

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
        picture = { format: c.picture[0].format, data: c.picture[0].data };
      }
    } catch (metaErr) {
      console.warn("Failed to extract metadata:", metaErr);
    }

    await initializeD1Tables();

    // 3. Duplicate detection — a track is considered a duplicate when its
    //    title + artist + album match an existing row (case/whitespace
    //    insensitive). Runs before any R2 upload so duplicates leave no files.
    if (!allowDuplicate) {
      const existing = (await queryD1(
        `SELECT title, artist, album FROM tracks`
      )) as { title: string; artist: string | null; album: string | null }[];

      const nTitle = normalizeForMatch(finalTitle);
      const nArtist = normalizeForMatch(artist);
      const nAlbum = normalizeForMatch(album);

      const isDuplicate = existing.some(
        (t) =>
          normalizeForMatch(cleanTitle(t.title)) === nTitle &&
          normalizeForMatch(t.artist) === nArtist &&
          normalizeForMatch(t.album) === nAlbum
      );

      if (isDuplicate) {
        return {
          success: false,
          duplicate: true,
          error: `"${finalTitle}"${artist ? ` — ${artist}` : ""} already exists in the library`,
        };
      }
    }

    // 4. Upload audio file to R2
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

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

    // 5. Upload cover art (if embedded) now that the track is confirmed new
    let coverUrl: string | null = null;
    if (picture) {
      try {
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
      } catch (coverErr) {
        console.warn("Failed to upload cover art:", coverErr);
      }
    }

    // 6. Save metadata to D1
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

// Backfill bit depth + sample rate for tracks uploaded before these specs were
// extracted. Downloads only the first chunk of each file from R2 (enough for the
// audio header) and parses it. Per-track try/catch so one bad file doesn't abort.
export async function backfillAudioSpecsAction(): Promise<{ success: boolean; updated?: number; error?: string }> {
  try {
    await initializeD1Tables();
    const bucketName = process.env.R2_BUCKET_NAME || "zenify";
    const rows = (await queryD1(
      `SELECT id, file_url FROM tracks WHERE bit_depth IS NULL OR sample_rate IS NULL`
    )) as { id: string; file_url: string }[];

    let updated = 0;
    for (const row of rows) {
      try {
        const filename = row.file_url.split("/").pop();
        if (!filename) continue;

        const obj = await r2Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Range: "bytes=0-524287", // first 512KB — plenty for the header
          })
        );
        if (!obj.Body) continue;

        const bytes = await obj.Body.transformToByteArray();
        const buffer = Buffer.from(bytes);

        const metadata = await mm.parseBuffer(buffer, undefined, { duration: false });
        const f = metadata.format;
        const bitDepth = f.bitsPerSample ?? null;
        const sampleRate = f.sampleRate ?? null;

        if (bitDepth != null || sampleRate != null) {
          await queryD1(`UPDATE tracks SET bit_depth = ?, sample_rate = ? WHERE id = ?`, [
            bitDepth,
            sampleRate,
            row.id,
          ]);
          updated++;
        }
      } catch (trackErr) {
        console.warn(`Failed to backfill specs for track ${row.id}:`, trackErr);
      }
    }

    if (updated > 0) {
      revalidatePath("/");
      revalidatePath("/admin");
    }
    return { success: true, updated };
  } catch (error: any) {
    console.error("Backfill specs error:", error);
    return { success: false, error: error.message || "Failed to backfill audio specs" };
  }
}

// Upload (or replace) a manual cover image for an album. Used when the album
// has no embedded art. Stored in R2 and upserted into the albums table by name.
export async function setAlbumCoverAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const albumName = formData.get("album") as string;
    const file = formData.get("file") as File;

    if (!albumName || !file || file.size === 0) {
      return { success: false, error: "Missing album name or image" };
    }
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    await initializeD1Tables();

    const bucketName = process.env.R2_BUCKET_NAME || "zenify";
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `album_${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const coverUrl = `/api/cover/${filename}`;
    await queryD1(
      `INSERT INTO albums (name, cover_url) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET cover_url = excluded.cover_url`,
      [albumName, coverUrl]
    );

    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Set album cover error:", error);
    return { success: false, error: error.message || "Failed to set album cover" };
  }
}

// Remove a manually-uploaded album cover (reverts to embedded art / placeholder).
export async function removeAlbumCoverAction(albumName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!albumName) return { success: false, error: "Missing album name" };

    const rows = (await queryD1(`SELECT cover_url FROM albums WHERE name = ?`, [albumName])) as { cover_url?: string }[];
    const coverUrl = rows[0]?.cover_url;

    if (coverUrl) {
      const filename = coverUrl.split("/").pop();
      if (filename) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME || "zenify",
              Key: decodeURIComponent(filename),
            })
          );
        } catch (e) {
          console.warn("Failed to delete album cover from R2:", e);
        }
      }
    }

    await queryD1(`DELETE FROM albums WHERE name = ?`, [albumName]);
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("Remove album cover error:", error);
    return { success: false, error: error.message || "Failed to remove album cover" };
  }
}

// Upload (or replace) an artist profile photo. Stored in R2, upserted by name.
export async function setArtistImageAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const artistName = formData.get("artist") as string;
    const file = formData.get("file") as File;

    if (!artistName || !file || file.size === 0) {
      return { success: false, error: "Missing artist name or image" };
    }
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "File must be an image" };
    }

    await initializeD1Tables();

    const bucketName = process.env.R2_BUCKET_NAME || "zenify";
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filename = `artist_${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const imageUrl = `/api/cover/${filename}`;
    await queryD1(
      `INSERT INTO artists (name, image_url) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET image_url = excluded.image_url`,
      [artistName, imageUrl]
    );

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/artist/${encodeURIComponent(artistName)}`);
    return { success: true };
  } catch (error: any) {
    console.error("Set artist image error:", error);
    return { success: false, error: error.message || "Failed to set artist image" };
  }
}

// Save / update an artist bio.
export async function setArtistBioAction(artistName: string, bio: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!artistName) return { success: false, error: "Missing artist name" };
    await initializeD1Tables();
    await queryD1(
      `INSERT INTO artists (name, bio) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET bio = excluded.bio`,
      [artistName, bio.trim() || null]
    );
    revalidatePath("/");
    revalidatePath(`/artist/${encodeURIComponent(artistName)}`);
    return { success: true };
  } catch (error: any) {
    console.error("Set artist bio error:", error);
    return { success: false, error: error.message || "Failed to save bio" };
  }
}

// Remove an artist's uploaded photo (reverts to initial avatar).
export async function removeArtistImageAction(artistName: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!artistName) return { success: false, error: "Missing artist name" };

    const rows = (await queryD1(`SELECT image_url FROM artists WHERE name = ?`, [artistName])) as { image_url?: string }[];
    const imageUrl = rows[0]?.image_url;

    if (imageUrl) {
      const filename = imageUrl.split("/").pop();
      if (filename) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME || "zenify",
              Key: decodeURIComponent(filename),
            })
          );
        } catch (e) {
          console.warn("Failed to delete artist image from R2:", e);
        }
      }
    }

    // Keep the row only if a bio exists; otherwise drop it entirely.
    await queryD1(`UPDATE artists SET image_url = NULL WHERE name = ?`, [artistName]);
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/artist/${encodeURIComponent(artistName)}`);
    return { success: true };
  } catch (error: any) {
    console.error("Remove artist image error:", error);
    return { success: false, error: error.message || "Failed to remove artist image" };
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
