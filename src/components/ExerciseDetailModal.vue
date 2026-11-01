<template>
  <ion-modal
    :is-open="isOpen"
    :enter-animation="modalEnterAnimation"
    :leave-animation="modalLeaveAnimation"
    @did-dismiss="close"
    class="exercise-modal"
  >
    <ion-header class="modal-header">
      <ion-toolbar>
        <div class="modal-bar">
          <span class="bar-brand">NutriFit <i></i> Exercise</span>
          <span class="bar-title">{{ exercise?.name || 'Exercise' }}</span>
          <button class="close-button" type="button" @click="close">
            Close <ion-icon :icon="closeOutline" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content">
      <div class="modal-body" v-if="exercise">
        <aside class="exercise-media">
          <div class="media-frame">
            <img v-if="mediaImage" :src="mediaImage" :alt="exercise.name" />
            <div v-else class="media-fallback">
              <ion-icon :icon="barbellOutline" />
            </div>
            <span class="media-index">{{ exercise.group || 'Exercise' }} guide</span>
            <span class="media-level">{{ getLevelLabel(exercise.level) }}</span>
          </div>

          <div class="media-facts">
            <div>
              <span>Equipment</span>
              <strong>{{ exercise.equipmentLabel || exercise.equipment || 'None' }}</strong>
            </div>
            <div>
              <span>Type</span>
              <strong>{{ exercise.mechanic || 'Not set' }}</strong>
            </div>
            <div>
              <span>Push or pull</span>
              <strong>{{ exercise.force || 'Not set' }}</strong>
            </div>
          </div>

          <p class="media-note">Coaching cues apply to all bodies. Use the variation that fits your mobility.</p>

          <div class="media-muscles">
            <span class="block-label">Primary muscles</span>
            <div class="chip-row">
              <span class="chip" v-for="m in (exercise.muscles || [])" :key="m">{{ m }}</span>
              <span class="muted" v-if="!(exercise.muscles || []).length">Not specified</span>
            </div>
            <template v-if="(exercise.secondaryMuscles || []).length">
              <span class="block-label secondary-label">Secondary</span>
              <div class="chip-row">
                <span class="chip chip-secondary" v-for="m in exercise.secondaryMuscles" :key="'s-' + m">{{ m }}</span>
              </div>
            </template>
          </div>
        </aside>

        <div class="exercise-detail">
          <header class="detail-head">
            <span class="modal-kicker">Exercise guide</span>
            <h2>{{ exercise.name }}</h2>
            <div class="pill-row">
              <span class="pill">{{ exercise.group }}</span>
              <span class="pill">Level: {{ getLevelLabel(exercise.level) }}</span>
              <span class="pill">Equipment: {{ exercise.equipmentLabel || exercise.equipment || 'None' }}</span>
              <span class="pill pill-verified">Library verified</span>
            </div>
            <p class="detail-plan">{{ prescription.summary }} · Rest {{ prescription.rest }} · Tempo {{ prescription.tempo }}</p>
            <div class="head-actions">
              <button class="primary-button" type="button" @click="startSession">
                Start guided practice <ion-icon :icon="playCircleOutline" />
              </button>
              <button
                class="outline-button add-session-btn"
                :class="{ added: inSession }"
                type="button"
                :disabled="inSession"
                @click="addToSession"
              >
                {{ inSession ? 'Added to session' : 'Add to session' }}
                <ion-icon :icon="inSession ? checkmarkCircleOutline : addOutline" />
              </button>
            </div>
          </header>

          <section class="section">
            <div class="section-title">
              <span class="section-index">01</span>
              <h3>How to do it</h3>
              <span class="step-count">{{ steps.length }} steps</span>
            </div>
            <div class="coach-card" v-if="steps.length">
              <div class="coach-top">
                <span class="coach-index">Step {{ activeStep + 1 }} of {{ steps.length }}</span>
                <span class="coach-breath"><ion-icon :icon="heartOutline" /> {{ guide.breathing }}</span>
              </div>
              <Transition :name="stepDir" mode="out-in">
                <p class="coach-text" :key="activeStep">{{ steps[activeStep] }}</p>
              </Transition>
              <div class="coach-foot">
                <button class="text-btn" type="button" :disabled="activeStep === 0" @click="prevStep">
                  <ion-icon :icon="arrowBackOutline" /> Prev
                </button>
                <div class="step-dots">
                  <button
                    v-for="(step, idx) in steps"
                    :key="'dot-' + idx"
                    type="button"
                    :class="{ active: idx === activeStep, done: idx < activeStep }"
                    :aria-label="`Step ${idx + 1}`"
                    @click="goStep(idx)"
                  ></button>
                </div>
                <button class="text-btn" type="button" :disabled="activeStep === steps.length - 1" @click="nextStep">
                  Next <ion-icon :icon="arrowForwardOutline" />
                </button>
              </div>
            </div>
            <p v-else class="muted">No steps available.</p>
          </section>

          <section class="section">
            <div class="section-title">
              <span class="section-index">02</span>
              <h3>Coach notes</h3>
            </div>
            <div class="notes-grid">
              <article class="note-card">
                <span class="note-label">Form cues</span>
                <button
                  v-for="cue in guide.cues"
                  :key="cue"
                  class="cue-item"
                  :class="{ checked: checkedCues[cue] }"
                  type="button"
                  @click="toggleCue(cue)"
                >
                  <ion-icon :icon="checkedCues[cue] ? checkmarkCircleOutline : ellipseOutline" />
                  <span>{{ cue }}</span>
                </button>
              </article>
              <article class="note-card">
                <span class="note-label">Common mistakes</span>
                <ul class="note-list">
                  <li v-for="mistake in guide.mistakes" :key="mistake">
                    <ion-icon :icon="closeCircleOutline" /> {{ mistake }}
                  </li>
                </ul>
              </article>
              <article class="note-card">
                <span class="note-label">Safety</span>
                <ul class="note-list">
                  <li v-for="note in guide.safety" :key="note">
                    <ion-icon :icon="shieldCheckmarkOutline" /> {{ note }}
                  </li>
                </ul>
              </article>
            </div>
          </section>

          <section class="section">
            <div class="section-title">
              <span class="section-index">03</span>
              <h3>Video guides</h3>
              <button class="text-btn" type="button" @click="loadTutorials" :disabled="loading">
                {{ loading ? 'Loading...' : 'Find videos' }}
              </button>
            </div>

            <div v-if="loading" class="video-loading-skeleton">
              <div class="skeleton-card" v-for="n in 2" :key="n">
                <div class="skeleton-frame"></div>
                <div class="skeleton-lines">
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line short"></div>
                </div>
              </div>
            </div>

            <div v-else-if="tutorials.length === 0" class="tutorial-empty">
              <span class="tutorial-icon"><ion-icon :icon="playCircleOutline" /></span>
              <div>
                <p>YouTube video guides</p>
                <small>Find videos to check your form, pace and setup.</small>
                <a class="text-btn" :href="videoSearchUrl" target="_blank" rel="noopener">
                  Search YouTube <ion-icon :icon="openOutline" />
                </a>
              </div>
            </div>

            <div class="video-list">
              <div class="video-item" v-for="t in tutorials" :key="t.id">
                <div class="video-frame">
                  <div
                    class="video-thumb-wrapper"
                    @click="openPlayer(t)"
                    @keydown.enter.prevent="openPlayer(t)"
                    @keydown.space.prevent="openPlayer(t)"
                    role="button"
                    tabindex="0"
                    :aria-label="'Play video: ' + t.title"
                  >
                    <img
                      v-if="t.thumbnail && !t.thumbnailError"
                      :src="t.thumbnail"
                      :alt="t.title"
                      class="video-thumb-img"
                      @error="handleThumbnailError(t)"
                    />
                    <div v-else class="video-thumb-fallback">
                      <ion-icon :icon="playCircleOutline" />
                      <span>{{ t.title }}</span>
                    </div>
                    <div class="play-overlay">
                      <span class="play-btn-circle">
                        <ion-icon :icon="playCircleOutline" />
                      </span>
                    </div>
                  </div>
                </div>
                <div class="video-text">
                  <p class="video-title">{{ t.title }}</p>
                  <p class="video-channel">{{ t.channel }}</p>
                  <a class="video-open-link" :href="t.watchUrl" target="_blank" rel="noopener" @click.stop>
                    Open in YouTube <ion-icon :icon="openOutline" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <div class="detail-foot">
            <span>NutriFit exercise library</span>
            <button class="text-btn" type="button" @click="close">Back to workouts</button>
          </div>
        </div>
      </div>
    </ion-content>

    <VideoPlayerModal
      :is-open="!!activeVideo"
      :video="activeVideo"
      @close="activeVideo = null"
    />
  </ion-modal>
</template>

<script setup>
import { ref, watch, computed, onUnmounted } from 'vue';
import { IonModal, IonHeader, IonToolbar, IonContent } from '@ionic/vue';
import VideoPlayerModal from './VideoPlayerModal.vue';
import {
  addOutline,
  arrowBackOutline,
  arrowForwardOutline,
  barbellOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  closeOutline,
  ellipseOutline,
  heartOutline,
  openOutline,
  playCircleOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { searchYoutubeTutorials, getSearchUrl } from '../services/youtube';
import { getExerciseGuide, getLevelLabel } from '../services/exerciseGuide';
import { getExerciseImage } from '../services/exercises';
import { useSession } from '../composables/useSession';
import { modalEnterAnimation, modalLeaveAnimation } from '../utils/modalAnimations';

const { setDetailOpen } = useSession();

const props = defineProps({
  isOpen: Boolean,
  exercise: Object,
  inSession: Boolean,
});

const emit = defineEmits(['close', 'start', 'add']);
const tutorials = ref([]);
const loading = ref(false);
const activeStep = ref(0);
const stepDir = ref('step-next');
const checkedCues = ref({});
const activeVideo = ref(null);

const guide = computed(() => getExerciseGuide(props.exercise || {}));
const prescription = computed(() => guide.value.prescription);
const steps = computed(() => props.exercise?.instructions || []);
const videoSearchUrl = computed(() => getSearchUrl(props.exercise?.name || ''));
const mediaImage = computed(() => getExerciseImage(props.exercise?.images?.[0]));

const close = () => {
  activeVideo.value = null;
  emit('close');
  tutorials.value = [];
};

const openPlayer = (video) => {
  activeVideo.value = video;
};

const startSession = () => {
  if (props.exercise) emit('start', props.exercise);
};

const addToSession = () => {
  if (props.exercise) emit('add', props.exercise);
};

const nextStep = () => {
  if (activeStep.value < steps.value.length - 1) {
    stepDir.value = 'step-next';
    activeStep.value += 1;
  }
};

const prevStep = () => {
  if (activeStep.value > 0) {
    stepDir.value = 'step-prev';
    activeStep.value -= 1;
  }
};

const goStep = (idx) => {
  if (idx === activeStep.value) return;
  stepDir.value = idx > activeStep.value ? 'step-next' : 'step-prev';
  activeStep.value = idx;
};

const toggleCue = (cue) => {
  checkedCues.value = { ...checkedCues.value, [cue]: !checkedCues.value[cue] };
};

const loadTutorials = async () => {
  if (!props.exercise?.name) return;
  loading.value = true;
  tutorials.value = [];
  tutorials.value = await searchYoutubeTutorials(props.exercise.name);
  loading.value = false;
};

const handleThumbnailError = (t) => {
  if (t.thumbnailAlternatives && t.thumbnailIndex < t.thumbnailAlternatives.length - 1) {
    t.thumbnailIndex += 1;
    t.thumbnail = t.thumbnailAlternatives[t.thumbnailIndex];
  } else {
    t.thumbnailError = true;
  }
};

watch(() => props.isOpen, (open) => {
  setDetailOpen(!!open);
  if (open) {
    activeStep.value = 0;
    checkedCues.value = {};
    loadTutorials();
  } else {
    activeVideo.value = null;
  }
});

watch(() => props.exercise, () => {
  tutorials.value = [];
  activeStep.value = 0;
  checkedCues.value = {};
});

onUnmounted(() => {
  setDetailOpen(false);
});
</script>

<style scoped>
  .exercise-modal {
    --backdrop-opacity: 0.86;
    --background: #0b0b0b;
    --width: 100vw;
    --height: 100vh;
    --height: 100dvh;
    --max-width: none;
    --max-height: none;
    --border-radius: 0;
  }

  .modal-header {
    --background: #0b0b0b;
    border-bottom: 1px solid var(--line);
  }

  .modal-header ion-toolbar {
    --background: #0b0b0b;
    --color: var(--text);
    --border-width: 0;
    --min-height: calc(4.2rem + env(safe-area-inset-top, 0px));
    padding: env(safe-area-inset-top, 0px) var(--page-x) 0;
  }

  .modal-bar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  .bar-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--dim);
    font-size: 0.5rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .bar-brand i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--dim);
  }

  .bar-title {
    overflow: hidden;
    max-width: 42vw;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-align: center;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .close-button {
    display: inline-flex;
    align-items: center;
    justify-self: end;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: transparent;
    color: var(--text-soft);
    font-size: 0.5rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .close-button ion-icon {
    font-size: 0.75rem;
  }

  .close-button:hover {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .modal-content {
    --background: #0b0b0b;
  }

  .modal-body {
    display: grid;
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
    align-items: start;
    gap: clamp(1.6rem, 4vw, 4rem);
    width: 100%;
    padding: clamp(1.4rem, 3vw, 2.6rem) var(--page-x) 4rem;
  }

  .exercise-media {
    position: sticky;
    top: 1.5rem;
    display: grid;
    gap: 1.2rem;
    min-width: 0;
  }

  .media-frame {
    position: relative;
    overflow: hidden;
    min-height: 280px;
    aspect-ratio: 4 / 3.4;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
  }

  .media-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: none;
  }

  .media-fallback {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    color: var(--dim);
    font-size: 2rem;
  }

  .media-frame::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 32%, transparent 66%, rgba(0, 0, 0, 0.55) 100%);
    content: '';
  }

  .media-index,
  .media-level {
    position: absolute;
    z-index: 2;
    color: var(--text);
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .media-index {
    top: 1rem;
    left: 1.1rem;
  }

  .media-level {
    top: 0.9rem;
    right: 0.9rem;
    padding: 0.28rem 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: rgba(5, 5, 5, 0.72);
    backdrop-filter: blur(8px);
  }

  .media-facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .media-facts > div {
    display: grid;
    gap: 0.2rem;
    padding: 0.8rem 0.7rem 0.8rem 0;
    border-right: 1px solid var(--line);
  }

  .media-facts > div:not(:first-child) {
    padding-left: 0.8rem;
  }

  .media-facts > div:last-child {
    border-right: 0;
  }

  .media-facts span {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .media-facts strong {
    overflow: hidden;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.78rem;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .media-muscles {
    display: grid;
    gap: 0.55rem;
  }

  .block-label {
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .secondary-label {
    margin-top: 0.3rem;
  }

  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .chip {
    padding: 0.38rem 0.65rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.58rem;
    text-transform: capitalize;
  }

  .chip-secondary {
    border-color: var(--line);
    color: var(--muted);
  }

  .exercise-detail {
    display: grid;
    gap: 2rem;
    min-width: 0;
  }

  .detail-head {
    display: grid;
    gap: 0.7rem;
    padding-bottom: 1.4rem;
    border-bottom: 1px solid var(--line);
  }

  .modal-kicker {
    color: var(--dim);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .detail-head h2 {
    font-size: clamp(2.4rem, 5vw, 4.6rem);
    font-weight: 500;
    line-height: 0.86;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.3rem;
  }

  .pill {
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-soft);
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .pill-verified {
    border-color: rgba(134, 239, 172, 0.45);
    background: rgba(34, 197, 94, 0.12);
    color: #bbf7d0;
  }

  .media-note {
    padding: 0.7rem 0.8rem;
    border: 1px dashed var(--line-strong);
    border-radius: 0.6rem;
    color: var(--dim);
    font-size: 0.58rem;
    line-height: 1.7;
  }

  .detail-plan {
    margin: 0;
    color: var(--muted);
    font-size: 0.62rem;
    line-height: 1.6;
  }

  .head-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .primary-button,
  .outline-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.7rem 1rem;
    border-radius: 8px;
    font-family: var(--font-display);
    font-size: 0.56rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .primary-button {
    border: 1px solid var(--white);
    background: var(--white);
    color: var(--black);
  }

  .primary-button:hover {
    background: transparent;
    color: var(--white);
  }

  .outline-button {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--text);
  }

  .outline-button:hover {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .outline-button.add-session-btn.added,
  .outline-button.add-session-btn.added:hover,
  .outline-button.add-session-btn.added:active {
    border-color: rgba(134, 239, 172, 0.55);
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
    cursor: default;
    transform: none;
  }

  .outline-button.add-session-btn:disabled {
    opacity: 1;
  }

  .prescription-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: -1rem;
  }

  .prescription-grid > div {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: var(--surface);
  }

  .prescription-grid span {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .prescription-grid strong {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  .tempo-note {
    margin-top: -1.1rem;
    color: var(--dim);
    font-size: 0.58rem;
    line-height: 1.7;
  }

  .coach-card {
    display: grid;
    gap: 1rem;
    padding: 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: 1rem;
    background: linear-gradient(135deg, var(--surface-2), var(--surface));
  }

  .coach-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .coach-index {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .coach-breath {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--text-soft);
    font-size: 0.58rem;
    line-height: 1.5;
    text-align: right;
  }

  .coach-breath ion-icon {
    color: #fda4af;
    font-size: 0.85rem;
  }

  .coach-text {
    min-height: 3.8rem;
    color: var(--text);
    font-family: var(--font-display);
    font-size: clamp(1rem, 2vw, 1.35rem);
    font-weight: 400;
    line-height: 1.55;
  }

  .step-next-enter-active,
  .step-next-leave-active,
  .step-prev-enter-active,
  .step-prev-leave-active {
    transition: opacity 0.18s var(--ease), transform 0.24s var(--ease-out);
  }

  .step-next-enter-from {
    opacity: 0;
    transform: translateX(16px);
  }

  .step-next-leave-to {
    opacity: 0;
    transform: translateX(-16px);
  }

  .step-prev-enter-from {
    opacity: 0;
    transform: translateX(-16px);
  }

  .step-prev-leave-to {
    opacity: 0;
    transform: translateX(16px);
  }

  .coach-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--line);
  }

  .coach-foot .text-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .step-dots {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
  }

  .step-dots button {
    width: 7px;
    height: 7px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--line-strong);
    transition: background-color 0.3s var(--ease), transform 0.3s var(--ease);
  }

  .step-dots button.done {
    background: var(--text-soft);
  }

  .step-dots button.active {
    background: var(--white);
    transform: scale(1.45);
  }

  .notes-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .note-card {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    padding: 0.9rem;
    border: 1px solid var(--line);
    border-radius: 0.8rem;
    background: var(--surface);
  }

  .note-label {
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .cue-item {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    padding: 0.35rem 0;
    border: 0;
    background: transparent;
    color: var(--text-soft);
    font-size: 0.62rem;
    line-height: 1.55;
    text-align: left;
  }

  .cue-item ion-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--dim);
    font-size: 0.8rem;
  }

  .cue-item.checked {
    color: var(--text);
  }

  .cue-item.checked ion-icon {
    color: #86efac;
  }

  .note-list {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .note-list li {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    color: var(--text-soft);
    font-size: 0.62rem;
    line-height: 1.55;
  }

  .note-list ion-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--dim);
    font-size: 0.75rem;
  }

  .tutorial-empty .text-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.55rem;
    text-decoration: none;
  }

  .section {
    display: grid;
    gap: 0.9rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
  }

  .section-index {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
  }

  .section-title h3 {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .step-count {
    margin-left: auto;
    color: var(--dim);
    font-size: 0.48rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .section-title .text-btn {
    margin-left: auto;
  }

  .steps {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: steps;
  }

  .steps li {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--line);
    color: var(--text-soft);
    font-size: 0.78rem;
    line-height: 1.8;
    cursor: pointer;
    transition: color 0.3s var(--ease), padding 0.3s var(--ease), background-color 0.3s var(--ease);
  }

  .steps li:first-child {
    border-top: 1px solid var(--line);
  }

  .steps li:hover,
  .steps li.active {
    padding-right: 0.7rem;
    padding-left: 0.7rem;
    background: var(--surface);
    color: var(--text);
  }

  .steps li.active .step-index {
    color: var(--white);
  }

  .step-index {
    flex-shrink: 0;
    min-width: 1.6rem;
    padding-top: 0.12rem;
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
  }

  .muted {
    color: var(--muted);
    font-size: 0.72rem;
  }

  .text-btn {
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.56rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .text-btn:hover:not(:disabled) {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .text-btn:active:not(:disabled),
  .primary-button:active,
  .outline-button:active,
  .close-button:active {
    transform: scale(0.94);
  }

  .text-btn:disabled {
    cursor: progress;
    opacity: 0.5;
  }

  .tutorial-empty {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 1.1rem;
    border: 1px dashed var(--line-strong);
    border-radius: 0.9rem;
    background: var(--surface);
  }

  .tutorial-icon {
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    color: var(--text-soft);
    font-size: 0.95rem;
  }

  .tutorial-empty p {
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .tutorial-empty small {
    display: block;
    margin-top: 0.15rem;
    color: var(--dim);
    font-size: 0.58rem;
    line-height: 1.6;
  }

  .video-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .video-loading-skeleton {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .skeleton-card {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--surface);
    padding: 0.8rem;
    display: grid;
    gap: 0.6rem;
  }

  .skeleton-frame {
    width: 100%;
    padding-top: 56.25%;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 0.5rem;
    animation: pulse-glow 1.4s ease-in-out infinite;
  }

  .skeleton-lines {
    display: grid;
    gap: 0.35rem;
  }

  .skeleton-line {
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    animation: pulse-glow 1.4s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 60%;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }

  .video-item {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--surface);
  }

  .video-frame {
    position: relative;
    width: 100%;
    padding-top: 56.25%;
    background: #000;
  }

  .video-frame iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .video-thumb-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: #111;
    cursor: pointer;
    overflow: hidden;
  }

  .video-thumb-fallback {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.5rem;
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #18181b, #09090b);
    color: var(--text-soft);
    text-align: center;
    font-size: 0.65rem;
  }

  .video-thumb-fallback ion-icon {
    font-size: 2rem;
    color: var(--brand, #22c55e);
  }

  .video-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease, opacity 0.3s ease;
  }

  .video-thumb-wrapper:hover .video-thumb-img {
    transform: scale(1.05);
    opacity: 0.9;
  }

  .play-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.3);
    transition: background 0.2s ease;
  }

  .video-thumb-wrapper:hover .play-overlay {
    background: rgba(0, 0, 0, 0.45);
  }

  .play-btn-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    color: #fff;
    font-size: 2.2rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }

  .video-thumb-wrapper:hover .play-btn-circle {
    transform: scale(1.12);
    background: var(--brand, #22c55e);
    border-color: transparent;
    color: #000;
  }

  .video-text {
    display: grid;
    gap: 0.25rem;
    padding: 0.8rem 0.9rem 0.95rem;
  }

  .video-open-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.35rem;
    color: var(--brand, #22c55e);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .video-open-link ion-icon {
    font-size: 0.65rem;
  }

  .video-open-link:hover {
    text-decoration: underline;
  }

  .video-title {
    display: -webkit-box;
    overflow: hidden;
    color: var(--text);
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .video-channel {
    color: var(--dim);
    font-size: 0.58rem;
  }

  .detail-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1.2rem;
    border-top: 1px solid var(--line);
    color: var(--dim);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  @media (max-width: 1024px) {
    .modal-body {
      grid-template-columns: 1fr;
    }

    .exercise-media {
      position: static;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: start;
      gap: 1.2rem;
    }

    .media-frame {
      grid-row: span 2;
      min-height: 300px;
      aspect-ratio: auto;
    }

    .notes-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .modal-bar {
      grid-template-columns: 1fr auto;
    }

    .bar-title {
      display: none;
    }

    .exercise-media {
      grid-template-columns: 1fr;
    }

    .media-frame {
      grid-row: auto;
      min-height: 260px;
      aspect-ratio: 4 / 3;
    }

    .media-facts {
      margin-top: 0;
    }

    .prescription-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .notes-grid {
      grid-template-columns: 1fr;
    }

    .coach-top {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.4rem;
    }

    .coach-breath {
      text-align: left;
    }

    .video-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .video-item {
      border-radius: 0.7rem;
    }

    .video-text {
      gap: 0.15rem;
      padding: 0.5rem 0.55rem 0.6rem;
    }

    .video-title {
      font-size: 0.6rem;
      line-height: 1.35;
    }

    .video-channel {
      font-size: 0.5rem;
    }

    .detail-foot {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 480px) {
    .modal-header ion-toolbar {
      --min-height: calc(3.6rem + env(safe-area-inset-top, 0px));
    }

    .bar-brand {
      font-size: 0.44rem;
    }

    .detail-head h2 {
      font-size: 2.3rem;
    }

    .media-facts strong {
      font-size: 0.68rem;
    }
  }
</style>
