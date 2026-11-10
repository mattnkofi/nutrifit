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

        <div class="header-center">
          <nav
            v-if="isAuthenticated"
            ref="navRef"
            class="desktop-nav"
            aria-label="Primary navigation"
          >
            <span
              class="desktop-nav-indicator"
              :class="{ ready: indicatorReady }"
              :style="indicatorStyle"
              aria-hidden="true"
            ></span>
            <RouterLink
              v-for="(item, index) in navItems"
              :key="item.name"
              :ref="(el) => setNavRef(el, index)"
              :to="item.path"
              class="desktop-nav-link"
              :class="{ active: isActive(item) }"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <ion-icon :icon="item.icon" />
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>

        <div class="header-actions">
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { barbellSharp } from 'ionicons/icons';
import { useCoach } from '../composables/useCoach';
import { useSession } from '../composables/useSession';
import { useAuth } from '../composables/useAuth';
import { primaryNavItems } from '../config/navigation';

const router = useRouter();
const route = useRoute();
const { isCoachOpen, toggleCoach } = useCoach();
const { hasAnyModalOpen } = useSession();
const { displayName, initials, avatarUrl, isAuthenticated } = useAuth();

const navItems = primaryNavItems;
const navRef = ref(null);
const navRefs = ref([]);
const indicatorStyle = ref({});
const indicatorReady = ref(false);

let resizeObserver = null;

const routeName = () => {
  const name = route.name;
  return Array.isArray(name) ? name[0] : name;
};

const isActive = (item) => {
  const name = routeName();
  return name === item.name || (item.aliases || []).includes(name);
};

const setNavRef = (el, index) => {
  if (el) navRefs.value[index] = el;
};

// Keep the highlight glued to the active link across route changes and
// viewport resizes. The nav is display:none on smaller screens, so bail out
// before measuring (a hidden element reports a zero-sized rect).
const measureIndicator = async () => {
  await nextTick();
  const nav = navRef.value;
  if (!nav || nav.offsetParent === null) {
    indicatorReady.value = false;
    return;
  }

  const index = navItems.findIndex(isActive);
  const target = navRefs.value[index];
  // RouterLink is a component, so its ref exposes the instance (with $el)
  // rather than the anchor element itself.
  const el = target?.$el || target;
  if (index < 0 || !el?.getBoundingClientRect) {
    indicatorReady.value = false;
    return;
  }

  const navRect = nav.getBoundingClientRect();
  const rect = el.getBoundingClientRect();

  indicatorStyle.value = {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: `translate3d(${rect.left - navRect.left - nav.clientLeft}px, ${
      rect.top - navRect.top - nav.clientTop
    }px, 0)`,
  };

  if (!indicatorReady.value) {
    // Paint the pill at rest first so it does not fly in from the corner.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }
  indicatorReady.value = true;
};

watch(
  () => [route.name, isAuthenticated.value],
  measureIndicator,
  { flush: 'post' }
);

onMounted(() => {
  measureIndicator();
  window.addEventListener('resize', measureIndicator);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => measureIndicator());
    if (navRef.value) resizeObserver.observe(navRef.value);
  }

  window.setTimeout(measureIndicator, 260);
});

onUnmounted(() => {
  window.removeEventListener('resize', measureIndicator);
  resizeObserver?.disconnect();
});

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

  .header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
  }

  /* ------------------------------------------------------- Desktop nav */

  .desktop-nav {
    position: relative;
    display: none;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.025);
  }

  .desktop-nav-indicator {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 0;
    border-radius: 999px;
    background: var(--ion-color-primary);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.32);
    pointer-events: none;
    opacity: 0;
    will-change: transform, width;
    transition:
      transform 0.48s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.36s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.2s var(--ease);
  }

  .desktop-nav-indicator.ready {
    opacity: 1;
  }

  .desktop-nav-indicator:not(.ready) {
    transition: none;
  }

  .desktop-nav-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    height: 2.5rem;
    padding: 0 0.88rem;
    border-radius: 999px;
    color: var(--muted);
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
    transition: color 0.28s var(--ease);
  }

  .desktop-nav-link ion-icon {
    font-size: 1rem;
  }

  .desktop-nav-link:hover {
    color: var(--text);
  }

  .desktop-nav-link.active,
  .desktop-nav-link.active:hover {
    color: var(--ion-color-primary-contrast);
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
    .desktop-nav {
      display: inline-flex;
    }

    .desktop-nav-link span {
      display: none;
    }

    .header-shell {
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: clamp(1rem, 2vw, 2rem);
      padding: 0.95rem var(--page-x) 0.95rem;
      padding-top: calc(0.95rem + env(safe-area-inset-top, 0));
      min-height: 4.9rem;
    }

    .brand-mark {
      width: 2.5rem;
      height: 2.5rem;
      padding: 0.28rem;
      border-radius: 0.6rem;
    }

    .brand-name {
      font-size: 1.28rem;
    }

    .brand-sub {
      font-size: 0.5rem;
    }

    .header-actions {
      gap: 0.8rem;
    }

    .coach-btn {
      height: 2.7rem;
      padding: 0.26rem 0.95rem 0.26rem 0.26rem;
      gap: 0.5rem;
    }

    .coach-icon {
      width: 2.15rem;
      height: 2.15rem;
      font-size: 1.05rem;
    }

    .coach-label {
      font-size: 0.66rem;
    }

    .profile-pill {
      gap: 0.6rem;
      padding: 0.28rem 0.28rem 0.28rem 0.8rem;
      border-radius: 10px;
    }

    .profile-copy strong {
      font-size: 0.7rem;
    }

    .profile-copy small {
      font-size: 0.44rem;
    }

    .avatar {
      width: 2.05rem;
      height: 2.05rem;
    }
  }

  @media (min-width: 1180px) {
    .desktop-nav-link span {
      display: inline;
    }
  }

  @media (min-width: 1280px) {
    .header-shell {
      padding: 1.05rem var(--page-x) 1.05rem;
      padding-top: calc(1.05rem + env(safe-area-inset-top, 0));
      min-height: 5.15rem;
    }

    .brand-mark {
      width: 2.7rem;
      height: 2.7rem;
      padding: 0.3rem;
    }

    .brand-name {
      font-size: 1.4rem;
    }

    .brand-sub {
      font-size: 0.54rem;
    }

    .coach-btn {
      height: 2.85rem;
      padding: 0.28rem 1rem 0.28rem 0.28rem;
    }

    .coach-icon {
      width: 2.28rem;
      height: 2.28rem;
      font-size: 1.1rem;
    }

    .coach-label {
      font-size: 0.7rem;
    }

    .profile-pill {
      padding: 0.3rem 0.3rem 0.3rem 0.88rem;
    }

    .profile-copy strong {
      font-size: 0.75rem;
    }

    .profile-copy small {
      font-size: 0.46rem;
    }

    .avatar {
      width: 2.2rem;
      height: 2.2rem;
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
