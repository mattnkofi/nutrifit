import { computed, ref } from 'vue';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabase';
import { friendlyAuthError } from '../services/auth';
import {
  deleteAccount as deleteAccountService,
  getAvatarUrl,
  getCurrentSession,
  getDisplayName,
  getInitials,
  signOut as signOutService,
  signOutEverywhere as signOutEverywhereService,
  updateDisplayName as updateDisplayNameService,
  updateAvatarUrl as updateAvatarUrlService,
} from '../services/auth';

const session = ref(null);
const user = ref(null);
const authLoading = ref(true);
const isPasswordRecovery = ref(false);
const authError = ref('');
// Set when a deep link (email confirmation, Google sign-in) completes while
// the app is on the landing page. App.vue watches this to move the user into
// the dashboard instead of leaving them stranded.
const postAuthRedirect = ref(false);

let initPromise = null;
let listenerBound = false;
let deepLinkListenerBound = false;
const handledDeepLinks = new Set();

const readUrlParams = () => {
  if (typeof window === 'undefined') return new URLSearchParams();
  const params = new URLSearchParams(window.location.search.replace(/^\?/, ''));
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  hash.forEach((value, key) => params.set(key, value));
  return params;
};

// Read these before supabase-js consumes and clears the URL on redirect back
// from Google or from a password-recovery email.
const initialParams = readUrlParams();
const initialRedirectError = (() => {
  const error = initialParams.get('error');
  if (!error) return '';
  return initialParams.get('error_description') || error;
})();
if (initialParams.get('type') === 'recovery' || initialParams.get('flow') === 'recovery') {
  isPasswordRecovery.value = true;
}

const applySession = (nextSession) => {
  session.value = nextSession || null;
  user.value = nextSession?.user || null;
};

const bindListener = () => {
  if (!supabase || listenerBound) return;
  listenerBound = true;
  supabase.auth.onAuthStateChange((event, nextSession) => {
    applySession(nextSession);
    if (event === 'PASSWORD_RECOVERY') isPasswordRecovery.value = true;
  });
};

const parseAuthUrl = (rawUrl) => {
  const url = new URL(rawUrl);
  const search = new URLSearchParams(url.search);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const get = (key) => hash.get(key) || search.get(key);
  return { url, search, hash, get };
};

// Handles both native deep links (com.nutrifit.app://auth?code=...) and the
// HTTPS callback page that forwards the same parameters into the app.
const completeAuthFromUrl = async (rawUrl) => {
  if (!supabase || !rawUrl) return false;

  let parsed;
  try {
    parsed = parseAuthUrl(rawUrl);
  } catch {
    return false;
  }

  const { get } = parsed;
  const errorCode = get('error');
  if (errorCode) {
    authError.value = get('error_description') || errorCode;
    return false;
  }

  if (get('type') === 'recovery' || get('flow') === 'recovery') isPasswordRecovery.value = true;

  try {
    const code = get('code');
    const accessToken = get('access_token');
    const refreshToken = get('refresh_token');
    const tokenHash = get('token_hash');
    const type = get('type');
    // supabase-js stores the PKCE verifier under a per-flow slot and appends
    // sb_flow_id to the redirect. Forward it so the exchange finds the right
    // verifier even if another sign-in started in the meantime.
    const flowId = get('sb_flow_id');

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined
      );
      if (error) throw error;
    } else if (accessToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
    } else {
      return false;
    }

    const { data } = await supabase.auth.getSession();
    applySession(data.session || null);
    authError.value = '';
    if (!isPasswordRecovery.value) postAuthRedirect.value = true;
    return true;
  } catch (error) {
    authError.value = friendlyAuthError(error);
    return false;
  }
};

const handleDeepLink = async (url) => {
  if (!url || handledDeepLinks.has(url)) return;
  handledDeepLinks.add(url);

  await completeAuthFromUrl(url);

  if (Capacitor.isNativePlatform()) {
    // The OAuth flow runs in a Custom Tab; close it once we are back.
    Browser.close().catch(() => {});
  }
};

const bindDeepLinkListener = () => {
  if (!supabase || deepLinkListenerBound || !Capacitor.isNativePlatform()) return;
  deepLinkListenerBound = true;
  App.addListener('appUrlOpen', ({ url }) => {
    handleDeepLink(url);
  });
};

// Register immediately so a link that is delivered while the session is still
// being restored is not lost.
bindDeepLinkListener();

export const initAuth = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!supabase) {
      authLoading.value = false;
      return null;
    }

    authError.value = initialRedirectError;

    // Bind before restoring the session so a SIGNED_IN emitted by the
    // supabase-js URL detection on the web is never missed.
    bindListener();

    // Android reports the URL that launched a cold start through
    // getLaunchUrl() instead of the appUrlOpen event.
    if (Capacitor.isNativePlatform()) {
      try {
        const launch = await App.getLaunchUrl();
        if (launch?.url) await handleDeepLink(launch.url);
      } catch (error) {
        console.warn('[auth] Could not read launch URL:', error?.message || error);
      }
    }

    try {
      applySession(await getCurrentSession());
    } catch (error) {
      console.warn('[auth] Could not restore session:', error?.message || error);
    } finally {
      authLoading.value = false;
    }

    bindDeepLinkListener();
    return session.value;
  })();

  return initPromise;
};

export const useAuth = () => {
  const displayName = computed(() => getDisplayName(user.value));
  const initials = computed(() => getInitials(displayName.value, user.value?.email));
  const avatarUrl = computed(() => getAvatarUrl(user.value));
  const isAuthenticated = computed(() => Boolean(user.value));

  const clearAuthError = () => {
    authError.value = '';
  };

  const endPasswordRecovery = () => {
    isPasswordRecovery.value = false;
  };

  const signOut = async () => {
    await signOutService();
    applySession(null);
    isPasswordRecovery.value = false;
    authError.value = '';
    postAuthRedirect.value = false;
  };

  const signOutEverywhere = async () => {
    await signOutEverywhereService();
    applySession(null);
    isPasswordRecovery.value = false;
    authError.value = '';
    postAuthRedirect.value = false;
  };

  const deleteAccount = async () => {
    await deleteAccountService();
    applySession(null);
    isPasswordRecovery.value = false;
    authError.value = '';
    postAuthRedirect.value = false;
  };

  const updateDisplayName = async (name) => {
    const data = await updateDisplayNameService(name);
    if (data?.user) {
      user.value = data.user;
      if (session.value) session.value = { ...session.value, user: data.user };
    }
  };

  const updateAvatar = async (url) => {
    const data = await updateAvatarUrlService(url);
    if (data?.user) {
      user.value = data.user;
      if (session.value) session.value = { ...session.value, user: data.user };
    }
  };

  return {
    session,
    user,
    authLoading,
    isAuthenticated,
    displayName,
    initials,
    avatarUrl,
    isPasswordRecovery,
    endPasswordRecovery,
    authError,
    clearAuthError,
    postAuthRedirect,
    initAuth,
    signOut,
    signOutEverywhere,
    deleteAccount,
    updateDisplayName,
    updateAvatar,
  };
};
