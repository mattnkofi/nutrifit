/**
 * Upload the email assets (brand mark + faint watermark) to a public
 * Supabase Storage bucket so the HTML templates can reference them by URL.
 *
 * Email clients cannot read data: URIs and Supabase Auth has no way to attach
 * inline images (cid:), so the images must live at a stable public URL.
 *
 * Requires SUPABASE_ACCESS_TOKEN (Management API, Project Settings read) in
 * .env. The service-role key is fetched at runtime and never printed or saved.
 *
 *   npm run auth:assets
 *   npm run auth:assets -- --check
 */

import './load-env.mjs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './load-env.mjs';

const BUCKET = 'email-assets';
const ASSET_DIR = path.join(root, 'supabase', 'email-templates', 'assets');
const checkOnly = process.argv.includes('--check');

const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
if (!token) fail('SUPABASE_ACCESS_TOKEN is missing from .env.');

const projectRef =
  (process.env.SUPABASE_PROJECT_REF || '').trim() ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1];
if (!projectRef) fail('Could not work out the project ref. Set SUPABASE_PROJECT_REF or VITE_SUPABASE_URL.');

const projectOrigin = `https://${projectRef}.supabase.co`;
const publicBase = `${projectOrigin}/storage/v1/object/public/${BUCKET}`;

const api = async (url, init = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: response.status, ok: response.ok, body };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  throw lastError;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const assets = (await readdir(ASSET_DIR)).filter((file) => file.toLowerCase().endsWith('.png')).sort();
if (!assets.length) fail(`No PNG assets found in ${ASSET_DIR}`);

if (checkOnly) {
  for (const file of assets) {
    const url = `${publicBase}/${file}`;
    const head = await fetch(url, { method: 'HEAD' });
    const bytes = head.headers.get('content-length');
    console.log(`${head.ok ? 'ok  ' : 'MISS'} ${url}${bytes ? `  (${bytes} bytes)` : ''}`);
  }
  process.exit(0);
}

console.log(`Project: ${projectRef}`);
console.log(`Bucket:  ${BUCKET}`);

// 1. service_role key, used only in memory.
const keys = await api(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!keys.ok) fail(`Could not read project API keys (${keys.status}): ${JSON.stringify(keys.body)}`);
const serviceRole = keys.body.find((key) => key.name === 'service_role')?.api_key;
if (!serviceRole) fail('The project API keys did not include service_role.');

const storageHeaders = { Authorization: `Bearer ${serviceRole}`, apikey: serviceRole };

// 2. Public bucket (created once; 409 means it already exists).
const created = await api(`${projectOrigin}/storage/v1/bucket`, {
  method: 'POST',
  headers: { ...storageHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: BUCKET,
    name: BUCKET,
    public: true,
    file_size_limit: 1048576,
    allowed_mime_types: ['image/png'],
  }),
});
if (created.ok) console.log(`Created public bucket "${BUCKET}".`);
else if (created.status === 409 || /already exists/i.test(JSON.stringify(created.body))) console.log(`Bucket "${BUCKET}" already exists.`);
else fail(`Could not create bucket (${created.status}): ${JSON.stringify(created.body)}`);

// 3. Upload every PNG.
for (const file of assets) {
  const bytes = await readFile(path.join(ASSET_DIR, file));
  const uploaded = await api(`${projectOrigin}/storage/v1/object/${BUCKET}/${file}`, {
    method: 'POST',
    headers: {
      ...storageHeaders,
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!uploaded.ok) fail(`Upload failed for ${file} (${uploaded.status}): ${JSON.stringify(uploaded.body)}`);
  console.log(`uploaded  ${publicBase}/${file}`);
}

console.log('\nDone. The public URLs above are what the templates should reference.');
