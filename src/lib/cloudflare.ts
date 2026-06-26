import { S3Client } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";

// --- Cloudflare R2 Client ---
// Requires: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// --- Cloudflare D1 Helper (REST API) ---
// Requires: CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN
export async function queryD1(sql: string, params: any[] = []) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const dbId = process.env.D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !dbId || !apiToken) {
    throw new Error("Missing Cloudflare D1 environment variables");
  }

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
    console.error("D1 Query Error:", data.errors);
    throw new Error("Failed to execute D1 query");
  }

  return data.result[0].results;
}

// Helper to initialize tables if they don't exist
export async function initializeD1Tables() {
  const tracksTable = `
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      file_url TEXT NOT NULL,
      artist TEXT,
      cover_url TEXT,
      lyrics TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const favoritesTable = `
    CREATE TABLE IF NOT EXISTS favorites (
      user_email TEXT NOT NULL,
      track_id TEXT NOT NULL,
      PRIMARY KEY (user_email, track_id)
    );
  `;
  const playlistsTable = `
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Album art keyed by album name. cover_url here is a MANUAL upload used only
  // when the album has no embedded cover from any of its tracks.
  const albumsTable = `
    CREATE TABLE IF NOT EXISTS albums (
      name TEXT PRIMARY KEY,
      cover_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  // Artist profile (photo + bio), keyed by artist name. Manually managed in admin.
  const artistsTable = `
    CREATE TABLE IF NOT EXISTS artists (
      name TEXT PRIMARY KEY,
      image_url TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await queryD1(tracksTable);
    await queryD1(favoritesTable);
    await queryD1(usersTable);
    await queryD1(playlistsTable);
    await queryD1(albumsTable);
    await queryD1(artistsTable);

    // Attempt to add new columns if they don't exist (SQLite doesn't support IF NOT EXISTS for ADD COLUMN natively via single statement, so we just catch errors if they already exist)
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN artist TEXT;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN cover_url TEXT;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN lyrics TEXT;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN album TEXT;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN year INTEGER;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN genre TEXT;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN duration REAL;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN bit_depth INTEGER;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN sample_rate INTEGER;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN play_count INTEGER DEFAULT 0;`); } catch(e) {}
    try { await queryD1(`ALTER TABLE tracks ADD COLUMN last_played_at DATETIME;`); } catch(e) {}

    console.log("Tables initialized successfully.");
  } catch (error) {
    console.error("Error initializing tables:", error);
  }
}

export async function getPlaylists(): Promise<Playlist[]> {
  try {
    const rows = await queryD1("SELECT * FROM playlists ORDER BY created_at ASC");
    return rows as Playlist[];
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return [];
  }
}

export type Track = {
  id: string;
  title: string;
  category: string;
  file_url: string;
  artist?: string;
  cover_url?: string;
  lyrics?: string;
  album?: string;
  year?: number;
  genre?: string;
  duration?: number;
  bit_depth?: number;
  sample_rate?: number;
  play_count?: number;
};

export type Playlist = {
  id: string;
  name: string;
  user_email?: string;
  created_at?: string;
};

export type Album = {
  name: string;
  trackCount: number;
  artist?: string;
  cover_url?: string; // resolved cover: embedded art preferred, else manual upload
  source: "embedded" | "uploaded" | "none";
};

// Tracks SELECT that resolves an effective cover for every row:
//   1. a manually uploaded album cover (explicit override), else
//   2. the track's own embedded cover, else
//   3. any sibling track's embedded cover in the same album.
// Because the result column is still named `cover_url`, every existing component
// gets the album fallback for free.
const TRACK_SELECT_WITH_COVER = `
  SELECT t.id, t.title, t.category, t.file_url, t.artist,
    COALESCE(a.cover_url, t.cover_url, ec.embedded_cover) AS cover_url,
    t.lyrics, t.album, t.year, t.genre, t.duration, t.bit_depth, t.sample_rate, t.play_count
  FROM tracks t
  LEFT JOIN albums a ON a.name = t.album
  LEFT JOIN (
    SELECT album, MAX(cover_url) AS embedded_cover
    FROM tracks
    WHERE cover_url IS NOT NULL AND album IS NOT NULL AND album != ''
    GROUP BY album
  ) ec ON ec.album = t.album
`;

// Fetch tracks based on category or fetch all if none provided
export const getTracksByCategory = unstable_cache(
  async (category: string | null = null): Promise<Track[]> => {
    try {
      let sql = `${TRACK_SELECT_WITH_COVER} ORDER BY t.created_at DESC`;
      let params: string[] = [];

      if (category) {
        sql = `${TRACK_SELECT_WITH_COVER} WHERE t.category = ? ORDER BY t.created_at DESC`;
        params = [category];
      }

      const rows = await queryD1(sql, params);
      return rows as Track[];
    } catch (error) {
      console.error("Error fetching tracks:", error);
      return [];
    }
  },
  ["tracks-by-category"],
  { revalidate: 30 }
);

// Fetch all tracks belonging to a single album.
export const getTracksByAlbum = unstable_cache(
  async (album: string): Promise<Track[]> => {
    try {
      const sql = `${TRACK_SELECT_WITH_COVER} WHERE t.album = ? ORDER BY t.created_at DESC`;
      const rows = await queryD1(sql, [album]);
      return rows as Track[];
    } catch (error) {
      console.error("Error fetching album tracks:", error);
      return [];
    }
  },
  ["tracks-by-album"],
  { revalidate: 30 }
);

export type Artist = {
  name: string;
  trackCount: number;
  albumCount: number;
  image_url?: string;
  bio?: string;
};

// Fetch all tracks by a single artist, most-played first (covers resolved).
export const getTracksByArtist = unstable_cache(
  async (artist: string): Promise<Track[]> => {
    try {
      const sql = `${TRACK_SELECT_WITH_COVER} WHERE t.artist = ? ORDER BY COALESCE(t.play_count, 0) DESC, t.created_at ASC`;
      const rows = await queryD1(sql, [artist]);
      return rows as Track[];
    } catch (error) {
      console.error("Error fetching artist tracks:", error);
      return [];
    }
  },
  ["tracks-by-artist"],
  { revalidate: 30 }
);

// Increment a track's play counter and stamp last-played (best-effort).
export async function incrementPlayCount(trackId: string): Promise<void> {
  try {
    if (!trackId) return;
    await queryD1(
      `UPDATE tracks SET play_count = COALESCE(play_count, 0) + 1, last_played_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [trackId]
    );
  } catch (error) {
    console.error("Error incrementing play count:", error);
  }
}

// Recently played tracks (most recent first). Empty until something is played.
export async function getRecentlyPlayed(limit = 9): Promise<Track[]> {
  try {
    const sql = `${TRACK_SELECT_WITH_COVER} WHERE t.last_played_at IS NOT NULL ORDER BY t.last_played_at DESC LIMIT ${Number(limit)}`;
    const rows = await queryD1(sql);
    return rows as Track[];
  } catch (error) {
    console.error("Error fetching recently played:", error);
    return [];
  }
}

// Newest additions to the library (most recent first).
export async function getNewTracks(limit = 12): Promise<Track[]> {
  try {
    const sql = `${TRACK_SELECT_WITH_COVER} ORDER BY t.created_at DESC LIMIT ${Number(limit)}`;
    const rows = await queryD1(sql);
    return rows as Track[];
  } catch (error) {
    console.error("Error fetching new tracks:", error);
    return [];
  }
}

// List every artist (derived from tracks) with counts + profile image/bio.
export async function getArtists(): Promise<Artist[]> {
  try {
    const rows = (await queryD1(`
      SELECT t.artist AS name,
        COUNT(*) AS trackCount,
        COUNT(DISTINCT t.album) AS albumCount,
        ar.image_url AS image_url,
        ar.bio AS bio
      FROM tracks t
      LEFT JOIN artists ar ON ar.name = t.artist
      WHERE t.artist IS NOT NULL AND t.artist != ''
      GROUP BY t.artist
      ORDER BY trackCount DESC, t.artist ASC
    `)) as any[];
    return rows.map((r) => ({
      name: r.name as string,
      trackCount: Number(r.trackCount) || 0,
      albumCount: Number(r.albumCount) || 0,
      image_url: r.image_url || undefined,
      bio: r.bio || undefined,
    }));
  } catch (error) {
    console.error("Error fetching artists:", error);
    return [];
  }
}

// Single artist's profile + counts (null if the artist has no tracks).
export async function getArtistInfo(name: string): Promise<Artist | null> {
  try {
    const rows = (await queryD1(`
      SELECT t.artist AS name,
        COUNT(*) AS trackCount,
        COUNT(DISTINCT t.album) AS albumCount,
        ar.image_url AS image_url,
        ar.bio AS bio
      FROM tracks t
      LEFT JOIN artists ar ON ar.name = t.artist
      WHERE t.artist = ?
      GROUP BY t.artist
    `, [name])) as any[];
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      name: r.name as string,
      trackCount: Number(r.trackCount) || 0,
      albumCount: Number(r.albumCount) || 0,
      image_url: r.image_url || undefined,
      bio: r.bio || undefined,
    };
  } catch (error) {
    console.error("Error fetching artist info:", error);
    return null;
  }
}

// List every album (derived from tracks) with its resolved cover + source.
export async function getAlbums(): Promise<Album[]> {
  try {
    const rows = (await queryD1(`
      SELECT t.album AS name,
        COUNT(*) AS trackCount,
        MAX(t.artist) AS artist,
        ec.embedded_cover AS embedded_cover,
        a.cover_url AS uploaded_cover
      FROM tracks t
      LEFT JOIN albums a ON a.name = t.album
      LEFT JOIN (
        SELECT album, MAX(cover_url) AS embedded_cover
        FROM tracks
        WHERE cover_url IS NOT NULL AND album IS NOT NULL AND album != ''
        GROUP BY album
      ) ec ON ec.album = t.album
      WHERE t.album IS NOT NULL AND t.album != ''
      GROUP BY t.album
      ORDER BY trackCount DESC, t.album ASC
    `)) as any[];

    return rows.map((r) => {
      // A manual upload is an explicit override; otherwise fall back to embedded art.
      const cover = r.uploaded_cover || r.embedded_cover || undefined;
      const source: Album["source"] = r.uploaded_cover
        ? "uploaded"
        : r.embedded_cover
          ? "embedded"
          : "none";
      return {
        name: r.name as string,
        trackCount: Number(r.trackCount) || 0,
        artist: r.artist || undefined,
        cover_url: cover,
        source,
      };
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return [];
  }
}

export async function getUserFavorites(email: string): Promise<string[]> {
  try {
    const rows = await queryD1("SELECT track_id FROM favorites WHERE user_email = ?", [email]);
    return rows.map((r: any) => r.track_id);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

export async function toggleFavoriteInD1(email: string, trackId: string, isFavorited: boolean) {
  try {
    if (isFavorited) {
      await queryD1("DELETE FROM favorites WHERE user_email = ? AND track_id = ?", [email, trackId]);
    } else {
      await queryD1("INSERT OR IGNORE INTO favorites (user_email, track_id) VALUES (?, ?)", [email, trackId]);
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
}

