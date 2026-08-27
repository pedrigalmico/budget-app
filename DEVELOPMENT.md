# Development workflow

## The three rules

1. **Never point a dev build at production data.** `npm run dev` uses the local
   emulators. If you ever set `VITE_USE_EMULATORS=false`, you are editing live
   financial records — treat that as a deliberate, temporary act.
2. **Work on a branch.** `main` should always match what is deployed.
3. **Deploy rules before code** when both changed. Rules are backward compatible
   with old clients; new code may depend on new rules.

## Daily loop

```bash
git checkout -b feature/what-youre-doing   # never develop on main
npm run emulators                          # terminal 1 — local Auth + Firestore
npm run dev                                # terminal 2 — app on localhost
```

First time only, load realistic data into the emulator:

```bash
npm run seed -- ~/MiKai-Backups/mikai-recovered-YYYYMMDD-HHMMSS.json
```

Log in locally as `dev@local.test` / `devpassword`. Emulator state persists
between runs in `.emulator-data/` (gitignored), so you only seed once.

Before committing:

```bash
npx tsc -b && npm run lint && npm run build
```

## Deploying

```bash
firebase deploy --only firestore:rules --project budgeting-app-221d6
npm run build && firebase deploy --only hosting --project budgeting-app-221d6
```

`--project` is required because `.firebaserc` is gitignored.

## Data safety

- **Automatic backups** — the app snapshots the last server-confirmed state to
  `users/{uid}/backups/{timestamp}` before any write that drops more than 20% of
  records, and once daily. The 20 most recent are kept.
- **Manual export** — Settings → Download as JSON. Do this before risky changes.
- **Point-in-Time Recovery** — 7-day rollback, requires the Blaze plan.

### Restoring from a backup

Backups live in Firestore under the user document. To restore, copy the `data`
field of the chosen backup doc over the parent `users/{uid}` document, or adapt
the recovery script kept with the backup exports.

## Why any of this exists

On 2026-08-27 the app deleted 17 months of records. The Firestore listener read
a cache-sourced snapshot — which reports `exists() === false` for a document it
simply hasn't cached yet — as proof the user was new, and wrote an empty default
state. Loading the app offline on localhost triggered it; the queued write
flushed on reconnect and overwrote everything.

The data was recovered from a React fiber closure still held in a second
laptop's browser memory. It was luck, not design. Hence: emulators, so localhost
can't reach production; a `fromCache` guard, so an unreachable server is never
mistaken for an empty one; a write latch, so nothing is saved before the initial
read lands; and automatic backups, so the next mistake is recoverable.
