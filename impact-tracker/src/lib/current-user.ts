import { cookies } from "next/headers";
import { db } from "./db";

// No login yet: the header has a user picker that stores the chosen user in a cookie.
export const USER_COOKIE = "it_user";

export async function getCurrentUser() {
  const id = (await cookies()).get(USER_COOKIE)?.value;
  const user = id ? await db.user.findUnique({ where: { id } }) : null;
  return user ?? (await db.user.findFirst({ orderBy: { createdAt: "asc" } }));
}
