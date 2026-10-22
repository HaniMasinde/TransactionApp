# Group Contributions API

Express and PostgreSQL backend. The API assigns all public registrations the `member` role and `pending` status. Chairperson approval is required before login. Roles are read from PostgreSQL for every authenticated request; request body or browser role values are never trusted for authorization.

## Setup

Requires Node.js 20+ and PostgreSQL 14+.

```sh
cp .env.example .env  # only if .env does not already exist
# Otherwise add/update these settings in the existing .env.
# Set DATABASE_URL, SESSION_SECRET, and a private JWT_SECRET of at least 32 characters.
npm install
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:4000`. Client Vite proxies `/api` to this server. Database schema setup is idempotent and also runs when the server starts.

## Production deployment

When deploying the client and API on separate hosts, configure these variables:

- Client build: `VITE_API_BASE_URL=https://<api-host>/api` (include `/api`; this value is embedded when the client is built).
- API runtime: `NODE_ENV=production`, `CLIENT_ORIGIN=https://<client-host>`, `SESSION_SECRET=<a-long-random-secret>`, and `DATABASE_URL`.
- `CLIENT_ORIGIN` may contain a comma-separated list of exact client origins. The API fails to start in production if no client origin is configured.
- Use `SESSION_COOKIE_SAME_SITE=lax` for same-site deployments. Use `none` only when the client and API are on different sites; this requires HTTPS and `NODE_ENV=production`.

If production routes `/api` from the client host to the API, the client can keep the default `/api` base URL. Confirm the deployment by opening `https://<api-host>/api/health` and checking that it returns HTTP 200, then verify the browser request uses the intended API host and that login persists its session cookie.

## Provision the two administrator accounts

Do not add admin account creation to public registration. Provision both administrators directly through the seed script. Enter the password interactively so it is not placed in shell history:

```sh
read -rsp 'Admin password: ' ADMIN_PASSWORD; echo
export ADMIN_PASSWORD ADMIN_NAME='Group Treasurer' ADMIN_PHONE='+254700000001' ADMIN_ROLE=treasurer
npm run seed:admin
unset ADMIN_PASSWORD
```

Repeat with the chairperson's name, phone, and `ADMIN_ROLE=chairperson`. The database allows only one active treasurer and one active chairperson. The current treasurer can transfer the treasurer role to an active member with `POST /api/admin/roles/transfer-treasurer`; the current chairperson can transfer the chairperson role with `POST /api/admin/roles/transfer-chairperson`. Both accept `{ "userId": "..." }`.

## Role permissions

| Resource or action | Member | Treasurer | Chairperson |
|---|---|---|---|
| Collective total | Yes | Yes | Yes |
| Personal transaction history | Own records | Own records | Own records |
| Member account list | No | Yes, with contribution totals | Yes, account details only |
| Group transactions and reports | No | Yes | No |
| Record/correct a payment | No | Yes | No |
| Approve/reject registrations | No | No | Yes |
| Activate/deactivate members | No | No | Yes |

The SRS leaves chairperson access to transaction history undecided, so this API denies group transaction and contribution-total access to chairpersons by default.

Transactions are append-only. Corrections create a separate negative transaction with its own unique M-Pesa code. Unmatched payment names can later be linked to an active member without changing the original payment details. Treasurers' payment actions and chairpersons' account decisions are audit logged. Passwords are bcrypt hashed, sessions expire and can be revoked, and deactivated accounts lose existing sessions.

## Main routes

- Public: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`
- Authenticated: `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/dashboard`, `GET /api/me/transactions`, `GET/PATCH /api/me/profile`, `DELETE /api/me`
- Treasurer: `GET/POST /api/transactions`, `POST /api/transactions/:id/corrections`, `PATCH /api/transactions/:id/member-link`, `GET /api/reports/summary`, `GET /api/audit`, `POST /api/admin/roles/transfer-treasurer`
- Treasurer and chairperson: `GET /api/members`
- Chairperson: `GET /api/admin/registrations/pending`, `POST /api/admin/registrations/:id/decision`, `PATCH /api/admin/members/:id/status`, `POST /api/admin/roles/transfer-chairperson`

Protected routes require `Authorization: Bearer <token>`. Use HTTPS in deployed environments and keep the JWT secret private.
