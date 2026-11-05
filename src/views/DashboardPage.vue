<template>
  <ion-page class="dashboard-page">
    <ion-content :fullscreen="true" class="dashboard-content" :style="{ '--padding-top': 'calc(7.2rem + env(safe-area-inset-top, 0))' }">
      <main class="dashboard-shell">
        <section class="dash-hero">
          <div class="hero-main">
            <div class="hero-head">
              <p class="eyebrow">{{ greeting }}</p>
              <span class="day-chip">
                {{ todayLabel }} <i></i>
                {{ labels.goal !== 'Not set' ? labels.goal : 'Set a goal' }}
              </span>
            </div>

            <div class="hero-copy">
              <h1>Dashboard<span>.</span></h1>
              <p class="subhead">A clear view of your food, workouts and daily progress.</p>
            </div>

            <div class="hero-stats">
              <div class="hero-stat">
                <strong><RollingNumber :value="weeklyAverage" /><small>%</small></strong>
                <span>Weekly avg</span>
              </div>
              <div class="hero-stat">
                <strong><RollingNumber :value="workoutsThisWeek" /><small>/<RollingNumber :value="trainingTarget" /></small></strong>
                <span>Workouts</span>
              </div>
              <div class="hero-stat">
                <strong><RollingNumber :value="daysOnTarget" /></strong>
                <span>Days on target</span>
              </div>
            </div>

            <div class="hero-actions">
              <button class="primary-button" type="button" @click="goTo('/workouts')">
                Start workout <ion-icon :icon="arrowForwardOutline" />
              </button>
              <button class="outline-button" type="button" @click="goTo('/scanner')">
                <ion-icon :icon="cameraOutline" /> Scan a meal
              </button>
            </div>
          </div>

          <article class="momentum-card">
            <div class="momentum-head">
              <span class="card-kicker">Today's progress</span>
              <span class="momentum-delta">
                <template v-if="weeklyDelta === null">No prior data</template>
                <template v-else>{{ weeklyDelta > 0 ? '+' : '' }}<RollingNumber :value="weeklyDelta" />%</template>
              </span>
            </div>

            <div class="momentum-score">
              <div class="score-ring" :style="{ '--score': todayScore }">
                <strong><RollingNumber :value="todayScore" /><small>%</small></strong>
              </div>
              <div class="score-copy">
                <span class="score-status">{{ scoreStatus }}</span>
                <p class="momentum-note">{{ dailyTip }}</p>
              </div>
            </div>

            <div class="momentum-track"><span :style="{ width: `${todayScore}%` }"></span></div>

            <div class="momentum-foot">
              <span>This week</span>
              <strong>
                <template v-if="streak"><RollingNumber :value="streak" />-day streak</template>
                <template v-else>No streak yet</template>
                <ion-icon :icon="flameOutline" />
              </strong>
            </div>
          </article>
        </section>

        <section class="metric-rail">
          <article class="rail-card rail-calories">
            <header class="rail-head">
              <span class="rail-icon"><ion-icon :icon="pieChartOutline" /></span>
              <span class="rail-badge"><RollingNumber :value="caloriePercent" />%</span>
            </header>

            <span class="card-kicker rail-kicker">Calories</span>

            <div class="rail-value">
              <strong><RollingNumber :value="todayCalories" grouping /></strong>
              <span v-if="calorieTarget">of <RollingNumber :value="calorieTarget" grouping /> kcal today</span>
              <span v-else>kcal today · no target set</span>
            </div>

            <div class="rail-track"><span :style="{ width: `${caloriePercent}%` }"></span></div>

            <button class="rail-action" type="button" @click="goTo('/scanner')">
              <span class="rail-action-meta">
                <template v-if="todayMeals.length"><RollingNumber :value="todayMeals.length" /> meal{{ todayMeals.length === 1 ? '' : 's' }} logged</template>
                <template v-else>No meals logged yet</template>
              </span>
              <span class="rail-action-label">Scan meal <ion-icon :icon="arrowForwardOutline" /></span>
            </button>
          </article>

          <article class="rail-card rail-water">
            <header class="rail-head">
              <span class="rail-icon"><ion-icon :icon="waterOutline" /></span>
              <span class="rail-badge"><RollingNumber :value="waterPercent" />%</span>
            </header>

            <span class="card-kicker rail-kicker">Hydration</span>

            <div class="rail-value">
              <strong><RollingNumber :value="todayWater" /><small>/<RollingNumber :value="waterTarget" /></small></strong>
              <span>glasses · <RollingNumber :value="todayWater * 250" grouping /> ml</span>
            </div>

            <div class="glass-row" role="img" :aria-label="`${todayWater} of ${waterTarget} glasses of water`">
              <span v-for="glass in waterTarget" :key="glass" :class="{ filled: glass <= todayWater }"></span>
            </div>

            <div class="water-controls">
              <button
                class="water-step"
                type="button"
                :disabled="todayWater <= 0"
                aria-label="Remove one glass of water"
                @click="changeWater(-1)"
              >
                −
              </button>
              <span class="water-hint">{{ waterHint }}</span>
              <button
                class="water-step add"
                type="button"
                :disabled="todayWater >= 40"
                aria-label="Add one glass of water"
                @click="changeWater(1)"
              >
                +
              </button>
            </div>
          </article>

          <article class="rail-card rail-workout">
            <header class="rail-head">
              <span class="rail-icon"><ion-icon :icon="barbellOutline" /></span>
              <span class="rail-badge"><RollingNumber :value="workoutsThisWeek" />/<RollingNumber :value="trainingTarget" /></span>
            </header>

            <span class="card-kicker rail-kicker">Workout plan</span>

            <div class="rail-value">
              <strong><RollingNumber :value="planProgress" /><small>%</small></strong>
              <span>{{ plans.workouts.length ? 'Plan completed' : 'No plan yet' }}</span>
            </div>

            <div class="rail-track"><span :style="{ width: `${trainingPercent}%` }"></span></div>

            <button class="rail-action" type="button" @click="goTo('/workouts')">
              <span class="rail-action-meta">
                <template v-if="plans.workouts.length"><RollingNumber :value="workoutsThisWeek" /> of <RollingNumber :value="trainingTarget" /> this week</template>
                <template v-else>Find a plan that fits</template>
              </span>
              <span class="rail-action-label">Browse <ion-icon :icon="arrowForwardOutline" /></span>
            </button>
          </article>

          <article class="rail-card rail-streak">
            <header class="rail-head">
              <span class="rail-icon"><ion-icon :icon="statsChartOutline" /></span>
              <span class="streak-badge">
                <ion-icon :icon="flameOutline" />
                <template v-if="streak"><RollingNumber :value="streak" />-day</template>
                <template v-else>No streak</template>
              </span>
            </header>

            <span class="card-kicker rail-kicker">Weekly activity</span>

            <div class="week-chart" aria-hidden="true">
              <div class="bar-chart">
                <span
                  v-for="day in weeklyBars"
                  :key="day.key"
                  :class="{ today: day.key === todayKeyValue }"
                  :style="{ height: `${day.height}%` }"
                ></span>
              </div>

              <div class="week-labels">
                <span v-for="day in weeklyBars" :key="`label-${day.key}`">{{ day.label.charAt(0) }}</span>
              </div>
            </div>

            <button class="rail-action" type="button" @click="goTo('/goals')">
              <span class="rail-action-meta"><RollingNumber :value="weeklyAverage" />% weekly average</span>
              <span class="rail-action-label">Goals <ion-icon :icon="arrowForwardOutline" /></span>
            </button>
          </article>
        </section>

        <section class="workspace-grid">
          <div class="workspace-main">
            <article class="scanner-card">
              <div class="scanner-content">
                <span class="card-kicker">Quick action · Meal scanner</span>
                <h2>Scan a meal.<br />See the details.</h2>
                <p>Take a photo or upload an image to see calories, nutrients and portion sizes right away.</p>

                <div class="scanner-actions">
                  <button class="primary-button" type="button" @click="goTo('/scanner')">
                    Open meal scanner <ion-icon :icon="arrowForwardOutline" />
                  </button>
                  <span class="scanner-meta">Photo · Upload · Review</span>
                </div>
              </div>

              <div class="scanner-visual">
                <div class="visual-top">
                  <span class="visual-label">Meal Scanner</span>
                  <span class="visual-live"><i></i> Ready</span>
                </div>

                <div class="scan-frame" aria-hidden="true">
                  <span class="corner tl"></span>
                  <span class="corner tr"></span>
                  <span class="corner bl"></span>
                  <span class="corner br"></span>
                  <span class="scan-line"></span>
                  <ion-icon :icon="cameraOutline" />
                </div>

                <span class="visual-foot">Point · Capture · Review</span>
              </div>
            </article>

            <article class="quick-actions-card">
              <div class="section-head">
                <div>
                  <span class="card-kicker">Shortcuts</span>
                  <h3>Common tasks.</h3>
                </div>
                <ion-icon :icon="flashOutline" />
              </div>

              <div class="quick-actions">
                <button type="button" class="action-tile tile-scan" @click="goTo('/scanner')">
                  <span class="tile-icon"><ion-icon :icon="cameraOutline" /></span>
                  <span class="tile-copy"><strong>Meal Scanner</strong><small>Review a meal</small></span>
                  <ion-icon class="tile-arrow" :icon="arrowForwardOutline" />
                </button>
                <button type="button" class="action-tile tile-workout" @click="goTo('/workouts')">
                  <span class="tile-icon"><ion-icon :icon="barbellOutline" /></span>
                  <span class="tile-copy"><strong>Start Workout</strong><small>Open library</small></span>
                  <ion-icon class="tile-arrow" :icon="arrowForwardOutline" />
                </button>
                <button type="button" class="action-tile tile-water" @click="changeWater(1)">
                  <span class="tile-icon"><ion-icon :icon="waterOutline" /></span>
                  <span class="tile-copy"><strong>Add Water</strong><small><RollingNumber :value="todayWater" /> of <RollingNumber :value="waterTarget" /> glasses</small></span>
                  <ion-icon class="tile-arrow" :icon="arrowForwardOutline" />
                </button>
                <button type="button" class="action-tile tile-goals" @click="goTo('/goals')">
                  <span class="tile-icon"><ion-icon :icon="statsChartOutline" /></span>
                  <span class="tile-copy"><strong>View Goals</strong><small>See progress</small></span>
                  <ion-icon class="tile-arrow" :icon="arrowForwardOutline" />
                </button>
              </div>
            </article>
          </div>

          <aside class="workspace-side">
            <article class="coach-card">
              <div class="coach-head">
                <div class="coach-title">
                  <span class="coach-icon"><ion-icon :icon="sparklesOutline" /></span>
                  <div>
                    <span class="card-kicker">Daily Coach</span>
                    <h3>Today's plan</h3>
                  </div>
                </div>
                <span class="online-badge">Personalized</span>
              </div>

              <div class="coach-empty">
                <span class="empty-index">{{ plans.workouts.length ? '01' : '00' }}</span>
                <div>
                  <p v-if="plans.workouts.length"><RollingNumber :value="plans.workouts.length" />-day plan ready</p>
                  <p v-else>No plan yet</p>
                  <small v-if="plans.workouts.length">
                    <RollingNumber :value="workoutsThisWeek" /> of <RollingNumber :value="trainingTarget" /> workouts completed this week.
                  </small>
                  <small v-else>We will suggest a plan based on your goals and recent activity.</small>
                </div>
              </div>

              <button class="primary-button" type="button" @click="goTo('/planner')">
                {{ plans.workouts.length ? 'Open my plan' : 'Create my plan' }} <ion-icon :icon="arrowForwardOutline" />
              </button>
            </article>

            <article class="focus-card">
              <div class="section-head">
                <div>
                  <span class="card-kicker">Today's focus</span>
                  <h3>Small wins.</h3>
                </div>
                <span class="focus-count"><RollingNumber :value="completedFocus" /> of 4</span>
              </div>

              <ul class="focus-list">
                <li :class="{ done: hasTodayActivity }">
                  <span class="focus-check"><ion-icon v-if="hasTodayActivity" :icon="checkmarkOutline" /></span>
                  <span>
                    <strong>Daily check-in</strong>
                    <small>{{ hasTodayActivity ? 'Progress saved' : 'Log any activity today' }}</small>
                  </span>
                </li>
                <li :class="{ done: todayMeals.length > 0 }">
                  <span class="focus-check"><ion-icon v-if="todayMeals.length" :icon="checkmarkOutline" /></span>
                  <span>
                    <strong>Log a meal</strong>
                    <small><template v-if="todayMeals.length"><RollingNumber :value="todayMeals.length" /> meal{{ todayMeals.length === 1 ? '' : 's' }} logged</template><template v-else>Scan or add a meal</template></small>
                  </span>
                </li>
                <li :class="{ done: todayWater >= waterTarget }">
                  <span class="focus-check"><ion-icon v-if="todayWater >= waterTarget" :icon="checkmarkOutline" /></span>
                  <span>
                    <strong>Drink <RollingNumber :value="waterTarget" /> glasses</strong>
                    <small><RollingNumber :value="todayWater" /> of <RollingNumber :value="waterTarget" /> glasses</small>
                  </span>
                </li>
                <li :class="{ done: todayWorkouts.length > 0 }">
                  <span class="focus-check"><ion-icon v-if="todayWorkouts.length" :icon="checkmarkOutline" /></span>
                  <span>
                    <strong>Complete a workout</strong>
                    <small>{{ todayWorkouts.length ? 'Workout logged' : '30–45 minutes' }}</small>
                  </span>
                </li>
              </ul>

              <button class="outline-button focus-button" type="button" @click="goTo('/planner')">
                Open planner <ion-icon :icon="arrowForwardOutline" />
              </button>
            </article>
          </aside>
        </section>
      </main>
    </ion-content>

    <Transition name="undo-toast">
      <div v-if="waterUndo" :key="waterUndo.id" class="undo-toast" role="status" aria-live="polite">
        <span class="undo-icon"><ion-icon :icon="waterOutline" /></span>
        <span class="undo-copy">
          <strong>{{ waterUndo.amount > 0 ? 'Water added' : 'Water removed' }}</strong>
          <small><RollingNumber :value="todayWater" /> of <RollingNumber :value="waterTarget" /> glasses today</small>
        </span>
        <button type="button" class="undo-action" @click="undoWater">Undo</button>
        <span class="undo-timer" :style="{ animationDuration: `${UNDO_MS}ms` }"></span>
      </div>
    </Transition>
  </ion-page>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IonPage, IonContent } from '@ionic/vue';
import {
  arrowForwardOutline,
  barbellOutline,
  cameraOutline,
  checkmarkOutline,
  flameOutline,
  flashOutline,
  pieChartOutline,
  sparklesOutline,
  statsChartOutline,
  waterOutline,
} from 'ionicons/icons';
import { useAuth } from '../composables/useAuth';
import { useUserData } from '../composables/useUserData';
import RollingNumber from '../components/RollingNumber.vue';
import { todayKey } from '../services/userData';

const router = useRouter();
const goTo = (path) => router.push(path);

const { displayName } = useAuth();

const {
  plans,
  labels,
  streak,
  todayScore,
  todayCalories,
  todayMeals,
  todayWater,
  todayWorkouts,
  calorieTarget,
  caloriePercent,
  waterTarget,
  waterPercent,
  trainingPercent,
  trainingTarget,
  planProgress,
  workoutsThisWeek,
  weeklyAverage,
  weeklyBars,
  weeklyDelta,
  daysOnTarget,
  dailyTip,
  hasTodayActivity,
  todayLabel,
  formatCalories,
  setWater,
} = useUserData();

const todayKeyValue = todayKey();

const UNDO_MS = 7000;
const waterUndo = ref(null);
let undoTimer = null;

const clearUndoTimer = () => {
  if (undoTimer) {
    clearTimeout(undoTimer);
    undoTimer = null;
  }
};

const changeWater = (amount) => {
  const previous = todayWater.value;
  const next = Math.max(0, Math.min(40, previous + amount));
  if (next === previous) return;

  setWater(next);
  clearUndoTimer();
  waterUndo.value = { id: Date.now(), previous, amount: next - previous };
  undoTimer = setTimeout(() => {
    waterUndo.value = null;
    undoTimer = null;
  }, UNDO_MS);
};

const undoWater = () => {
  if (!waterUndo.value) return;
  setWater(waterUndo.value.previous);
  clearUndoTimer();
  waterUndo.value = null;
};

onUnmounted(clearUndoTimer);

const greeting = computed(() => {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = String(displayName.value || '').trim().split(/\s+/)[0];
  return name ? `${time}, ${name}` : time;
});

const waterHint = computed(() => {
  const remaining = waterTarget.value - todayWater.value;
  if (remaining <= 0) return 'Goal reached';
  return `${remaining} to go`;
});

const scoreStatus = computed(() => {
  if (todayScore.value >= 70) return 'On track';
  if (todayScore.value > 0) return 'In progress';
  return 'Not started';
});

const completedFocus = computed(
  () =>
    [
      hasTodayActivity.value,
      todayMeals.value.length > 0,
      todayWater.value >= waterTarget.value,
      todayWorkouts.value.length > 0,
    ].filter(Boolean).length
);
</script>

<style scoped>
  :host {
    display: block;
    padding-top: 0;
  }

  .dashboard-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding-top: clamp(0.6rem, 1.2vw, 0.9rem);
  }

  /* ---------------------------------------------------------------- Hero */

  .dash-hero {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(250px, 320px);
    align-items: stretch;
    gap: clamp(1rem, 2vw, 1.6rem);
    padding-bottom: clamp(0.9rem, 1.6vw, 1.2rem);
    border-bottom: 1px solid var(--line);
  }

  .hero-main {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.9rem;
    min-height: 0;
  }

  .hero-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .day-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--dim);
    font-size: 0.56rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .day-chip i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--dim);
  }

  .hero-copy {
    display: grid;
    gap: 0.5rem;
  }

  .hero-copy h1 {
    font-size: clamp(2.1rem, 4.6vw, 3.4rem);
    font-weight: 500;
    line-height: 0.88;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .hero-copy h1 span {
    color: var(--dim);
  }

  .subhead {
    max-width: 48ch;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.7;
  }

  .hero-stats {
    display: flex;
    align-items: stretch;
    gap: clamp(0.9rem, 2vw, 1.8rem);
    padding: 0.7rem 0;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }

  .hero-stat {
    display: grid;
    gap: 0.08rem;
    min-width: 0;
  }

  .hero-stat strong {
    font-family: var(--font-display);
    font-size: clamp(1.05rem, 1.8vw, 1.35rem);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
  }

  .hero-stat strong small {
    font-size: 0.58em;
    color: var(--dim);
  }

  .hero-stat span {
    color: var(--dim);
    font-size: 0.54rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  /* ------------------------------------------------------- Momentum card */

  .momentum-card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: clamp(0.95rem, 1.5vw, 1.25rem);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-lg);
    background:
      radial-gradient(120% 130% at 100% 0%, rgba(255, 255, 255, 0.08), transparent 58%),
      var(--surface);
    color: var(--text);
  }

  .momentum-card::after {
    position: absolute;
    right: -4.5rem;
    bottom: -5.5rem;
    width: 12rem;
    height: 12rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    box-shadow: 0 0 0 2rem rgba(255, 255, 255, 0.025), 0 0 0 4rem rgba(255, 255, 255, 0.018);
    content: '';
    pointer-events: none;
  }

  .momentum-head,
  .momentum-score,
  .momentum-track,
  .momentum-foot {
    position: relative;
    z-index: 1;
  }

  .momentum-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .momentum-card .card-kicker {
    color: var(--muted);
  }

  .momentum-delta {
    padding: 0.2rem 0.42rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.56rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .momentum-score {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    margin: 0.9rem 0 0.65rem;
  }

  .score-ring {
    --score: 0;
    position: relative;
    display: grid;
    place-items: center;
    width: clamp(4.4rem, 6vw, 5.2rem);
    aspect-ratio: 1;
    flex-shrink: 0;
    border-radius: 50%;
    background: conic-gradient(var(--white) calc(var(--score) * 1%), rgba(255, 255, 255, 0.12) 0);
    transition: background 0.6s var(--ease);
  }

  .score-ring::before {
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background: var(--surface);
    content: '';
  }

  .score-ring strong {
    position: relative;
    z-index: 1;
    font-family: var(--font-display);
    font-size: clamp(1.15rem, 1.9vw, 1.5rem);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.01em;
  }

  .score-ring strong small {
    font-size: 0.5em;
    color: var(--dim);
  }

  .score-copy {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
  }

  .score-status {
    justify-self: start;
    padding: 0.18rem 0.44rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.54rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .momentum-note {
    max-width: 32ch;
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.55;
  }

  .momentum-track {
    height: 3px;
    margin-top: auto;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
  }

  .momentum-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #ffffff, #8a8a8a);
    transition: width 0.6s var(--ease-out);
  }

  .momentum-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.7rem;
    margin-top: 0.7rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--line);
    color: var(--dim);
    font-size: 0.56rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .momentum-foot strong {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--white);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  /* --------------------------------------------------------- Metric rail */

  .metric-rail {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(0.65rem, 1.1vw, 0.9rem);
    margin-top: clamp(0.9rem, 1.5vw, 1.2rem);
  }

  .rail-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
    min-height: 218px;
    padding: clamp(1rem, 1.3vw, 1.15rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 42%),
      var(--surface);
    transition: border-color 0.3s var(--ease), background-color 0.3s var(--ease);
  }

  .rail-card:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
  }

  .rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .rail-icon {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-soft);
    font-size: 0.9rem;
  }

  .rail-kicker {
    display: block;
    color: var(--muted);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    line-height: 1.1;
    white-space: nowrap;
  }

  .rail-badge {
    padding: 0.25rem 0.55rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .rail-value {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
  }

  .rail-value strong {
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 2.4vw, 2.5rem);
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: -0.005em;
  }

  .rail-value strong small {
    margin-left: 0.04em;
    color: var(--dim);
    font-size: 0.42em;
  }

  .rail-value > span {
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .rail-track {
    height: 5px;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .rail-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #ffffff, #9a9a9a);
    transition: width 0.5s var(--ease-out);
  }

  .rail-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    margin-top: auto;
    padding: 0.32rem 0.32rem 0.32rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.035);
    text-align: left;
  }

  .rail-action-meta {
    overflow: hidden;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rail-action-label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
    padding: 0.5rem 0.72rem;
    border-radius: 0.55rem;
    background: var(--white);
    color: var(--black);
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .rail-action-label ion-icon {
    font-size: 0.8rem;
    transition: transform 0.25s var(--ease);
  }

  .rail-action:hover {
    border-color: var(--line-strong);
    background: rgba(255, 255, 255, 0.07);
  }

  .rail-action:hover .rail-action-label {
    background: #dcdcdc;
  }

  .rail-action:hover .rail-action-label ion-icon {
    transform: translateX(2px);
  }

  .rail-action:active {
    transform: scale(0.99);
  }

  /* --------------------------------------------------------- Hydration */

  .glass-row {
    display: flex;
    gap: 0.28rem;
    margin: 0.05rem 0 0.1rem;
  }

  .glass-row span {
    flex: 1;
    height: 1.5rem;
    border: 1px solid var(--line);
    border-radius: 0.32rem;
    background: rgba(255, 255, 255, 0.03);
    transition:
      background 0.3s var(--ease),
      border-color 0.3s var(--ease),
      box-shadow 0.3s var(--ease);
  }

  .glass-row span.filled {
    border-color: var(--white);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.4));
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.16);
  }

  .water-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    margin-top: auto;
    padding: 0.32rem;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.035);
  }

  .water-step {
    display: grid;
    place-items: center;
    width: 2.05rem;
    height: 2.05rem;
    flex-shrink: 0;
    padding: 0;
    border: 1px solid var(--line-strong);
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
    font-size: 1.15rem;
    font-weight: 500;
    line-height: 1;
  }

  .water-step.add {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .water-step:hover:not(:disabled) {
    border-color: var(--white);
    color: var(--white);
    transform: translateY(-1px);
  }

  .water-step.add:hover:not(:disabled) {
    border-color: var(--white);
    background: #dcdcdc;
    color: var(--black);
  }

  .water-step:active:not(:disabled) {
    transform: scale(0.94);
  }

  .water-step:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .water-hint {
    flex: 1;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ------------------------------------------------------ Weekly chart */

  .streak-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.24rem 0.52rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.64rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .streak-badge ion-icon {
    color: var(--muted);
    font-size: 0.65rem;
  }

  .week-chart {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.45rem;
    min-height: 96px;
  }

  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 0.3rem;
    flex: 1;
    min-height: 64px;
  }

  .bar-chart span {
    flex: 1;
    min-width: 0;
    min-height: 5px;
    border-radius: 0.28rem 0.28rem 0 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.12));
    transition: height 0.5s var(--ease-out);
  }

  .bar-chart span.today {
    background: linear-gradient(180deg, #ffffff, rgba(255, 255, 255, 0.45));
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.25);
  }

  .week-labels {
    display: flex;
    justify-content: space-between;
    gap: 0.3rem;
    color: var(--dim);
    font-size: 0.64rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .week-labels span {
    flex: 1;
    text-align: center;
  }

  /* ---------------------------------------------------------- Workspace */

  .workspace-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.8fr);
    align-items: start;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    margin-top: clamp(0.7rem, 1.2vw, 1rem);
  }

  .workspace-main,
  .workspace-side {
    display: grid;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    min-width: 0;
  }

  .scanner-card {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
    align-items: stretch;
    gap: clamp(1rem, 1.8vw, 1.5rem);
    padding: clamp(0.9rem, 1.5vw, 1.25rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: linear-gradient(150deg, var(--surface-2), var(--surface) 70%);
  }

  .scanner-visual {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    overflow: hidden;
    min-height: 240px;
    padding: 0.9rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background:
      radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.1), transparent 58%),
      #090909;
  }

  .scanner-visual::before {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 28px 28px;
    content: '';
  }

  .visual-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    width: 100%;
    z-index: 2;
  }

  .visual-label,
  .visual-live,
  .visual-foot {
    position: relative;
    z-index: 2;
    color: var(--muted);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .visual-live {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--text-soft);
  }

  .visual-live i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--white);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }

  .visual-foot {
    color: var(--dim);
    letter-spacing: 0.08em;
    text-align: center;
  }

  .scan-frame {
    position: relative;
    display: grid;
    place-items: center;
    width: min(56%, 150px);
    aspect-ratio: 1;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
  }

  .scan-frame > ion-icon {
    color: var(--text-soft);
    font-size: clamp(1.4rem, 2.4vw, 2rem);
  }

  .corner {
    position: absolute;
    width: 0.9rem;
    height: 0.9rem;
    border-color: var(--white);
    border-style: solid;
  }

  .corner.tl { top: -1px; left: -1px; border-width: 2px 0 0 2px; border-radius: 0.3rem 0 0 0; }
  .corner.tr { top: -1px; right: -1px; border-width: 2px 2px 0 0; border-radius: 0 0.3rem 0 0; }
  .corner.bl { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; border-radius: 0 0 0 0.3rem; }
  .corner.br { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; border-radius: 0 0 0.3rem 0; }

  .scan-line {
    position: absolute;
    left: 8%;
    right: 8%;
    top: 16%;
    height: 1px;
    background: var(--white);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    animation: scanSweep 4s var(--ease) infinite;
  }

  .scanner-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.55rem;
    min-width: 0;
    padding: clamp(0.25rem, 0.7vw, 0.6rem);
  }

  .scanner-content h2 {
    margin: 0.15rem 0 0;
    font-size: clamp(1.5rem, 2.4vw, 2rem);
    font-weight: 500;
    line-height: 0.95;
    text-transform: uppercase;
  }

  .scanner-content .card-kicker {
    font-size: 0.66rem;
    letter-spacing: 0.16em;
  }

  .scanner-content p {
    max-width: 40ch;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.65;
  }

  .scanner-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.55rem;
  }

  .scanner-actions .primary-button {
    padding: 0.8rem 1.15rem;
    font-size: 0.72rem;
  }

  .scanner-meta {
    color: var(--dim);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .quick-actions-card,
  .coach-card,
  .focus-card {
    padding: clamp(0.75rem, 1.2vw, 1rem);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: linear-gradient(160deg, var(--surface-2), var(--surface) 72%);
  }

  .section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .section-head > ion-icon {
    color: var(--dim);
    font-size: 0.9rem;
  }

  .section-head h3 {
    margin-top: 0.3rem;
    font-size: clamp(1.1rem, 1.6vw, 1.4rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.9rem;
  }

  .action-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
    min-width: 0;
    min-height: 112px;
    padding: 0.8rem;
    border: 1px solid var(--line);
    border-radius: 0.8rem;
    background: var(--surface-2);
    text-align: left;
  }

  .action-tile:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
    transform: translateY(-2px);
  }

  .tile-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-soft);
    font-size: 0.9rem;
  }

  .tile-copy {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .tile-copy strong {
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .tile-copy small {
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.3;
  }

  .tile-arrow {
    position: absolute;
    top: 0.95rem;
    right: 0.85rem;
    color: var(--dim);
    font-size: 0.7rem;
    transition: transform 0.3s var(--ease), color 0.3s var(--ease);
  }

  .action-tile:hover .tile-arrow {
    color: var(--white);
    transform: translateX(3px);
  }

  .coach-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .coach-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .coach-icon {
    display: grid;
    place-items: center;
    width: 1.85rem;
    height: 1.85rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 0.5rem;
    color: var(--white);
    font-size: 0.8rem;
  }

  .coach-title h3 {
    margin-top: 0.15rem;
    font-size: 1.05rem;
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .online-badge {
    padding: 0.22rem 0.4rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .coach-empty {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    margin: 0.85rem 0;
    padding: 0.85rem;
    border: 1px dashed var(--line-strong);
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.025);
  }

  .empty-index {
    font-family: var(--font-display);
    font-size: 1.2rem;
    line-height: 1;
    color: var(--dim);
  }

  .coach-empty p {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .coach-empty small {
    display: block;
    margin-top: 0.15rem;
    color: var(--muted);
    font-size: 0.54rem;
    line-height: 1.6;
  }

  .coach-card .primary-button {
    width: 100%;
  }

  .focus-count {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
  }

  .focus-list {
    display: grid;
    gap: 0;
    margin: 0.85rem 0;
    padding: 0;
    list-style: none;
  }

  .focus-list li {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 0;
    border-top: 1px solid var(--line);
  }

  .focus-check {
    display: grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    color: var(--black);
    font-size: 0.55rem;
  }

  .focus-list li.done .focus-check {
    background: var(--white);
    border-color: var(--white);
  }

  .focus-list li > span:last-child {
    display: grid;
    gap: 0.05rem;
  }

  .focus-list strong {
    font-size: 0.6rem;
    font-weight: 500;
    line-height: 1.3;
  }

  .focus-list small {
    color: var(--dim);
    font-size: 0.48rem;
  }

  .focus-list li.done strong {
    color: var(--muted);
    text-decoration: line-through;
    text-decoration-color: var(--dim);
  }

  .focus-button {
    width: 100%;
    padding: 0.6rem 0.9rem;
    font-size: 0.54rem;
  }

  /* ------------------------------------------------------ Undo toast */

  .undo-toast {
    position: fixed;
    left: 50%;
    bottom: calc(4.6rem + env(safe-area-inset-bottom, 0));
    z-index: 99999;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.65rem;
    width: min(92vw, 390px);
    overflow: hidden;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: rgba(18, 18, 18, 0.96);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transform: translateX(-50%);
  }

  .undo-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.06);
    color: var(--white);
    font-size: 0.9rem;
  }

  .undo-copy {
    display: grid;
    gap: 0.05rem;
    min-width: 0;
  }

  .undo-copy strong {
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .undo-copy small {
    overflow: hidden;
    color: var(--muted);
    font-size: 0.55rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .undo-action {
    padding: 0.42rem 0.72rem;
    border: 1px solid var(--white);
    border-radius: 0.45rem;
    background: var(--white);
    color: var(--black);
    font-family: var(--font-display);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .undo-action:hover {
    background: #dcdcdc;
    border-color: #dcdcdc;
  }

  .undo-action:active {
    transform: scale(0.96);
  }

  .undo-timer {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    background: var(--white);
    transform-origin: left center;
    animation-name: undoCountdown;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }

  .undo-toast-enter-active,
  .undo-toast-leave-active {
    transition:
      opacity 0.28s var(--ease-out),
      transform 0.28s var(--ease-out);
  }

  .undo-toast-enter-from,
  .undo-toast-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(14px);
  }

  @keyframes undoCountdown {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }

  /* -------------------------------------------------------- Responsive */

  @media (max-width: 1280px) {
    .quick-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1120px) {
    .dash-hero {
      grid-template-columns: 1fr;
    }

    .metric-rail {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .workspace-grid {
      grid-template-columns: 1fr;
    }

    .workspace-side {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }
  }

  @media (max-width: 800px) {
    .scanner-card {
      grid-template-columns: 1fr;
    }

    .scanner-visual {
      min-height: 210px;
    }

    .workspace-side {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .dash-hero {
      padding: 0 0 0.9rem;
    }

    .hero-head {
      flex-wrap: wrap;
      gap: 0.35rem 0.6rem;
    }

    .hero-copy h1 {
      font-size: clamp(2rem, 10vw, 2.7rem);
    }

    .hero-stats {
      gap: 0.5rem;
    }

    .hero-stat {
      flex: 1;
    }

    .hero-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .hero-actions .primary-button,
    .hero-actions .outline-button {
      width: 100%;
      padding: 0.72rem 0.45rem;
      font-size: 0.58rem;
      letter-spacing: 0.06em;
    }

    .momentum-card {
      padding: 0.9rem;
      border-radius: var(--radius);
    }

    .momentum-score {
      gap: 0.7rem;
    }

    .score-ring {
      width: 4.4rem;
    }

    .metric-rail {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
      margin-top: 0.8rem;
    }

    .rail-card {
      min-height: 0;
      gap: 0.4rem;
      padding: 0.75rem;
      border-radius: var(--radius);
    }

    .rail-head {
      align-items: flex-start;
    }

    .rail-icon {
      width: 1.55rem;
      height: 1.55rem;
      border-radius: 0.45rem;
      font-size: 0.78rem;
    }

    .rail-kicker {
      font-size: 0.58rem;
      letter-spacing: 0.1em;
    }

    .rail-badge,
    .streak-badge {
      padding: 0.14rem 0.38rem;
      font-size: 0.56rem;
      line-height: 1.2;
    }

    .streak-badge ion-icon {
      font-size: 0.55rem;
    }

    .rail-value {
      gap: 0.1rem;
    }

    .rail-value strong {
      font-size: 1.75rem;
      line-height: 1;
    }

    .rail-value > span {
      font-size: 0.62rem;
      line-height: 1.3;
    }

    .rail-track {
      height: 3px;
    }

    .rail-action {
      justify-content: center;
      padding: 0.26rem;
      border-radius: 0.55rem;
    }

    .rail-action-meta {
      display: none;
    }

    .rail-action-label {
      justify-content: center;
      width: 100%;
      padding: 0.34rem 0.4rem;
      font-size: 0.58rem;
      letter-spacing: 0.06em;
    }

    .rail-action-label ion-icon {
      font-size: 0.68rem;
    }

    .glass-row {
      gap: 0.2rem;
      margin: 0;
    }

    .glass-row span {
      height: 1rem;
      border-radius: 0.25rem;
    }

    .water-controls {
      gap: 0.2rem;
      padding: 0.2rem;
      border-radius: 0.55rem;
    }

    .water-step {
      width: 1.55rem;
      height: 1.55rem;
      border-radius: 0.4rem;
      font-size: 0.95rem;
    }

    .water-hint {
      overflow: hidden;
      font-size: 0.56rem;
      letter-spacing: 0.02em;
      text-overflow: ellipsis;
    }

    .week-chart {
      min-height: 66px;
      gap: 0.28rem;
    }

    .bar-chart {
      min-height: 46px;
      gap: 0.2rem;
    }

    .bar-chart span {
      border-radius: 0.2rem 0.2rem 0 0;
    }

    .week-labels {
      gap: 0.2rem;
      font-size: 0.52rem;
    }

    .quick-actions {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }

    .action-tile {
      min-height: 100px;
    }

    .scanner-card {
      gap: 0.8rem;
      padding: 0.8rem;
    }

    .scanner-visual {
      min-height: 190px;
      padding: 0.75rem;
    }

    .scan-frame {
      width: min(56%, 132px);
    }

    .scanner-content {
      gap: 0.4rem;
      padding: 0.15rem 0.15rem 0.3rem;
    }

    .scanner-content h2 {
      font-size: 1.4rem;
    }

    .scanner-content p {
      font-size: 0.74rem;
      line-height: 1.55;
    }

    .scanner-actions {
      width: 100%;
      margin-top: 0.35rem;
    }

    .scanner-actions .primary-button {
      width: 100%;
    }

    .scanner-meta {
      display: none;
    }

    .undo-toast {
      width: calc(100vw - 1.4rem);
    }
  }

  @media (max-width: 400px) {
    .hero-stats {
      flex-wrap: wrap;
      row-gap: 0.55rem;
    }

    .hero-stat {
      flex: 1 1 30%;
    }

    .hero-actions {
      grid-template-columns: 1fr;
    }

    .momentum-foot {
      flex-wrap: wrap;
      gap: 0.4rem;
    }
  }
</style>
