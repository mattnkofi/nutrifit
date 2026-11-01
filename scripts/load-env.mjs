/**
 * Load the project's .env into process.env for Node scripts.
 *
 * Vite already loads .env for the app, but only exposes `VITE_`-prefixed keys
 * to the browser. The auth/SMTP scripts read plain names such as SMTP_PASS,
 * so they need an explicit load. Real environment variables always win over
 * values from .env, so a one-off `$env:SMTP_PASS = "..."` still overrides it.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');

if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn(`Could not read .env: ${error.message}`);
  }
}

export { root };
