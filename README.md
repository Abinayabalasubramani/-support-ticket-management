# TicketFlow: Support Ticket Management & Analytics

A full-stack support desk: agents create, assign and work on tickets, search and filter them, follow every ticket's full activity timeline, and watch live analytics. Built for the Krishnas Digital Technologies full-stack assignment.

| | |
|---|---|
| **Live app** | https://support-ticket-management-woad.vercel.app |
| **API** | https://support-ticket-api-cdns.onrender.com (health check: `/health`) |
| **Repository** | https://github.com/Abinayabalasubramani/-support-ticket-management |
| **Demo video** | _add the Google Drive link here_ |

**Demo sign-in** (password for both: `Demo@12345`)

| Role | Email | Can do |
|---|---|---|
| Admin | `aarav.mehta@example.com` | Everything, including deleting tickets |
| Agent | `priya.nair@example.com` | Everything except deleting tickets |

> The free hosting plans put idle servers to sleep. If the first load takes up to a minute, the API is waking up; an uptime monitor pings it every 5 minutes to keep that rare.

---

## Contents
1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [API reference](#api-reference)
7. [Additional challenge: decisions](#additional-challenge-decisions)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [AI-assisted development disclosure](#ai-assisted-development-disclosure)
11. [Known limitations and trade-offs](#known-limitations-and-trade-offs)

---

## Features

**Ticket management**
- Create, view, edit and delete tickets: title, description, priority (Low, Medium, High, Critical), status (Open, In Progress, Resolved, Closed), category, assignee, creation date.
- Assignment and a **status workflow with enforced transitions** (invalid moves are rejected by the API with `409`).
- **Status history** (previous status, new status, timestamp) for every ticket.

**Search, filtering, pagination**
- Server-side pagination, sorting (title, priority, status, dates) and case-insensitive search over title and description.
- Filter by status, priority, category and assignee (including "Unassigned"). Filters combine, accept several values each, and work together with search, sorting and pagination (the total always reflects the filters).

**Dashboard and analytics**
- Total, open, resolved and critical ticket counts; ticket volume over time; distribution by status and by priority; a "needs attention" list.
- Date-range filter (7 days, 30 days, all time, or a custom range). **Every number comes from the backend**, nothing is hard-coded in the UI.

**Frontend quality**
- Responsive dark and light themes (a single button switches), loading skeletons, empty states, error states with retry, success toasts, form validation with server messages shown next to the right field.
- Reusable components, Redux Toolkit + RTK Query for state and caching, debounced search, no unnecessary requests, updates appear without reloading.

**Team management (admins)**
- A Team page lists the people who can sign in and be assigned tickets, and lets an admin add a new team member (name, email, role, password with a generator). New members can sign in immediately and appear in every assignee list, including in other open sessions.
- Each ticket has one main assignee (the accountable owner) plus any number of **collaborators**, so several people can work on one ticket. Assigning many tickets to one person is done with bulk assign.

**Security**
- Sign-in with hashed passwords and signed, expiring tokens; roles (admin, agent); every API route protected; brute-force limit on sign-in; security headers; per-IP rate limiting; error responses that never expose internals.

**The three additional-challenge features (all implemented)**
- **Activity timeline** (the chosen feature): status changes, assignee changes and edits for every ticket.
- **Bulk operations**: select tickets and change their status or assignee in one action.
- **Real-time updates**: changes made in one browser appear in other open sessions.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19, Vite, React Router | Required; fast builds |
| State and data | Redux Toolkit + **RTK Query** | Caching, tag-based refetching and loading/error state with little code |
| Styling | Tailwind CSS 4 with design tokens, lucide icons, Recharts | One set of tokens drives both themes |
| Forms | React Hook Form + Zod | Instant validation that mirrors the server |
| Backend | Node.js, Express 4 | Required |
| Validation | Zod | One schema language on both sides |
| Database | **PostgreSQL** (Neon) | Relational data, grouped analytics, transactions |
| ORM | Prisma 6 | Migrations, typed queries, seeding |
| Auth | bcryptjs, jsonwebtoken | Hashed passwords, signed expiring tokens |
| Security | helmet, express-rate-limit | Standard headers and abuse limits |
| Tests | Jest, Supertest | API tests against a real PostgreSQL schema |
| Hosting | Neon, Render, Vercel (free tiers) | Free, no card needed |

---

## Architecture

```
Browser (React, Vercel)  --HTTPS/JSON-->  Express API (Render)  --Prisma-->  PostgreSQL (Neon)
        |                                        |
        +------ Server-Sent Events <-------------+   (live ticket changes)
```

Request path: `route -> authenticate -> (role check) -> validate (Zod) -> controller -> service (business rules) -> Prisma`. Any error goes to one central error handler.

```
server/
  prisma/            schema.prisma, migrations/, seed.js
  src/
    config/          env validation (fails fast), Prisma client
    routes/          one file per resource
    controllers/     thin HTTP layer
    services/        business rules: status transitions, transactions, activity log
    validators/      Zod schemas
    middleware/      authenticate, requireRole, validate, errorHandler, rateLimiter, requestId
    events/          in-process event hub, one-time stream tickets
    utils/           AppError, status-transition map
  tests/             Jest + Supertest suites and helpers
client/
  src/
    api/             RTK Query service (all endpoints, cache tags)
    features/        auth, filters, ui slices
    realtime/        live-update connection
    components/      common, layout, tickets, dashboard, auth
    pages/           Login, Dashboard, Tickets, Ticket detail
```

### Data model

| Table | Purpose |
|---|---|
| `User` | Agents who sign in and can be assigned tickets (`role`: ADMIN or AGENT, `passwordHash`) |
| `Category` | Ticket categories |
| `Ticket` | The ticket; links to a category and (optionally) an assignee |
| `StatusHistory` | One row per status change: `fromStatus`, `toStatus`, `changedAt` (deleted with the ticket) |
| `TicketCollaborator` | Links a ticket to the extra people working on it (one row per ticket and person; removed with the ticket or the user) |
| `TicketActivity` | Assignee changes and edits for the timeline (stores names as they were at the time) |

Deleting a category that still has tickets is blocked; deleting a user unassigns their tickets; deleting a ticket deletes its history. Indexes cover every filtered and sorted column.

### Status workflow

| From | Allowed next statuses |
|---|---|
| Open | In Progress, Resolved |
| In Progress | Open, Resolved |
| Resolved | Closed, In Progress |
| Closed | none (final) |

The rules live in one file (`server/src/utils/statusTransitions.js`) and are used by the single endpoint, the bulk endpoint and the UI (which only offers the valid moves).

---

## Getting started

**Prerequisites:** Node.js 20 or newer, npm, and a PostgreSQL database (a free [Neon](https://neon.com) project works well).

```bash
git clone https://github.com/Abinayabalasubramani/-support-ticket-management.git
cd -support-ticket-management
```

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # then fill in the values (see "Environment variables")
npx prisma migrate deploy   # creates the tables
npm run db:seed             # demo users, 64 tickets, timelines (WIPES existing data)
npm run dev                 # http://localhost:4000  (check /health)
```

The seed prints the demo sign-in at the end. It is demo data only and deletes everything first; it refuses to run with `NODE_ENV=production`.

> **Windows:** if `npx prisma generate` fails with `EPERM … query_engine-windows.dll.node`, stop the running dev server first (it holds the file open), run `generate`, then start the server again.

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm run dev                 # http://localhost:5173
```

Sign in with a demo account above.

### Useful scripts (`server/`)

| Command | What it does |
|---|---|
| `npm run dev` | API with automatic restart |
| `npm start` | API (production) |
| `npm test` | Whole test suite (see [Testing](#testing)) |
| `npm run db:migrate` | Create and apply a new migration (development) |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Reset to demo data |
| `npm run db:studio` | Browse the database in the browser |

---

## Environment variables

### `server/.env`

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host-pooler/db?sslmode=require` | Connection used by the running app (Neon: the **pooled** URL) |
| `DIRECT_URL` | yes | `postgresql://user:pass@host/db?sslmode=require` | Direct connection used by migrations |
| `JWT_SECRET` | yes | 48 random bytes, hex | Signs login tokens. At least 32 characters; never commit it |
| `JWT_EXPIRES_IN` | no | `8h` | How long a sign-in lasts |
| `CORS_ORIGIN` | yes in production | `https://your-app.vercel.app,http://localhost:5173` | Allowed browser origins, comma-separated |
| `PORT` | no | `4000` | Listening port (the host sets it in production) |
| `NODE_ENV` | no | `production` | `development`, `test` or `production` |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### `server/.env.test` (used only by `npm test`)
Same keys as above, but both database URLs must end with `&schema=test` so the tests use a **separate schema** and can never touch real data. See `.env.test.example`. The app refuses to run tests against any other schema.

### `client/.env`

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | yes | `https://support-ticket-api-cdns.onrender.com/api` | API base URL, including `/api`, no trailing slash. Read at **build** time |
| `VITE_SHOW_DEMO_LOGIN` | no | `true` | Show a "Demo accounts" box on the login page (hidden by default; the demo logins are listed at the top of this README) |

---

## API reference

Base path `/api`. Everything except `POST /auth/login` and `GET /health` requires `Authorization: Bearer <token>`.

### Errors
Every error has the same shape, and clients never see internal details (those go to the server log):

```json
{ "error": { "code": "INVALID_STATUS_TRANSITION", "message": "Cannot change status from OPEN to CLOSED. Allowed: IN_PROGRESS, RESOLVED", "requestId": "…" } }
```
Validation errors add `details: [{ location, field, message }]`. The same `requestId` is returned in the `X-Request-Id` header and written to the server log.

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `INVALID_REFERENCE` |
| 401 | `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `INVALID_STATUS_TRANSITION`, `STATUS_CHANGED`, `DUPLICATE` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 429 | `RATE_LIMITED`, `TOO_MANY_LOGIN_ATTEMPTS` |
| 503 | `DATABASE_UNAVAILABLE` |
| 500 | `INTERNAL_ERROR` |

### Authentication
| Method and path | Purpose | Success |
|---|---|---|
| `POST /auth/login` | Body `{ email, password }` | `200 { token, user }` |
| `GET /auth/me` | The signed-in user | `200 user` |
| `POST /auth/stream-ticket` | One-time pass to open the live stream | `200 { ticket, expiresInSeconds }` |
| `GET /health` | Liveness and database check (public) | `200 { status, database }` |

### Tickets
| Method and path | Purpose | Success / errors |
|---|---|---|
| `GET /tickets` | List (see parameters below) | `200 { data, meta: { page, limit, total, totalPages } }` |
| `POST /tickets` | Create. Body: `title`, `description`, `categoryId`, optional `priority`, `assigneeId` | `201`, `400`, `404` |
| `GET /tickets/:id` | One ticket, with `allowedTransitions` | `200`, `404` |
| `PUT /tickets/:id` | Edit title, description, priority, category (not status) | `200`, `400`, `404` |
| `PATCH /tickets/:id/status` | Body `{ status }` | `200`, `404`, `409` |
| `PATCH /tickets/:id/assignee` | Body `{ assigneeId }` (`null` unassigns) | `200`, `404` |
| `PUT /tickets/:id/collaborators` | Body `{ userIds: [...] }`: the complete list of other people on the ticket (max 10; `[]` removes all). The main assignee is never repeated here | `200`, `400`, `404` |
| `PATCH /tickets/bulk` | Body `{ ids: [...], status }` **or** `{ ids: [...], assigneeId }`, up to 100 | `200` with a result per ticket |
| `DELETE /tickets/:id` | **Admin only** | `204`, `403`, `404` |
| `GET /tickets/:id/history` | Status changes, newest first | `200`, `404` |
| `GET /tickets/:id/activity` | Full timeline: status changes, assignments, edits | `200`, `404` |

**`GET /tickets` parameters:** `page` (default 1), `limit` (default 10, max 100), `sortBy` (`createdAt`, `updatedAt`, `title`, `priority`, `status`), `order` (`asc`, `desc`), `search`, and the comma-separated filters `status`, `priority`, `category` (ids) and `assignee` (ids and/or `unassigned`).
Example: `/tickets?status=OPEN,IN_PROGRESS&priority=HIGH,CRITICAL&assignee=unassigned&search=login&sortBy=priority&order=desc&page=2&limit=8`

**Bulk response:** `{ results: [{ id, ok: true } | { id, ok: false, code, message }], summary: { requested, succeeded, failed } }`. Tickets that cannot be changed are reported and skipped; the rest are updated.

### Analytics
All accept optional `from` and `to` (`YYYY-MM-DD` or ISO date, on the creation date; `from` after `to` is a `400`).

| Path | Returns |
|---|---|
| `GET /analytics/summary` | `{ total, open, resolved, critical, criticalUnresolved }` |
| `GET /analytics/by-status` | `[{ status, count }]` for all four statuses (zeros included) |
| `GET /analytics/by-priority` | `[{ priority, count }]` for all four priorities |
| `GET /analytics/volume` | `[{ date, count }]`, one entry per day, up to 366 days |

### Team (admin only; agents get `403`)
| Method and path | Purpose | Success / errors |
|---|---|---|
| `GET /users` | Team members with role and assigned-ticket count (never password hashes) | `200` |
| `POST /users` | Add a member. Body: `name`, `email`, `password` (8 to 72 bytes), optional `role` (`AGENT` default, or `ADMIN`) | `201`, `400`, `409 DUPLICATE_EMAIL` |

### Other
| Path | Purpose |
|---|---|
| `GET /meta` | Categories, users, statuses, priorities and the transition map (for dropdowns) |
| `GET /events?ticket=…` | Server-Sent Events stream of ticket changes (needs a one-time ticket) |

**Limits:** 300 requests per minute per IP, 60 writes per minute, and 10 *failed* sign-ins per 15 minutes.

---

## Additional challenge: decisions

The brief asks for one feature and an explanation of the decisions. All three are built; the **activity timeline** is the chosen one.

### Activity timeline (chosen)
- **Two sources, one feed.** Status changes live in `StatusHistory` (a required table). Assignee changes and edits go to `TicketActivity`. `GET /tickets/:id/activity` merges both and sorts them newest first. The status-only endpoint stays as the assignment describes it.
- **Written in the same transaction as the change**, so a log entry can never exist without its change, or the reverse.
- **Only real changes are logged.** Assigning the person who already has the ticket, or saving an edit with identical values, writes nothing.
- **Names are stored as they were at the time**, so the history stays readable if a user is later renamed or deleted. Description edits record that the text changed, not the text.

### Bulk operations
- **Partial success with a per-ticket report**, rather than all-or-nothing: one bad ticket should not block the other nine. The response says exactly which were skipped and why, and the UI lists them.
- **Same rules as single changes:** the transition map is reused, each changed ticket gets its own history row with its real "from" status.
- **Fast on a remote database:** tickets are updated in a few grouped queries inside one transaction (explicit timeouts). If a ticket changes while the batch runs, the whole batch rolls back with a retry message.

### Real-time updates
- **Server-Sent Events, not WebSockets**: updates only flow server to browser, so SSE is simpler (plain HTTP, no extra library or deployment setup).
- **Events carry ids only.** Browsers refetch through the normal API, so there is no second copy of data to keep consistent and nothing sensitive on the stream.
- **No duplicate work:** each tab sends an `X-Client-Id` and ignores events for its own changes. Bursts are batched into one refresh.
- **Authenticated without leaking the token:** `EventSource` cannot send headers, so the client first requests a **one-time ticket** (valid 30 seconds) instead of putting the login token in the URL.
- **Resilient:** a heartbeat keeps proxies from closing the stream; after a drop the client reconnects with a fresh ticket (growing delays) and refreshes everything.

---

## Testing

```bash
cd server
cp .env.test.example .env.test     # database URLs ending with &schema=test
npm test
```

- Jest and Supertest call the real Express app against a real PostgreSQL **test schema** (`schema=test`, kept apart from real data). The schema is migrated automatically before the run.
- **More than 280 tests in 11 suites**, covering: validation failures; **all 16 status transitions** (valid ones recorded, invalid ones rejected with no history written); filtering, search, sorting and pagination (including combined filters and pages past the end); analytics and date ranges; CRUD; bulk operations; the activity timeline; real-time events; authentication (wrong credentials, forged, expired and `alg: none` tokens, roles, stream tickets, the attempt limit); security headers, CORS and rate limiting; and error handling that never leaks internals.
- A lock file stops two runs from using the shared schema at once. Run one `npm test` at a time.
- Over a remote database a full run takes several minutes; a local PostgreSQL makes it much faster.
- The real error behaviour is also tested directly: tests make the database "fail" on purpose and check the client sees a friendly 503 or 500 while the details go to the log.

---

## Deployment

| Part | Service | Settings |
|---|---|---|
| Database | Neon (PostgreSQL) | Pooled URL as `DATABASE_URL`, direct URL as `DIRECT_URL` |
| API | Render web service, **Ohio** region (same as the database) | Root `server`; build `npm ci && npx prisma generate && npx prisma migrate deploy`; start `node src/server.js`; health check `/health` |
| Frontend | Vercel | Root `client`; `VITE_API_URL` set to the Render URL plus `/api` |
| Keep-alive | UptimeRobot | HTTP monitor on `/health`, every 5 minutes |

Order for a first deploy: create the database, set the Render environment variables (including a **new random `JWT_SECRET`** and `CORS_ORIGIN`), run the seed once against the database, deploy the API, then deploy the frontend and add its URL to `CORS_ORIGIN`. Migrations run on every API deploy, so schema changes ship with the code.

---

## AI-assisted development disclosure

**AI tool used:** Claude Code, used throughout the TicketFlow project.

**Development approach:** I broke the assignment into application features and developed the project iteratively. I made the decisions on the technology stack, application architecture, UI/UX direction, database design, ticket workflow and additional features. Claude Code assisted with code implementation based on these requirements, following an iterative workflow: define a task, review the implementation, test the result, identify issues and refine the solution.

**My contribution**
- Analysing the assignment and planning the application features.
- Selecting the technology stack and deciding how the frontend, backend and database work together.
- Defining the dashboard, ticket management interface and create-ticket experience using visual references.
- Specifying ticket status transitions, filtering requirements, analytics behaviour and additional features.
- Testing workflows, identifying bugs, evaluating results and requesting corrections.
- Configuring the database, deployment services, environment variables and the GitHub repository.
- Reviewing the API documentation, architecture and known limitations.

**AI-assisted tasks:** React components, Express APIs, automated tests, authentication, bulk operations, activity timelines, real-time updates and deployment configuration, plus debugging and documentation.

**Validation:** manual testing and automated backend tests covering ticket operations, status transitions, filtering, pagination, analytics, authentication, error handling and the additional features. I also investigated issues found during development and checked the deployed application.

**Accountability:** I guided the requirements, technical and design decisions, evaluation and deployment, and take responsibility for the submitted work. I am continuing to strengthen my understanding of the implementation so I can explain its behaviour and make modifications when required.

---

## Known limitations and trade-offs

**Authentication and access**
- Admins can add team members, but there is no editing or removing of users, no password change or reset, and no self-registration. The seeded demo users share one demo password.
- A ticket has one main assignee plus collaborators. Collaborators cannot be set from the bulk actions or used as a list filter yet, and they receive no notifications.
- The login token is kept in `localStorage` (so it survives reloads and is shared between tabs). That is exposed to any script injected into the page, which is why tokens are short-lived (8 hours) and the app sets security headers. Cookies were avoided because the frontend and API are on different domains and browsers block third-party cookies.
- Tokens are not revoked server-side: signing out discards the token in the browser, and a changed role or a removed user takes effect at the next sign-in or expiry.
- All signed-in agents can see all tickets (there is no per-team or per-customer access). The timeline does not yet record **who** made each change.
- Ticket ids are sequential integers shown in URLs (like many issue trackers). They are not a security feature either way; real protection is access control. A production version would add per-ticket authorization and could use opaque ids.

**Infrastructure**
- Free tiers: the API sleeps after 15 minutes without traffic (about a minute to wake), Neon sleeps after 5 minutes idle, and Neon's free storage is 0.5 GB. The uptime monitor reduces, but cannot remove, cold starts.
- Region: the API and database are in Ohio (USA), so users in India see about 250-300 ms per request.
- Development and the live app **share one database**, and the seed script wipes it. Re-seeding resets the demo data.
- The event hub, stream tickets and rate-limit counters live in server memory. That is correct for one instance; several instances would need Redis (or Postgres `LISTEN/NOTIFY`) as a shared store.

**Product and data**
- Search is a case-insensitive substring match, not full-text or fuzzy search.
- Analytics buckets days in UTC, computes the volume chart in memory (capped at 366 days), and counts by creation date.
- Bulk updates are capped at 100 tickets per request.
- The shared test schema means test runs are sequential, and slow over a remote database.

**Not done**
- No frontend automated tests or end-to-end browser tests; the UI was tested by hand.
- No CI pipeline, pagination cursor, file attachments, comments on tickets, or notifications.
- Accessibility follows good basics (labels, focus states, roles, keyboard-closable dialogs) but has not been audited.
- Prisma prints a deprecation warning for the `package.json#prisma` seed setting (a config file is required from Prisma 7).

**If I continued:** record the acting user on every change, per-team permissions, password reset and user admin, cursor pagination, full-text search, a shared store for events and limits, CI with tests on every push, and end-to-end tests.
