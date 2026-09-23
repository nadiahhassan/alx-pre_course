import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { hashToken, newSessionToken } from "./passwords";
import { can, type Ability } from "./permissions";

export const SESSION_COOKIE = "it_session";
const SESSION_DAYS = 14;

export async function startSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Cached per request. */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
});

/** For pages: the signed-in user, or a redirect to the sign-in page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export class NotAllowedError extends Error {
  constructor(ability: Ability) {
    super(`You don't have permission to do this (${ability}).`);
  }
}

/** For server actions: the signed-in user if they may perform `ability`; throws otherwise. */
export async function requireAbility(ability: Ability) {
  const user = await getCurrentUser();
  if (!user || !can(user, ability)) throw new NotAllowedError(ability);
  return user;
}

/** For pages that only make sense for people who can `ability` (forms): 404 for everyone else. */
export async function requirePageAbility(ability: Ability) {
  const user = await requireUser();
  if (!can(user, ability)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}
