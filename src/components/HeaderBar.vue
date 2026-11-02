<template>
  <ion-header class="app-header" :class="{ 'session-open': hasAnyModalOpen }" translucent>
    <ion-toolbar>
      <div class="header-shell">
        <button class="brand" type="button" @click="goTo('/dashboard')" aria-label="Go to dashboard">
          <img class="brand-mark" src="/nf-icon.png" alt="NutriFit logo" />
          <span class="brand-copy">
            <span class="brand-name">NutriFit</span>
            <span class="brand-sub">Fitness &amp; nutrition</span>
          </span>
        </button>

        <div class="header-spacer"></div>

        <div class="header-actions">
          <button
            v-if="isNative"
            class="header-refresh"
            :class="{ spinning: refreshing }"
            type="button"
            :disabled="refreshing"
            @click="refreshApp"
            aria-label="Refresh app"
            title="Refresh app"
          >
            <ion-icon :icon="refreshOutline" />
          </button>

          <button
            v-if="isAuthenticated"
            class="coach-btn"
            :class="{ active: isCoachOpen }"
            type="button"
            @click="toggleCoach"
            :aria-label="isCoachOpen ? 'Close AI coach' : 'Open AI coach'"
            :aria-pressed="isCoachOpen"
          >
            <span class="coach-icon">
              <ion-icon :icon="barbellSharp" />
              <i class="coach-ping" aria-hidden="true"></i>
            </span>
            <span class="coach-label">Ask Coach</span>
          </button>

          <button class="profile-pill" type="button" @click="goTo('/profile')">
            <span class="profile-copy">
              <strong>{{ displayName || 'Guest' }}</strong>
              <small>Member</small>
            </span>
            <span class="avatar">
              <img :src="avatarSrc" :alt="displayName || 'Member avatar'" />
            </span>
          </button>
        </div>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';
import { barbellSharp, refreshOutline } from 'ionicons/icons';
import { useCoach } from '../composables/useCoach';
import { useSession } from '../composables/useSession';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { isCoachOpen, toggleCoach } = useCoach();
const { hasAnyModalOpen } = useSession();
const { displayName, initials, avatarUrl, isAuthenticated } = useAuth();

const isNative = Capacitor.isNativePlatform();
const refreshing = ref(false);

const refreshApp = () => {
  if (refreshing.value) return;
  refreshing.value = true;
  // Give the icon one visible spin before reloading the whole web app.
  window.setTimeout(() => window.location.reload(), 280);
};

const avatarSrc = computed(() => {
  if (avatarUrl.value) return avatarUrl.value;
  const text = String(initials.value || 'NF').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#1c1c1c"/><text x="50" y="50" fill="#f5f5f5" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="500" text-anchor="middle" dominant-baseline="central">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});

const goTo = (path) => router.push(path);
</script>

<style scoped>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    --background: rgba(var(--ion-background-color-rgb, 5, 5, 5), 0.92);
    --border-color: transparent;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    z-index: 950;
    transition: transform 0.32s var(--ease-out), opacity 0.24s var(--ease);
  }

  .app-header.session-open {
    transform: translateY(-115%);
    opacity: 0;
    pointer-events: none;
  }

  .header-shell {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: clamp(0.8rem, 2vw, 2rem);
    width: 100%;
    padding: 0.9rem var(--page-x) 0.9rem;
    padding-top: calc(0.9rem + env(safe-area-inset-top, 0));
    border-bottom: 1px solid var(--line);
    min-height: 3.8rem;
  }

  .header-spacer {
    width: 100%;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: left;
  }

  .brand-mark {
    display: block;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    padding: 0;
    border-radius: 0.5rem;
    background: transparent;
    object-fit: contain;
    transition: transform 0.35s var(--ease);
  }

  .brand:hover .brand-mark {
    transform: rotate(-6deg);
    background: transparent;
  }

  .brand-copy {
    display: grid;
    gap: 0.05rem;
  }

  .brand-name {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1;
    text-transform: uppercase;
    color: var(--text);
  }

  .brand-sub {
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }



  .header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.7rem;
  }

  .coach-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.46rem;
    height: 2.5rem;
    padding: 0.24rem 0.82rem 0.24rem 0.24rem;
    border: 1px solid var(--line-strong);
    border-radius: 11px;
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--font-body);
    cursor: pointer;
    overflow: hidden;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    transition: color 0.35s var(--ease), border-color 0.35s var(--ease), transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease), background-color 0.35s var(--ease);
  }

  .coach-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, transparent 25%, rgba(255, 255, 255, 0.15) 45%, transparent 65%);
    transform: translateX(-130%);
    transition: transform 0.75s var(--ease-out);
    pointer-events: none;
  }

  .coach-btn:hover {
    border-color: var(--ion-color-primary);
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  }

  .coach-btn:hover::after {
    transform: translateX(130%);
  }

  .coach-btn:hover .coach-icon ion-icon {
    transform: rotate(10deg) scale(1.08);
  }

  .coach-icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex: 0 0 auto;
    border-radius: 7px;
    background: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
    font-size: 1rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  .coach-icon ion-icon {
    transition: transform 0.35s var(--ease-out);
  }

  .coach-ping {
    position: absolute;
    top: -1px;
    right: -1px;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #4ade80;
    border: 2px solid var(--surface);
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
    animation: coachPing 2.6s var(--ease) infinite;
  }

  .coach-label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .coach-btn.active {
    background: var(--ion-color-primary);
    border-color: var(--ion-color-primary);
    color: var(--ion-color-primary-contrast);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  }

  .coach-btn.active .coach-icon {
    background: var(--ion-color-primary-contrast);
    color: var(--ion-color-primary);
  }

  .coach-btn.active .coach-ping {
    border-color: var(--ion-color-primary);
  }

  .coach-btn.active .coach-icon ion-icon {
    animation: coachPump 2.4s var(--ease) infinite;
  }

  @keyframes coachPump {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-1px) scale(1.1); }
  }

  @keyframes coachPing {
    0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.45); }
    70% { box-shadow: 0 0 0 5px rgba(74, 222, 128, 0); }
  }

  .profile-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.24rem 0.24rem 0.24rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface);
    color: var(--text);
    text-align: left;
    transition: border-color 0.3s var(--ease), background-color 0.3s var(--ease);
  }

  .profile-pill:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }

  .profile-copy {
    display: grid;
    gap: 0.02rem;
  }

  .profile-copy strong {
    font-size: 0.6rem;
    font-weight: 500;
    line-height: 1.2;
  }

  .profile-copy small {
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .avatar {
    display: block;
    width: 1.7rem;
    height: 1.7rem;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
  }

  .avatar img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: none;
  }

  @media (min-width: 1024px) {
    .header-shell {
      grid-template-columns: auto 1fr auto;
      gap: clamp(1rem, 2.4vw, 2.4rem);
      padding: 1.5rem var(--page-x) 1.5rem;
      padding-top: calc(1.5rem + env(safe-area-inset-top, 0));
      min-height: 6rem;
    }

    .brand-mark {
      width: 2.6rem;
      height: 2.6rem;
      padding: 0.32rem;
      border-radius: 0.62rem;
    }

    .brand-name {
      font-size: 1.42rem;
    }

    .brand-sub {
      font-size: 0.52rem;
    }

    .header-actions {
      gap: 0.85rem;
    }

    .coach-btn {
      height: 2.8rem;
      padding: 0.28rem 1rem 0.28rem 0.28rem;
      gap: 0.55rem;
    }

    .coach-icon {
      width: 2.24rem;
      height: 2.24rem;
      font-size: 1.12rem;
    }

    .coach-label {
      font-size: 0.7rem;
    }

    .profile-pill {
      gap: 0.65rem;
      padding: 0.3rem 0.3rem 0.3rem 0.85rem;
      border-radius: 11px;
    }

    .profile-copy strong {
      font-size: 0.72rem;
    }

    .profile-copy small {
      font-size: 0.46rem;
    }

    .avatar {
      width: 2.15rem;
      height: 2.15rem;
    }
  }

  @media (min-width: 1280px) {
    .header-shell {
      padding: 1.7rem var(--page-x) 1.7rem;
      padding-top: calc(1.7rem + env(safe-area-inset-top, 0));
      min-height: 6.7rem;
    }

    .brand-mark {
      width: 2.95rem;
      height: 2.95rem;
      padding: 0.36rem;
    }

    .brand-name {
      font-size: 1.58rem;
    }

    .brand-sub {
      font-size: 0.57rem;
    }

    .coach-btn {
      height: 3.05rem;
      padding: 0.3rem 1.1rem 0.3rem 0.3rem;
    }

    .coach-icon {
      width: 2.45rem;
      height: 2.45rem;
      font-size: 1.22rem;
    }

    .coach-label {
      font-size: 0.76rem;
    }

    .profile-pill {
      padding: 0.34rem 0.34rem 0.34rem 0.95rem;
    }

    .profile-copy strong {
      font-size: 0.8rem;
    }

    .profile-copy small {
      font-size: 0.5rem;
    }

    .avatar {
      width: 2.35rem;
      height: 2.35rem;
    }
  }

  @media (max-width: 640px) {
    .header-shell {
      padding: 0.7rem var(--page-x) 0.7rem;
      padding-top: calc(0.7rem + env(safe-area-inset-top, 0));
      min-height: 3.6rem;
    }

    .brand-sub,
    .profile-copy {
      display: none;
    }

    .profile-pill {
      padding: 0.25rem;
    }

    .coach-btn {
      width: 2.5rem;
      padding: 0.24rem;
    }

    .coach-label {
      display: none;
    }
  }
</style>
