/**
 * Build a safe partial UPDATE for a fixed table name (caller-supplied, not from user).
 * @param {string} table
 * @param {string} id
 * @param {Record<string, unknown>} body
 * @param {string[]} allowedKeys
 */
export function buildPartialUpdate(table, id, body, allowedKeys) {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(body[key]);
    }
  }
  if (!sets.length) return null;
  sets.push("updated_at = NOW()");
  vals.push(id);
  const sql = `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`;
  return { sql, vals };
}
