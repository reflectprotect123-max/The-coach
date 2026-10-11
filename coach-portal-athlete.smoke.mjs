/**
 * Legacy athlete compatibility helpers — prescription detection + sync status shape.
 * This does not test the current strengthside app or production delivery.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const dir = dirname(fileURLToPath(import.meta.url));

const syncSrc = readFileSync(join(dir, 'coach-sync.js'), 'utf8');
const cloudSrc = readFileSync(join(dir, 'coach-cloud.js'), 'utf8');
const sandbox = { console, module: { exports: {} }, globalThis: {}, Whoop: null };
sandbox.globalThis = sandbox;
vm.runInNewContext(syncSrc, sandbox);
vm.runInNewContext(cloudSrc, sandbox);
const Sync = sandbox.CoachSync || sandbox.module.exports;
const Cloud = sandbox.CoachCloud;

if (!Sync.isCoachPrescription) throw new Error('CoachSync.isCoachPrescription missing');
if (!Sync.pullAll) throw new Error('CoachSync.pullAll missing');
if (!Sync.formatStatusLine) throw new Error('CoachSync.formatStatusLine missing');
if (!Sync.markWithdrawn) throw new Error('CoachSync.markWithdrawn missing');
if (!Cloud.markCompleted) throw new Error('CoachCloud.markCompleted missing');
if (!Cloud.deliverySummary) throw new Error('CoachCloud.deliverySummary missing');
if (!Cloud.refreshPublishedStates) throw new Error('CoachCloud.refreshPublishedStates missing');
if (!Cloud.nutritionSnapshot) throw new Error('CoachCloud.nutritionSnapshot missing');

if (!Sync.isCoachPrescription({ source: 'coach-bridge', coachSessionId: 's1' })) {
  throw new Error('isCoachPrescription coach-bridge');
}
if (Sync.isCoachPrescription({ id: 'local' })) throw new Error('isCoachPrescription local');

const state = { sessions: [{ id: 'a', coachSessionId: 'c1', status: 'scheduled' }] };
if (!Sync.markWithdrawn(state, 'c1')) throw new Error('markWithdrawn');
if (!state.sessions[0].coachWithdrawn) throw new Error('coachWithdrawn flag');

if (typeof Sync.formatStatusLine() !== 'string') throw new Error('formatStatusLine string');

console.log('coach-portal-athlete: ok');
