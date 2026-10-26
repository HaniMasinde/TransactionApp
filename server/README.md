# Group Contributions API

Express and PostgreSQL backend. The API assigns all public registrations the `member` role and `pending` status. Chairperson approval is required before login. Roles are read from PostgreSQL for every authenticated request; request body or browser role values are never trusted for authorization.

## Setup

Requires Node.js 20+ and PostgreSQL 14+.

```sh
cp .env.example .env  # only if .env does not already exist
# Otherwise add/update these settings in the existing .env.
# Set DATABASE_URL and a private SESSION_SECRET of at least 32 characters.
npm install
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:4000`. Client Vite proxies `/api` to this server. Run `npm run db:migrate` after deploying new migrations; the API server does not apply migrations automatically.

## Email delivery

Email verification and password recovery use SMTP. For Gmail, enable 2-Step Verification on the sending Google account, create a Google App Password, and set `SMTP_USER` to that Gmail address and `SMTP_PASS` to the generated App Password (not the account password). Gmail messages are sent from the authenticated `SMTP_USER` account; `EMAIL_FROM` is used with other SMTP providers. The example configuration uses Gmail SMTP on port 465 with TLS.

Set these variables in the API server's environment (`server/.env` for local development, or the hosting provider's environment settings for a deployment), then restart/redeploy the API. Do not commit real SMTP credentials. Gmail or Google Workspace administrators may restrict App Passwords; if App Passwords are unavailable, use an approved SMTP provider and its host, port, security mode, username, and password instead.

Email verification also requires migration `016_email_verification_codes.sql`; run `npm run db:migrate` against the deployed database before using registration.

Registration requires a unique username. Sign-in requires the account's username, registered phone number, and password together. Usernames are case-insensitive and can be changed in Account settings. Existing accounts must set a username in Account settings before signing in with the new flow. Apply migration `017_usernames.sql` with `npm run db:migrate` before deploying the username-enabled API.

## Profile pictures

Authenticated users can upload a profile picture from Account settings. JPEG and PNG files up to 2 MB are accepted, cropped to the user's selected square in the browser, decoded, and normalized to a 512-pixel JPEG before storage in PostgreSQL. Apply migration `010_profile_pictures.sql` before deploying this feature. The API uses `PUT /api/members/me/profile-picture` for uploads and `GET /api/members/me/profile-picture` to retrieve the current user's image.

## Provision the two administrator accounts

Do not add admin account creation to public registration. Provision both administrators directly through the seed script. Enter the password interactively so it is not placed in shell history:

```sh
read -rsp 'Admin password: ' ADMIN_PASSWORD; echo
export ADMIN_PASSWORD ADMIN_NAME='Group Treasurer' ADMIN_PHONE='+254700000001' ADMIN_ROLE=treasurer
npm run seed:admin
unset ADMIN_PASSWORD
```

Repeat with the chairperson's name, phone, and `ADMIN_ROLE=chairperson`. The database allows only one active treasurer and one active chairperson. The current treasurer can transfer the treasurer role to an active member with `POST /api/admin/roles/transfer-treasurer`; the current chairperson can transfer the chairperson role with `POST /api/admin/roles/transfer-chairperson`. Both accept `{ "userId": "..." }`.

The initial Technical Administrator is provisioned separately with `npm run seed:technical-admin`. Its password must be 8–40 characters and include uppercase and lowercase letters, a digit, and a special character. The same requirement is enforced when a Technical Administrator changes their password.

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

## Member account deletion

Members can submit a deletion request with a reason from Account settings. Only the chairperson can approve or decline it, and a reason for the decision is required and recorded in the audit log. On approval, the member profile is anonymized, active sessions are revoked, and all original transaction rows and their member references are retained. Other active, approved accounts receive a dashboard notification containing the deletion action and chairperson's reason. Office holders and Technical Administrators cannot request deletion of their accounts.

Transactions are append-only. Corrections create a separate negative transaction with its own unique M-Pesa code. Unmatched payment names can later be linked to an active member without changing the original payment details. Treasurers' payment actions and chairpersons' account decisions are audit logged. Passwords are bcrypt hashed, sessions expire after 20 minutes of inactivity, and deactivated accounts lose existing sessions. Users receive a warning at 18 minutes to stay signed in or log out.

Treasurers can reverse a transaction within 12 hours of recording it. After that window, migration `011_transaction_reversal_approvals.sql` enables reasoned requests that must be approved by the chairperson from Member approvals before the transaction is reversed.

Members can request reversal of their own contribution with a reason from Transactions. Treasurers review these requests there; an approval reverses transactions within 12 hours, and forwards older transactions to the chairperson for final approval. Migration `012_member_transaction_reversal_requests.sql` adds this two-stage review flow.

When a transaction is recorded, every active approved member receives a notification naming the member whose contribution was recorded. The notification does not include the amount.

Chairpersons must provide a response reason when approving or rejecting a forwarded reversal request. The requester and reviewing treasurer receive the decision and reason; members are notified when a reversal is completed. Broadcast notifications do not include the monetary value. Chairperson response reasons are retained in the audit log and require no additional migration.

Technical Administrators can send an in-app announcement about upcoming app updates to all active, approved members, treasurers, secretaries, and chairpersons. Apply migration `013_app_update_announcements.sql` to allow the announcement notification event.

The Technical Administration page includes role assignment, official role-removal approvals, app-update announcements, recent administrator audit records, PDF export, and an option to clear prior audit history. Clearing audit logs is recorded as a new audit record and notifies all active, approved group accounts (members, treasurers, chairpersons, and secretaries) in the same database transaction. Role changes notify active approved members and the affected account through in-app notifications. Apply migrations `018_role_change_notifications.sql` and `019_audit_log_clear_notifications.sql` with `npm run db:migrate` against the deployment database before deploying these notifications; the API does not run migrations automatically.

Chairpersons, secretaries, and treasurers can submit a reasoned request to step down from their current office in Account settings. The Technical Admin receives a notification and can approve or decline the request; an approved request changes the official's role to member. A chairperson request cannot be approved until another chairperson is in place. Apply migration `015_official_role_removal_requests.sql`.

## Main routes

- Public: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Member: `GET/POST /api/members/me/deletion-request`
- Authenticated: `GET/PUT /api/members/me/profile-picture`
- Chairperson: `GET /api/admin/member-deletion-requests`, `PATCH /api/admin/member-deletion-requests/:id`
- Authenticated: `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/dashboard`, `GET /api/me/transactions`, `GET/PATCH /api/me/profile`, `DELETE /api/me`
- Treasurer: `GET/POST /api/transactions`, `POST /api/transactions/:id/corrections`, `PATCH /api/transactions/:id/member-link`, `GET /api/reports/summary`, `GET /api/audit`, `POST /api/admin/roles/transfer-treasurer`
- Treasurer: `PATCH /api/transactions/:id/reverse` (within 12 hours, or submits a reasoned approval request after the cutoff)
- Chairperson: `GET /api/transactions/reversal-requests`, `PATCH /api/transactions/reversal-requests/:id`
- Technical Administrator: `POST /api/technical-admin/announcements` to notify all active, approved members and office holders about upcoming app updates.
- Technical Administrator: `GET /api/technical-admin/audit-logs` to review recent administrator audit records.
- Technical Administrator: `DELETE /api/technical-admin/audit-logs` to clear prior audit records while retaining a record of the deletion.
- Technical Administrator: `GET /api/technical-admin/role-removal-requests`, `PATCH /api/technical-admin/role-removal-requests/:id`
- Official: `GET/POST /api/members/me/role-removal-request`
- Treasurer: `GET/PUT /api/payment-destination` to view or update the group contribution payment number. Approved members can read it with `GET /api/payment-destination`.
- Treasurer and chairperson: `GET /api/members`
- Chairperson: `GET /api/admin/registrations/pending`, `POST /api/admin/registrations/:id/decision`, `PATCH /api/admin/members/:id/status`, `POST /api/admin/roles/transfer-chairperson`

Password recovery requires the SMTP settings and `FRONTEND_URL` in the server environment. Apply migration `003_recovery_and_notifications.sql` with `npm run db:migrate` before deploying the recovery endpoints.

Protected routes require `Authorization: Bearer <token>`. Use HTTPS in deployed environments and keep the JWT secret private.
