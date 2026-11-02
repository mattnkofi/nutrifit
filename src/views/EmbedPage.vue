<template>
  <main class="embed-shell">
    <iframe
      v-if="youtubeUrl"
      :src="youtubeUrl"
      :title="`YouTube video ${videoId}`"
      frameborder="0"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
      allowfullscreen
      webkitallowfullscreen
      mozallowfullscreen
    ></iframe>
    <p v-else class="embed-error">This video link is not valid.</p>
  </main>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// This page is only ever loaded inside the native app's video player. It is
// hosted on the public HTTPS origin so YouTube receives a valid Referer
// instead of the WebView's https://localhost origin (which triggers Error
// 153). The player itself still runs inside the app's WebView.
const route = useRoute();

const videoId = computed(() => {
  const raw = String(route.params.videoId || '');
  return /^[A-Za-z0-9_-]{6,20}$/.test(raw) ? raw : '';
});

const youtubeUrl = computed(() => {
  if (!videoId.value) return '';

  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    modestbranding: '1',
    rel: '0',
    origin: window.location.origin,
    enablejsapi: '1',
  });

  return `https://www.youtube.com/embed/${videoId.value}?${params.toString()}`;
});
</script>

<style scoped>
  .embed-shell {
    position: fixed;
    inset: 0;
    margin: 0;
    padding: 0;
    background: #000;
    overflow: hidden;
  }

  .embed-shell iframe {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .embed-error {
    display: grid;
    place-items: center;
    height: 100%;
    margin: 0;
    color: #b5b5b5;
    font-size: 0.85rem;
  }
</style>
