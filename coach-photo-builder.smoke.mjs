/**
 * Session builder must match the TrainHeroic photo grid (shots 061–115).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'coach.html'), 'utf8');

const required = [
  'Session Preview',
  'SESSION TEMPLATE FORM',
  'Save Prescription',
  'aria-label="Metric 1"',
  'aria-label="Metric 2"',
  'aria-label="Sets"',
  'Rep Range (min-max)',
  'Weight (lb)',
  'Weight (LWP+)',
  'Time (min::sec)',
  'Distance (meters)',
  'Velocity (m/s)',
  'Other Number',
  'For Weight',
  'For Completion',
  'Back to Calendar',
  'Publish Session',
  '+ Add Block',
];
for (const needle of required) {
  if (!html.includes(needle)) throw new Error('coach.html missing ' + needle);
}

const sessionStart = html.indexOf('function sessionHtml()');
const sessionEnd = html.indexOf('function coachChrome(', sessionStart);
const session = html.slice(sessionStart, sessionEnd);
if (session.includes('Strength builder')) throw new Error('session editor must not open the strength overlay');
if (session.includes('Edit prescription')) throw new Error('session editor must show the set grid, not an edit-prescription step');
if (session.includes('Target RIR')) throw new Error('session editor must not show Target RIR');
if (session.includes('Add a block type')) throw new Error('session editor must use one Add Block control');

console.log('Photo session builder markup passed');
