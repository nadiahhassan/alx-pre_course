// Where alerts and reports go. Every channel is optional: anything not configured is skipped,
// and the message is printed instead so nothing is lost.

import nodemailer from "nodemailer";

export interface Channels { slack?: string; teams?: string; smtp?: { host: string; port: number; user?: string; pass?: string; from: string } }

export function channelsFromEnv(from?: string): Channels {
  const e = process.env;
  return {
    slack: e.SLACK_WEBHOOK_URL || undefined,
    teams: e.TEAMS_WEBHOOK_URL || undefined,
    smtp: e.SMTP_HOST ? { host: e.SMTP_HOST, port: +(e.SMTP_PORT || 587), user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.SMTP_FROM || from || e.SMTP_USER || "" } : undefined,
  };
}

export async function postChat(ch: Channels, text: string, f: typeof fetch = fetch): Promise<string[]> {
  const sent: string[] = [];
  for (const [name, url] of [["Slack", ch.slack], ["Teams", ch.teams]] as const) {
    if (!url) continue;
    const res = await f(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error(`${name} webhook refused the message (HTTP ${res.status}).`);
    sent.push(name);
  }
  return sent;
}

export async function sendEmail(ch: Channels, to: string[], subject: string, html: string, textBody: string): Promise<boolean> {
  if (!ch.smtp || !to.length) return false;
  const t = nodemailer.createTransport({ host: ch.smtp.host, port: ch.smtp.port, secure: ch.smtp.port === 465, auth: ch.smtp.user ? { user: ch.smtp.user, pass: ch.smtp.pass } : undefined });
  await t.sendMail({ from: ch.smtp.from, to, subject, html, text: textBody });
  return true;
}
