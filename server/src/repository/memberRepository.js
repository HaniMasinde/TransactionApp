const db = require('../config/database')
const { withTransaction } = db
const audit = require('../utils/audit')

async function list(role) {
  if (role === 'chairperson') {
    const result = await db.query(`SELECT id, name, phone, status, created_at AS "createdAt"
      FROM users WHERE role = 'member' ORDER BY name`)
    return result.rows
  }
  const result = await db.query(`SELECT u.id, u.name, u.phone, u.status, u.created_at AS "createdAt",
    COALESCE(SUM(t.amount), 0) AS "totalContributed"
    FROM users u LEFT JOIN transactions t ON t.member_id = u.id
    WHERE u.role = 'member' GROUP BY u.id ORDER BY u.name`)
  return result.rows
}
async function listPending() {
  const result = await db.query(`SELECT id, name, phone, created_at AS "createdAt"
    FROM users WHERE role = 'member' AND status = 'pending' ORDER BY created_at`)
  return result.rows
}
async function decideRegistration(id, decision, actorId) {
  const status = decision === 'approve' ? 'active' : 'rejected'
  return withTransaction(async client => {
    const result = await client.query(`UPDATE users SET status = $1, updated_at = NOW()
      WHERE id = $2 AND role = 'member' AND status = 'pending'
      RETURNING id, name, phone, role, status`, [status, id])
    if (!result.rows[0]) return null
    await audit(client, actorId, `registration.${decision}`, 'user', id, { status })
    return result.rows[0]
  })
}
async function setMemberStatus(id, status, actorId) {
  return withTransaction(async client => {
    const result = await client.query(`UPDATE users SET status = $1, updated_at = NOW()
      WHERE id = $2 AND role = 'member' AND status IN ('active', 'deactivated')
      RETURNING id, name, phone, role, status`, [status, id])
    if (!result.rows[0]) return null
    if (status === 'deactivated') await client.query('DELETE FROM user_sessions WHERE user_id = $1', [id])
    await audit(client, actorId, `member.${status}`, 'user', id, { status })
    return result.rows[0]
  })
}
async function transferRole(role, actorId, targetId) {
  const endpointRole = role
  return withTransaction(async client => {
    const target = await client.query("SELECT id, name FROM users WHERE id = $1 AND role = 'member' AND status = 'active' FOR UPDATE", [targetId])
    if (!target.rows[0]) return null
    const current = await client.query('UPDATE users SET role = \'member\', updated_at = NOW() WHERE id = $1 AND role = $2 AND status = \'active\' RETURNING id', [actorId, endpointRole])
    if (!current.rows[0]) return null
    await client.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [endpointRole, targetId])
    await audit(client, actorId, `role.${endpointRole}_transferred`, 'user', targetId, { previousAdminId: String(actorId) })
    return target.rows[0]
  })
}
async function anonymizeAccount(id, actorId, newHash) {
  return withTransaction(async client => {
    await client.query("SELECT set_config('app.anonymize_member', 'on', true)")
    await client.query(`UPDATE transactions SET
      member_name = CASE WHEN member_id = $1 THEN 'Former member' ELSE member_name END,
      member_id = CASE WHEN member_id = $1 THEN NULL ELSE member_id END,
      created_by = CASE WHEN created_by = $1 THEN NULL ELSE created_by END
      WHERE member_id = $1 OR created_by = $1`, [id])
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [id])
    await client.query(`UPDATE users SET name = 'Deleted member', phone = $1, password_hash = $2,
      status = 'deleted', updated_at = NOW() WHERE id = $3`, [`deleted-${id}@invalid.local`, newHash, id])
    await audit(client, actorId, 'account.deleted', 'user', id)
  })
}
module.exports = { list, listPending, decideRegistration, setMemberStatus, transferRole, anonymizeAccount }
