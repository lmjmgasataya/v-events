import "dotenv/config";
import { db } from ".";
import { users } from "./schema";
import bcrypt from "bcryptjs";

const ACCOUNTS = [
  { username: "admin", name: "Admin", role: "admin" as const, password: "changeme" },
];

async function main() {
  for (const account of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    await db
      .insert(users)
      .values({ username: account.username, passwordHash, name: account.name, role: account.role })
      .onConflictDoUpdate({ target: users.username, set: { passwordHash, name: account.name, role: account.role } });
    console.log(`✓ ${account.username} (${account.role})`);
  }
  console.log("\nAccounts seeded with the passwords set in ACCOUNTS above.");
  console.log("Change passwords before deploying to production.");
  process.exit(0);
}

main();
