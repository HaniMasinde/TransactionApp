
const db = require("../config/database");

const OFFICE_ROLES = ["treasurer", "chairperson", "secretary"];
const MEMBER_STATUSES = ["approved", "disabled"];

async function withTransaction(callback) {
  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function writeAudit(
  client,
  actorId,
  action,
  targetType,
  targetId,
  oldValues = null,
  newValues = null
) {
  await client.query(
    `INSERT INTO audit_logs
       (actor_user_id, action, target_type, target_id, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      actorId || null,
      action,
      targetType,
      targetId,
      oldValues === null ? null : JSON.stringify(oldValues),
      newValues === null ? null : JSON.stringify(newValues),
    ]
  );
}

async function list(role) {
  const contributionColumn =
    role === "chairperson"
      ? ""
      : `, COALESCE(
           SUM(CASE WHEN t.status = 'active' THEN t.amount ELSE 0 END),
           0
         ) AS "totalContributed"`;

  const result = await db.query(
    `SELECT
       u.id,
       u.full_name AS name,
       u.phone,
       u.role,
       u.account_status AS status,
       u.created_at AS "createdAt"
       ${contributionColumn}
     FROM users u
     ${
       role === "chairperson"
         ? ""
         : "LEFT JOIN transactions t ON t.member_user_id = u.id"
     }
     WHERE u.role = 'member'
       AND u.deleted_at IS NULL
       AND u.account_status <> 'anonymized'
     ${
       role === "chairperson"
         ? ""
         : "GROUP BY u.id"
     }
     ORDER BY u.full_name`
  );

  return result.rows;
}

async function listPending() {
  const result = await db.query(
    `SELECT id, full_name AS name, phone,
            created_at AS "createdAt"
     FROM users
     WHERE role = 'member'
       AND account_status = 'pending'
       AND deleted_at IS NULL
     ORDER BY created_at ASC`
  );

  return result.rows;
}

async function decideRegistration(id, decision, actorId) {
  if (!["approve", "reject"].includes(decision)) {
    throw new Error("Decision must be 'approve' or 'reject'.");
  }

  const status = decision === "approve" ? "approved" : "rejected";

  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users
       SET account_status = $1, updated_at = NOW()
       WHERE id = $2
         AND role = 'member'
         AND account_status = 'pending'
         AND deleted_at IS NULL
       RETURNING id, full_name AS name, phone, role,
                 account_status AS status`,
      [status, id]
    );

    const user = result.rows[0];
    if (!user) return null;

    await writeAudit(
      client,
      actorId,
      `registration.${decision}`,
      "user",
      id,
      { status: "pending" },
      { status }
    );

    return user;
  });
}

async function setMemberStatus(id, status, actorId) {
  if (!MEMBER_STATUSES.includes(status)) {
    throw new Error(
      `Invalid member status. Allowed values: ${MEMBER_STATUSES.join(", ")}.`
    );
  }

  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id, account_status
       FROM users
       WHERE id = $1
         AND role = 'member'
         AND deleted_at IS NULL
       FOR UPDATE`,
      [id]
    );

    const previous = existing.rows[0];
    if (!previous) return null;

    if (!["approved", "disabled"].includes(previous.account_status)) {
      return null;
    }

    const result = await client.query(
      `UPDATE users
       SET account_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, full_name AS name, phone, role,
                 account_status AS status`,
      [status, id]
    );

    if (status === "disabled") {
      // connect-pg-simple stores the session data in the sess JSON column.
      await client.query(
        `DELETE FROM sessions
         WHERE sess->'user'->>'id' = $1`,
        [String(id)]
      );
    }

    await writeAudit(
      client,
      actorId,
      `member.${status}`,
      "user",
      id,
      { status: previous.account_status },
      { status }
    );

    return result.rows[0];
  });
}

/**
 * Initiate a role transfer.
 *
 * This deliberately creates a pending transfer instead of changing roles
 * immediately. The successor must accept it and the transfer workflow must
 * complete it before the office holder's role changes.
 */
async function transferRole(role, actorId, targetId) {
  if (!OFFICE_ROLES.includes(role)) {
    throw new Error(
      `Invalid office role. Allowed values: ${OFFICE_ROLES.join(", ")}.`
    );
  }

  if (String(actorId) === String(targetId)) {
    throw new Error("You cannot transfer an office to yourself.");
  }

  return withTransaction(async (client) => {
    const currentResult = await client.query(
      `SELECT id, full_name, role, account_status
       FROM users
       WHERE id = $1
         AND role = $2
         AND account_status = 'approved'
         AND deleted_at IS NULL
       FOR UPDATE`,
      [actorId, role]
    );

    const current = currentResult.rows[0];
    if (!current) return null;

    const successorResult = await client.query(
      `SELECT id, full_name, role, account_status
       FROM users
       WHERE id = $1
         AND role = 'member'
         AND account_status = 'approved'
         AND deleted_at IS NULL
       FOR UPDATE`,
      [targetId]
    );

    const successor = successorResult.rows[0];
    if (!successor) return null;

    const pendingResult = await client.query(
      `SELECT id
       FROM role_transfers
       WHERE office_role = $1
         AND status IN ('pending', 'accepted')
       LIMIT 1
       FOR UPDATE`,
      [role]
    );

    if (pendingResult.rows[0]) {
      throw new Error(
        `An active transfer already exists for the ${role} office.`
      );
    }

    const inserted = await client.query(
      `INSERT INTO role_transfers
         (office_role, current_holder_user_id, successor_user_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [role, actorId, targetId]
    );

    const transfer = inserted.rows[0];

    await writeAudit(
      client,
      actorId,
      `role.${role}_transfer_requested`,
      "role_transfer",
      transfer.id,
      null,
      {
        officeRole: role,
        currentHolderUserId: actorId,
        successorUserId: targetId,
        status: "pending",
      }
    );

    return transfer;
  });
}

/**
 * Anonymize a member without deleting the user row or breaking historical
 * transaction/audit foreign keys. Office holders must transfer their role
 * before account anonymization.
 */
async function anonymizeAccount(id, actorId, newHash) {
  if (!newHash || typeof newHash !== "string") {
    throw new Error("A replacement password hash is required.");
  }

  return withTransaction(async (client) => {
    const existingResult = await client.query(
      `SELECT id, full_name, role, account_status
       FROM users
       WHERE id = $1
         AND deleted_at IS NULL
       FOR UPDATE`,
      [id]
    );

    const existing = existingResult.rows[0];
    if (!existing) return null;

    if (OFFICE_ROLES.includes(existing.role)) {
      throw new Error(
        "Transfer the office role before anonymizing this account."
      );
    }

    await client.query(
      `UPDATE transactions
       SET member_user_id = NULL,
           entered_member_name = 'Former member',
           updated_at = NOW()
       WHERE member_user_id = $1`,
      [id]
    );

    // Keep created_by and updated_by intact: they are required historical
    // references and must not be nulled during anonymization.
    await client.query(
      `DELETE FROM sessions
       WHERE sess->'user'->>'id' = $1`,
      [String(id)]
    );

    const updatedResult = await client.query(
      `UPDATE users
       SET full_name = 'Deleted member',
           phone = $2,
           normalized_phone = NULL,
           recovery_email = NULL,
           normalized_email = NULL,
           password_hash = $3,
           account_status = 'anonymized',
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name AS name, role,
                 account_status AS status, deleted_at AS "deletedAt"`,
      [id, `deleted-${id}`, newHash]
    );

    await writeAudit(
      client,
      actorId,
      "account.anonymized",
      "user",
      id,
      {
        name: existing.full_name,
        role: existing.role,
        status: existing.account_status,
      },
      { status: "anonymized" }
    );

    return updatedResult.rows[0];
  });
}

module.exports = {
  list,
  listPending,
  decideRegistration,
  setMemberStatus,
  transferRole,
  anonymizeAccount,
};
