<template>
  <nav class="bottom-nav" :class="{ 'coach-open': isCoachOpen, 'session-open': hasAnyModalOpen }" aria-label="Primary navigation">
    <div class="tab-bar">
      <button
        v-for="item in items"
        :key="item.name"
        class="tab-btn"
        :class="{ active: route.name === item.name }"
        type="button"
        :aria-label="item.label"
        @click="goTo(item.path)"
      >
        <ion-icon :icon="item.icon" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import {
  homeOutline,
  barbellOutline,
  cameraOutline,
  calendarOutline,
  personOutline,
} from 'ionicons/icons';
import { useCoach } from '../composables/useCoach';
import { useSession } from '../composables/useSession';

const router = useRouter();
const route = useRoute();
const { isCoachOpen } = useCoach();
const { hasAnyModalOpen } = useSession();

const items = [
  { name: 'dashboard', label: 'Home', icon: homeOutline, path: '/dashboard' },
  { name: 'workouts', label: 'Workouts', icon: barbellOutline, path: '/workouts' },
  { name: 'scanner', label: 'Scan', icon: cameraOutline, path: '/scanner' },
  { name: 'planner', label: 'Planner', icon: calendarOutline, path: '/planner' },
  { name: 'profile', label: 'Profile', icon: personOutline, path: '/profile' },
];

const goTo = (path) => {
  router.push(path).catch(() => {});
};
</script>

<style scoped>
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    width: 100%;
    background: rgba(7, 7, 7, 0.72);
    backdrop-filter: blur(26px) saturate(1.18);
    -webkit-backdrop-filter: blur(26px) saturate(1.18);
    border-top: 1px solid rgba(255, 255, 255, 0.16);
    display: block;
    padding-bottom: calc(env(safe-area-inset-bottom, 0) + 1px);
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    isolation: isolate;
    transition: transform 0.32s var(--ease-out), opacity 0.24s var(--ease);
  }

  .tab-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0;
    padding: 0.25rem max(var(--page-x), 1rem) 0.3rem;
    height: 3.4rem;
    background: transparent;
    max-width: 100%;
    margin: 0 auto;
  }

  .tab-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.1rem;
    padding: 0.25rem max(var(--page-x), 1rem) 0.3rem;
    height: 3.4rem;
    background: transparent;
    max-width: 100%;
    margin: 0 auto;
    transition: all 0.25s ease;
  }

  .tab-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 0.6rem;
    background: transparent;
    color: var(--muted);
    transition:
      color 0.25s ease,
      background-color 0.25s ease,
      border-color 0.25s ease,
      transform 0.25s ease,
      width 0.25s ease,
      padding 0.25s ease;
    width: 2.6rem;
    height: 2.6rem;
    font-size: 1.25rem;
    flex: 0 0 auto;
  }

  .tab-btn:hover {
    color: var(--white);
  }

  .tab-btn.active {
    color: var(--white);
    background: rgba(255, 255, 255, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.32);
    border-radius: 0.8rem;
    transform: scale(1);
    padding: 0 0.4rem;
    width: 3.6rem;
    height: 2.6rem;
  }

  .tab-btn:active {
    transform: scale(0.92);
  }

  ion-icon {
    font-size: inherit;
  }

  .bottom-nav.session-open {
    transform: translateY(115%);
    opacity: 0;
    pointer-events: none;
  }

  @media (max-width: 1023px) {
    .bottom-nav.coach-open {
      transform: translateY(115%);
      opacity: 0;
      pointer-events: none;
    }
  }

  @media (min-width: 1024px) {
    .bottom-nav {
      left: auto;
      right: 2rem;
      top: 50%;
      bottom: auto;
      transform: translateY(-50%);
      width: auto;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(7, 7, 7, 0.6);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      padding-bottom: 0;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
    }

    .tab-bar {
      flex-direction: column;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.6rem 0.5rem;
      height: auto;
      max-width: none;
    }

    .tab-btn {
      width: 3.6rem;
      height: 3.6rem;
      font-size: 1.7rem;
      transition:
        color 0.25s ease,
        background-color 0.25s ease,
        border-color 0.25s ease,
        transform 0.25s ease,
        height 0.25s ease,
        padding 0.25s ease;
    }

    .tab-btn.active {
      border-radius: 999px;
      height: 4.2rem;
      padding: 0.4rem 0;
    }
  }

  @media (min-width: 1280px) {
    .bottom-nav {
      right: 2.5rem;
    }

    .tab-bar {
      gap: 0.5rem;
      padding: 0.8rem 0.6rem;
    }

    .tab-btn {
      width: 4rem;
      height: 4rem;
      font-size: 1.9rem;
    }

    .tab-btn.active {
      height: 4.8rem;
      padding: 0.6rem 0;
    }
  }
</style>