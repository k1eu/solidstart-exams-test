import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

async function main() {
  console.log("migration started ", new Date().toISOString());
  const sqlite = new Database("sqlite.db");
  const db = drizzle(sqlite);
  migrate(db, {
    migrationsFolder: "drizzle",
  });
  console.log("migration finished ", new Date().toISOString());
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
