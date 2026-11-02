import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

export const isAuthConfigured = Boolean(supabase);

const client = () => {
  if (!supabase) {
    throw new Error(
      'Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    );
  }
  return supabase;
};

export const authRedirectUrl = (path = '/auth') => {
  if (Capacitor.isNativePlatform()) return `com.nutrifit.app://${path.replace(/^\/+/, '')}`;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
};

export const getDisplayName = (user) => {
  if (!user) return '';
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || meta.display_name;
  if (name && String(name).trim()) return String(name).trim();
  return user.email ? user.email.split('@')[0] : 'Member';
};

export const getInitials = (name, email) => {
  const source = String(name || '').trim() || String(email || '').trim();
  if (!source) return 'NF';
  const parts = source.includes('@') ? [source[0]] : source.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]).join('');
  return letters.toUpperCase() || 'NF';
};

export const getAvatarUrl = (user) => {
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || '';
};

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUpWithEmail({ name, email, password }) {
  const { data, error } = await client().auth.signUp({
    email: String(email || '').trim(),
    password,
    options: {
      data: { full_name: String(name || '').trim() },
      emailRedirectTo: authRedirectUrl('/auth'),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await client().auth.signInWithPassword({
    email: String(email || '').trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function resendConfirmation(email) {
  const { data, error } = await client().auth.resend({
    type: 'signup',
    email: String(email || '').trim(),
    options: {
      emailRedirectTo: authRedirectUrl('/auth'),
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle({ redirectTo = '/auth' } = {}) {
  const { data, error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl(redirectTo),
      skipBrowserRedirect: Capacitor.isNativePlatform(),
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const { data, error } = await client().auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo: authRedirectUrl('/auth'),
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  const { data, error } = await client().auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function updateDisplayName(name) {
  const { data, error } = await client().auth.updateUser({
    data: { full_name: String(name || '').trim() },
  });
  if (error) throw error;
  return data;
}

export async function updateAvatarUrl(avatarUrl) {
  const { data, error } = await client().auth.updateUser({
    data: { avatar_url: String(avatarUrl || '').trim() },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Ends the session on every device signed in to this account.
export async function signOutEverywhere() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}

// Deletes the Supabase auth user. The SQL function cascades to every table
// owned by the account (see supabase/migrations/0001_nutrifit_core.sql).
export async function deleteAccount() {
  const db = client();
  const { error } = await db.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut().catch(() => {});
}

export function isRateLimitError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.status === 429 ||
    error?.code === 'over_request_rate_limit' ||
    error?.code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many')
  );
}

export function friendlyAuthError(error) {
  const raw = String(error?.message || error || '');
  const message = raw.toLowerCase();

  if (isRateLimitError(error)) {
    const emailLimit =
      error?.code === 'over_email_send_rate_limit' ||
      message.includes('email') ||
      message.includes('confirmation');
    return emailLimit
      ? 'Supabase’s built-in mailer is limited to 2 emails per hour. Use “Continue with Google”, or turn off “Confirm email” for local testing (see AUTH_SETUP.md).'
      : 'Too many attempts right now. Wait a minute and try again, or use “Continue with Google”.';
  }
  if (message.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the confirmation link.';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('user not found') || error?.code === 'user_not_found') {
    return 'No NutriFit account is registered with that email. Create an account first.';
  }
  if (message.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (message.includes('unable to validate email') || message.includes('invalid email')) {
    return 'That email address does not look valid.';
  }
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
    return 'Google sign-in is not enabled yet. Turn it on in your Supabase dashboard (see AUTH_SETUP.md).';
  }
  if (message.includes('redirect_uri_mismatch') || message.includes('redirect uri')) {
    return 'The Google OAuth redirect URL is not configured correctly. See AUTH_SETUP.md.';
  }
  if (message.includes('not configured')) return raw;

  return raw || 'Something went wrong. Please try again.';
}
