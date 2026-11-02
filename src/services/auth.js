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

const FALLBACK_PUBLIC_APP_URL = 'https://nutrifit-active.vercel.app';

// The deployed web app. Native email/OAuth links land here first instead of
// redirecting straight to com.nutrifit.app://, which some mail clients and
// browsers render as a blank page.
export const publicAppUrl = () => {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') return window.location.origin;
  }

  return FALLBACK_PUBLIC_APP_URL;
};

export const authRedirectUrl = (path = '/auth') => {
  if (Capacitor.isNativePlatform()) return `com.nutrifit.app://${path.replace(/^\/+/, '')}`;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
};

// Every native auth flow (email confirmation, Google sign-in, password
// recovery) lands on this HTTPS page first. Mail apps and in-app browsers
// handle custom URL schemes inconsistently, so the page paints a real
// confirmation screen and forwards the result to the installed app. If the
// automatic handoff is blocked, the visible "Open NutriFit" button still works.
export const authNativeRedirectUrl = (flow = '') => {
  const suffix = flow === 'recovery' ? '?flow=recovery' : '';
  return `${publicAppUrl()}/auth/callback${suffix}`;
};

export const authEmailRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) return authNativeRedirectUrl();
  return authRedirectUrl('/auth');
};

// Google sign-in runs in a Chrome Custom Tab (a separate browser context from
// the app's WebView), so it uses the same HTTPS hop as the email links.
export const authOAuthRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) return authNativeRedirectUrl();
  return authRedirectUrl('/auth');
};

// Password recovery needs a marker because the redirect only carries the
// session tokens, not the original "recovery" type.
export const authRecoveryRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) return authNativeRedirectUrl('recovery');
  return authRedirectUrl('/auth');
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
      emailRedirectTo: authEmailRedirectUrl(),
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
      emailRedirectTo: authEmailRedirectUrl(),
    },
  });
  if (error) throw error;
  return data;
}

const supabaseProjectUrl = () =>
  String(import.meta.env.VITE_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/+$/, '');

// Builds the same /authorize URL that supabase-js would return. The native app
// uses this as a fallback so Google sign-in can never be blocked just because
// supabase-js failed to hand back a URL.
const googleAuthorizeUrl = (redirectTo) => {
  const base = supabaseProjectUrl();
  if (!base) return '';

  const url = new URL(`${base}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
};

export async function signInWithGoogle({ redirectTo = '/auth' } = {}) {
  const native = Capacitor.isNativePlatform();
  const callbackUrl = native ? authOAuthRedirectUrl() : authRedirectUrl(redirectTo);

  if (native) {
    // The flow runs in a Chrome Custom Tab (a separate browser context), so
    // supabase-js must not redirect the WebView itself.
    const fallbackUrl = googleAuthorizeUrl(callbackUrl);
    try {
      const { data } = await client().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      // Return the same { data, error } shape as supabase-js so callers can
      // read `data.url` without knowing which branch ran.
      return {
        data: { ...(data || {}), provider: 'google', url: data?.url || fallbackUrl },
        error: null,
      };
    } catch (error) {
      if (fallbackUrl) {
        return { data: { provider: 'google', url: fallbackUrl }, error: null };
      }
      throw error;
    }
  }

  const { data, error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  return { data, error: null };
}

export async function sendPasswordReset(email) {
  const { data, error } = await client().auth.resetPasswordForEmail(String(email || '').trim(), {
    redirectTo: authRecoveryRedirectUrl(),
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
  if (message.includes('code verifier') || message.includes('pkce')) {
    return 'Your email is confirmed, but this link was opened on a different device or after the app was reinstalled. Open NutriFit and sign in with your email and password.';
  }
  if (message.includes('not configured')) return raw;

  return raw || 'Something went wrong. Please try again.';
}
