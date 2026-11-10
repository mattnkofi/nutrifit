<template>
  <ion-page class="planner-page">
    <ion-content :fullscreen="true" class="planner-content" :style="{ '--padding-top': 'calc(var(--header-h) + 1.15rem + env(safe-area-inset-top, 0))' }">
      <main class="planner-shell">
        <section class="planner-hero">
          <div class="hero-copy">
            <p class="eyebrow">Meal &amp; Workout Planner</p>
            <h1>Weekly Schedule</h1>
          </div>
          <div class="hero-side">
            <span class="page-tag">{{ liveDateTime }}</span>
          </div>
        </section>

        <section class="planner-workspace">
          <article class="plan-panel">
            <div class="plan-top">
              <div>
                <span class="card-kicker">Plan builder</span>
                <h2>This week</h2>
              </div>
              <div class="plan-tab-switch">
                <button
                  class="pts-btn"
                  :class="{ active: activeTab === 'workouts' }"
                  type="button"
                  @click="activeTab = 'workouts'"
                >
                  Workouts
                </button>
                <button
                  class="pts-btn"
                  :class="{ active: activeTab === 'meals' }"
                  type="button"
                  @click="activeTab = 'meals'"
                >
                  Meals
                </button>
              </div>
            </div>

            <div class="plan-summary">
              <div class="summary-copy">
                <span class="summary-index">Live Schedule</span>
                <strong>{{ aiPlan.length || aiMealPlan.length ? (activeTab === 'workouts' ? 'Active Workout Plan' : 'Active Meal Plan') : 'No active plan' }}</strong>
                <p>Ready and based on your goals.</p>
              </div>
              <span class="summary-mark"><ion-icon :icon="sparklesOutline" /></span>
            </div>

            <div class="week-strip" aria-hidden="true">
              <div
                v-for="day in weekDates"
                :key="day.key"
                class="day-slot"
                :class="{ today: day.key === todayKeyValue }"
              >
                <span>{{ day.label }}</span>
                <b>{{ String(day.dayNumber).padStart(2, '0') }}</b>
                <i></i>
              </div>
            </div>

            <div class="plan-options">
              <div class="option-row">
                <span class="option-icon"><ion-icon :icon="barbellOutline" /></span>
                <span><small>Workouts</small><strong>7-Day Custom Training</strong></span>
                <span class="option-tag">{{ userLevel }}</span>
              </div>
              <div class="option-row">
                <span class="option-icon"><ion-icon :icon="restaurantOutline" /></span>
                <span><small>Meals</small><strong>Balanced Nutrition Plan</strong></span>
                <span class="option-tag">{{ userEquipment }}</span>
              </div>
              <div class="option-row">
                <span class="option-icon"><ion-icon :icon="calendarOutline" /></span>
                <span><small>Real-Time Clock</small><strong>{{ liveDateTime }}</strong></span>
                <span class="option-tag">Live</span>
              </div>
            </div>

            <div class="generate-row">
              <div class="generate-copy">
                <span class="empty-icon"><ion-icon :icon="sparklesOutline" /></span>
                <p>{{ loading ? 'Generating Plan...' : (aiPlan.length || aiMealPlan.length ? 'Plan Ready' : 'No plan yet') }}</p>
                <small>Weekly workouts and meals around your goals and logged food history.</small>
              </div>
              <button class="primary-button" type="button" @click="generatePlans" :disabled="loading">
                {{ loading ? 'Generating...' : (aiPlan.length || aiMealPlan.length ? 'Regenerate Plan' : 'Create my plan') }} <ion-icon :icon="arrowForwardOutline" />
              </button>
            </div>

            <p v-if="planError" class="plan-error">{{ planError }}</p>

            <!-- Loading Skeleton during Generation / Regeneration -->
            <div v-if="loading" class="plan-loading-state">
              <div class="skeleton-card" v-for="n in 3" :key="n">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line medium"></div>
              </div>
            </div>

            <!-- Workouts Plan View -->
            <div v-else-if="activeTab === 'workouts' && aiPlan.length" class="plan-list animate-fade">
              <div v-for="day in aiPlan" :key="day.day" class="plan-day clickable-card" @click="openDayModal(day, 'workout')">
                <span class="plan-day-name">{{ day.day }}</span>
                <div class="plan-day-body">
                  <strong>{{ day.workout?.name }}</strong>
                  <small>
                    {{ day.workout?.group }} · <RollingNumber :value="day.workout?.exercises?.length || 0" />
                    exercise{{ (day.workout?.exercises?.length || 0) === 1 ? '' : 's' }}
                  </small>
                </div>
                <ion-icon :icon="chevronForwardOutline" class="day-arrow" />
              </div>
            </div>

            <!-- Meals Plan View (Closed accordions by default, current day open) -->
            <div v-else-if="activeTab === 'meals' && aiMealPlan.length" class="plan-list animate-fade">
              <div v-for="day in aiMealPlan" :key="day.day" class="meal-accordion-card" :class="{ open: isDayOpen(day.day) }">
                <div class="mac-header" @click="toggleMealDay(day.day)">
                  <div class="mac-title-group">
                    <span class="mac-day">{{ day.day }}</span>
                    <span class="mac-preview" v-if="!isDayOpen(day.day)"><RollingNumber :value="day.meals?.length || 0" /> meals planned</span>
                  </div>
                  <ion-icon :icon="isDayOpen(day.day) ? chevronUpOutline : chevronDownOutline" class="mac-chevron" />
                </div>
                <div v-if="isDayOpen(day.day)" class="mac-body animate-fade">
                  <div v-for="(m, mi) in day.meals" :key="mi" class="mac-meal-row">
                    <div class="mmr-top">
                      <span class="mmr-type">{{ m.mealType }}</span>
                      <span class="mmr-cal"><b><RollingNumber :value="m.calories" /></b> kcal</span>
                    </div>
                    <p class="mmr-desc">{{ m.food }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State if no plan generated yet and not loading -->
            <div v-else-if="!loading" class="plan-empty-notice">
              <p>Click "Create my plan" above to generate your customized weekly schedule.</p>
            </div>
          </article>

          <aside class="planner-side">
            <article class="sessions-panel">
              <div class="side-head">
                <div>
                  <span class="card-kicker">Your week</span>
                  <h2>Sessions &amp;<br />suggestions</h2>
                </div>
                <span class="pill"><RollingNumber :value="mealHistory.length" /> Meals Logged</span>
              </div>

              <div class="history-preview-list" v-if="mealHistory.length">
                <div v-for="(m, mi) in mealHistory.slice(0, 4)" :key="mi" class="hp-item">
                  <img :src="m.image" alt="Meal" v-if="m.image" />
                  <div class="hp-info">
                    <strong>{{ m.name }}</strong>
                    <span><RollingNumber :value="m.calories" /> kcal · {{ mealDateLabel(m) }}</span>
                  </div>
                </div>
              </div>

              <div class="sessions-empty" v-else>
                <p>No scanned meals yet</p>
                <small>Log meals in the Scanner tab to feed your nutrition history into the planner.</small>
              </div>
            </article>

            <article class="how-panel">
              <span class="card-kicker">How it works</span>
              <ol>
                <li><span>01</span><p>Set goals and preferences.</p></li>
                <li><span>02</span><p>Create a plan for the week based on your meals.</p></li>
                <li><span>03</span><p>Accept, swap or start your workouts.</p></li>
              </ol>
            </article>
          </aside>
        </section>
      </main>
    </ion-content>

    <!-- Workout Day Details Modal -->
    <transition name="modal-fade">
      <div v-if="selectedDayModal" class="plan-modal-backdrop" @click="selectedDayModal = null">
        <div class="plan-modal-card" @click.stop>
          <div class="pm-header">
            <div>
              <span class="pm-kicker">Workout Routine</span>
              <h2>{{ selectedDayModal.day }}</h2>
            </div>
            <button class="modal-close-btn" type="button" @click="selectedDayModal = null" aria-label="Close">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="pm-body">
            <div class="pm-workout-banner">
              <h3>{{ selectedDayModal.workout?.name }}</h3>
              <div class="pm-tags">
                <span v-if="selectedDayModal.workout?.group" class="pm-tag pm-tag-group">{{ selectedDayModal.workout?.group }}</span>
                <span v-if="selectedDayModal.workout?.level" class="pm-tag pm-tag-level">
                  <span class="pm-tag-label">Level</span>
                  {{ selectedDayModal.workout?.level }}
                </span>
              </div>
            </div>
            <div class="pm-exercises-list" v-if="selectedDayModal.workout?.exercises?.length">
              <div
                v-for="(ex, ei) in selectedDayModal.workout.exercises"
                :key="ei"
                class="pm-ex-item"
                :class="{ 'clickable-exercise': hasValidTutorial(ex.name) }"
                @click="hasValidTutorial(ex.name) && openExerciseDetailByName(ex.name)"
              >
                <div class="pei-top">
                  <strong><RollingNumber :value="ei + 1" />. {{ ex.name }}</strong>
                </div>
                <p class="pei-notes" v-if="ex.notes">{{ ex.notes }}</p>
                <small class="pei-hint" v-if="hasValidTutorial(ex.name)">VIEW YOUTUBE TUTORIAL &amp; GUIDE →</small>
              </div>
            </div>
          </div>

          <div class="pm-footer">
            <button class="scan-button pm-done-btn" type="button" @click="selectedDayModal = null">
              Done
            </button>
          </div>
        </div>
      </div>
    </transition>

    <ExerciseDetailModal
      :is-open="showExerciseModal"
      :exercise="selectedExercise"
      @close="showExerciseModal = false"
    />
  </ion-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import {
  arrowForwardOutline,
  barbellOutline,
  calendarOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  closeOutline,
  restaurantOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { generateWorkoutPlan, generateMealPlan } from '../services/aiService';
import { getExercisesByNames, normalizeExercise, loadExercises } from '../services/exercises';
import ExerciseDetailModal from '../components/ExerciseDetailModal.vue';
import RollingNumber from '../components/RollingNumber.vue';
import { useUserData } from '../composables/useUserData';
import { getWeekDates, todayKey } from '../services/userData';

const {
  profile,
  mealHistory,
  plans,
  savePlans,
  labels,
} = useUserData();

const aiPlan = computed(() => plans.value.workouts);
const aiMealPlan = computed(() => plans.value.meals);

const weekDates = computed(() => getWeekDates(0));
const todayKeyValue = todayKey();

const liveDateTime = ref('');
let clockTimer = null;

const updateLiveClock = () => {
  const now = new Date();
  liveDateTime.value = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(now);
};

const userLevel = computed(() => (labels.value.experience === 'Not set' ? 'Beginner' : labels.value.experience));
const userEquipment = computed(() => (labels.value.equipment === 'Not set' ? 'Bodyweight' : labels.value.equipment));

const mealDateLabel = (meal) => {
  if (!meal?.date) return 'No date';
  return String(meal.date).split(',')[0];
};

const activeTab = ref('workouts');
const loading = ref(false);
const planError = ref('');

const selectedDayModal = ref(null);
const showExerciseModal = ref(false);
const selectedExercise = ref(null);

const validExerciseNames = ref(new Set());

const daysMapFull = {
  'monday': 'Mon', 'mon': 'Mon',
  'tuesday': 'Tue', 'tue': 'Tue',
  'wednesday': 'Wed', 'wed': 'Wed',
  'thursday': 'Thu', 'thu': 'Thu',
  'friday': 'Fri', 'fri': 'Fri',
  'saturday': 'Sat', 'sat': 'Sat',
  'sunday': 'Sun', 'sun': 'Sun'
};

const getTodayShort = () => {
  const shortMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return shortMap[new Date().getDay()];
};

const openMealDays = ref({});

const isDayOpen = (dayName) => {
  const normalized = String(dayName || '').toLowerCase().trim();
  const short = daysMapFull[normalized] || normalized.slice(0, 3);
  if (openMealDays.value[dayName] !== undefined) {
    return openMealDays.value[dayName];
  }
  return short.toLowerCase() === getTodayShort().toLowerCase();
};

const toggleMealDay = (dayName) => {
  const current = isDayOpen(dayName);
  openMealDays.value = {
    ...openMealDays.value,
    [dayName]: !current
  };
};

const openDayModal = (dayData, type) => {
  if (type === 'workout') {
    selectedDayModal.value = dayData;
  }
};

const hasValidTutorial = (exerciseName) => {
  const clean = String(exerciseName || '').toLowerCase().trim();
  if (!clean || clean.includes('rest') || clean.includes('swim') || clean.includes('walk') || clean.includes('stretch') || clean.includes('recovery')) {
    return false;
  }
  for (const name of validExerciseNames.value) {
    if (name.includes(clean) || clean.includes(name)) return true;
  }
  return false;
};

const openExerciseDetailByName = async (exerciseName) => {
  try {
    const matches = await getExercisesByNames([exerciseName]);
    const found = matches.length ? matches[0] : null;
    if (found) {
      selectedExercise.value = normalizeExercise(found);
      showExerciseModal.value = true;
    }
  } catch (e) {
    console.error(e);
  }
};

const generatePlans = async () => {
  if (loading.value) return;
  loading.value = true;
  planError.value = '';

  const preferences = {
    goal: profile.value.goal || 'general_fitness',
    level: profile.value.experience || 'beginner',
    equipment: profile.value.equipment || 'bodyweight',
    dailyCalories: profile.value.dailyCalories || undefined,
    dailyProtein: profile.value.dailyProtein || undefined,
    age: profile.value.age || undefined,
    heightCm: profile.value.heightCm || undefined,
    weightKg: profile.value.weightKg || undefined,
  };

  try {
    const [workouts, meals] = await Promise.all([
      generateWorkoutPlan(preferences, mealHistory.value),
      generateMealPlan(preferences, mealHistory.value)
    ]);
    const nextWorkouts = Array.isArray(workouts) ? workouts : [];
    const nextMeals = Array.isArray(meals) ? meals : [];

    if (!nextWorkouts.length && !nextMeals.length) {
      planError.value = 'The planner returned an empty plan. Please try again.';
      return;
    }

    savePlans({ workouts: nextWorkouts, meals: nextMeals });
  } catch (e) {
    planError.value = e?.message || 'Could not create your plan. Please try again.';
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  updateLiveClock();
  clockTimer = setInterval(updateLiveClock, 30000);
  try {
    const all = await loadExercises();
    validExerciseNames.value = new Set(all.map(e => String(e.name || '').toLowerCase().trim()));
  } catch (e) {}
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<style scoped>
  :host {
    display: block;
    padding-top: 0;
  }

  .planner-content {
    --background: var(--bg);
  }

  .planner-shell {
    width: 100%;
    max-width: var(--content-max);
    margin: 0 auto;
    padding-top: clamp(0.6rem, 1.2vw, 0.9rem);
    padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0));
  }

  .planner-hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: clamp(1rem, 2.5vw, 3rem);
    padding-bottom: clamp(0.8rem, 1.4vw, 1.1rem);
    border-bottom: 1px solid var(--line);
  }

  .hero-copy h1 {
    margin-top: 0.3rem;
    font-size: clamp(2rem, 4.6vw, 3.3rem);
    font-weight: 500;
    line-height: 0.88;
    letter-spacing: 0.005em;
    text-transform: uppercase;
    word-break: break-word;
  }

  .hero-copy h1 span {
    color: var(--dim);
  }

  .page-subtitle {
    max-width: 54ch;
    margin-top: 0.55rem;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.7;
    word-break: break-word;
  }

  .hero-side {
    display: grid;
    justify-items: end;
    gap: 0.55rem;
    max-width: 260px;
    padding-bottom: 0.2rem;
  }

  .hero-side p {
    color: var(--dim);
    font-size: 0.6rem;
    line-height: 1.6;
    text-align: right;
    word-break: break-word;
  }

  .page-tag,
  .pill {
    display: inline-flex;
    align-items: center;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.46rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .planner-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
    align-items: start;
    gap: clamp(0.8rem, 1.5vw, 1.2rem);
    margin-top: clamp(0.9rem, 1.6vw, 1.3rem);
  }

  .plan-panel {
    display: grid;
    gap: clamp(0.85rem, 1.4vw, 1.1rem);
    min-width: 0;
    padding: clamp(0.9rem, 1.6vw, 1.3rem);
    border: 1px solid var(--line);
    border-radius: 1.5rem;
    background: var(--surface);
  }

  .plan-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.8rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
  }

  .plan-top h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.25rem, 2vw, 1.65rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .plan-tab-switch {
    display: flex;
    gap: 0.3rem;
    background: rgba(255, 255, 255, 0.04);
    padding: 0.25rem;
    border-radius: 0.85rem;
    border: 1px solid var(--line-strong);
  }

  .pts-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border: none;
    border-radius: 0.65rem;
    background: transparent;
    color: var(--muted);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pts-btn.active {
    background: var(--white);
    color: var(--black);
    box-shadow: 0 4px 14px rgba(255, 255, 255, 0.25);
    transform: scale(1.02);
  }

  .plan-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(0.8rem, 1.4vw, 1.05rem);
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: var(--surface-2);
    min-width: 0;
  }

  .summary-copy {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }

  .summary-index {
    color: var(--dim);
    font-size: 0.44rem;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .summary-copy strong {
    font-family: var(--font-display);
    font-size: clamp(1.05rem, 1.7vw, 1.35rem);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1;
    text-transform: uppercase;
    word-break: break-word;
  }

  .summary-copy p {
    max-width: 54ch;
    color: var(--muted);
    font-size: 0.6rem;
    line-height: 1.6;
    word-break: break-word;
  }

  .summary-mark {
    display: grid;
    place-items: center;
    width: 2.3rem;
    height: 2.3rem;
    flex-shrink: 0;
    border: 1px solid var(--line-strong);
    border-radius: 0.85rem;
    color: var(--white);
    font-size: 1rem;
  }

  .week-strip {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.3rem;
  }

  .day-slot {
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    padding: 0.55rem 0.2rem;
    border: 1px dashed var(--line);
    border-radius: 0.75rem;
    background: var(--surface-2);
    min-width: 0;
  }

  .day-slot.today {
    border-style: solid;
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .day-slot span {
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .day-slot b {
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 400;
    line-height: 1;
  }

  .day-slot i {
    width: 0.25rem;
    height: 0.25rem;
    border-radius: 50%;
    background: #343434;
  }

  .day-slot.today i {
    background: var(--white);
  }

  .plan-options {
    display: grid;
    border-top: 1px solid var(--line);
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0;
    border-bottom: 1px solid var(--line);
    min-width: 0;
  }

  .option-icon {
    display: grid;
    place-items: center;
    width: 1.65rem;
    height: 1.65rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .option-row > span:nth-child(2) {
    display: grid;
    gap: 0.05rem;
    min-width: 0;
    flex: 1;
  }

  .option-row small {
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .option-row strong {
    overflow: hidden;
    color: var(--text-soft);
    font-size: 0.58rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-tag {
    margin-left: auto;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    color: var(--dim);
    font-size: 0.4rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .generate-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.2rem;
    min-width: 0;
  }

  .generate-copy {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 0 0.65rem;
    min-width: 0;
    flex: 1;
  }

  .generate-copy .empty-icon {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.75rem;
    color: var(--white);
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .generate-copy p {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    word-break: break-word;
  }

  .generate-copy small {
    max-width: 46ch;
    color: var(--dim);
    font-size: 0.5rem;
    line-height: 1.55;
    word-break: break-word;
  }

  .generate-row .primary-button {
    flex-shrink: 0;
    border-radius: 999px;
  }

  .plan-loading-state {
    display: grid;
    gap: 0.6rem;
    padding: 0.5rem 0;
  }

  .skeleton-card {
    padding: 1rem;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: var(--surface-2);
    display: grid;
    gap: 0.5rem;
    animation: pulseSkeleton 1.2s infinite ease-in-out;
  }

  @keyframes pulseSkeleton {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .skeleton-line {
    height: 0.5rem;
    background: #242424;
    border-radius: 99px;
  }

  .skeleton-line.short { width: 30%; }
  .skeleton-line.medium { width: 65%; }

  .animate-fade {
    animation: fadeInTab 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInTab {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .plan-empty-notice {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--muted);
    font-size: 0.75rem;
  }

  .plan-error {
    margin-top: 0.7rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.6rem;
    color: var(--text-soft);
    font-size: 0.62rem;
    line-height: 1.5;
  }

  .clickable-day {
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .clickable-day:hover {
    border-color: var(--line-strong);
    background: rgba(255, 255, 255, 0.04);
  }

  .day-arrow {
    margin-left: auto;
    color: var(--dim);
    font-size: 0.9rem;
  }

  /* Meal Accordion Card */
  .meal-accordion-card {
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--surface-2);
    overflow: hidden;
    transition: border-color 0.2s ease;
  }

  .meal-accordion-card.open {
    border-color: var(--line-strong);
    background: rgba(255, 255, 255, 0.03);
  }

  .mac-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    cursor: pointer;
  }

  .mac-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mac-day {
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--white);
    min-width: 3.2rem;
  }

  .mac-preview {
    font-size: 0.58rem;
    color: var(--dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mac-chevron {
    color: var(--dim);
    font-size: 0.9rem;
  }

  .mac-body {
    display: grid;
    gap: 0.5rem;
    padding: 0 1rem 1rem 1rem;
    border-top: 1px solid var(--line);
    padding-top: 0.75rem;
  }

  .mac-meal-row {
    padding: 0.6rem 0.8rem;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line);
    display: grid;
    gap: 0.2rem;
  }

  .mmr-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mmr-type {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--white);
  }

  .mmr-cal {
    font-size: 0.65rem;
    color: var(--muted);
  }

  .mmr-desc {
    font-size: 0.68rem;
    color: var(--dim);
    margin: 0;
    text-transform: capitalize;
    word-break: break-word;
  }

  /* Plan Day Details Modal */
  .plan-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483655;
    display: grid;
    place-items: center;
    background: transparent;
    padding: 1rem;
  }

  .plan-modal-backdrop::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: rgba(3, 3, 3, 0.92);
    pointer-events: none;
  }

  .plan-modal-card {
    width: 100%;
    max-width: 440px;
    max-height: 84vh;
    overflow-y: auto;
    border-radius: 1.75rem;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #0d0d0f;
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.98), 0 0 50px rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    padding: 1.5rem;
    will-change: transform, opacity;
  }

  .modal-fade-enter-active {
    transition: opacity 0.28s var(--ease-out);
  }

  .modal-fade-leave-active {
    transition: opacity 0.2s var(--ease);
  }

  .modal-fade-enter-active::before {
    transition: opacity 0.22s var(--ease-out);
  }

  .modal-fade-leave-active::before {
    transition: opacity 0.18s var(--ease);
  }

  .modal-fade-enter-from::before,
  .modal-fade-leave-to::before {
    opacity: 0;
  }

  .modal-fade-enter-active .plan-modal-card {
    transition: transform 0.28s var(--ease-out), opacity 0.22s var(--ease-out);
    will-change: transform, opacity;
  }

  .modal-fade-leave-active .plan-modal-card {
    transition: transform 0.2s var(--ease), opacity 0.16s var(--ease);
    will-change: transform, opacity;
  }

  .modal-fade-enter-from .plan-modal-card {
    opacity: 0;
    transform: translate3d(0, 12px, 0) scale(0.97);
  }

  .modal-fade-leave-to .plan-modal-card {
    opacity: 0;
    transform: translate3d(0, 6px, 0) scale(0.985);
  }

  @media (max-width: 767px) {
    .modal-fade-enter-from .plan-modal-card {
      transform: translate3d(0, 18px, 0) scale(0.96);
    }

    .modal-fade-leave-to .plan-modal-card {
      transform: translate3d(0, 8px, 0) scale(0.98);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-fade-enter-active,
    .modal-fade-leave-active,
    .modal-fade-enter-active::before,
    .modal-fade-leave-active::before,
    .modal-fade-enter-active .plan-modal-card,
    .modal-fade-leave-active .plan-modal-card {
      transition-duration: 0.01ms;
    }

    .modal-fade-enter-from .plan-modal-card,
    .modal-fade-leave-to .plan-modal-card {
      transform: none;
    }
  }

  .pm-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.85rem;
  }

  .pm-kicker {
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--dim);
  }

  .pm-header h2 {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--white);
    margin: 0.15rem 0 0;
  }

  .modal-close-btn {
    display: grid;
    place-items: center;
    width: 2.15rem;
    height: 2.15rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text);
    font-size: 1.05rem;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .modal-close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.28);
  }

  .pm-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .pm-workout-banner {
    display: grid;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--line);
  }

  .pm-workout-banner h3 {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--white);
    margin: 0;
  }

  .pm-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.35rem;
  }

  .pm-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.65rem;
    border-radius: 999px;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-transform: uppercase;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--line);
    white-space: nowrap;
  }

  .pm-tag-group {
    color: var(--white);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .pm-tag-label {
    color: var(--dim);
    font-weight: 500;
  }

  .pm-exercises-list {
    display: grid;
    gap: 0.5rem;
    max-height: 260px;
    overflow-y: auto;
    padding-right: 0.2rem;
  }

  .pm-ex-item {
    padding: 0.75rem 0.9rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--line);
    display: grid;
    gap: 0.25rem;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .pm-ex-item.clickable-exercise {
    cursor: pointer;
  }

  .pm-ex-item.clickable-exercise:hover {
    border-color: var(--line-strong);
    background: rgba(255, 255, 255, 0.05);
  }

  .pei-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pei-top strong {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--white);
    text-transform: capitalize;
  }

  .pei-sets {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--muted);
  }

  .pei-notes {
    font-size: 0.62rem;
    color: var(--dim);
    margin: 0;
  }

  .pei-hint {
    font-size: 0.55rem;
    color: var(--white);
    font-weight: 600;
    margin-top: 0.2rem;
  }

  .pm-footer {
    border-top: 1px solid var(--line);
    padding-top: 1rem;
    display: flex;
  }

  .pm-done-btn {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: 999px;
  }

  .planner-side {
    display: grid;
    gap: clamp(0.7rem, 1.2vw, 1rem);
    min-width: 0;
  }

  .sessions-panel,
  .how-panel {
    padding: clamp(0.85rem, 1.5vw, 1.15rem);
    border: 1px solid var(--line);
    border-radius: 1.5rem;
    background: var(--surface);
    min-width: 0;
  }

  .side-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--line);
    min-width: 0;
  }

  .side-head h2 {
    margin-top: 0.25rem;
    font-size: clamp(1.15rem, 1.8vw, 1.5rem);
    font-weight: 500;
    line-height: 0.92;
    text-transform: uppercase;
    word-break: break-word;
  }

  .how-panel ol {
    display: grid;
    gap: 0;
    margin: 0.6rem 0 0;
    padding: 0;
    list-style: none;
  }

  .how-panel li {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0;
    border-top: 1px solid var(--line);
    min-width: 0;
  }

  .how-panel li span {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.5rem;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }

  .how-panel li p {
    color: var(--muted);
    font-size: 0.56rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .plan-list {
    display: grid;
    gap: 0.45rem;
    padding-top: 0.2rem;
  }

  .plan-day {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--surface-2);
    min-width: 0;
  }

  .plan-day-name {
    color: var(--dim);
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    min-width: 3.2rem;
    flex-shrink: 0;
  }

  .plan-day-body {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
    flex: 1;
  }

  .plan-day-body strong {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    word-break: break-word;
  }

  .plan-day-body small {
    color: var(--muted);
    font-size: 0.52rem;
    word-break: break-word;
  }

  .history-preview-list {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.75rem;
    max-height: 220px;
    overflow-y: auto;
  }

  .hp-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.6rem;
    border-radius: 0.85rem;
    background: var(--surface-2);
    border: 1px solid var(--line);
    min-width: 0;
  }

  .hp-item img {
    width: 32px;
    height: 32px;
    border-radius: 0.5rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  .hp-info {
    display: grid;
    gap: 0.05rem;
    min-width: 0;
    flex: 1;
  }

  .hp-info strong {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--white);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hp-info span {
    font-size: 0.52rem;
    color: var(--dim);
  }

  .sessions-empty {
    margin-top: 0.65rem;
    padding-top: 0.65rem;
    border-top: 1px solid var(--line);
  }

  .sessions-empty p {
    font-family: var(--font-display);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .sessions-empty small {
    display: block;
    margin-top: 0.15rem;
    color: var(--dim);
    font-size: 0.5rem;
    line-height: 1.55;
  }

  @media (min-width: 1024px) {
    .planner-shell {
      padding-top: 0;
      padding-bottom: 2.5rem;
    }

    .planner-hero {
      padding-bottom: 1.4rem;
    }

    .planner-workspace {
      gap: 1.4rem;
      margin-top: 1.5rem;
    }
  }

  @media (max-width: 1100px) {
    .planner-workspace {
      grid-template-columns: 1fr;
    }

    .planner-side {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }
  }

  @media (max-width: 820px) {
    .planner-hero {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.9rem;
    }

    .hero-side {
      justify-items: start;
      max-width: 440px;
    }

    .hero-side p {
      text-align: left;
    }
  }

  @media (max-width: 700px) {
    .hero-copy h1 {
      font-size: clamp(1.9rem, 9vw, 2.7rem);
    }

    .week-strip {
      display: flex;
      grid-template-columns: none;
      gap: 0.4rem;
      overflow-x: auto;
      padding-bottom: 0.35rem;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    .week-strip::-webkit-scrollbar {
      display: none;
    }

    .day-slot {
      flex: 0 0 3.15rem;
      scroll-snap-align: start;
    }

    .generate-row {
      align-items: stretch;
      flex-direction: column;
    }

    .generate-row .primary-button {
      width: 100%;
    }

    .planner-side {
      grid-template-columns: 1fr;
    }

    .plan-summary {
      align-items: flex-start;
    }

    .summary-mark {
      width: 2rem;
      height: 2rem;
      font-size: 0.85rem;
    }
  }
</style>
