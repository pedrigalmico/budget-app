/**
 * Load a JSON export into the LOCAL Firestore emulator so development runs
 * against realistic data without ever touching production.
 *
 *   npm run emulators          # in one terminal
 *   npm run seed -- ~/MiKai-Backups/mikai-recovered-XXXX.json
 *
 * Refuses to run against anything that is not a local emulator.
 */
import fs from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: npm run seed -- <export.json>');
  process.exit(1);
}

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';

// Hard safety rail: never let this script reach real Firestore.
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host)) {
  console.error(`ABORT: FIRESTORE_EMULATOR_HOST is "${host}", not a local emulator`);
  process.exit(1);
}

const UID = process.env.SEED_UID || 'VfPDeVOKLCemeUDQX5aY4ALLptL2';
const EMAIL = process.env.SEED_EMAIL || 'dev@local.test';
const PASSWORD = process.env.SEED_PASSWORD || 'devpassword';

initializeApp({ projectId: 'budgeting-app-221d6' });

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
await getFirestore().collection('users').doc(UID).set(data);

try {
  await getAuth().createUser({ uid: UID, email: EMAIL, password: PASSWORD });
} catch (err) {
  if (err.code !== 'auth/uid-already-exists' && err.code !== 'auth/email-already-exists') throw err;
}

const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
console.log(`seeded emulator at ${host}`);
console.log(`  expenses ${n('expenses')} | incomes ${n('incomes')} | investments ${n('investments')} | goals ${n('goals')}`);
console.log(`  log in locally as ${EMAIL} / ${PASSWORD}`);
