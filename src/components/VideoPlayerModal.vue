<template>
  <transition name="player-fade">
    <div
      v-if="isOpen && displayVideo"
      class="vp-backdrop"
      @click="close"
    >
      <div
        class="vp-card"
        role="dialog"
        aria-modal="true"
        :aria-label="displayVideo.title || 'Video player'"
        @click.stop
      >
        <header class="vp-head">
          <div class="vp-meta">
            <span class="vp-kicker">Now playing</span>
            <h2 class="vp-title">{{ displayVideo.title }}</h2>
            <p v-if="displayVideo.channel" class="vp-channel">{{ displayVideo.channel }}</p>
          </div>
          <button ref="closeButton" class="vp-close" type="button" aria-label="Close video player" @click="close">
            <ion-icon :icon="closeOutline" />
          </button>
        </header>

        <div class="vp-frame">
          <iframe
            :src="embedUrl"
            :title="displayVideo.title || 'YouTube video'"
            frameborder="0"
            referrerpolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            webkitallowfullscreen
            mozallowfullscreen
          ></iframe>
        </div>

        <footer class="vp-foot">
          <a class="vp-link" :href="watchUrl" target="_blank" rel="noopener">
            Open in YouTube <ion-icon :icon="openOutline" />
          </a>
          <span class="vp-note">Press Esc to close</span>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { closeOutline, openOutline } from 'ionicons/icons';
import { getEmbedUrl, getWatchUrl } from '../services/youtube';

const props = defineProps({
  isOpen: Boolean,
  video: { type: Object, default: null },
});

const emit = defineEmits(['close']);

// Kept separate from props.video so the player doesn't blank out mid-exit
// when the parent clears its active video at the same time it closes us.
const displayVideo = ref(null);
const closeButton = ref(null);
let lastFocused = null;

const embedUrl = computed(() => (displayVideo.value?.id ? getEmbedUrl(displayVideo.value.id) : ''));
const watchUrl = computed(() => {
  if (displayVideo.value?.watchUrl) return displayVideo.value.watchUrl;
  return displayVideo.value?.id ? getWatchUrl(displayVideo.value.id) : 'https://www.youtube.com';
});

const close = () => emit('close');

const onKeydown = (event) => {
  if (event.key !== 'Escape' || !props.isOpen) return;
  // Capture phase so Ionic's modal Escape handler doesn't also dismiss the
  // exercise detail modal underneath.
  event.preventDefault();
  event.stopPropagation();
  close();
};

onMounted(() => window.addEventListener('keydown', onKeydown, true));

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true));

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      lastFocused = document.activeElement;
      if (props.video) displayVideo.value = props.video;
      await nextTick();
      closeButton.value?.focus();
      return;
    }

    lastFocused?.focus?.();
    lastFocused = null;
  },
  { immediate: true }
);
</script>

<style scoped>
  .vp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483670;
    display: grid;
    place-items: center;
    padding: clamp(0.75rem, 3vw, 2rem);
    background: rgba(3, 3, 3, 0.94);
  }

  .vp-card {
    width: min(960px, 100%);
    max-height: 92vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    border: 1px solid var(--line-strong);
    border-radius: 1.25rem;
    background: #0b0b0d;
    box-shadow: 0 30px 90px rgba(0, 0, 0, 0.9);
    will-change: transform, opacity;
  }

  .vp-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .vp-kicker {
    color: var(--dim);
    font-size: 0.55rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .vp-title {
    margin: 0.2rem 0 0;
    color: var(--white);
    font-family: var(--font-display);
    font-size: clamp(0.95rem, 2.2vw, 1.2rem);
    font-weight: 600;
    line-height: 1.25;
  }

  .vp-channel {
    margin: 0.15rem 0 0;
    color: var(--muted);
    font-size: 0.68rem;
  }

  .vp-close {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text);
    font-size: 1.05rem;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .vp-close:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .vp-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 0.9rem;
    background: #000;
  }

  .vp-frame iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .vp-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .vp-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-soft);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.2s ease;
  }

  .vp-link:hover {
    color: var(--white);
  }

  .vp-note {
    color: var(--dim);
    font-size: 0.58rem;
    letter-spacing: 0.04em;
  }

  .player-fade-enter-active {
    transition: opacity 0.28s var(--ease-out);
  }

  .player-fade-leave-active {
    transition: opacity 0.2s var(--ease);
  }

  .player-fade-enter-from,
  .player-fade-leave-to {
    opacity: 0;
  }

  .player-fade-enter-active .vp-card {
    transition: transform 0.28s var(--ease-out), opacity 0.22s var(--ease-out);
  }

  .player-fade-leave-active .vp-card {
    transition: transform 0.2s var(--ease), opacity 0.16s var(--ease);
  }

  .player-fade-enter-from .vp-card {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.97);
  }

  .player-fade-leave-to .vp-card {
    opacity: 0;
    transform: translate3d(0, 6px, 0) scale(0.985);
  }

  @media (max-width: 767px) {
    .vp-backdrop {
      padding: 0.6rem;
    }

    .vp-card {
      gap: 0.7rem;
      padding: 0.75rem;
      border-radius: 1rem;
    }

    .vp-frame {
      border-radius: 0.75rem;
    }

    .vp-note {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .player-fade-enter-active,
    .player-fade-leave-active,
    .player-fade-enter-active .vp-card,
    .player-fade-leave-active .vp-card {
      transition-duration: 0.01ms;
    }

    .player-fade-enter-from .vp-card,
    .player-fade-leave-to .vp-card {
      transform: none;
    }
  }
</style>
