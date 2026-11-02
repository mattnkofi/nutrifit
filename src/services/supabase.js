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
        flowType: 'pkce',
        detectSessionInUrl: !isNative && !isAuthCallbackPage,
      },
    })
  : null;

export default supabase;
