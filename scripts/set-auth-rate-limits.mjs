#!/usr/bin/env node
/**
 * Raise Supabase Auth rate limits for a project.
 *
 * Supabase enforces these limits on its servers, so they cannot be changed from
 * the browser app. This script uses the Supabase Management API.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"   # https://supabase.com/dashboard/account/tokens
 *   node scripts/set-auth-rate-limits.mjs --check
 *   node scripts/set-auth-rate-limits.mjs --autoconfirm
 *
 * `--autoconfirm` disables "Confirm email". That is the only way to remove the
 * built-in mailer's hard 2-emails-per-hour cap: with confirmation off, signup
 * sends no email at all. New accounts become active immediately, so use it for
 * local/dev only and re-enable it before production.
 *
 * Without --autoconfirm the script still raises every limit it can, but the
 * built-in mailer stays capped at 2 emails/hour. Only custom SMTP (or a Send
 * Email hook) allows a higher email limit. See AUTH_SETUP.md.
 */

import './load-env.mjs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'nulbklefdrfoknlqaeqq';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const autoConfirm = args.has('--autoconfirm');
const reEnableConfirm = args.has('--confirm-email');
const help = args.has('--help') || args.has('-h');

if (help) {
  console.log(`Usage: node scripts/set-auth-rate-limits.mjs [options]

Options:
  --check           Only print the current auth config.
  --autoconfirm     Raise limits AND disable "Confirm email" (dev only).
  --confirm-email   Raise limits AND re-enable "Confirm email" (production).
  --help            Show this message.

Environment:
  SUPABASE_ACCESS_TOKEN  Required. Create one at
                         https://supabase.com/dashboard/account/tokens
  SUPABASE_PROJECT_REF   Optional. Defaults to ${projectRef}.`);
  process.exit(0);
}

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN.');
  console.error('Create one at https://supabase.com/dashboard/account/tokens');
  console.error('Then set it in this terminal:');
  console.error('  $env:SUPABASE_ACCESS_TOKEN = "sbp_..."');
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

// Every field below exists in the Management API's UpdateAuthConfigBody.
// There is no "sign in/sign up" key in that schema, so the 30-per-5-minutes
// IP limit is raised from the dashboard only.
const HIGH = 100000;
const payload = {
  rate_limit_email_sent: HIGH,
  rate_limit_sms_sent: HIGH,
  rate_limit_verify: HIGH,
  rate_limit_token_refresh: HIGH,
  rate_limit_otp: HIGH,
  rate_limit_anonymous_users: HIGH,
  rate_limit_web3: HIGH,
};

if (autoConfirm) payload.mailer_autoconfirm = true;
if (reEnableConfirm) payload.mailer_autoconfirm = false;

const printLimits = (config) => {
  const keys = Object.keys(config)
    .filter(
      (key) =>
        key.startsWith('rate_limit_') ||
        key === 'mailer_autoconfirm' ||
        key === 'smtp_host' ||
        key === 'smtp_sender_name'
    )
    .sort();

  for (const key of keys) {
    const value = config[key];
    if (key === 'mailer_autoconfirm') {
      console.log(`${key}: ${value}  ${value ? '(confirmation OFF)' : '(confirmation ON)'}`);
    } else if (key === 'smtp_host') {
      console.log(`${key}: ${value || '(built-in mailer)'}`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
};

const request = async (method, body) => {
  const response = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = data.message || data.error || text;
    throw new Error(`Supabase API returned ${response.status}: ${detail}`);
  }

  return data;
};

const run = async () => {
  const before = await request('GET');

  if (checkOnly) {
    console.log(`Current auth config for ${projectRef}:`);
    printLimits(before);
    return;
  }

  console.log(`Current auth config for ${projectRef}:`);
  printLimits(before);

  const after = await request('PATCH', payload);

  console.log('\nUpdated auth config:');
  printLimits(after);

  const usingBuiltInMailer = !after.smtp_host;
  if (usingBuiltInMailer) {
    console.log(
      '\nIMPORTANT: this project uses Supabase’s built-in mailer, which is hard-capped\n' +
        'at 2 emails per hour no matter what rate_limit_email_sent says. Supabase only\n' +
        'lifts that cap when you add custom SMTP or a Send Email hook.'
    );
    if (!after.mailer_autoconfirm) {
      console.log(
        '\nSo signup can still return 429 after two confirmation emails. To remove that\n' +
          'bottleneck for local testing, run:\n' +
          '  node scripts/set-auth-rate-limits.mjs --autoconfirm\n' +
          'and re-enable it before production with:\n' +
          '  node scripts/set-auth-rate-limits.mjs --confirm-email'
      );
    }
  }

  if (autoConfirm) {
    console.log(
      '\nEmail confirmation is now OFF. New accounts are active immediately.\n' +
        'Re-enable it before production: node scripts/set-auth-rate-limits.mjs --confirm-email'
    );
  }
  if (reEnableConfirm) {
    console.log('\nEmail confirmation is back ON. Signups will send a confirmation email again.');
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
