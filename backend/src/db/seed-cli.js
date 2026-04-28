import { pool } from "./pool.js";
import { executeSeed } from "./seed.js";

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await executeSeed(client);
  await client.query("COMMIT");
  console.log("Seed completed.");
  console.log(
    "Logins: admin@crm.local / admin123 | assistant1@crm.local / assist123 | assistant2@crm.local / assist123"
  );
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  throw e;
} finally {
  client.release();
  await pool.end();
}
