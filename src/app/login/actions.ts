"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    // Attempt to sign in
    await signIn("credentials", Object.fromEntries(formData), { redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid username or password.";
        default:
          return "Something went wrong.";
      }
    }
    // Rethrow redirect errors if signIn throws them
    throw error;
  }
  
  // If we reach here, signIn didn't throw (success with redirect: false)
  redirect("/");
}
