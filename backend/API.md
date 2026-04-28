# Star Health Insurance CRM — REST API

Base URL: `http://localhost:4000/api` (configure `FRONTEND_ORIGIN` and `PORT` in `.env`).

All routes except `POST /auth/login` require header: `Authorization: Bearer <JWT>`.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Body: `{ "email", "password" }` → `{ token, user }` |
| GET | `/auth/me` | Current user profile |

## Dashboard (Admin metrics available to all logged-in users)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/stats` | Totals, performance (daily/weekly counts), upsell list (low sum insured) |
| GET | `/dashboard/activities` | **Admin only** — recent assistant activities |

## Search

| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=` | Global client search by name, phone, or email |

## Users

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | **Admin** — list users for task assignment |

## Advisors

| Method | Path | Description |
|--------|------|-------------|
| GET | `/advisors` | Query: `search`, `page`, `pageSize` |
| POST | `/advisors` | Body: `name`, `phone?`, `email?` |
| PATCH | `/advisors/:id` | Partial update |
| DELETE | `/advisors/:id` | Deletes advisor; unassigns clients |

## Clients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clients` | Query: `search`, `advisorId`, `from`, `to` (renewal_date), `page`, `pageSize` |
| GET | `/clients/:id/full` | Client + policies + renewals + claims + notes + documents |
| POST | `/clients` | Body: `name`, `phone`, optional `email`, `advisor_id`, `policy_details`, `sum_insured`, `renewal_date` |
| PATCH | `/clients/:id` | Partial update |
| DELETE | `/clients/:id` | |
| POST | `/clients/:id/documents` | `multipart/form-data` field `file` |

## Policies (create/update: **Admin** or **Assistant 1**)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/policies` | Query: `status`, `clientId`, `from`, `to` (created date) |
| POST | `/policies` | Body: `client_id`, optional `policy_number`, `status`, `sum_insured`, `details`, `backoffice_query_notes` |
| PATCH | `/policies/:id` | |
| POST | `/policies/:id/documents` | `multipart` field `file` |
| DELETE | `/policies/:id` | **Admin only** |

## Renewals (**Admin** or **Assistant 2** for writes)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/renewals` | Query: `status`, `advisorId`, `from`, `to` |
| GET | `/renewals/upcoming` | Query: `days` (default 60) |
| POST | `/renewals` | Body: `client_id`, `renewal_date`, optional `status`, `reminder_date`, `call_logs` (array) |
| PATCH | `/renewals/:id` | |
| POST | `/renewals/:id/call-log` | Body: `{ "note" }` — appends to `call_logs` |
| DELETE | `/renewals/:id` | **Admin only** |

## Claims

| Method | Path | Description |
|--------|------|-------------|
| GET | `/claims` | Query: `status`, `clientId`, `from`, `to` |
| POST | `/claims` | Body: `client_id`, optional `description`, `status`, `amount` |
| PATCH | `/claims/:id` | |
| DELETE | `/claims/:id` | |

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | Query: `status`, `assignee` (user id) |
| POST | `/tasks` | Body: `title`, optional `description`, `assigned_to`, `due_date` |
| PATCH | `/tasks/:id` | |
| DELETE | `/tasks/:id` | |

## Notes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/notes` | Body: `entity_type` (`client` \| `policy` \| `claim` \| `renewal`), `entity_id`, `content` |
| DELETE | `/notes/:id` | |

## Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | For current user |
| PATCH | `/notifications/:id/read` | Mark read |
| POST | `/notifications/sync-renewals` | **Admin** — create renewal reminder notifications |

## AI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/generate-email` | Body: `{ "purpose", "context" }` — requires `OPENAI_API_KEY`; otherwise returns `503` with `fallback` text |

## Roles

- `admin` — Sales Manager: full access.
- `assistant1` — Policy & backoffice: policies CRUD; cannot delete policies unless admin (per route).
- `assistant2` — Renewals & calls: renewal writes.

## Health

`GET /health` — `{ "ok": true }`
