"use server";

import { queryD1, initializeD1Tables } from "@/lib/cloudflare";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function createPlaylistAction(name: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Playlist name is required" };
  if (trimmed.length > 50) return { success: false, error: "Name must be 50 characters or less" };

  try {
    await initializeD1Tables();
    const id = crypto.randomUUID();
    await queryD1(
      "INSERT INTO playlists (id, name, user_email) VALUES (?, ?, ?)",
      [id, trimmed, session.user.email || ""]
    );
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error creating playlist:", error);
    return { success: false, error: "Failed to create playlist" };
  }
}

export async function addTrackToPlaylistAction(
  playlistId: string,
  trackId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };
  if (!playlistId || !trackId) return { success: false, error: "Missing playlist or track" };

  try {
    await initializeD1Tables();
    await queryD1(
      "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)",
      [playlistId, trackId]
    );
    revalidatePath("/player");
    return { success: true };
  } catch (error) {
    console.error("Error adding track to playlist:", error);
    return { success: false, error: "Failed to add track to playlist" };
  }
}

export async function deletePlaylistAction(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  try {
    await queryD1("DELETE FROM playlists WHERE id = ? AND user_email = ?", [
      id,
      session.user.email || "",
    ]);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting playlist:", error);
    return { success: false, error: "Failed to delete playlist" };
  }
}
