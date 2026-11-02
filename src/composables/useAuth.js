import { computed, ref } from 'vue';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../services/supabase';
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

let initPromise = null;
let listenerBound = false;
let deepLinkListenerBound = false;

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
if (initialParams.get('type') === 'recovery') {
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

const bindDeepLinkListener = () => {
  if (!supabase || deepLinkListenerBound) return;
  deepLinkListenerBound = true;
  App.addListener('appUrlOpen', async ({ url }) => {
    const callbackUrl = new URL(url);
    const code = callbackUrl.searchParams.get('code');
    const callbackParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
    const errorDescription =
      callbackUrl.searchParams.get('error_description') || callbackParams.get('error_description');

    try {
      if (errorDescription) {
        authError.value = errorDescription;
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
      } else if (callbackParams.get('access_token')) {
        const { error } = await supabase.auth.setSession({
          access_token: callbackParams.get('access_token'),
          refresh_token: callbackParams.get('refresh_token') || '',
        });
        if (error) throw error;
      }
    } catch (error) {
      authError.value = error?.message || 'Unable to complete sign-in.';
    } finally {
      await Browser.close();
    }
  });
};

export const initAuth = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!supabase) {
      authLoading.value = false;
      return null;
    }

    authError.value = initialRedirectError;

    try {
      applySession(await getCurrentSession());
    } catch (error) {
      console.warn('[auth] Could not restore session:', error?.message || error);
    } finally {
      authLoading.value = false;
    }

    bindListener();
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
  };

  const signOutEverywhere = async () => {
    await signOutEverywhereService();
    applySession(null);
    isPasswordRecovery.value = false;
    authError.value = '';
  };

  const deleteAccount = async () => {
    await deleteAccountService();
    applySession(null);
    isPasswordRecovery.value = false;
    authError.value = '';
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
    initAuth,
    signOut,
    signOutEverywhere,
    deleteAccount,
    updateDisplayName,
    updateAvatar,
  };
};
