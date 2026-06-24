import { S3Client } from "@aws-sdk/client-s3";

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
  try {
    await queryD1(tracksTable);
    await queryD1(favoritesTable);
    await queryD1(usersTable);
    console.log("Tables initialized successfully.");
  } catch (error) {
    console.error("Error initializing tables:", error);
  }
}

export type Track = {
  id: string;
  title: string;
  category: string;
  file_url: string;
};

// Fetch tracks based on category or fetch all if none provided
export async function getTracksByCategory(category: string | null = null): Promise<Track[]> {
  try {
    let sql = "SELECT * FROM tracks ORDER BY created_at DESC";
    let params: string[] = [];

    if (category) {
      sql = "SELECT * FROM tracks WHERE category = ? ORDER BY created_at DESC";
      params = [category];
    }

    const rows = await queryD1(sql, params);
    return rows as Track[];
  } catch (error) {
    console.error("Error fetching tracks:", error);
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

