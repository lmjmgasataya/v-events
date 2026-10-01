import { eq, isNotNull } from "drizzle-orm";
import { db } from ".";
import { participants } from "./schema";
import { normalizeService } from "../lib/services";

// One-off cleanup: rewrites er_participants.service_attended to the standard
// SERVICE_OPTIONS values (see normalizeService). Dry run unless --apply is passed.
//   npm run db:normalize-services             # preview
//   npm run db:normalize-services -- --apply  # write

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await db
    .select({ id: participants.id, serviceAttended: participants.serviceAttended })
    .from(participants)
    .where(isNotNull(participants.serviceAttended));

  const changes = new Map<string, { to: string | null; ids: number[] }>();
  for (const row of rows) {
    const to = normalizeService(row.serviceAttended);
    if (to === row.serviceAttended) continue;
    const key = row.serviceAttended!;
    const entry = changes.get(key) ?? { to, ids: [] };
    entry.ids.push(row.id);
    changes.set(key, entry);
  }

  if (changes.size === 0) {
    console.log("Nothing to change — all service values are already standard.");
    process.exit(0);
  }

  for (const [from, { to, ids }] of changes) {
    console.log(`${JSON.stringify(from).padEnd(20)} → ${JSON.stringify(to).padEnd(22)} (${ids.length} row${ids.length === 1 ? "" : "s"})`);
  }

  if (!apply) {
    console.log("\nDry run — re-run with `-- --apply` to write these changes.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    for (const { to, ids } of changes.values()) {
      for (const id of ids) {
        await tx.update(participants).set({ serviceAttended: to }).where(eq(participants.id, id));
      }
    }
  });
  console.log(`\nUpdated ${[...changes.values()].reduce((n, c) => n + c.ids.length, 0)} row(s).`);
  process.exit(0);
}

main();
