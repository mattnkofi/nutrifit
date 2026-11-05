<template>
  <ion-modal
    :is-open="isOpen"
    :enter-animation="modalEnterAnimation"
    :leave-animation="modalLeaveAnimation"
    @did-dismiss="close"
    class="session-modal"
  >
    <ion-header class="session-header">
      <ion-toolbar>
        <div class="session-bar">
          <span class="bar-brand">NutriFit <i></i> Guided session</span>
          <span class="bar-title">{{ title || 'Workout' }}</span>
          <button class="close-button" type="button" @click="close">
            Close <ion-icon :icon="closeOutline" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="session-content">
      <div v-if="finished && summary" class="session-summary">
        <span class="summary-icon"><ion-icon :icon="trophyOutline" /></span>
        <span class="card-kicker">Session complete</span>
        <h2>Strong work.</h2>
        <p><RollingNumber :value="summary.exercises" /> exercises · <RollingNumber :value="summary.sets" /> sets · <RollingNumber :value="summary.minutes" /> min</p>

        <div class="summary-stats">
          <div>
            <span>Exercises</span>
            <strong><RollingNumber :value="summary.exercises" /></strong>
          </div>
          <div>
            <span>Sets</span>
            <strong><RollingNumber :value="summary.sets" /></strong>
          </div>
          <div>
            <span>Time</span>
            <strong><RollingNumber :value="summary.minutes" /><small>min</small></strong>
          </div>
        </div>

        <p v-if="summary.focus && summary.focus.length" class="summary-focus">
          Focus: {{ summary.focus.join(' · ') }}
        </p>

        <div class="summary-actions">
          <button class="primary-button" type="button" @click="restart">Do it again</button>
          <button class="outline-button" type="button" @click="close">Back to workouts</button>
        </div>
      </div>

      <div v-else-if="currentExercise" class="session-body">
        <div class="session-progress">
          <div class="progress-copy">
            <span>Exercise <RollingNumber :value="currentIndex + 1" /> of <RollingNumber :value="exercises.length" /></span>
            <strong>{{ currentExercise.name }}</strong>
          </div>
          <span class="progress-time"><RollingNumber :value="formattedElapsed" :duration="420" /></span>
          <div class="progress-track"><span :style="{ width: progressPercent + '%' }"></span></div>
        </div>

        <div class="session-main">
          <div class="session-visual">
            <img v-if="mediaImage" :src="mediaImage" :alt="currentExercise.name" />
            <div v-else class="media-fallback"><ion-icon :icon="barbellOutline" /></div>
            <span class="phase-badge" :class="phase">{{ phaseLabel }}</span>
            <span class="set-badge">Set <RollingNumber :value="currentSet" /> of <RollingNumber :value="prescription.sets" /></span>
          </div>

          <div class="timer-card" :class="phase">
            <div class="timer-clock">
              <svg class="timer-ring" viewBox="0 0 120 120" aria-hidden="true">
                <circle class="ring-track" cx="60" cy="60" r="54" />
                <circle class="ring-fill" cx="60" cy="60" r="54" :style="ringStyle" />
              </svg>
              <div class="timer-inner" role="timer" aria-live="off">
                <strong><RollingNumber :value="timerLabel" :duration="420" /></strong>
                <span>{{ phaseLabel }}</span>
              </div>
            </div>

            <div class="timer-info">
              <span class="block-label">
                {{ phase === 'rest' ? 'Recover before the next set' : phase === 'ready' ? 'Ready when you are' : 'Work window' }}
              </span>
              <p>{{ phase === 'rest' ? 'Breathe, relax your shoulders, and reset for the next set.' : guide.breathing }}</p>
              <div class="timer-actions">
                <button class="primary-button" type="button" @click="toggleTimer">
                  {{ timerRunning ? 'Pause' : phase === 'ready' ? 'Start set' : 'Resume' }}
                </button>
                <button
                  class="outline-button"
                  type="button"
                  :disabled="phase === 'ready'"
                  @click="phase === 'rest' ? startNextSet() : finishWorkSet()"
                >
                  {{ phase === 'rest' ? 'Skip rest' : 'Done set' }}
                </button>
                <button class="icon-button" type="button" :aria-label="soundOn ? 'Mute timer sounds' : 'Enable timer sounds'" @click="soundOn = !soundOn">
                  <ion-icon :icon="soundOn ? volumeHighOutline : volumeMuteOutline" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="session-coach">
          <div class="coach-head">
            <span class="block-label">How to do it</span>
            <span class="coach-count" v-if="instructions.length">Step <RollingNumber :value="activeStep + 1" /> of <RollingNumber :value="instructions.length" /></span>
          </div>
          <template v-if="instructions.length">
            <Transition :name="stepDir" mode="out-in">
              <p class="coach-step" :key="activeStep">{{ instructions[activeStep] }}</p>
            </Transition>
            <div class="coach-nav">
              <button class="step-arrow" type="button" :disabled="activeStep === 0" aria-label="Previous step" @click="prevStep">
                <ion-icon :icon="arrowBackOutline" />
              </button>
              <div class="step-dots">
                <button
                  v-for="(step, index) in instructions"
                  :key="'dot-' + index"
                  type="button"
                  :class="{ active: index === activeStep, done: index < activeStep }"
                  :aria-label="`Step ${index + 1}`"
                  @click="goStep(index)"
                ></button>
              </div>
              <button class="step-arrow" type="button" :disabled="activeStep === instructions.length - 1" aria-label="Next step" @click="nextStep">
                <ion-icon :icon="arrowForwardOutline" />
              </button>
            </div>
          </template>
          <p v-else class="coach-empty">No step-by-step notes for this exercise.</p>
        </div>

        <div class="session-cues">
          <span class="block-label">Form cues</span>
          <ul>
            <li v-for="cue in guide.cues.slice(0, 3)" :key="cue">
              <ion-icon :icon="checkmarkCircleOutline" />
              <span>{{ cue }}</span>
            </li>
          </ul>
        </div>

        <div class="session-footer">
          <button class="text-btn" type="button" @click="skipExercise">Skip exercise</button>
          <span><RollingNumber :value="completedSets" /> sets done · <RollingNumber :value="formattedElapsed" :duration="420" /></span>
          <button class="text-btn" type="button" @click="finishSession">Finish session</button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { IonModal, IonHeader, IonToolbar, IonContent } from '@ionic/vue';
import {
  arrowBackOutline,
  arrowForwardOutline,
  barbellOutline,
  checkmarkCircleOutline,
  closeOutline,
  trophyOutline,
  volumeHighOutline,
  volumeMuteOutline,
} from 'ionicons/icons';
import { getExerciseGuide, getWorkoutSummary } from '../services/exerciseGuide';
import { getExerciseImage } from '../services/exercises';
import RollingNumber from './RollingNumber.vue';
import { useSession } from '../composables/useSession';
import { modalEnterAnimation, modalLeaveAnimation } from '../utils/modalAnimations';

const { setSessionOpen } = useSession();

const props = defineProps({
  isOpen: Boolean,
  exercises: { type: Array, default: () => [] },
  title: { type: String, default: '' },
});

const emit = defineEmits(['close', 'complete']);

const currentIndex = ref(0);
const currentSet = ref(1);
const phase = ref('ready');
const secondsLeft = ref(0);
const timerRunning = ref(false);
const completedSets = ref(0);
const touchedExercises = ref([]);
const activeStep = ref(0);
const stepDir = ref('step-next');
const finished = ref(false);
const summary = ref(null);
const soundOn = ref(true);
const startedAt = ref(Date.now());
const now = ref(Date.now());

let ticker = null;
let deadline = 0;

const currentExercise = computed(() => props.exercises?.[currentIndex.value] || null);
const guide = computed(() => getExerciseGuide(currentExercise.value || {}));
const prescription = computed(() => guide.value.prescription);
const instructions = computed(() => currentExercise.value?.instructions || []);

const totalSets = computed(() =>
  (props.exercises || []).reduce((total, exercise) => total + getExerciseGuide(exercise).prescription.sets, 0)
);

const progressPercent = computed(() => {
  if (!totalSets.value) return 0;
  return Math.min(100, Math.round((completedSets.value / totalSets.value) * 100));
});

const elapsedSeconds = computed(() => Math.max(0, Math.floor((now.value - startedAt.value) / 1000)));
const formattedElapsed = computed(() => formatTime(elapsedSeconds.value));

const phaseDuration = computed(() => {
  if (phase.value === 'rest') return prescription.value.restSeconds || 30;
  return prescription.value.workSeconds || 45;
});

const ringPercent = computed(() => {
  if (!phaseDuration.value) return 0;
  const elapsed = Math.max(0, phaseDuration.value - secondsLeft.value);
  return Math.min(100, Math.max(0, (elapsed / phaseDuration.value) * 100));
});

const RING_CIRCUMFERENCE = 2 * Math.PI * 54;
const ringStyle = computed(() => ({
  strokeDasharray: `${RING_CIRCUMFERENCE}`,
  strokeDashoffset: `${RING_CIRCUMFERENCE * (1 - ringPercent.value / 100)}`,
}));

const timerLabel = computed(() => formatTime(secondsLeft.value));
const phaseLabel = computed(() => {
  if (phase.value === 'rest') return 'Rest';
  if (phase.value === 'work') return 'Work';
  return 'Ready';
});

const mediaImage = computed(() => getExerciseImage(currentExercise.value?.images?.[0]));

const formatTime = (value) => {
  const total = Math.max(0, Math.floor(value || 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const playBeep = (frequency = 880, duration = 120) => {
  if (!soundOn.value || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration / 1000);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration / 1000);
    oscillator.onended = () => context.close().catch(() => {});
  } catch (error) {
    return;
  }
};

const stopTimers = () => {
  if (ticker) window.clearInterval(ticker);
  ticker = null;
};

const startTimers = () => {
  stopTimers();
  ticker = window.setInterval(() => {
    now.value = Date.now();
    if (!timerRunning.value || finished.value) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining !== secondsLeft.value) {
      secondsLeft.value = remaining;
      if (remaining > 0 && remaining <= 3) playBeep(660, 70);
    }
    if (remaining <= 0) onPhaseEnd();
  }, 250);
};

const beginPhase = (nextPhase, seconds, running = true) => {
  phase.value = nextPhase;
  secondsLeft.value = seconds;
  timerRunning.value = running;
  deadline = running ? Date.now() + seconds * 1000 : 0;
};

const resetSession = () => {
  currentIndex.value = 0;
  currentSet.value = 1;
  phase.value = 'ready';
  completedSets.value = 0;
  touchedExercises.value = [];
  activeStep.value = 0;
  stepDir.value = 'step-next';
  finished.value = false;
  summary.value = null;
  timerRunning.value = false;
  startedAt.value = Date.now();
  now.value = Date.now();
  deadline = 0;
  secondsLeft.value = getExerciseGuide(props.exercises?.[0] || {}).prescription.workSeconds || 45;
};

const startTimer = () => {
  if (!currentExercise.value) return;
  if (phase.value === 'ready') {
    beginPhase('work', prescription.value.workSeconds || 45, true);
    return;
  }
  if (!timerRunning.value) {
    timerRunning.value = true;
    deadline = Date.now() + secondsLeft.value * 1000;
  }
};

const toggleTimer = () => {
  if (finished.value) return;
  if (!timerRunning.value) {
    startTimer();
    return;
  }
  secondsLeft.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  timerRunning.value = false;
  deadline = 0;
};

const goNextExercise = () => {
  if (currentIndex.value >= props.exercises.length - 1) {
    finishSession();
    return;
  }
  currentIndex.value += 1;
  currentSet.value = 1;
  activeStep.value = 0;
  stepDir.value = 'step-next';
  beginPhase('ready', getExerciseGuide(props.exercises[currentIndex.value]).prescription.workSeconds || 45, false);
};

const finishWorkSet = () => {
  if (phase.value !== 'work') return;
  completedSets.value += 1;
  if (!touchedExercises.value.includes(currentIndex.value)) {
    touchedExercises.value = [...touchedExercises.value, currentIndex.value];
  }
  playBeep(880, 150);
  if (currentSet.value < prescription.value.sets) {
    beginPhase('rest', prescription.value.restSeconds || 30, true);
  } else {
    goNextExercise();
  }
};

const startNextSet = () => {
  if (phase.value !== 'rest') return;
  if (currentSet.value < prescription.value.sets) {
    currentSet.value += 1;
    beginPhase('work', prescription.value.workSeconds || 45, true);
  } else {
    goNextExercise();
  }
};

const onPhaseEnd = () => {
  if (phase.value === 'work') {
    finishWorkSet();
  } else if (phase.value === 'rest') {
    startNextSet();
  }
};

const skipExercise = () => {
  timerRunning.value = false;
  deadline = 0;
  if (currentIndex.value >= props.exercises.length - 1) {
    finishSession();
    return;
  }
  goNextExercise();
};

const finishSession = () => {
  timerRunning.value = false;
  deadline = 0;
  finished.value = true;
  const planned = getWorkoutSummary(props.exercises);
  summary.value = {
    title: props.title || 'Guided session',
    exercises: touchedExercises.value.length,
    sets: completedSets.value,
    minutes: Math.max(1, Math.round(elapsedSeconds.value / 60)),
    date: new Date().toISOString(),
    focus: planned.focus,
  };
  playBeep(1040, 300);
  emit('complete', summary.value);
};

const prevStep = () => {
  if (activeStep.value === 0) return;
  stepDir.value = 'step-prev';
  activeStep.value = Math.max(0, activeStep.value - 1);
};

const nextStep = () => {
  if (activeStep.value >= instructions.value.length - 1) return;
  stepDir.value = 'step-next';
  activeStep.value = Math.min(instructions.value.length - 1, activeStep.value + 1);
};

const goStep = (index) => {
  if (index === activeStep.value) return;
  stepDir.value = index > activeStep.value ? 'step-next' : 'step-prev';
  activeStep.value = index;
};

const restart = () => {
  resetSession();
  startTimers();
};

const close = () => {
  timerRunning.value = false;
  stopTimers();
  emit('close');
};

watch(
  () => props.isOpen,
  (open) => {
    setSessionOpen(!!open);
    if (open) {
      resetSession();
      startTimers();
    } else {
      stopTimers();
    }
  },
  { immediate: true }
);

watch(
  () => props.exercises,
  () => {
    if (props.isOpen) resetSession();
  }
);

onUnmounted(() => {
  stopTimers();
  setSessionOpen(false);
});
</script>

<style scoped>
  .session-modal {
    --backdrop-opacity: 0.9;
    --background: #0b0b0b;
    --width: 100vw;
    --height: 100vh;
    --max-width: none;
    --max-height: none;
    --border-radius: 0;
  }

  .session-header {
    --background: #0b0b0b;
    border-bottom: 1px solid var(--line);
  }

  .session-header ion-toolbar {
    --background: #0b0b0b;
    --color: var(--text);
    --border-width: 0;
    --min-height: 4.2rem;
    padding: 0 var(--page-x);
  }

  .session-bar {
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
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease), transform 0.2s var(--ease);
  }

  .close-button:hover {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .close-button:active {
    transform: scale(0.94);
  }

  .session-content {
    --background: #0b0b0b;
  }

  .session-body {
    display: grid;
    gap: clamp(0.9rem, 1.8vw, 1.3rem);
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;
    padding: clamp(0.9rem, 2vw, 1.5rem) var(--page-x) 2rem;
  }

  .session-progress {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 0.8rem;
  }

  .progress-copy {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  .progress-copy span,
  .progress-time {
    color: var(--dim);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .progress-time {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.9rem;
    letter-spacing: 0.06em;
  }

  .progress-copy strong {
    overflow: hidden;
    color: var(--text);
    font-family: var(--font-display);
    font-size: clamp(1.05rem, 1.8vw, 1.4rem);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .progress-track {
    grid-column: 1 / -1;
    height: 3px;
    margin-top: 0.35rem;
    border-radius: 99px;
    background: var(--line);
    overflow: hidden;
  }

  .progress-track span {
    display: block;
    height: 100%;
    background: var(--white);
    transition: width 0.4s var(--ease);
  }

  .session-main {
    display: grid;
    grid-template-columns: minmax(200px, 0.62fr) minmax(0, 1.38fr);
    align-items: stretch;
    gap: clamp(0.9rem, 2vw, 1.6rem);
  }

  .session-visual {
    position: relative;
    overflow: hidden;
    min-height: 190px;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
  }

  .session-visual img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 190px;
    object-fit: cover;
  }

  .media-fallback {
    display: grid;
    place-items: center;
    min-height: 190px;
    color: var(--dim);
    font-size: 2rem;
  }

  .phase-badge,
  .set-badge {
    position: absolute;
    z-index: 2;
    top: 0.7rem;
    padding: 0.28rem 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: rgba(5, 5, 5, 0.78);
    color: var(--text);
    font-size: 0.5rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
  }

  .phase-badge {
    left: 0.7rem;
  }

  .phase-badge.work {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .phase-badge.rest {
    border-color: rgba(134, 239, 172, 0.5);
    color: #bbf7d0;
  }

  .set-badge {
    right: 0.7rem;
  }

  .timer-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: clamp(0.9rem, 2vw, 1.4rem);
    padding: clamp(0.9rem, 2vw, 1.2rem);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .timer-card.rest {
    border-color: rgba(134, 239, 172, 0.3);
    background: rgba(34, 197, 94, 0.06);
  }

  .timer-clock {
    position: relative;
    display: grid;
    place-items: center;
    width: clamp(6.5rem, 12vw, 8.2rem);
    height: clamp(6.5rem, 12vw, 8.2rem);
    flex-shrink: 0;
  }

  .timer-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track,
  .ring-fill {
    fill: none;
    stroke-width: 7;
  }

  .ring-track {
    stroke: rgba(255, 255, 255, 0.12);
  }

  .ring-fill {
    stroke: var(--white);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.9s linear;
  }

  .timer-card.rest .ring-fill {
    stroke: #86efac;
  }

  .timer-inner {
    display: grid;
    place-items: center;
    gap: 0.1rem;
    text-align: center;
  }

  .timer-inner strong {
    font-family: var(--font-display);
    font-size: clamp(1.35rem, 2.6vw, 1.9rem);
    font-weight: 500;
    letter-spacing: 0.04em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .timer-inner span {
    color: var(--dim);
    font-size: 0.48rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .timer-info {
    display: grid;
    gap: 0.45rem;
    min-width: 0;
  }

  .timer-info p {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.55;
  }

  .timer-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }

  .timer-actions .primary-button,
  .timer-actions .outline-button {
    padding: 0.6rem 0.9rem;
    font-size: 0.64rem;
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: 2.1rem;
    height: 2.1rem;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--text-soft);
    font-size: 0.9rem;
    transition: border-color 0.3s var(--ease), color 0.3s var(--ease), transform 0.2s var(--ease);
  }

  .icon-button:hover {
    border-color: var(--line-strong);
    color: var(--white);
  }

  .icon-button:active {
    transform: scale(0.92);
  }

  .block-label {
    color: var(--dim);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .session-coach {
    display: grid;
    gap: 0.7rem;
    padding: clamp(0.85rem, 1.6vw, 1.1rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .coach-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .coach-count {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
  }

  .coach-step {
    min-height: 3.1rem;
    color: var(--text);
    font-family: var(--font-display);
    font-size: clamp(1rem, 1.8vw, 1.25rem);
    font-weight: 400;
    line-height: 1.5;
  }

  .coach-empty {
    color: var(--muted);
    font-size: 0.72rem;
  }

  .coach-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding-top: 0.65rem;
    border-top: 1px solid var(--line);
  }

  .step-arrow {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    background: transparent;
    color: var(--text);
    font-size: 0.85rem;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease), transform 0.2s var(--ease);
  }

  .step-arrow:hover:not(:disabled) {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .step-arrow:active:not(:disabled) {
    transform: scale(0.9);
  }

  .step-arrow:disabled {
    cursor: not-allowed;
    opacity: 0.3;
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
    transform: scale(1.5);
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

  .session-cues ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.5rem 0 0;
    padding: 0;
    list-style: none;
  }

  .session-cues li {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    color: var(--text-soft);
    font-size: 0.7rem;
    line-height: 1.55;
  }

  .session-cues ion-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--white);
    font-size: 0.8rem;
  }

  .session-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--line);
    color: var(--dim);
    font-size: 0.54rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .text-btn {
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.6rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease), transform 0.2s var(--ease);
  }

  .text-btn:hover:not(:disabled) {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .text-btn:active:not(:disabled) {
    transform: scale(0.94);
  }

  .text-btn:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  .primary-button:active,
  .outline-button:active {
    transform: scale(0.95);
  }

  .session-summary {
    display: grid;
    place-items: center;
    gap: 0.5rem;
    width: min(100%, 560px);
    margin: 0 auto;
    padding: clamp(2rem, 6vw, 5rem) var(--page-x);
    text-align: center;
  }

  .summary-icon {
    display: grid;
    place-items: center;
    width: 4rem;
    height: 4rem;
    margin-bottom: 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 1.2rem;
    color: var(--white);
    font-size: 1.8rem;
  }

  .session-summary h2 {
    font-size: clamp(2.4rem, 6vw, 4.4rem);
    font-weight: 500;
    line-height: 0.9;
    text-transform: uppercase;
  }

  .session-summary > p {
    color: var(--muted);
    font-size: 0.68rem;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    margin: 1rem 0 0.4rem;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .summary-stats div {
    display: grid;
    gap: 0.2rem;
    padding: 0.8rem 0.6rem;
    border-right: 1px solid var(--line);
  }

  .summary-stats div:last-child {
    border-right: 0;
  }

  .summary-stats span {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .summary-stats strong {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 500;
    line-height: 1;
  }

  .summary-stats strong small {
    margin-left: 0.15rem;
    color: var(--dim);
    font-family: var(--font-body);
    font-size: 0.4em;
    font-weight: 500;
  }

  .summary-focus {
    color: var(--dim);
    font-size: 0.5rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summary-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }

  @media (max-width: 760px) {
    .session-bar {
      grid-template-columns: 1fr auto;
    }

    .bar-title {
      display: none;
    }

    .session-main {
      grid-template-columns: 1fr;
      gap: 0.7rem;
    }

    .session-visual {
      min-height: 0;
      height: 140px;
    }

    .session-visual img,
    .media-fallback {
      min-height: 0;
      height: 140px;
    }

    .timer-card {
      gap: 0.8rem;
      padding: 0.85rem;
    }

    .timer-clock {
      width: 5.6rem;
      height: 5.6rem;
    }

    .timer-info p {
      display: none;
    }

    .timer-actions {
      gap: 0.35rem;
    }

    .timer-actions .primary-button,
    .timer-actions .outline-button {
      flex: 1;
      min-width: 0;
      padding: 0.55rem 0.5rem;
      font-size: 0.58rem;
    }

    .coach-step {
      min-height: 2.6rem;
      font-size: 1rem;
    }

    .session-cues ul {
      grid-template-columns: 1fr;
    }

    .session-footer {
      align-items: center;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }

    .session-footer > span {
      order: -1;
      width: 100%;
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .session-header ion-toolbar {
      --min-height: 3.6rem;
    }

    .bar-brand {
      font-size: 0.44rem;
    }

    .session-body {
      padding-top: 0.8rem;
      gap: 0.75rem;
    }

    .session-visual,
    .session-visual img,
    .media-fallback {
      height: 120px;
      min-height: 0;
    }

    .summary-stats strong {
      font-size: 1.3rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .step-next-enter-active,
    .step-next-leave-active,
    .step-prev-enter-active,
    .step-prev-leave-active,
    .ring-fill,
    .progress-track span {
      transition: none;
    }
  }
</style>
