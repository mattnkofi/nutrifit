<template>
  <ion-page class="callback-page">
    <main class="callback-card">
      <img class="callback-mark" :src="nfIconMark" alt="NutriFit logo" />
      <span class="callback-kicker">{{ kicker }}</span>
      <h1>{{ title }}</h1>
      <p>{{ body }}</p>

      <a v-if="appUrl" class="callback-button" :href="appUrl">
        Open NutriFit
      </a>

      <p v-if="appUrl" class="callback-hint">
        If nothing happens, open the NutriFit app on this phone and sign in.
      </p>

      <router-link class="callback-link" to="/auth">
        Continue on the web
      </router-link>
    </main>
  </ion-page>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { IonPage } from '@ionic/vue';
import nfIconMark from '../assets/nf-icon-mark.png';

// This page is the HTTPS landing point for links sent to the native app
// (email confirmation, password recovery, Google sign-in). It must not let
// supabase-js exchange the one-time code here, because the PKCE verifier lives
// in the app's WebView. Instead it forwards the parameters to the custom
// scheme, which launches the app and completes the exchange there.
const search = typeof window !== 'undefined' ? window.location.search || '' : '';
const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
const params = new URLSearchParams(search);
const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
const error = params.get('error') || hashParams.get('error');
const errorDescription =
  params.get('error_description') || hashParams.get('error_description') || error;

const appUrl = computed(() => {
  if (error) return '';
  if (!search && !hash) return '';
  return `com.nutrifit.app://auth${search}${hash}`;
});

const kicker = computed(() => (error ? 'Something went wrong' : 'Almost there'));
const title = computed(() =>
  error ? 'We could not finish that link.' : 'Your link is ready.'
);
const body = computed(() => {
  if (error) return String(errorDescription || 'The link is invalid or has expired. Request a new one from the app.');
  return 'Opening NutriFit so we can finish signing you in.';
});

onMounted(() => {
  if (!appUrl.value) return;
  // Give the page a moment to paint before handing off to the app, so the
  // user never sees a blank screen if the custom scheme is slow to resolve.
  window.setTimeout(() => {
    window.location.href = appUrl.value;
  }, 900);
});
</script>

<style scoped>
  .callback-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 1.5rem var(--page-x);
    background: radial-gradient(circle at 50% 10%, #1b1b1b 0%, #0a0a0a 55%, #050505 100%);
    color: #f5f5f5;
  }

  .callback-card {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
    width: min(420px, 100%);
    margin: 0 auto;
    padding: 2rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    text-align: center;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  }

  .callback-mark {
    width: 3.25rem;
    height: 3.25rem;
    object-fit: contain;
  }

  .callback-kicker {
    color: #9a9a9a;
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-family: var(--font-display, 'Oswald', sans-serif);
    font-size: clamp(1.5rem, 5vw, 2rem);
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  p {
    margin: 0;
    max-width: 34ch;
    color: #b5b5b5;
    font-size: 0.82rem;
    line-height: 1.65;
  }

  .callback-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 0.6rem;
    background: #ffffff;
    color: #0a0a0a;
    font-family: var(--font-display, 'Oswald', sans-serif);
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .callback-hint {
    color: #8a8a8a;
    font-size: 0.68rem;
  }

  .callback-link {
    margin-top: 0.35rem;
    color: #8a8a8a;
    font-size: 0.68rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
