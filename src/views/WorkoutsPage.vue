<template>
  <ion-page class="workouts-page">

    <ion-content :fullscreen="true" class="workouts-content" :style="{ '--padding-top': 'calc(5rem + env(safe-area-inset-top, 0))' }">
      <main class="workouts-shell">

        <!-- ================= HERO ================= -->
        <section class="workouts-hero">
          <div class="hero-copy">
            <span class="eyebrow">Training</span>
            <h1>Workouts<span>.</span></h1>
            <p class="hero-sub">Pick a workout, build your session, then follow the guided timer.</p>
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <strong><RollingNumber :value="sessionExercises.length" /></strong>
              <span>Exercises ready</span>
            </div>
            <div class="hero-stat">
              <strong><RollingNumber :value="sessionEstimate" /><small>min</small></strong>
              <span>Estimated time</span>
            </div>
          </div>
        </section>

        <!-- ================= YOUR SESSION ================= -->
        <section class="session-section" id="session">
          <div class="section-head">
            <div>
              <span class="card-kicker">Step 1</span>
              <h2>Your session.</h2>
              <p class="section-sub">Add exercises below, then start when you're ready.</p>
            </div>
            <span class="pill" v-if="sessionExercises.length">
              <RollingNumber :value="sessionExercises.length" /> exercise{{ sessionExercises.length > 1 ? 's' : '' }} · ~<RollingNumber :value="sessionEstimate" /> min
            </span>
          </div>

          <div class="session-history" v-if="lastSession">
            <span class="history-icon"><ion-icon :icon="checkmarkCircleOutline" /></span>
            <div class="history-copy">
              <span class="card-kicker">Last completed</span>
              <strong>{{ lastSession.title || 'Completed workout' }}</strong>
              <small><RollingNumber :value="lastSession.exercises || 0" /> exercises · <RollingNumber :value="lastSession.sets || 0" /> sets · <RollingNumber :value="lastSession.minutes || 0" /> min</small>
            </div>
            <button class="text-btn" type="button" :disabled="!lastSession.items?.length" @click="repeatLastSession">
              <ion-icon :icon="playCircleOutline" /> Repeat
            </button>
          </div>

          <div class="session-panel" v-if="sessionExercises.length">
            <p class="session-reorder-hint" v-if="sessionExercises.length > 1">
              <ion-icon :icon="reorderThreeOutline" />
              Hold the handle, then drag to reorder
            </p>

            <ul class="session-list">
              <li
                class="session-item"
                v-for="(ex, idx) in sessionExercises"
                :key="ex.id || ex.name"
                :class="{ dragging: dragState?.active && dragState.index === idx }"
                :style="dragRowStyle(idx)"
              >
                <button
                  class="drag-handle"
                  type="button"
                  :aria-label="`Hold and drag to reorder ${ex.name}`"
                  @pointerdown.prevent="startDrag($event, idx)"
                  @contextmenu.prevent
                >
                  <ion-icon :icon="reorderThreeOutline" />
                </button>
                <span class="session-index"><RollingNumber :value="idx + 1" /></span>
                <div class="session-info">
                  <strong>{{ ex.name }}</strong>
                  <div class="session-meta">
                    <span class="meta-chip"><RollingNumber :value="prescriptionFor(ex).sets" /> sets</span>
                    <span class="meta-chip">{{ prescriptionFor(ex).reps }}</span>
                    <span class="meta-chip">Rest {{ prescriptionFor(ex).rest }}</span>
                  </div>
                </div>
                <button class="icon-btn" type="button" aria-label="Remove exercise" @click="removeFromSession(idx)">
                  <ion-icon :icon="closeOutline" />
                </button>
              </li>
            </ul>
            <div class="session-actions">
              <button class="primary-button start-btn" type="button" @click="startSession(sessionExercises, 'My session')">
                <ion-icon :icon="playCircleOutline" /> Start workout
              </button>
              <button class="text-btn" type="button" @click="clearSession">Clear all</button>
            </div>
          </div>

          <div class="session-panel session-empty" v-else>
            <span class="empty-icon"><ion-icon :icon="addCircleOutline" /></span>
            <div class="empty-copy">
              <strong>Your session is empty</strong>
              <p>Add exercises from the picks below, or browse the full library to build your workout.</p>
            </div>
            <button class="outline-button" type="button" :disabled="!recommendations.length" @click="addRecommendations">
              Use recommendations
            </button>
          </div>
        </section>

        <!-- ================= RECOMMENDED ================= -->
        <section class="recommendations">
          <div class="section-head">
            <div>
              <span class="card-kicker">Step 2</span>
              <h2>Picked for you.</h2>
              <p class="section-sub">Tap a card to see the full guide, or add it straight to your session.</p>
            </div>
            <span class="pill" :class="{ loading: loadingRecommendations }">
              <i></i> {{ loadingRecommendations ? 'Building your plan' : 'Updated daily' }}
            </span>
          </div>

          <div class="rec-grid" v-if="loadingRecommendations">
            <article class="rec-card rec-skeleton" v-for="n in 6" :key="'skeleton-' + n">
              <div class="rec-thumb"></div>
              <div class="card-body">
                <span class="skeleton-line skeleton-line-short"></span>
                <span class="skeleton-line"></span>
                <span class="skeleton-line skeleton-line-tiny"></span>
              </div>
            </article>
          </div>

          <div class="rec-grid" v-else-if="recommendations && recommendations.length">
            <article class="rec-card" v-for="(ex, index) in recommendations" :key="ex.id" :style="{ '--i': index }" @click.stop="openExercise(ex)">
              <div class="rec-thumb" v-if="ex.images && ex.images.length">
                <img
                  :src="getExerciseImage(ex.images[0])"
                  :alt="ex.name"
                  loading="lazy"
                  @error="handleExerciseImageError($event, ex.images[0])"
                />
                <span class="thumb-level">{{ getLevelLabel(ex.level) }}</span>
              </div>
              <div class="card-body">
                <span class="card-tag">{{ ex.group }}</span>
                <h3>{{ ex.name }}</h3>
                <p class="card-meta">{{ (ex.muscles || []).join(', ') }}</p>
                <div class="card-actions">
                  <button class="link-button" @click.stop="openExercise(ex)">
                    Details <ion-icon :icon="arrowForwardOutline" />
                  </button>
                  <button
                    class="add-btn"
                    :class="{ added: isInSession(ex) }"
                    :disabled="isInSession(ex)"
                    @click.stop="addToSession(ex)"
                    :aria-label="isInSession(ex) ? 'Already in your session' : 'Add to session'"
                  >
                    <ion-icon :icon="isInSession(ex) ? checkmarkCircleOutline : addOutline" />
                    {{ isInSession(ex) ? 'Added' : 'Add' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-state-block">
            <span class="empty-icon"><ion-icon :icon="sparklesOutline" /></span>
            <p>No recommendations yet</p>
            <small>Complete your profile and goals to get personalized workout picks.</small>
          </div>
        </section>

        <!-- ================= LIBRARY ================= -->
        <section class="library" id="library">
          <div class="section-head">
            <div>
              <span class="card-kicker">Step 3</span>
              <h2>Browse all exercises.</h2>
              <p class="section-sub">Search and filter to find exactly what you need.</p>
            </div>
            <span class="pill"><RollingNumber :value="libraryResults.length" /> exercise{{ libraryResults.length === 1 ? '' : 's' }}</span>
          </div>

          <div class="search-bar">
            <ion-icon :icon="searchOutline" />
            <input v-model="searchQuery" type="text" placeholder="Search by name or muscle..." aria-label="Search exercises" />
            <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''" aria-label="Clear search">
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="filter-dropdowns-bar">
            <!-- Workout Type Dropdown -->
            <div class="custom-dropdown" :class="{ open: openDropdown === 'type' }">
              <span class="cd-label">Type</span>
              <button class="cd-trigger" type="button" @click.stop="toggleDropdown('type')">
                <span>{{ activeChip }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openDropdown === 'type'" class="cd-menu">
                <button
                  v-for="chip in chips"
                  :key="chip"
                  class="cd-option"
                  :class="{ active: activeChip === chip }"
                  type="button"
                  @click="activeChip = chip; openDropdown = null"
                >{{ chip }}</button>
              </div>
            </div>

            <!-- Experience Level Dropdown -->
            <div class="custom-dropdown" :class="{ open: openDropdown === 'level' }">
              <span class="cd-label">Level</span>
              <button class="cd-trigger" type="button" @click.stop="toggleDropdown('level')">
                <span>{{ activeLevel }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openDropdown === 'level'" class="cd-menu">
                <button
                  v-for="level in levels"
                  :key="level"
                  class="cd-option"
                  :class="{ active: activeLevel === level }"
                  type="button"
                  @click="activeLevel = level; openDropdown = null"
                >{{ level }}</button>
              </div>
            </div>

            <!-- Equipment Dropdown -->
            <div class="custom-dropdown" :class="{ open: openDropdown === 'equipment' }">
              <span class="cd-label">Equipment</span>
              <button class="cd-trigger" type="button" @click.stop="toggleDropdown('equipment')">
                <span>{{ activeEquipment }}</span>
                <ion-icon :icon="chevronDownOutline" />
              </button>
              <div v-if="openDropdown === 'equipment'" class="cd-menu">
                <button
                  v-for="eq in equipmentOptions"
                  :key="eq"
                  class="cd-option"
                  :class="{ active: activeEquipment === eq }"
                  type="button"
                  @click="activeEquipment = eq; openDropdown = null"
                >{{ eq }}</button>
              </div>
            </div>
          </div>

          <div class="library-grid" v-if="loadingLibrary">
            <article class="lib-card skeleton-lib-card" v-for="n in 6" :key="'skel-' + n">
              <div class="skeleton-thumb"></div>
              <div class="card-body">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            </article>
          </div>

          <div class="library-grid" v-else-if="pagedLibrary.length">
            <article class="lib-card" v-for="(ex, index) in pagedLibrary" :key="ex.id" :style="{ '--i': index }" @click.stop="openExercise(ex)">
              <div class="lib-thumb" v-if="ex.images && ex.images.length">
                <img
                  :src="getExerciseImage(ex.images[0])"
                  :alt="ex.name"
                  loading="lazy"
                  @error="handleExerciseImageError($event, ex.images[0])"
                />
                <span class="thumb-level">{{ getLevelLabel(ex.level) }}</span>
              </div>
              <div class="card-body">
                <span class="card-tag">{{ ex.group }}</span>
                <h3>{{ ex.name }}</h3>
                <p class="card-meta">{{ (ex.muscles || []).join(', ') }}</p>
                <div class="card-actions">
                  <button class="link-button" @click.stop="openExercise(ex)">
                    Details <ion-icon :icon="arrowForwardOutline" />
                  </button>
                  <button
                    class="add-btn"
                    :class="{ added: isInSession(ex) }"
                    :disabled="isInSession(ex)"
                    @click.stop="addToSession(ex)"
                    :aria-label="isInSession(ex) ? 'Already in your session' : 'Add to session'"
                  >
                    <ion-icon :icon="isInSession(ex) ? checkmarkCircleOutline : addOutline" />
                    {{ isInSession(ex) ? 'Added' : 'Add' }}
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-state-block">
            <span class="empty-icon"><ion-icon :icon="searchOutline" /></span>
            <p>No exercises found</p>
            <small>Try a different search term or adjust your filters.</small>
          </div>

          <div class="pagination" v-if="libraryResults.length > pageSize">
            <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">
              <ion-icon :icon="arrowBackOutline" /> Prev
            </button>
            <span class="page-info">Page <RollingNumber :value="currentPage" /> of <RollingNumber :value="totalPages" /></span>
            <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">
              Next <ion-icon :icon="arrowForwardOutline" />
            </button>
          </div>
        </section>

      </main>
    </ion-content>

    <div class="session-toast" v-if="sessionNotice" role="status">{{ sessionNotice }}</div>

    <ExerciseDetailModal
      :is-open="showModal"
      :exercise="selectedExercise"
      :in-session="isInSession(selectedExercise)"
      @close="showModal = false"
      @add="addToSession"
      @start="startSingle"
    />
    <WorkoutSessionModal
      :is-open="showSession"
      :exercises="sessionExercisesForModal"
      :title="sessionTitle"
      @close="showSession = false"
      @complete="handleSessionComplete"
    />
  </ion-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';

import ExerciseDetailModal from '../components/ExerciseDetailModal.vue';
import WorkoutSessionModal from '../components/WorkoutSessionModal.vue';
import RollingNumber from '../components/RollingNumber.vue';
import { IonPage, IonContent } from '@ionic/vue';
import {
  addCircleOutline,
  addOutline,
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  closeOutline,
  playCircleOutline,
  reorderThreeOutline,
  searchOutline,
  sparklesOutline,
} from 'ionicons/icons';
import {
  getExerciseImage,
  getRecommendations,
  handleExerciseImageError,
  resolveRecommendedExercises,
  searchExercises,
} from '../services/exercises';
import {
  getLevelLabel,
  getPrescription,
  getWorkoutSummary,
} from '../services/exerciseGuide';
import { getRecommendedWorkouts } from '../services/aiService';
import { useUserData } from '../composables/useUserData';

const {
  profile,
  session,
  workoutHistory,
  saveSession,
  addWorkout,
} = useUserData();

const chips = ['All', 'Calisthenics', 'Weight Training', 'Cardio', 'Mobility'];
const levels = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const equipmentOptions = ['All', 'Bodyweight', 'Dumbbell', 'Barbell', 'Bands', 'Kettlebell'];
const activeChip = ref('All');
const activeLevel = ref('All');
const activeEquipment = ref('All');
const openDropdown = ref(null);

const toggleDropdown = (name) => {
  openDropdown.value = openDropdown.value === name ? null : name;
};

onMounted(() => {
  const handleOutsideClick = (e) => {
    if (!e.target.closest('.custom-dropdown')) {
      openDropdown.value = null;
    }
  };
  document.addEventListener('click', handleOutsideClick);
  onUnmounted(() => document.removeEventListener('click', handleOutsideClick));
});
const searchQuery = ref('');
const recommendations = ref([]);
const loadingRecommendations = ref(true);
const libraryResults = ref([]);
const loadingLibrary = ref(true);
const showModal = ref(false);
const selectedExercise = ref(null);
const showSession = ref(false);
const sessionExercises = session;
const sessionExercisesForModal = ref([]);
const sessionTitle = ref('My session');
const sessionNotice = ref('');
const lastSession = computed(() => workoutHistory.value[0] || null);
const currentPage = ref(1);
const pageSize = 12;

let noticeTimer = null;

const notify = (message) => {
  sessionNotice.value = message;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    sessionNotice.value = '';
  }, 2200);
};

// ---------------------------------------------------------------------------
// Session reordering: hold the drag handle, then move the row up or down.
// Only the handle starts a drag, so normal page scrolling still works.
// ---------------------------------------------------------------------------
const dragState = ref(null);
let dragTimer = null;
let settleTimer = null;

// Rows open a gap while dragging so the list visibly makes room for the
// row under your finger, then settle into place when you let go.
const dragShift = (index) => {
  const drag = dragState.value;
  if (!drag?.active || drag.settling) return 0;

  const from = drag.index;
  const to = drag.dropIndex;

  if (from < to && index > from && index <= to) return -drag.pitch;
  if (from > to && index >= to && index < from) return drag.pitch;
  return 0;
};

const dragRowStyle = (index) => {
  const drag = dragState.value;
  if (!drag?.active) return null;

  if (index === drag.index) {
    const offset = drag.settling ? drag.settleOffset : drag.delta;
    return {
      transform: `translate3d(0, ${offset}px, 0) scale(${offset === 0 ? 1 : 1.015})`,
      transition: drag.settling && !drag.committing ? 'transform 0.36s var(--ease-out)' : 'none',
      zIndex: 5,
      willChange: 'transform',
    };
  }

  const shift = dragShift(index);
  return {
    transform: `translate3d(0, ${shift}px, 0)`,
    transition: drag.committing ? 'none' : 'transform 0.32s var(--ease-out)',
  };
};

const removeDragListeners = () => {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  window.removeEventListener('pointercancel', onDragCancel);
};

const resetDrag = () => {
  if (dragTimer) {
    window.clearTimeout(dragTimer);
    dragTimer = null;
  }
  if (settleTimer) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
  removeDragListeners();
  dragState.value = null;
  document.body.classList.remove('session-reordering');
};

const activateDrag = () => {
  dragTimer = null;
  const drag = dragState.value;
  if (!drag) return;

  const rows = Array.from(drag.list.querySelectorAll('.session-item'));
  const rects = rows.map((row) => row.getBoundingClientRect());
  const current = rects[drag.index];
  if (!current || rects.length < 2) {
    resetDrag();
    return;
  }

  drag.active = true;
  drag.startY = drag.lastY;
  drag.startX = drag.lastX;
  drag.delta = 0;
  drag.dropIndex = drag.index;
  drag.slotTops = rects.map((rect) => rect.top);
  drag.centerPoints = rects.map((rect) => rect.top + rect.height / 2);
  drag.height = current.height;
  drag.pitch = drag.centerPoints[1] - drag.centerPoints[0];

  document.body.classList.add('session-reordering');
  try {
    navigator.vibrate?.(10);
  } catch {
    // Haptics are optional.
  }
};

const nearestDropIndex = (drag) => {
  const dragCenter = drag.slotTops[drag.index] + drag.delta + drag.height / 2;
  let target = 0;

  for (let i = 1; i < drag.centerPoints.length; i += 1) {
    const boundary = (drag.centerPoints[i - 1] + drag.centerPoints[i]) / 2;
    if (dragCenter > boundary) target = i;
  }

  return target;
};

const onDragMove = (event) => {
  const drag = dragState.value;
  if (!drag) return;

  drag.lastY = event.clientY;
  drag.lastX = event.clientX;

  if (!drag.active) {
    // A quick swipe should scroll the page, not lift the row.
    if (Math.abs(event.clientY - drag.startY) > 8 || Math.abs(event.clientX - drag.startX) > 8) {
      resetDrag();
    }
    return;
  }

  if (drag.settling) return;
  if (event.cancelable) event.preventDefault();

  drag.delta = event.clientY - drag.startY;
  drag.dropIndex = nearestDropIndex(drag);
};

const finishDrag = () => {
  const drag = dragState.value;
  if (!drag) return;

  if (!drag.active) {
    resetDrag();
    return;
  }
  if (drag.settling) return;

  removeDragListeners();
  document.body.classList.remove('session-reordering');

  const from = drag.index;
  const to = drag.dropIndex;
  const settleOffset = drag.slotTops[from] + drag.delta - drag.slotTops[to];

  if (to !== from) {
    const next = [...sessionExercises.value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    sessionExercises.value = next;
    persistSession();
    notify('Session order updated');
  }

  // Commit the new order without moving anything on screen: the sibling
  // rows are already sitting in their future slots, so clearing the gap
  // shifts and reordering happens in the same frame.
  drag.committing = true;
  drag.settling = true;
  drag.index = to;
  drag.dropIndex = to;
  drag.settleOffset = settleOffset;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (dragState.value !== drag) return;
      drag.committing = false;
      drag.settleOffset = 0;
      settleTimer = window.setTimeout(() => {
        if (dragState.value === drag) resetDrag();
      }, 420);
    });
  });
};

const onDragEnd = () => finishDrag();

const onDragCancel = () => finishDrag();

const startDrag = (event, index) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  if (dragState.value) resetDrag();

  const row = event.currentTarget.closest('.session-item');
  const list = row?.parentElement;
  if (!row || !list) return;

  dragState.value = {
    index,
    dropIndex: index,
    startY: event.clientY,
    startX: event.clientX,
    lastY: event.clientY,
    lastX: event.clientX,
    delta: 0,
    active: false,
    settling: false,
    committing: false,
    row,
    list,
  };

  dragTimer = window.setTimeout(activateDrag, 180);
  window.addEventListener('pointermove', onDragMove, { passive: false });
  window.addEventListener('pointerup', onDragEnd);
  window.addEventListener('pointercancel', onDragCancel);
};

onUnmounted(() => {
  resetDrag();
});


const totalPages = computed(() => {
  if (!libraryResults.value.length) return 1;
  return Math.max(1, Math.ceil(libraryResults.value.length / pageSize));
});

const pagedLibrary = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return libraryResults.value.slice(start, start + pageSize);
});

const sessionSummary = computed(() => getWorkoutSummary(sessionExercises.value));
const sessionEstimate = computed(() =>
  sessionSummary.value.exercises ? sessionSummary.value.minutes : 0
);

const prescriptionFor = (exercise) => getPrescription(exercise);

const goPage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
};

const persistSession = () => {
  saveSession(sessionExercises.value.filter((ex) => ex?.name));
};

const loadData = async () => {
  loadingRecommendations.value = true;
  loadingLibrary.value = true;
  try {
    const userPrefs = {
      goal: profile.value.goal || 'general_fitness',
      level: profile.value.experience || 'beginner',
      equipment: profile.value.equipment || 'bodyweight',
      activityLevel: profile.value.activityLevel || 'moderate',
      age: profile.value.age || undefined,
      weightKg: profile.value.weightKg || undefined,
    };
    let rec = [];
    try {
      rec = await getRecommendedWorkouts(userPrefs);
    } catch (e) {
      rec = [];
    }
    recommendations.value = await resolveRecommendedExercises(
      Array.isArray(rec) ? rec : [],
      userPrefs
    );
  } catch (e) {
    console.error('Failed to load recommendations', e);
    try {
      recommendations.value = await getRecommendations();
    } catch (fallbackError) {
      recommendations.value = [];
    }
  } finally {
    loadingRecommendations.value = false;
  }
  try {
    const lib = await searchExercises(searchQuery.value, activeChip.value, {
      level: activeLevel.value,
      equipment: activeEquipment.value,
    });
    libraryResults.value = Array.isArray(lib) ? lib : [];
    currentPage.value = 1;
  } catch (e) {
    console.error('Failed to load library', e);
    libraryResults.value = [];
    currentPage.value = 1;
  } finally {
    loadingLibrary.value = false;
  }
};

const refreshLibrary = async () => {
  loadingLibrary.value = true;
  try {
    const res = await searchExercises(searchQuery.value, activeChip.value, {
      level: activeLevel.value,
      equipment: activeEquipment.value,
    });
    libraryResults.value = Array.isArray(res) ? res : [];
    currentPage.value = 1;
  } catch (e) {
    console.error('Failed to refresh library', e);
    libraryResults.value = [];
    currentPage.value = 1;
  } finally {
    loadingLibrary.value = false;
  }
};

const openExercise = (ex) => {
  selectedExercise.value = ex;
  showModal.value = true;
};

const isInSession = (ex) => {
  if (!ex?.name) return false;
  return sessionExercises.value.some((item) => item.id === ex.id || item.name === ex.name);
};

const addToSession = (ex) => {
  if (!ex?.name) return;
  if (isInSession(ex)) {
    notify('Already in your session');
    return;
  }
  sessionExercises.value = [...sessionExercises.value, ex];
  persistSession();
  notify(`${ex.name} added to your session`);
};

const removeFromSession = (index) => {
  sessionExercises.value = sessionExercises.value.filter((_, idx) => idx !== index);
  persistSession();
};

const clearSession = () => {
  sessionExercises.value = [];
  persistSession();
  notify('Session cleared');
};

const addRecommendations = () => {
  sessionExercises.value = recommendations.value.slice(0, 4);
  persistSession();
  notify('Recommendations added to your session');
};

const startSession = (list, title = 'My session') => {
  const items = (Array.isArray(list) ? list : []).filter((ex) => ex?.name);
  if (!items.length) return;
  sessionExercisesForModal.value = items;
  sessionTitle.value = title;
  showSession.value = true;
};

const startSingle = (ex) => {
  if (!ex?.name) return;
  showModal.value = false;
  startSession([ex], ex.name);
};

const handleSessionComplete = (summary) => {
  const record = {
    ...summary,
    title: sessionTitle.value,
    items: sessionExercisesForModal.value.map(({ raw, searchText, rank, ...item }) => item),
    date: new Date().toISOString(),
  };
  addWorkout(record);
  sessionExercises.value = [];
  persistSession();
};

const repeatLastSession = () => {
  if (!lastSession.value?.items?.length) return;
  sessionExercises.value = lastSession.value.items;
  persistSession();
  startSession(sessionExercises.value, lastSession.value.title || 'Last session');
};

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  if (noticeTimer) window.clearTimeout(noticeTimer);
});

watch([searchQuery, activeChip, activeLevel, activeEquipment], () => {
  refreshLibrary();
});

watch(libraryResults, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});
</script>

<style scoped>
  :host {
    display: block;
    padding-top: 0;
  }

  .workouts-content {
    --background: var(--bg);
  }

  .workouts-shell {
    width: 100%;
    max-width: none;
    margin: 0;
    padding-top: clamp(0.6rem, 1.2vw, 0.9rem);
  }

  /* ============ HERO ============ */
  .workouts-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: clamp(1rem, 2vw, 1.8rem);
    padding-bottom: clamp(0.9rem, 1.5vw, 1.2rem);
    border-bottom: 1px solid var(--line);
  }

  .hero-copy {
    display: grid;
    gap: 0.45rem;
    justify-items: start;
  }

  .hero-copy h1 {
    font-size: clamp(2.2rem, 4.8vw, 3.4rem);
    font-weight: 500;
    line-height: 0.9;
    letter-spacing: 0.005em;
    text-transform: uppercase;
  }

  .hero-copy h1 span {
    color: var(--dim);
  }

  .hero-sub {
    max-width: 46ch;
    color: var(--muted);
    font-size: 0.85rem;
    line-height: 1.65;
  }

  .hero-stats {
    display: flex;
    gap: clamp(0.9rem, 2vw, 1.6rem);
    padding-bottom: 0.2rem;
  }

  .hero-stat {
    display: grid;
    gap: 0.3rem;
    min-width: 76px;
    padding-left: clamp(0.85rem, 1.5vw, 1.1rem);
    border-left: 1px solid var(--line);
  }

  .hero-stat strong {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    font-weight: 500;
    line-height: 0.85;
  }

  .hero-stat strong small {
    margin-left: 0.15rem;
    color: var(--dim);
    font-size: 0.7rem;
    font-weight: 400;
  }

  .hero-stat span {
    color: var(--muted);
    font-size: 0.64rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    line-height: 1.4;
    text-transform: uppercase;
  }

  /* ============ SECTION HEADS ============ */
  .session-section,
  .recommendations,
  .library {
    margin-top: clamp(1.2rem, 2vw, 1.7rem);
  }

  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.8rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--line);
  }

  .section-head h2 {
    margin-top: 0.3rem;
    font-size: clamp(1.25rem, 2vw, 1.6rem);
    font-weight: 500;
    line-height: 1;
    text-transform: uppercase;
  }

  .section-sub {
    margin-top: 0.35rem;
    max-width: 52ch;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.6;
  }

  .section-head .card-kicker {
    font-size: 0.62rem;
    color: var(--text-soft);
  }

  /* ============ PILLS ============ */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.34rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    color: var(--text-soft);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pill i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--white);
  }

  .pill.loading i {
    animation: pillPulse 1s var(--ease) infinite;
  }

  @keyframes pillPulse {
    0%, 100% { opacity: 0.35; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.25); }
  }

  /* ============ SESSION ============ */
  .session-section .section-head {
    margin-bottom: 0.6rem;
    padding-bottom: 0.5rem;
  }

  .session-history {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-bottom: 0.55rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid rgba(134, 239, 172, 0.32);
    border-radius: var(--radius);
    background: rgba(34, 197, 94, 0.07);
  }

  .history-icon {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    border: 1px solid rgba(134, 237, 172, 0.4);
    border-radius: 0.55rem;
    color: #bbf7d0;
    font-size: 0.9rem;
  }

  .history-copy {
    display: grid;
    flex: 1;
    min-width: 0;
    gap: 0.15rem;
  }

  .history-copy strong {
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .history-copy small {
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.5;
  }

  .session-panel {
    display: grid;
    gap: 0.55rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .session-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.42rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .session-reorder-hint {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin: -0.15rem 0 0;
    color: var(--dim);
    font-size: 0.54rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .session-reorder-hint ion-icon {
    font-size: 0.8rem;
  }

  .session-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.55rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: var(--surface-2);
    transition:
      border-color 0.24s var(--ease),
      background-color 0.24s var(--ease),
      box-shadow 0.24s var(--ease);
  }

  .session-item:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
  }

  .session-item.dragging {
    border-color: var(--white);
    background: var(--surface);
    box-shadow: 0 22px 50px rgba(0, 0, 0, 0.55);
    cursor: grabbing;
    pointer-events: none;
    transition:
      border-color 0.24s var(--ease),
      background-color 0.24s var(--ease),
      box-shadow 0.3s var(--ease);
  }

  .session-item.dragging .session-index {
    color: var(--white);
    border-color: var(--line-strong);
  }

  .drag-handle {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 2.1rem;
    flex-shrink: 0;
    border: 1px solid transparent;
    border-radius: 0.4rem;
    background: transparent;
    color: var(--dim);
    font-size: 0.95rem;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    transition: color 0.2s var(--ease), border-color 0.2s var(--ease), background-color 0.2s var(--ease);
  }

  .drag-handle:hover {
    border-color: var(--line-strong);
    background: var(--surface-3);
    color: var(--text);
  }

  .drag-handle:active {
    cursor: grabbing;
    color: var(--white);
  }

  :global(body.session-reordering) {
    cursor: grabbing;
    user-select: none;
    -webkit-user-select: none;
  }

  .session-index {
    display: grid;
    place-items: center;
    width: 1.55rem;
    height: 1.55rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.4rem;
    color: var(--text-soft);
    font-family: var(--font-display);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }

  .session-info {
    display: grid;
    flex: 1;
    min-width: 0;
    gap: 0.2rem;
  }

  .session-info strong {
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 0.86rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .session-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .meta-chip {
    padding: 0.12rem 0.45rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-soft);
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    border: 1px solid var(--line);
    border-radius: 0.45rem;
    background: transparent;
    color: var(--muted);
    font-size: 0.75rem;
    transition: border-color 0.3s var(--ease), color 0.3s var(--ease);
  }

  .icon-btn:hover {
    border-color: var(--white);
    color: var(--white);
  }

  .icon-btn:active {
    border-color: var(--white);
    background: rgba(255, 255, 255, 0.08);
    transform: scale(0.9);
    transition-duration: 0.1s;
  }

  .session-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.15rem;
  }

  .session-actions .start-btn {
    flex: 1;
    min-width: 200px;
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
    font-size: 0.72rem;
  }

  .session-empty {
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.8rem;
  }

  .session-empty .empty-icon {
    margin-bottom: 0;
  }

  .empty-copy {
    display: grid;
    gap: 0.25rem;
  }

  .empty-copy strong {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .empty-copy p {
    max-width: 48ch;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.6;
  }

  .session-empty .outline-button {
    justify-self: end;
    white-space: nowrap;
  }

  /* ============ CARDS ============ */
  .rec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: clamp(0.6rem, 1vw, 0.85rem);
  }

  .rec-card,
  .lib-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    will-change: transform, opacity;
    animation: cardIn 0.5s var(--ease-out) backwards;
    animation-delay: calc(var(--i, 0) * 45ms);
  }

  .rec-card:hover,
  .lib-card:hover {
    border-color: var(--line-strong);
    background: var(--surface-2);
    transform: translateY(-3px);
  }

  .rec-card:active,
  .lib-card:active {
    border-color: var(--white);
    transform: scale(0.975);
    transition-duration: 0.12s;
  }

  @keyframes cardIn {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .rec-thumb,
  .lib-thumb {
    position: relative;
    width: 100%;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    background: var(--surface-3);
  }

  .rec-thumb {
    height: clamp(96px, 8.5vw, 122px);
  }

  .lib-thumb {
    height: 96px;
  }

  .rec-thumb img,
  .lib-thumb img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s var(--ease);
  }

  .rec-card:hover .rec-thumb img,
  .lib-card:hover .lib-thumb img {
    transform: scale(1.04);
  }

  .thumb-level {
    position: absolute;
    top: 0.55rem;
    right: 0.55rem;
    padding: 0.26rem 0.55rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    background: rgba(5, 5, 5, 0.75);
    color: var(--text);
    font-size: 0.52rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
  }

  .card-body {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem;
  }

  .card-tag {
    color: var(--muted);
    font-size: 0.62rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .card-body h3 {
    font-size: clamp(0.92rem, 1vw, 1.05rem);
    font-weight: 500;
    line-height: 1.18;
    text-transform: uppercase;
  }

  .card-meta {
    display: -webkit-box;
    overflow: hidden;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.5;
    text-transform: capitalize;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .card-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.4rem;
    padding-top: 0.55rem;
    border-top: 1px solid var(--line);
  }

  .link-button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-soft);
    font-size: 0.66rem;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .link-button ion-icon {
    font-size: 0.7rem;
    transition: transform 0.3s var(--ease);
  }

  .link-button:hover {
    color: var(--white);
  }

  .link-button:hover ion-icon {
    transform: translateX(3px);
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.38rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    font-size: 0.66rem;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease);
  }

  .add-btn ion-icon {
    font-size: 0.72rem;
  }

  .add-btn:hover {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .add-btn:active {
    transform: scale(0.94);
    transition-duration: 0.1s;
  }

  .add-btn:active ion-icon {
    transform: rotate(90deg);
  }

  .add-btn ion-icon {
    transition: transform 0.3s var(--ease);
  }

  .add-btn.added,
  .add-btn.added:hover,
  .add-btn.added:active {
    border-color: rgba(134, 239, 172, 0.55);
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
    cursor: default;
    transform: none;
  }

  .add-btn.added ion-icon,
  .add-btn.added:active ion-icon {
    transform: none;
    color: #86efac;
  }

  .add-btn:disabled {
    opacity: 1;
  }

  /* skeletons */
  .rec-skeleton {
    position: relative;
    overflow: hidden;
    cursor: default;
    pointer-events: none;
  }

  .rec-skeleton::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 24%,
      rgba(255, 255, 255, 0.04) 40%,
      rgba(255, 255, 255, 0.14) 50%,
      rgba(255, 255, 255, 0.04) 60%,
      transparent 76%
    );
    background-size: 220% 100%;
    content: '';
    pointer-events: none;
    animation: cardWave 1.7s linear infinite;
  }

  .rec-skeleton:hover {
    border-color: var(--line);
    background: var(--surface);
    transform: none;
  }

  @keyframes cardWave {
    from { background-position: 180% 0; }
    to { background-position: -180% 0; }
  }

  .rec-skeleton .rec-thumb,
  .skeleton-line {
    background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
    background-size: 200% 100%;
    animation: skeletonShimmer 1.35s linear infinite;
  }

  .rec-skeleton .card-body {
    gap: 0.6rem;
    padding: 0.85rem;
  }

  .skeleton-line {
    display: block;
    height: 8px;
    border-radius: 999px;
  }

  .skeleton-line-short { width: 35%; height: 6px; }
  .skeleton-line-tiny { width: 60%; }

  @keyframes skeletonShimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }

  /* ============ TOAST ============ */
  .session-toast {
    position: fixed;
    z-index: 20000;
    bottom: calc(5.2rem + env(safe-area-inset-bottom, 0));
    left: 50%;
    max-width: min(92vw, 420px);
    padding: 0.75rem 1.1rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--white);
    color: var(--black);
    font-family: var(--font-display);
    font-size: 0.66rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
    transform: translateX(-50%);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    animation: toastIn 0.25s var(--ease);
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 10px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  /* ============ LIBRARY ============ */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.9rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    transition: border-color 0.3s var(--ease);
  }

  .search-bar:focus-within {
    border-color: var(--line-strong);
  }

  .search-bar > ion-icon {
    flex-shrink: 0;
    color: var(--dim);
    font-size: 1rem;
  }

  .search-bar input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font-family: inherit;
    font-size: 0.85rem;
  }

  .search-bar input::placeholder {
    color: var(--dim);
  }

  .clear-search {
    display: grid;
    place-items: center;
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    border: 0;
    border-radius: 50%;
    background: var(--surface-3);
    color: var(--muted);
    font-size: 0.75rem;
  }

  .clear-search:hover {
    color: var(--white);
  }

  .filter-dropdowns-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    margin-bottom: 1.15rem;
    position: relative;
    z-index: 50;
  }

  .custom-dropdown {
    position: relative;
    display: grid;
    gap: 0.2rem;
    min-width: 0;
  }

  .cd-label {
    font-size: 0.52rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--dim);
  }

  .cd-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.2rem;
    width: 100%;
    padding: 0.5rem 0.55rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 0.65rem;
    color: var(--white);
    font-size: 0.62rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: border-color 0.2s ease;
  }

  .cd-trigger span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cd-trigger ion-icon {
    font-size: 0.58rem;
    color: var(--dim);
    flex-shrink: 0;
  }

  .cd-trigger:hover {
    border-color: var(--line-strong);
  }

  .custom-dropdown.open .cd-trigger {
    border-color: var(--white);
  }

  .cd-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    width: 100%;
    min-width: 130px;
    background: #141417;
    border: 1px solid var(--line-strong);
    border-radius: 0.75rem;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9);
    padding: 0.3rem;
    display: grid;
    gap: 0.15rem;
    z-index: 100;
    animation: cdMenuIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes cdMenuIn {
    from { transform: translateY(-4px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .cd-option {
    width: 100%;
    padding: 0.45rem 0.6rem;
    background: transparent;
    border: none;
    border-radius: 0.5rem;
    color: var(--muted);
    font-size: 0.62rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cd-option:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--white);
  }

  .cd-option.active {
    background: var(--white);
    color: var(--black);
    font-weight: 600;
  }

  .library-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: clamp(0.75rem, 1.1vw, 1rem);
    margin-top: 1.1rem;
  }

  .lib-thumb {
    height: clamp(110px, 8.5vw, 140px);
  }

  .lib-card .card-body {
    gap: 0.35rem;
    padding: 0.9rem;
  }

  .lib-card .card-body h3 {
    font-size: clamp(0.98rem, 1.1vw, 1.12rem);
  }

  /* ============ EMPTY STATE ============ */
  .empty-state-block {
    display: grid;
    place-items: center;
    gap: 0.35rem;
    padding: 2.8rem 1.2rem;
    border: 1px dashed var(--line-strong);
    border-radius: var(--radius-lg);
    background: var(--surface);
    text-align: center;
  }

  .empty-icon {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.35rem;
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    color: var(--muted);
    font-size: 1.1rem;
  }

  .empty-state-block p {
    color: var(--text);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .empty-state-block small {
    max-width: 40ch;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.6;
  }

  /* ============ PAGINATION ============ */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    margin-top: 1.1rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--line);
  }

  .page-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 0.95rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text-soft);
    font-size: 0.6rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease), transform 0.2s var(--ease);
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--white);
    background: var(--white);
    color: var(--black);
  }

  .page-btn:active:not(:disabled) {
    transform: scale(0.93);
  }

  .page-btn ion-icon {
    transition: transform 0.25s var(--ease);
  }

  .page-btn:first-child:hover:not(:disabled) ion-icon {
    transform: translateX(-3px);
  }

  .page-btn:last-child:hover:not(:disabled) ion-icon {
    transform: translateX(3px);
  }

  .page-btn:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  .page-info {
    color: var(--muted);
    font-size: 0.7rem;
  }

  /* ============ TEXT BUTTON ============ */
  .text-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: transparent;
    color: var(--text);
    font-family: var(--font-display);
    font-size: 0.62rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.3s var(--ease), color 0.3s var(--ease), border-color 0.3s var(--ease);
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
    opacity: 0.4;
  }

  .primary-button:active,
  .outline-button:active,
  .link-button:active,
  .add-btn:active {
    transform: scale(0.94);
  }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 1024px) {
    .workouts-hero {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .hero-stats {
      padding-top: 0.9rem;
      border-top: 1px solid var(--line);
    }

    .hero-stat:first-child {
      padding-left: 0;
      border-left: 0;
    }

    .session-empty {
      grid-template-columns: 1fr;
    }

    .session-empty .outline-button {
      justify-self: start;
    }
  }

  @media (max-width: 760px) {
    .hero-copy h1 {
      font-size: clamp(2rem, 9vw, 2.7rem);
    }

    .hero-stats {
      width: 100%;
      gap: 0;
      justify-content: space-between;
    }

    .hero-stat {
      flex: 1;
      min-width: 0;
    }

    .section-head {
      align-items: flex-end;
      flex-wrap: wrap;
    }

    .rec-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .library-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-top: 0.85rem;
    }

    .rec-card,
    .lib-card {
      border-radius: var(--radius);
    }

    .rec-thumb {
      height: clamp(60px, 12vw, 82px);
    }

    .lib-thumb {
      height: clamp(104px, 30vw, 150px);
    }

    .card-body {
      gap: 0.15rem;
      padding: 0.5rem;
    }

    .card-tag {
      font-size: 0.54rem;
      letter-spacing: 0.08em;
    }

    .card-body h3 {
      display: -webkit-box;
      overflow: hidden;
      font-size: clamp(0.66rem, 2.5vw, 0.82rem);
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .card-meta {
      display: none;
    }

    .lib-card .card-body {
      gap: 0.3rem;
      padding: 0.7rem;
    }

    .lib-card .card-body h3 {
      font-size: clamp(0.82rem, 3.6vw, 1rem);
    }

    .lib-card .card-meta {
      display: -webkit-box;
      font-size: 0.66rem;
    }

    .card-actions {
      margin-top: 0.15rem;
      padding-top: 0.35rem;
    }

    .link-button {
      display: none;
    }

    .add-btn {
      flex: 1;
      justify-content: center;
      padding: 0.32rem 0.3rem;
      font-size: 0.52rem;
      gap: 0.2rem;
    }

    .lib-card .add-btn {
      padding: 0.45rem 0.3rem;
      font-size: 0.6rem;
    }

    .thumb-level {
      top: 0.3rem;
      right: 0.3rem;
      padding: 0.16rem 0.36rem;
      font-size: 0.42rem;
    }

    .lib-card .thumb-level {
      top: 0.45rem;
      right: 0.45rem;
      padding: 0.2rem 0.45rem;
      font-size: 0.5rem;
    }

    .search-bar {
      margin-bottom: 0.7rem;
      padding: 0.65rem 0.8rem;
    }

    .filter-block {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.4rem;
    }

    .filter-label {
      flex: 0 0 78px;
      font-size: 0.52rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .filter-row {
      flex: 1;
      flex-wrap: nowrap;
      gap: 0.25rem;
      padding-bottom: 0;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .filter-row::-webkit-scrollbar {
      display: none;
    }

    .filter-pill {
      flex-shrink: 0;
      padding: 0.25rem 0.55rem;
      font-size: 0.58rem;
    }

    .session-history {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .session-history .text-btn {
      margin-left: 3rem;
    }

    .session-panel {
      gap: 0.5rem;
      padding: 0.6rem;
    }

    .session-section .section-head h2 {
      font-size: 1.05rem;
    }

    .session-section .card-kicker {
      font-size: 0.5rem;
    }

    .session-section .section-sub {
      font-size: 0.6rem;
    }

    .session-panel strong,
    .session-info strong {
      font-size: 0.68rem;
    }

    .session-empty .empty-copy strong {
      font-size: 0.75rem;
    }

    .session-empty .empty-copy p {
      font-size: 0.6rem;
    }

    .session-history {
      padding: 0.45rem 0.6rem;
      gap: 0.5rem;
    }

    .history-icon {
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.75rem;
      border-radius: 0.4rem;
    }

    .history-copy strong {
      font-size: 0.72rem;
    }

    .history-copy small {
      font-size: 0.58rem;
    }

    .session-list {
      gap: 0.35rem;
    }

    .session-item {
      gap: 0.4rem;
      padding: 0.45rem 0.5rem;
    }

    .session-index {
      width: 1.35rem;
      height: 1.35rem;
      font-size: 0.6rem;
    }

    .session-info {
      gap: 0.15rem;
    }

    .session-info strong {
      font-size: 0.72rem;
      line-height: 1.25;
    }

    .session-meta {
      gap: 0.2rem;
    }

    .drag-handle {
      width: 1.5rem;
      height: 2rem;
      font-size: 0.85rem;
    }

    .icon-btn {
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.65rem;
    }
  }

  @media (max-width: 560px) {
    .workouts-hero {
      gap: 0.7rem;
      padding-bottom: 0.7rem;
    }

    .hero-sub,
    .section-sub {
      display: none;
    }

    .session-section,
    .recommendations,
    .library {
      margin-top: 1rem;
    }

    .section-head {
      margin-bottom: 0.65rem;
      padding-bottom: 0.45rem;
    }

    .rec-grid {
      gap: 0.4rem;
    }

    .library-grid {
      gap: 0.5rem;
    }

    .rec-thumb {
      height: 54px;
    }

    .lib-thumb {
      height: 96px;
    }

    .card-body {
      gap: 0.1rem;
      padding: 0.42rem;
    }

    .card-body h3 {
      font-size: 0.64rem;
    }

    .lib-card .card-body {
      gap: 0.25rem;
      padding: 0.6rem;
    }

    .lib-card .card-body h3 {
      font-size: 0.9rem;
    }

    .add-btn {
      padding: 0.28rem 0.2rem;
      font-size: 0.54rem;
      gap: 0.12rem;
    }

    .lib-card .add-btn {
      padding: 0.42rem 0.3rem;
      font-size: 0.58rem;
    }

    .add-btn ion-icon {
      font-size: 0.6rem;
    }

    .thumb-level {
      font-size: 0.4rem;
    }

    .session-actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .session-actions .start-btn {
      width: 100%;
      min-width: 0;
    }

    .session-actions .text-btn {
      justify-self: start;
    }

    .session-item {
      gap: 0.35rem;
    }

    .filter-row {
      gap: 0.35rem;
    }

    .filter-pill {
      padding: 0.42rem 0.65rem;
      font-size: 0.58rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rec-card,
    .lib-card,
    .filter-pill.active {
      animation: none;
      transition: none;
    }

    .rec-card:hover,
    .lib-card:hover,
    .rec-card:active,
    .lib-card:active {
      transform: none;
    }
  }

  .skeleton-lib-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    overflow: hidden;
    padding: 0;
  }

  .skeleton-thumb {
    width: 100%;
    height: 160px;
    background: rgba(255, 255, 255, 0.06);
    animation: pulse-glow 1.4s ease-in-out infinite;
  }

  .skeleton-line {
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    animation: pulse-glow 1.4s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 50%;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.9; }
  }
</style>
