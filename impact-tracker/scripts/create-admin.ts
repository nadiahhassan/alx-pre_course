// Create (or reset) a Global lead account, e.g. for the first sign-in on a
// real deployment that wasn't seeded with demo data.
//
//   npm run create-admin -- you@example.org "Your Name" "a-long-password"
import { PrismaClient } from "@prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/lib/passwords";

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error('Usage: npm run create-admin -- <email> "<name>" "<password>"');
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}
const prisma = new PrismaClient();
const data = { name, role: "admin", team: "", active: true, passwordHash: hashPassword(password) };
prisma.user
  .upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase(), ...data }, update: data })
  .then((u) => console.log(`Admin ready: ${u.email}`))
  .finally(() => prisma.$disconnect());
