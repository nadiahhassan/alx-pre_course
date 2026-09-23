"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { endSession, requireAbility, requireUser, startSession } from "@/lib/auth";
import { ROLES, TEAMS } from "@/lib/constants";
import { FormReader, formValues, type FormState } from "@/lib/forms";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "@/lib/passwords";

/** Only allow redirects back into the app, never to another site. */
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // Same message whether the email or the password is wrong.
  if (!user || !user.active || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { errors: { _form: "That email and password don't match an active account." }, values: { email } };
  }
  await startSession(user.id);
  redirect(safeNext(String(fd.get("next") ?? "/")));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!verifyPassword(current, user.passwordHash)) return { errors: { current: "That isn't your current password" } };
  if (next.length < MIN_PASSWORD_LENGTH) return { errors: { next: `Use at least ${MIN_PASSWORD_LENGTH} characters` } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
  // Sign out other devices.
  await db.session.deleteMany({ where: { userId: user.id } });
  await startSession(user.id);
  return { message: "Password changed" };
}

function readUser(fd: FormData, requirePassword: boolean) {
  const f = new FormReader(fd);
  const data = {
    name: f.text("name", { required: true, max: 120 }),
    email: f.text("email", { required: true, max: 200 }).toLowerCase(),
    role: f.oneOf("role", ROLES, "viewer"),
    team: f.text("team"),
  };
  const password = String(fd.get("password") ?? "");
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) f.errors.email = "Enter a valid email address";
  if (data.role === "partner" && !(TEAMS as readonly string[]).includes(data.team)) f.errors.team = "Choose the partner's team";
  if (data.role !== "partner") data.team = "";
  if ((requirePassword || password) && password.length < MIN_PASSWORD_LENGTH) {
    f.errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return { f, data, password };
}

export async function createUser(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAbility("manage-users");
  const { f, data, password } = readUser(fd, true);
  if (!f.errors.email && (await db.user.findUnique({ where: { email: data.email } }))) f.errors.email = "Someone already uses this email";
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.user.create({ data: { ...data, passwordHash: hashPassword(password) } });
  revalidatePath("/people");
  redirect("/people");
}

export async function updateUser(userId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAbility("manage-users");
  const { f, data, password } = readUser(fd, false);
  const clash = await db.user.findUnique({ where: { email: data.email } });
  if (clash && clash.id !== userId) f.errors.email = "Someone already uses this email";
  if (userId === me.id && data.role !== "admin") f.errors.role = "You can't remove your own admin role";
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.user.update({ where: { id: userId }, data: { ...data, ...(password && { passwordHash: hashPassword(password) }) } });
  if (password) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/people");
  redirect("/people");
}

export async function setUserActive(userId: string, active: boolean) {
  const me = await requireAbility("manage-users");
  if (userId === me.id) throw new Error("You can't deactivate your own account");
  await db.user.update({ where: { id: userId }, data: { active } });
  if (!active) await db.session.deleteMany({ where: { userId } });
  revalidatePath("/people");
}
