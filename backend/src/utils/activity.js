import { pool } from "../db/pool.js";

export async function logActivity(userId, action, meta = {}) {
  try {
    await pool.query(`INSERT INTO activities (user_id, action, meta) VALUES ($1,$2,$3::jsonb)`, [
      userId,
      action,
      JSON.stringify(meta),
    ]);
  } catch (e) {
    console.warn("activity log failed", e.message);
  }
}
