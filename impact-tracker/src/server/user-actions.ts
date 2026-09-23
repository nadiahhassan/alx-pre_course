"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { USER_COOKIE } from "@/lib/current-user";

export async function setCurrentUser(userId: string) {
  (await cookies()).set(USER_COOKIE, userId, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
