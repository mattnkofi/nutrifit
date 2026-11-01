#!/usr/bin/env node
// Verifies that the NutriFit Supabase schema has been applied.
//
//   npm run db:check
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env (or the current
// environment). A table that exists but is protected by row level security is
// reported as "protected", which is expected for the anon key.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const readEnv = () => {
  const env = { ...process.env };
  try {
    const text = readFileSync(resolve(root, '.env'), 'utf8');
    text.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) return;
      const value = match[2].replace(/^['"]|['"]$/g, '').trim();
      if (!env[match[1]]) env[match[1]] = value;
    });
  } catch {
    // .env is optional when variables are already exported.
  }
  return env;
};

const env = readEnv();
const url = (env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = env.VITE_SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Fill in .env first.');
  process.exit(1);
}

const tables = [
  'profiles',
  'water_logs',
  'meals',
  'workouts',
  'workout_sessions',
  'plans',
  'user_settings',
];

const missingCodes = new Set(['PGRST125', 'PGRST205', '42P01']);

const checkTable = async (table) => {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      // Non JSON response.
    }
    const code = body?.code;
    const message = String(body?.message || text || '').toLowerCase();

    if (response.ok) return { table, state: 'ok', detail: `HTTP ${response.status}` };
    if (missingCodes.has(code) || message.includes('invalid path') || message.includes('does not exist')) {
      return { table, state: 'missing', detail: body?.message || `HTTP ${response.status}` };
    }
    if (
      response.status === 401 ||
      response.status === 403 ||
      code === '42501' ||
      message.includes('permission denied')
    ) {
      return { table, state: 'protected', detail: 'RLS active (expected for anon key)' };
    }
    return { table, state: 'error', detail: body?.message || `HTTP ${response.status}` };
  } catch (error) {
    return { table, state: 'error', detail: error?.message || 'Request failed' };
  }
};

const main = async () => {
  const results = [];
  for (const table of tables) {
    // Sequential so the output stays readable and rate limits are avoided.
    // eslint-disable-next-line no-await-in-loop
    results.push(await checkTable(table));
  }

  const missing = results.filter((result) => result.state === 'missing');
  const errors = results.filter((result) => result.state === 'error');

  results.forEach((result) => {
    const mark = result.state === 'missing' ? 'MISSING' : result.state === 'error' ? 'ERROR' : 'OK';
    console.log(`${mark.padEnd(8)} ${result.table.padEnd(18)} ${result.detail}`);
  });

  console.log('');
  if (!missing.length && !errors.length) {
    console.log('Schema looks good. Signed-in users can read and write their own rows.');
    return;
  }

  console.log('Run supabase/migrations/0001_nutrifit_core.sql in the Supabase SQL editor,');
  console.log('then run this check again. See DATABASE_SETUP.md for step-by-step help.');
  process.exitCode = 1;
};

main();
