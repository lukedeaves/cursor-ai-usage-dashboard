import { normalizeHeaderList } from './csv-fields.js';

export const SCHEMA_VERSION = 2;

export const REQUIRED_COLUMNS = [
  'Date', 'Kind', 'Model', 'Max Mode',
  'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read',
  'Output Tokens', 'Total Tokens', 'Cost',
];

export const OPTIONAL_COLUMNS = [
  'User',
  'Cloud Agent ID',
  'Automation ID',
];

export function validateCsvSchema(fields) {
  const normalized = normalizeHeaderList(fields);
  if (!normalized.length) {
    return { valid: false, version: SCHEMA_VERSION, missing: [...REQUIRED_COLUMNS], unknown: [], message: 'CSV has no header row' };
  }

  const set = new Set(normalized);
  const missing = REQUIRED_COLUMNS.filter(c => !set.has(c));
  const known = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const unknown = normalized.filter(f => !known.has(f));

  let message = null;
  if (missing.length) {
    message = `Missing columns: ${missing.join(', ')}. Cursor may have changed its export format.`;
  } else if (unknown.length) {
    message = `New columns detected: ${unknown.join(', ')}. Import will continue.`;
  }

  return {
    valid: missing.length === 0,
    version: SCHEMA_VERSION,
    missing,
    unknown,
    message,
    hasUser: set.has('User'),
    hasTeamFields: set.has('Cloud Agent ID') || set.has('Automation ID'),
  };
}
