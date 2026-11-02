import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isNative = Capacitor.isNativePlatform();

// The web callback page forwards the one-time code to the app instead of
// exchanging it itself. Native auth comes back through the App plugin's
// deep-link listener. In both cases supabase-js must not consume the code
// before our code gets a chance to hand it over.
const isAuthCallbackPage =
  typeof window !== 'undefined' && /^\/auth\/callback\/?$/.test(window.location.pathname);

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // On the web PKCE keeps the one-time code bound to this browser.
        // In the native app the auth flow runs in a Custom Tab (a different
        // browser context), so the PKCE verifier stored in the WebView cannot
        // be used reliably. The native app therefore uses the implicit flow
        // and receives the session tokens through the app deep link, which is
        // then applied with setSession().
        flowType: isNative ? 'implicit' : 'pkce',
        detectSessionInUrl: !isNative && !isAuthCallbackPage,
      },
    })
  : null;

export default supabase;
