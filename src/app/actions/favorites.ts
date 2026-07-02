"use server";

import { toggleFavoriteInD1, getUserFavorites } from "@/lib/cloudflare";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Lets client components (e.g. the player's Like button) know which tracks the
// current user has favorited. `loggedIn: false` when there is no session.
export async function getFavoriteIdsAction(): Promise<{ loggedIn: boolean; ids: string[] }> {
  const session = await auth();
  if (!session?.user?.email) return { loggedIn: false, ids: [] };
  try {
    const ids = await getUserFavorites(session.user.email);
    return { loggedIn: true, ids };
  } catch {
    return { loggedIn: true, ids: [] };
  }
}

export async function toggleFavoriteAction(trackId: string, isCurrentlyFavorited: boolean) {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "You must be logged in to favorite tracks." };
  }

  try {
    await toggleFavoriteInD1(session.user.email, trackId, isCurrentlyFavorited);
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
