# Running the tests

The backend has 13 automated test suites (over 340 tests) using **Jest** and **Supertest**. They call the real Express app and a real PostgreSQL database. The database is a separate **`test` schema**, so real data is never touched.

## 1. Requirements

- Node.js 20 or newer
- The server dependencies installed: `cd server && npm ci`
- A PostgreSQL database. A free Neon database works: use the same project as the app. The tests use their own schema inside it.

## 2. Set up the test environment (once)

```bash
cd server
cp .env.test.example .env.test
```

Open `server/.env.test` and fill in:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Your **direct** (non-pooler) connection string, ending with `&schema=test` |
| `DIRECT_URL` | The same string, also ending with `&schema=test` |
| `JWT_SECRET` | Any random string of at least 32 characters (different from the real one) |

`.env.test` is ignored by git. Never commit it or paste it anywhere.

**Safety check:** if the database URL does not end with `schema=test`, the tests refuse to start.

## 3. Run everything

```bash
cd server
npm test
```

`npm test` runs `jest --runInBand`, which means one test file at a time. Before the first test:
- the `test` schema is migrated automatically (`prisma migrate deploy`);
- a lock file (`server/tests/.jest-running`) is created, so a second run cannot start at the same time.

Over a remote database the full run takes several minutes. A local PostgreSQL is much faster.

## 4. Run only some tests

```bash
npx jest --runInBand transitions          # one suite
npx jest --runInBand bulk crud            # several suites
npx jest --runInBand -t "reopen"          # tests whose name contains "reopen"
```

## 5. What each suite covers

| Suite | Covers |
|---|---|
| `crud.test.js` | Create, read, update, delete tickets and `/api/meta` |
| `list.test.js` | Filters, search, sorting, pagination |
| `transitions.test.js` | Every status move, allowed or rejected, including reopen |
| `bulk.test.js` | Bulk status and assignee changes, partial success |
| `activity.test.js` | The activity timeline |
| `collaborators.test.js` | Adding and removing collaborators |
| `analytics.test.js` | Dashboard numbers |
| `auth.test.js` | Login, tokens, expiry |
| `users.test.js` | Team members, admin-only access |
| `security.test.js` | Roles, rate limits, no secret leakage |
| `events.test.js` | Live update events |
| `errors.test.js` | Safe error responses (503 / 500) |
| `validation.test.js` | Rejection of bad input |

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database server` | The free Neon database was asleep. Run the command again. |
| "Another test run is in progress (process …)" | Another `npm test` is really running. Wait for it, or stop it. A lock left by a crashed run is taken over automatically. |
| Tests refuse to start | Check that both URLs in `.env.test` end with `&schema=test`. |
| Timeouts on a slow connection | The timeout is already 120 s per test. Re-run, or use a nearer or local database. |
| `EPERM` during `prisma generate` (Windows) | Stop the dev server (`npm run dev`) first, then run it again. |

## 7. Rules for running them

- Run **one** `npm test` at a time. The suites share one schema.
- Use `--runInBand`. Running suites in parallel corrupts the shared data.
- Never point `.env.test` at your real schema.
