#!/usr/bin/env node
/**
 * Apply the branded NutriFit auth emails to a Supabase project.
 *
 * This uses the Supabase Management API, so it needs an account access token
 * (not the anon key):
 *   https://supabase.com/dashboard/account/tokens
 *
 * It also enforces email confirmation (mailer_autoconfirm = false) so users
 * must verify their address before they can sign in.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
 *   npm run auth:emails:check
 *   npm run auth:emails
 *
 * Optional SMTP provider (recommended for real users):
 *   $env:SMTP_HOST = "smtp.resend.com"
 *   $env:SMTP_PORT = "465"
 *   $env:SMTP_USER = "resend"
 *   $env:SMTP_PASS = "re_your_api_key"
 *   $env:SMTP_ADMIN_EMAIL = "noreply@yourdomain.com"
 *   $env:SMTP_SENDER_NAME = "NutriFit"
 *   npm run auth:emails
 *
 * Optional URL configuration:
 *   $env:SITE_URL = "https://your-app.example.com"
 *   $env:URI_ALLOW_LIST = "https://your-app.example.com/**,http://localhost:5173/**"
 *
 * Flags:
 *   --check              Only show the current subjects/templates/SMTP status.
 *   --dry-run            Read the files and show what would be sent.
 *   --keep-autoconfirm   Do not turn email confirmation on.
 */

import './load-env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = path.join(root, 'supabase', 'email-templates');

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const dryRun = args.has('--dry-run');
const keepAutoconfirm = args.has('--keep-autoconfirm');
const help = args.has('--help') || args.has('-h');

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'nulbklefdrfoknlqaeqq';

if (help) {
  console.log(`Usage: node scripts/apply-auth-emails.mjs [options]

Options:
  --check              Show current Supabase email settings.
  --dry-run            Read templates and print the planned payload.
  --keep-autoconfirm   Leave "Confirm email" as-is (default: turn it ON).
  --help               Show this message.

Environment:
  SUPABASE_ACCESS_TOKEN  Required (except with --dry-run).
  SUPABASE_PROJECT_REF   Optional. Defaults to ${projectRef}.
  SMTP_HOST              Optional. Add custom SMTP in the same run.
  SMTP_PORT              Optional. Usually 465 or 587.
  SMTP_USER              Optional.
  SMTP_PASS              Optional.
  SMTP_ADMIN_EMAIL       Optional. The From address.
  SMTP_SENDER_NAME       Optional. Defaults to NutriFit.
  SITE_URL               Optional. Updates the Supabase Site URL.
  URI_ALLOW_LIST         Optional. Comma-separated redirect allow list.`);
  process.exit(0);
}

const templates = [
  {
    file: 'confirm-signup.html',
    subjectKey: 'mailer_subjects_confirmation',
    contentKey: 'mailer_templates_confirmation_content',
    subject: 'Confirm your NutriFit account',
  },
  {
    file: 'magic-link.html',
    subjectKey: 'mailer_subjects_magic_link',
    contentKey: 'mailer_templates_magic_link_content',
    subject: 'Your NutriFit sign-in link',
  },
  {
    file: 'reset-password.html',
    subjectKey: 'mailer_subjects_recovery',
    contentKey: 'mailer_templates_recovery_content',
    subject: 'Reset your NutriFit password',
  },
  {
    file: 'change-email.html',
    subjectKey: 'mailer_subjects_email_change',
    contentKey: 'mailer_templates_email_change_content',
    subject: 'Confirm your new NutriFit email',
  },
  {
    file: 'invite.html',
    subjectKey: 'mailer_subjects_invite',
    contentKey: 'mailer_templates_invite_content',
    subject: "You're invited to NutriFit",
  },
  {
    file: 'reauthentication.html',
    subjectKey: 'mailer_subjects_reauthentication',
    contentKey: 'mailer_templates_reauthentication_content',
    subject: 'Your NutriFit verification code',
  },
];

const readTemplates = async () => {
  const loaded = [];
  for (const template of templates) {
    const filePath = path.join(templatesDir, template.file);
    const html = await fs.readFile(filePath, 'utf8');
    if (!html.includes('<!DOCTYPE html>')) {
      throw new Error(`${template.file} does not look like a full HTML email.`);
    }
    if (!/\{\{\s*\.[A-Za-z]+\s*\}\}/.test(html)) {
      throw new Error(`${template.file} has no Supabase template variables.`);
    }
    loaded.push({ ...template, html });
  }
  return loaded;
};

const buildPayload = (loaded) => {
  const payload = {
    external_email_enabled: true,
    ...(keepAutoconfirm ? {} : { mailer_autoconfirm: false }),
  };

  for (const template of loaded) {
    payload[template.subjectKey] = template.subject;
    payload[template.contentKey] = template.html;
  }

  if (process.env.SITE_URL) payload.site_url = process.env.SITE_URL;
  if (process.env.URI_ALLOW_LIST) payload.uri_allow_list = process.env.URI_ALLOW_LIST;

  const smtpHost = (process.env.SMTP_HOST || '').trim();
  if (smtpHost) {
    const required = ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_ADMIN_EMAIL'];
    const missing = required.filter((key) => !(process.env[key] || '').trim());
    if (missing.length) {
      if (!dryRun) {
        throw new Error(
          `SMTP_HOST is set but ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing. ` +
            'Fill them in .env (or export them) before applying.'
        );
      }
      console.log(`\nSkipping SMTP in this preview: ${missing.join(', ')} not filled in yet.`);
    } else {
      payload.smtp_host = smtpHost;
      payload.smtp_port = String(process.env.SMTP_PORT).trim();
      payload.smtp_user = process.env.SMTP_USER.trim();
      payload.smtp_pass = process.env.SMTP_PASS;
      payload.smtp_admin_email = process.env.SMTP_ADMIN_EMAIL.trim();
      payload.smtp_sender_name = (process.env.SMTP_SENDER_NAME || 'NutriFit').trim();
    }
  }

  return payload;
};

const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
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

const printConfig = (config) => {
  console.log(`Project: ${projectRef}`);
  console.log(`Email provider enabled: ${config.external_email_enabled}`);
  console.log(
    `Confirm email: ${config.mailer_autoconfirm ? 'OFF (users are active immediately)' : 'ON'}`
  );
  console.log(`SMTP: ${config.smtp_host || 'built-in mailer (2 emails/hour)'}`);
  console.log(`Site URL: ${config.site_url || '(not set)'}`);
  console.log(`Redirect allow list: ${config.uri_allow_list || '(not set)'}`);
  console.log('');
  for (const template of templates) {
    const subject = config[template.subjectKey] || '(empty)';
    const content = config[template.contentKey] || '';
    console.log(`- ${template.subjectKey}: ${subject}  [${content.length} chars]`);
  }
};

const run = async () => {
  const loaded = await readTemplates();
  console.log(`Loaded ${loaded.length} templates from supabase/email-templates.`);

  if (dryRun) {
    const payload = buildPayload(loaded);
    console.log('\nDry run — would send these keys:');
    for (const key of Object.keys(payload)) {
      const value = payload[key];
      const display =
        key === 'smtp_pass'
          ? '***'
          : typeof value === 'string' && value.length > 80
            ? `${value.slice(0, 60)}… (${value.length} chars)`
            : value;
      console.log(`  ${key}: ${display}`);
    }
    return;
  }

  if (!token) {
    console.error('Missing SUPABASE_ACCESS_TOKEN.');
    console.error('Create one at https://supabase.com/dashboard/account/tokens');
    console.error('Then set it in this terminal:');
    console.error('  $env:SUPABASE_ACCESS_TOKEN = "sbp_..."');
    process.exit(1);
  }

  const before = await request('GET');

  if (checkOnly) {
    console.log('\nCurrent settings:');
    printConfig(before);
    return;
  }

  const payload = buildPayload(loaded);
  const after = await request('PATCH', payload);

  console.log('\nUpdated settings:');
  printConfig(after);

  if (!after.smtp_host) {
    console.log(
      '\nThe project is still using Supabase’s built-in mailer, which only allows\n' +
        '2 emails per hour. Add custom SMTP for real users:\n' +
        '  $env:SMTP_HOST = "smtp.resend.com"\n' +
        '  $env:SMTP_PORT = "465"\n' +
        '  $env:SMTP_USER = "resend"\n' +
        '  $env:SMTP_PASS = "re_..."\n' +
        '  $env:SMTP_ADMIN_EMAIL = "noreply@yourdomain.com"\n' +
        '  npm run auth:emails'
    );
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
