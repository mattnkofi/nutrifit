<template>
  <nav class="bottom-nav" :class="{ 'coach-open': isCoachOpen, 'session-open': hasAnyModalOpen }" aria-label="Primary navigation">
    <div class="tab-bar" ref="tabBarRef">
      <span
        class="nav-indicator"
        :class="{ ready: indicatorReady }"
        :style="indicatorStyle"
        aria-hidden="true"
      ></span>
      <button
        v-for="(item, index) in items"
        :key="item.name"
        :ref="(el) => setTabRef(el, index)"
        class="tab-btn"
        :class="{ active: isActive(item) }"
        type="button"
        :aria-label="item.label"
        :aria-current="isActive(item) ? 'page' : undefined"
        @click="goTo(item.path)"
      >
        <ion-icon :icon="item.icon" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCoach } from '../composables/useCoach';
import { useSession } from '../composables/useSession';
import { primaryNavItems } from '../config/navigation';

const router = useRouter();
const route = useRoute();
const { isCoachOpen } = useCoach();
const { hasAnyModalOpen } = useSession();

const items = primaryNavItems;

const tabBarRef = ref(null);
const tabRefs = ref([]);
const indicatorStyle = ref({});
const indicatorReady = ref(false);

let resizeObserver = null;

const routeName = () => (Array.isArray(route.name) ? route.name[0] : route.name);
const isActive = (item) => {
  const name = routeName();
  return name === item.name || (item.aliases || []).includes(name);
};

const setTabRef = (el, index) => {
  if (el) tabRefs.value[index] = el;
};

const remSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

// The pill grows a little past the icon so the selected tab still feels
// "expanded", without changing the tab layout (which would make the pill
// jump instead of slide).
const indicatorPadding = () => {
  const rem = remSize();
  if (window.innerWidth >= 1280) return { x: 0, y: rem * 0.8 };
  if (window.innerWidth >= 1024) return { x: 0, y: rem * 0.6 };
  return { x: rem * 1, y: 0 };
};

const measureIndicator = async () => {
  await nextTick();
  const bar = tabBarRef.value;
  if (!bar) return;

  const index = items.findIndex(isActive);
  const el = tabRefs.value[index];
  if (index < 0 || !el) {
    indicatorReady.value = false;
    return;
  }

  const barRect = bar.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const pad = indicatorPadding();

  indicatorStyle.value = {
    width: `${rect.width + pad.x}px`,
    height: `${rect.height + pad.y}px`,
    transform: `translate3d(${rect.left - barRect.left - pad.x / 2}px, ${
      rect.top - barRect.top - pad.y / 2
    }px, 0)`,
  };

  if (!indicatorReady.value) {
    // Paint the pill at its resting spot first, otherwise it animates in
    // from the top-left corner on the very first page load.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }
  indicatorReady.value = true;
};

watch(() => route.name, measureIndicator, { flush: 'post' });

onMounted(() => {
  measureIndicator();
  window.addEventListener('resize', measureIndicator);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => measureIndicator());
    if (tabBarRef.value) resizeObserver.observe(tabBarRef.value);
  }

  // Fonts and responsive padding can land after the first paint.
  window.setTimeout(measureIndicator, 260);
});

onUnmounted(() => {
  window.removeEventListener('resize', measureIndicator);
  resizeObserver?.disconnect();
});

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
    background: rgba(var(--ion-background-color-rgb, 7, 7, 7), 0.88);
    backdrop-filter: blur(26px) saturate(1.18);
    -webkit-backdrop-filter: blur(26px) saturate(1.18);
    border-top: 1px solid var(--line-strong);
    display: block;
    padding-bottom: calc(env(safe-area-inset-bottom, 0) + 1px);
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    isolation: isolate;
    transition: transform 0.32s var(--ease-out), opacity 0.24s var(--ease);
  }

  .tab-bar {
    position: relative;
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

  /* The highlight is its own layer so it can glide between tabs. */
  .nav-indicator {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 0;
    border-radius: 0.8rem;
    background: var(--ion-color-primary);
    box-shadow: 0 12px 30px rgba(255, 255, 255, 0.2);
    pointer-events: none;
    opacity: 0;
    will-change: transform, width, height;
    transition:
      transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.38s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.38s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.38s var(--ease-out),
      opacity 0.2s var(--ease);
  }

  .nav-indicator.ready {
    opacity: 1;
  }

  .nav-indicator:not(.ready) {
    transition: none;
  }

  .tab-btn {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 0.6rem;
    background: transparent;
    color: var(--muted);
    transition:
      color 0.28s var(--ease),
      transform 0.28s var(--ease-out);
    width: 2.6rem;
    height: 2.6rem;
    font-size: 1.25rem;
    flex: 0 0 auto;
  }

  .tab-btn:hover {
    color: var(--text);
  }

  .tab-btn.active {
    color: var(--ion-color-primary-contrast);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.8rem;
    transform: scale(1);
  }

  .tab-btn.active:hover {
    color: var(--ion-color-primary-contrast);
  }

  .tab-btn:active {
    transform: scale(0.9);
  }

  ion-icon {
    font-size: inherit;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .tab-btn.active ion-icon {
    transform: scale(1.1);
  }

  .tab-btn:active ion-icon {
    transform: scale(0.9);
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
    /* Desktop uses the docked nav inside HeaderBar instead of this bar. */
    .bottom-nav {
      display: none;
    }
  }
</style>
