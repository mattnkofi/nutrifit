<template>
  <div
    class="pull-refresh"
    :class="{ pulling, refreshing, ready: isReady }"
    :style="rootStyle"
    role="status"
    aria-live="polite"
  >
    <div class="ptr-pill">
      <span class="ptr-ring" aria-hidden="true"></span>
      <span class="ptr-label">{{ label }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const THRESHOLD = 62;
const MAX_PULL = 128;

const distance = ref(0);
const tracking = ref(false);
const pulling = ref(false);
const refreshing = ref(false);

const state = {
  startX: 0,
  startY: 0,
  target: 0,
};

let frame = 0;

const isReady = computed(() => distance.value >= THRESHOLD - 0.5);

const label = computed(() => {
  if (refreshing.value) return 'Refreshing app…';
  if (isReady.value) return 'Release to refresh';
  return 'Pull to refresh';
});

const progress = computed(() => Math.min(1, distance.value / THRESHOLD));

const rootStyle = computed(() => {
  const value = distance.value;
  const shift = Math.round(value * 0.86 - 58);
  const fade = Math.min(1, value / 30);
  const scale = 0.9 + progress.value * 0.1;

  return {
    opacity: refreshing.value ? 1 : fade,
    transform: `translate(-50%, ${shift}px) scale(${scale})`,
    '--ptr-turn': `${progress.value * 220}deg`,
  };
});

// Frames are smoothed instead of jumping straight to the finger position,
// which keeps the pill fluid even when touch events arrive unevenly.
const animate = () => {
  frame = 0;
  const diff = state.target - distance.value;

  if (Math.abs(diff) < 0.2) {
    distance.value = state.target;
    return;
  }

  distance.value += diff * (refreshing.value ? 0.2 : 0.3);
  frame = requestAnimationFrame(animate);
};

const aim = (value, immediate = false) => {
  state.target = Math.max(0, value);

  if (immediate) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    distance.value = state.target;
    return;
  }

  if (!frame) frame = requestAnimationFrame(animate);
};

const rubberBand = (raw) => MAX_PULL * (1 - Math.exp(-raw / MAX_PULL));

const findScroller = () => {
  const pages = Array.from(document.querySelectorAll('.ion-page:not(.ion-page-hidden)'));
  for (let i = pages.length - 1; i >= 0; i -= 1) {
    const content = pages[i].querySelector('ion-content');
    if (!content) continue;
    const root = content.shadowRoot || content;
    return root.querySelector('.inner-scroll') || null;
  }
  return null;
};

const isBlocked = () => {
  return Boolean(
    document.querySelector(
      '.profile-modal-backdrop, .modal-backdrop, ion-modal.show-modal, .ion-modal, .cd-menu'
    )
  );
};

const atTop = () => {
  const scroller = findScroller();
  return !scroller || scroller.scrollTop <= 0;
};

const triggerRefresh = () => {
  if (refreshing.value) return;
  refreshing.value = true;
  pulling.value = false;
  aim(THRESHOLD + 22);

  try {
    navigator.vibrate?.(14);
  } catch {
    // Haptics are optional.
  }

  // Let the spinner complete a visible turn before reloading the whole app.
  window.setTimeout(() => {
    window.location.reload();
  }, 780);
};

const onTouchStart = (event) => {
  if (refreshing.value || event.touches.length !== 1) return;

  const target = event.target;
  if (
    target?.closest?.(
      'input, textarea, select, ion-range, ion-toggle, .crop-viewport, .crop-stage, .drag-handle, [data-no-pull]'
    )
  ) {
    return;
  }
  if (isBlocked() || !atTop()) return;

  state.startX = event.touches[0].clientX;
  state.startY = event.touches[0].clientY;
  tracking.value = true;
  pulling.value = false;
};

const onTouchMove = (event) => {
  if (!tracking.value || refreshing.value) return;

  const touch = event.touches[0];
  if (!touch) return;

  const dy = touch.clientY - state.startY;
  const dx = touch.clientX - state.startX;

  if (dy <= 0) {
    if (pulling.value) {
      pulling.value = false;
      aim(0);
    }
    tracking.value = false;
    return;
  }

  // Ignore horizontal swipes so carousels and sliders keep working.
  if (!pulling.value && Math.abs(dx) > dy) {
    tracking.value = false;
    return;
  }

  if (!atTop()) {
    tracking.value = false;
    pulling.value = false;
    aim(0);
    return;
  }

  if (dy > 6) {
    if (event.cancelable) event.preventDefault();
    pulling.value = true;
    aim(rubberBand(dy));
  }
};

const onTouchEnd = () => {
  if (!tracking.value) return;

  const wasPulling = pulling.value;
  tracking.value = false;
  pulling.value = false;

  if (!wasPulling) return;

  const reached = Math.max(state.target, distance.value) >= THRESHOLD;
  if (reached) {
    triggerRefresh();
  } else {
    aim(0);
  }
};

const onTouchCancel = () => {
  tracking.value = false;
  pulling.value = false;
  if (!refreshing.value) aim(0);
};

onMounted(() => {
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchCancel, { passive: true });
});

onUnmounted(() => {
  if (frame) cancelAnimationFrame(frame);
  window.removeEventListener('touchstart', onTouchStart);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
  window.removeEventListener('touchcancel', onTouchCancel);
});
</script>

<style scoped>
  .pull-refresh {
    position: fixed;
    left: 50%;
    top: calc(env(safe-area-inset-top, 0px) + 4.35rem);
    z-index: 960;
    pointer-events: none;
    opacity: 0;
    will-change: transform, opacity;
  }

  .ptr-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: rgba(var(--ion-background-color-rgb, 7, 7, 7), 0.9);
    color: var(--text);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(18px) saturate(1.2);
    -webkit-backdrop-filter: blur(18px) saturate(1.2);
    white-space: nowrap;
    transition:
      border-color 0.28s var(--ease),
      box-shadow 0.28s var(--ease),
      background-color 0.28s var(--ease);
  }

  .ptr-ring {
    width: 1.15rem;
    height: 1.15rem;
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.18);
    border-top-color: var(--white);
    border-radius: 50%;
    transform: rotate(var(--ptr-turn, 0deg));
    will-change: transform;
  }

  .pull-refresh.ready .ptr-pill {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(var(--ion-background-color-rgb, 7, 7, 7), 0.96);
    box-shadow: 0 18px 46px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .pull-refresh.ready .ptr-ring {
    border-top-color: var(--white);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.45);
  }

  .pull-refresh.refreshing .ptr-ring {
    animation: ptr-spin 0.7s linear infinite;
  }

  .pull-refresh.refreshing .ptr-pill {
    animation: ptr-breathe 1.7s var(--ease) infinite;
  }

  .ptr-label {
    font-size: 0.58rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  @keyframes ptr-spin {
    from {
      transform: rotate(var(--ptr-turn, 0deg));
    }
    to {
      transform: rotate(calc(var(--ptr-turn, 0deg) + 360deg));
    }
  }

  @keyframes ptr-breathe {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.025);
    }
  }
</style>
