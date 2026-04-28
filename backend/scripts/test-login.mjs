/**
 * CLI smoke test for auth (no browser). Run from backend folder:
 *   node scripts/test-login.mjs
 *   node scripts/test-login.mjs assistant1@crm.local assist123
 *
 * Optional: BASE_URL=http://127.0.0.1:4000 node scripts/test-login.mjs
 */
const base = process.env.BASE_URL || "http://localhost:4000";
const url = `${base.replace(/\/$/, "")}/api/auth/login`;
const email = process.argv[2] || "admin@crm.local";
const password = process.argv[3] || "admin123";

let res;
try {
  res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
} catch (e) {
  console.error(`POST ${url}`);
  console.error("Fetch failed (is the backend running?):", e.cause?.message || e.message);
  process.exit(1);
}
const body = await res.text();
console.log(`POST ${url}`);
console.log(`HTTP ${res.status}`);
console.log(body);
process.exit(res.ok ? 0 : 1);
