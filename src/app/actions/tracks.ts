"use server";

import { queryD1 } from "@/lib/cloudflare";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// Moves a track into a playlist by setting its category. Single-category model,
// so this effectively re-files the track under the chosen playlist.
export async function moveTrackToPlaylistAction(
  trackId: string,
  playlistName: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const name = playlistName.trim();
  if (!trackId || !name) return { success: false, error: "Missing track or playlist" };

  try {
    await queryD1(`UPDATE tracks SET category = ? WHERE id = ?`, [name, trackId]);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Move track error:", error);
    return { success: false, error: "Failed to move track" };
  }
}
