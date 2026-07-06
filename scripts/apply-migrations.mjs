/**
 * Applica migrazioni SQL in supabase/migrations/ al progetto remoto.
 * Idempotente: usa public._supermastro_migrations.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  connectPg,
  bootstrapAppliedMigrations,
  listAppliedMigrations,
  markMigrationApplied,
} from "./supabase-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "..", "supabase", "migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = await connectPg();

try {
  let applied = await bootstrapAppliedMigrations(client, files);
  console.log(`→ ${files.length} migrazioni (${applied.size} già applicate)`);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip ${file}`);
      continue;
    }
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    console.log(`  applying ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await markMigrationApplied(client, file);
      await client.query("commit");
      console.log(`  OK ${file}`);
      count++;
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file}: ${err.message}`);
    }
  }

  console.log(count ? `Migrazioni applicate: ${count}` : "Nessuna migrazione nuova.");
} catch (err) {
  console.error("ERRORE:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
