export const SCHEMA_VERSION = 1;

export const REQUIRED_COLUMNS = [
  'Date', 'Kind', 'Model', 'Max Mode',
  'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read',
  'Output Tokens', 'Total Tokens', 'Cost',
];

export const OPTIONAL_COLUMNS = ['User'];

const COLUMN_ALIASES = {
  date: 'Date',
  kind: 'Kind',
  model: 'Model',
  user: 'User',
  cost: 'Cost',
};

export function validateCsvSchema(fields) {
  if (!fields?.length) {
    return { valid: false, version: SCHEMA_VERSION, missing: [...REQUIRED_COLUMNS], unknown: [], message: 'CSV has no header row' };
  }

  const normalized = fields.map(f => f.trim());
  const set = new Set(normalized);
  const missing = REQUIRED_COLUMNS.filter(c => !set.has(c));
  const known = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS, ...Object.keys(COLUMN_ALIASES)]);
  const unknown = normalized.filter(f => f && !known.has(f) && !Object.values(COLUMN_ALIASES).includes(f));

  let message = null;
  if (missing.length) {
    message = `Missing columns: ${missing.join(', ')}. Cursor may have changed its export format.`;
  } else if (unknown.length) {
    message = `Unrecognized columns: ${unknown.join(', ')}. Data may still import if core fields exist.`;
  }

  return {
    valid: missing.length === 0,
    version: SCHEMA_VERSION,
    missing,
    unknown,
    message,
    hasUser: set.has('User'),
  };
}
