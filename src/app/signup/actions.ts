"use server";

import bcrypt from "bcryptjs";
import { queryD1, initializeD1Tables } from "@/lib/cloudflare";

export async function signupAction(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !username || !email || !password) {
    return { error: "All fields are required" };
  }

  try {
    await initializeD1Tables(); // Ensure users table exists

    // Check if user already exists
    const existingUser = await queryD1(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUser && existingUser.length > 0) {
      return { error: "Username or email already exists" };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    // Insert new user
    await queryD1(
      "INSERT INTO users (id, name, username, email, password_hash) VALUES (?, ?, ?, ?, ?)",
      [id, name, username, email, passwordHash]
    );

    return { success: true };
  } catch (error: any) {
    console.error("Signup error:", error);
    return { error: "Failed to create account. Please try again." };
  }
}
