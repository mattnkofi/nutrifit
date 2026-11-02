<template>
  <ion-app>
    <!-- Cinematic Intro & Loading Screen (Plays Every Time App Opens) -->
    <div v-if="isLoading && !skipIntro" class="app-intro-loader" :class="{ 'fade-out': isFadingOut }" aria-live="polite">
      <div class="intro-backdrop-glow"></div>
      <div class="intro-content">
        <div class="intro-logo-card">
          <div class="intro-ring ring-1"></div>
          <div class="intro-ring ring-2"></div>
          <div class="intro-ring ring-3"></div>
          <img class="intro-logo" src="/nf-icon.png" alt="NutriFit logo" />
        </div>
        <div class="intro-text-group">
          <h1 class="intro-title">NUTRIFIT</h1>
          <p class="intro-subtitle">Elite Fitness & Nutrition AI</p>
        </div>
        <div class="intro-progress-bar">
          <div class="intro-progress-fill"></div>
        </div>
      </div>
    </div>
    <template v-else>
      <HeaderBar v-if="showHeader" />
      <ion-router-outlet />
      <BottomNav v-if="showNav" />
      <AIChatbot v-if="isAuthenticated" />
    </template>
  </ion-app>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useRoute, useRouter } from 'vue-router';
import BottomNav from './components/BottomNav.vue';
import HeaderBar from './components/HeaderBar.vue';
import AIChatbot from './components/ai/AIChatbot.vue';
import { useAuth } from './composables/useAuth';

const isLoading = ref(true);
const isFadingOut = ref(false);
const route = useRoute();
const router = useRouter();
const { authError, isAuthenticated, isPasswordRecovery, postAuthRedirect } = useAuth();

const routeName = computed(() => {
  const name = route.name;
  if (Array.isArray(name)) return name[0];
  return name;
});

const isEmbedRoute = computed(() => routeName.value === 'embed');

// The auth callback and embed screens must paint immediately: the callback
// forwards into the app after a short delay, and the embed page is an iframe.
const skipIntro = computed(() => isEmbedRoute.value || routeName.value === 'auth-callback');

onMounted(() => {
  if (skipIntro.value) {
    isLoading.value = false;
    return;
  }

  // Play cinematic intro animation every time app opens
  window.setTimeout(() => {
    isFadingOut.value = true;
    window.setTimeout(() => {
      isLoading.value = false;
    }, 450);
  }, 1300);
});

// Original: hidden on landing, auth and embed routes, shown on authenticated tabs
const showNav = computed(
  () => !['landing', 'auth', 'auth-callback', 'embed'].includes(routeName.value)
);

// The auth, callback and embed screens have their own full-height layouts, so
// the global header is hidden there.
const showHeader = computed(
  () => !['auth', 'auth-callback', 'embed'].includes(routeName.value)
);

// A deep link (email confirmation or Google sign-in) can complete while the app
// is sitting on the landing page. Move the user into the app as soon as the
// session appears, and send recovery links to the password form. `immediate`
// matters on a cold start: the link is handled before this component mounts.
watch(
  [isAuthenticated, isPasswordRecovery, postAuthRedirect, authError],
  ([authenticated, recovery, shouldRedirect, error]) => {
    if (recovery) {
      if (routeName.value !== 'auth') router.replace('/auth');
      return;
    }

    if (authenticated && shouldRedirect) {
      postAuthRedirect.value = false;
      if (routeName.value !== 'dashboard') router.replace('/dashboard');
      return;
    }

    if (error && routeName.value !== 'auth' && routeName.value !== 'auth-callback') {
      router.replace('/auth');
    }
  },
  { immediate: true }
);
</script>

<style scoped>
  :deep(ion-router-outlet) {
    display: block;
    padding-bottom: calc(3.6rem + env(safe-area-inset-bottom, 0));
  }

  @media (min-width: 1024px) {
    :deep(ion-router-outlet) {
      --padding-bottom: 2rem;
    }
  }

  /* Cinematic Intro & Loading Screen Styles */
  .app-intro-loader {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at center, #1c1c1c 0%, #0a0a0a 55%, #050505 100%);
    color: #ffffff;
    opacity: 1;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .app-intro-loader.fade-out {
    opacity: 0;
    transform: scale(1.04);
    pointer-events: none;
  }

  .intro-backdrop-glow {
    position: absolute;
    width: 28rem;
    height: 28rem;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.035) 50%, transparent 70%);
    border-radius: 50%;
    animation: pulseGlow 2.4s ease-in-out infinite;
    pointer-events: none;
  }

  .intro-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.8rem;
    z-index: 2;
  }

  .intro-logo-card {
    position: relative;
    display: grid;
    place-items: center;
    width: 6.2rem;
    height: 6.2rem;
    animation: floatLogo 2s ease-in-out infinite;
  }

  .intro-ring {
    position: absolute;
    inset: -0.6rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: spinRing 3s linear infinite;
  }

  .intro-ring.ring-2 {
    inset: -1.3rem;
    border-color: rgba(255, 255, 255, 0.05);
    animation-duration: 5s;
    animation-direction: reverse;
  }

  .intro-ring.ring-3 {
    inset: -2rem;
    border-top-color: #ffffff;
    border-right-color: transparent;
    border-bottom-color: transparent;
    border-left-color: transparent;
    animation-duration: 1.5s;
  }

  .intro-logo {
    width: 4.2rem;
    height: 4.2rem;
    padding: 0;
    border-radius: 1rem;
    background: transparent;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 255, 255, 0.2);
    object-fit: contain;
    animation: popIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .intro-text-group {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    animation: fadeInUp 0.8s ease 0.2s both;
  }

  .intro-title {
    margin: 0;
    font-family: 'Oswald', sans-serif;
    font-size: 2.1rem;
    font-weight: 700;
    letter-spacing: 0.32em;
    color: #ffffff;
  }

  .intro-subtitle {
    margin: 0;
    color: #888888;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.28em;
    text-transform: uppercase;
  }

  .intro-progress-bar {
    width: 10rem;
    height: 2px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 0.5rem;
    animation: fadeIn 0.8s ease 0.4s both;
  }

  .intro-progress-fill {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #ffffff, transparent);
    animation: loadSweep 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes pulseGlow {
    0%, 100% { transform: scale(0.95); opacity: 0.6; }
    50% { transform: scale(1.08); opacity: 1; }
  }

  @keyframes floatLogo {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  @keyframes spinRing {
    to { transform: rotate(360deg); }
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes loadSweep {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
</style>
