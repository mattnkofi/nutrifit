import { computed, ref, watch } from 'vue';
import { useAuth } from './useAuth';
import { DEFAULT_SETTINGS, applyPreferences, normalizeSettings } from '../services/preferences';
import {
  addMealRemote,
  addWorkoutRemote,
  deleteMealRemote,
  fetchUserData,
  isDbConfigured,
  savePlansRemote,
  saveProfileRemote,
  saveSessionRemote,
  saveSettingsRemote,
  setWaterRemote,
  syncMissingRemote,
} from '../services/db';
import {
  compressImageDataUrl,
  deleteStoredImage,
  uploadAvatarImage,
  uploadMealImage,
} from '../services/storage';
import {
  activityLabel,
  average,
  buildDayStats,
  calculateStreak,
  createEmptyProfile,
  dateKeyFromValue,
  equipmentLabel,
  experienceLabel,
  formatMonthYear,
  formatNumber,
  formatShortDate,
  getWeekDates,
  goalLabel,
  normalizeProfile,
  percentOf,
  profileCompletion,
  readUserStore,
  todayKey,
  writeUserStore,
} from '../services/userData';

const profile = ref(createEmptyProfile());
const water = ref({});
const mealHistory = ref([]);
const mealImages = ref({});
const workoutHistory = ref([]);
const session = ref([]);
const plans = ref({ workouts: [], meals: [] });
const settings = ref(normalizeSettings(DEFAULT_SETTINGS));

const currentUserId = ref('guest');
const dataLoading = ref(false);
const dbStatus = ref('local'); // local | synced | error
const dbError = ref('');
const lastSyncedAt = ref('');
const auth = useAuth();

let hydrateToken = 0;

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizePlans = (value) => ({
  workouts: asArray(value?.workouts),
  meals: asArray(value?.meals),
});

const persist = (key, value) => writeUserStore(currentUserId.value, key, value);

const isCloudUser = () => Boolean(isDbConfigured && currentUserId.value && currentUserId.value !== 'guest');

const stripMealImages = (meals) =>
  asArray(meals).map((meal) => {
    if (!meal || !meal.image) return meal;
    const { image, ...rest } = meal;
    return rest;
  });

const attachMealImages = (meals, images = {}) =>
  asArray(meals).map((meal) => ({
    ...meal,
    image: meal?.image || images?.[String(meal?.id)] || '',
  }));

const cacheMealImages = (meals) => {
  const next = {};
  asArray(meals)
    .slice(0, 8)
    .forEach((meal) => {
      if (meal?.image && meal?.id != null) next[String(meal.id)] = meal.image;
    });
  mealImages.value = next;
  persist('meal_images', next);
};

// Replaces the temporary base64 photo with the Storage URL once the upload is
// done, so the history keeps working after a reload and on another device.
const replaceMealImage = (mealId, imageUrl) => {
  if (!imageUrl) return;
  mealHistory.value = mealHistory.value.map((meal) =>
    String(meal?.id) === String(mealId) ? { ...meal, image: imageUrl } : meal
  );
  cacheMealImages(mealHistory.value);
  persist('meal_history', stripMealImages(mealHistory.value));
};

const syncMealImage = async (meal) => {
  if (!isCloudUser() || !meal) return meal;
  if (!String(meal.image || '').startsWith('data:')) return meal;

  try {
    const url = await uploadMealImage(currentUserId.value, meal.id, meal.image);
    if (url) {
      replaceMealImage(meal.id, url);
      return { ...meal, image: url };
    }
  } catch (error) {
    // The bucket may not exist yet; fall through to the in-row copy.
    console.warn('[storage] Could not upload meal photo:', error?.message || error);
  }

  // No Storage: keep a compressed copy inside the meal row so the photo still
  // syncs to other devices without a database migration.
  const compact = await compressImageDataUrl(meal.image);
  if (compact && compact !== meal.image) {
    replaceMealImage(meal.id, compact);
    return { ...meal, image: compact };
  }
  return meal;
};

// Uploads photos that only exist as base64 on this device (offline logs and
// accounts created before Storage existed) and patches the matching DB rows.
const syncLocalMealImages = async (localMeals, remoteMeals) => {
  const locals = asArray(localMeals);
  const remotes = asArray(remoteMeals);
  if (!isCloudUser()) return { localMeals: locals, remoteMeals: remotes };

  const remoteById = new Map(remotes.map((meal) => [String(meal?.id), meal]));
  const upgraded = [];
  const patchedRemote = new Map();

  for (const meal of locals) {
    if (!String(meal?.image || '').startsWith('data:')) continue;
    const key = String(meal?.id);
    if (remoteById.get(key)?.image) continue;

    // Always push the photo, even when compression left it unchanged. The old
    // `synced.image === meal.image` guard skipped small photos, so they stayed
    // only on the device that took them.
    const synced = await syncMealImage(meal);
    if (!synced.image) continue;
    upgraded.push(synced);

    // Only patch rows that already exist remotely. Older builds could leave a
    // deleted meal in this device's cache, and re-adding it here would bring it
    // back on every device.
    if (!remoteById.has(key)) continue;

    try {
      await addMealRemote(currentUserId.value, synced);
      patchedRemote.set(key, synced.image);
    } catch (error) {
      console.warn('[storage] Could not backfill meal photo:', error?.message || error);
    }
  }

  if (!upgraded.length) return { localMeals: locals, remoteMeals: remotes };

  const upgradedById = new Map(upgraded.map((meal) => [String(meal.id), meal.image]));
  return {
    localMeals: locals.map((meal) =>
      upgradedById.has(String(meal?.id)) ? { ...meal, image: upgradedById.get(String(meal?.id)) } : meal
    ),
    remoteMeals: remotes.map((meal) =>
      patchedRemote.has(String(meal?.id)) ? { ...meal, image: patchedRemote.get(String(meal?.id)) } : meal
    ),
  };
};

// Older builds kept the avatar as a base64 string in auth metadata. Move it to
// Storage once, keep profiles.avatar_url and the auth metadata in sync, and
// restore the avatar on a new device even if only one of them has it.
const syncAvatarToCloud = async (userId) => {
  if (!isCloudUser()) return;
  const stored = String(profile.value.avatarUrl || '').trim();
  const meta = String(auth.avatarUrl.value || '').trim();
  let url = stored || meta;
  if (!url) return;

  let changed = false;
  if (url.startsWith('data:')) {
    try {
      const uploaded = await uploadAvatarImage(userId, url);
      // No Storage bucket yet: keep the local photo instead of dropping it or
      // retrying on every load. It will move to Storage once the bucket exists.
      if (!uploaded) return;
      url = uploaded;
      changed = true;
    } catch (error) {
      console.info('[storage] Avatar stays on this device:', error?.message || error);
      return;
    }
  }

  if (url !== stored) {
    profile.value = normalizeProfile({ ...profile.value, avatarUrl: url });
    persist('profile', profile.value);
    changed = true;
  }

  if (changed) {
    try {
      await saveProfileRemote(userId, profile.value);
    } catch (error) {
      markFailed(error);
    }
  }

  if (url !== meta) {
    try {
      await auth.updateAvatar(url);
    } catch (error) {
      console.warn('[storage] Could not sync avatar metadata:', error?.message || error);
    }
  }
};


const readLocal = (userId) => ({
  profile: normalizeProfile(readUserStore(userId, 'profile', {})),
  water: readUserStore(userId, 'water', {}) || {},
  mealHistory: asArray(readUserStore(userId, 'meal_history', [])),
  workoutHistory: asArray(readUserStore(userId, 'workout_history', [])),
  session: asArray(readUserStore(userId, 'session', [])),
  plans: normalizePlans(readUserStore(userId, 'plans', {})),
  settings: normalizeSettings(readUserStore(userId, 'settings', DEFAULT_SETTINGS)),
  mealImages: readUserStore(userId, 'meal_images', {}) || {},
});

const applyLocal = (local) => {
  profile.value = local.profile;
  water.value = local.water;
  mealImages.value = local.mealImages;
  mealHistory.value = attachMealImages(local.mealHistory, local.mealImages);
  workoutHistory.value = local.workoutHistory;
  session.value = local.session;
  plans.value = local.plans;
  settings.value = local.settings;
  applyPreferences(settings.value);
};

const applyRemote = (remote, images = {}) => {
  profile.value = normalizeProfile(remote.profile || {});
  water.value = remote.water || {};
  mealHistory.value = attachMealImages(remote.meals, images);
  workoutHistory.value = asArray(remote.workouts);
  session.value = asArray(remote.session);
  plans.value = normalizePlans(remote.plans);
  settings.value = normalizeSettings(remote.settings || DEFAULT_SETTINGS);
  applyPreferences(settings.value);
  cacheMealImages(mealHistory.value);
};

const mirrorCurrent = (userId) => {
  writeUserStore(userId, 'profile', profile.value);
  writeUserStore(userId, 'water', water.value);
  writeUserStore(userId, 'meal_history', stripMealImages(mealHistory.value));
  writeUserStore(userId, 'workout_history', workoutHistory.value);
  writeUserStore(userId, 'session', session.value);
  writeUserStore(userId, 'plans', plans.value);
  writeUserStore(userId, 'settings', settings.value);
  writeUserStore(userId, 'meal_images', mealImages.value);
};

const markSynced = () => {
  dbStatus.value = 'synced';
  dbError.value = '';
  lastSyncedAt.value = new Date().toISOString();
};

const markFailed = (error) => {
  dbStatus.value = 'error';
  dbError.value = error?.message || 'Cloud sync failed. Your changes are saved on this device.';
};

const pushRemote = (task) => {
  if (!isCloudUser()) return Promise.resolve(null);
  return Promise.resolve()
    .then(task)
    .then((result) => {
      markSynced();
      return result;
    })
    .catch((error) => {
      markFailed(error);
      return null;
    });
};

const hydrate = async (userId) => {
  const id = userId || 'guest';
  currentUserId.value = id;
  const token = (hydrateToken += 1);

  const local = readLocal(id);
  applyLocal(local);
  dbStatus.value = 'local';
  dbError.value = '';
  lastSyncedAt.value = '';

  if (!isCloudUser()) {
    dataLoading.value = false;
    return;
  }

  dataLoading.value = true;
  try {
    const remote = await fetchUserData(id);
    if (token !== hydrateToken) return;
    // Photos live in a separate local store (`meal_images`), so merge them in
    // before backfilling. Reading raw `meal_history` meant those photos were
    // never seen and never reached `meals.items`.
    const localMeals = attachMealImages(local.mealHistory, local.mealImages);
    const images = await syncLocalMealImages(localMeals, remote.meals);
    if (token !== hydrateToken) return;
    const merged = await syncMissingRemote(
      id,
      { ...remote, meals: images.remoteMeals },
      { ...local, mealHistory: images.localMeals }
    );
    if (token !== hydrateToken) return;
    applyRemote(merged, local.mealImages);
    mirrorCurrent(id);
    markSynced();
    await syncAvatarToCloud(id);
  } catch (error) {
    if (token !== hydrateToken) return;
    markFailed(error);
  } finally {
    if (token === hydrateToken) dataLoading.value = false;
  }
};

// Re-read the correct namespace whenever the signed-in account changes.
watch(
  () => auth.user.value?.id || 'guest',
  (userId) => {
    hydrate(userId);
  },
  { immediate: true }
);

const saveProfile = async (patch = {}) => {
  profile.value = normalizeProfile({
    ...profile.value,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  persist('profile', profile.value);

  if (!isCloudUser()) return { ok: true, localOnly: true };

  try {
    await saveProfileRemote(currentUserId.value, profile.value);
    markSynced();
    return { ok: true };
  } catch (error) {
    markFailed(error);
    return { ok: false, error: error?.message || 'Could not save to Supabase.' };
  }
};

const setWater = (count) => {
  const key = todayKey();
  const value = Math.max(0, Math.min(40, Math.round(Number(count) || 0)));
  const next = { ...water.value, [key]: value };
  water.value = next;
  persist('water', next);
  pushRemote(() => setWaterRemote(currentUserId.value, key, value));
};

const addWater = (amount = 1) => {
  const key = todayKey();
  setWater((Number(water.value[key]) || 0) + amount);
};

const removeWater = (amount = 1) => {
  const key = todayKey();
  setWater((Number(water.value[key]) || 0) - amount);
};

const addMeal = (entry) => {
  if (!entry) return;
  const next = { ...entry, id: entry.id ?? `${Date.now()}` };
  mealHistory.value = [next, ...mealHistory.value];
  cacheMealImages(mealHistory.value);
  persist('meal_history', stripMealImages(mealHistory.value));
  pushRemote(async () => {
    const synced = await syncMealImage(next);
    return addMealRemote(currentUserId.value, synced);
  });
};

const deleteMeal = (id) => {
  const removed = mealHistory.value.find((meal) => String(meal?.id) === String(id));
  mealHistory.value = mealHistory.value.filter((meal) => String(meal.id) !== String(id));
  cacheMealImages(mealHistory.value);
  persist('meal_history', stripMealImages(mealHistory.value));
  pushRemote(async () => {
    const result = await deleteMealRemote(currentUserId.value, id);
    if (removed?.image) {
      await deleteStoredImage(removed.image, currentUserId.value).catch(() => {});
    }
    return result;
  });
};

const addWorkout = (record) => {
  if (!record) return;
  const next = {
    ...record,
    id:
      record.id ??
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
  };
  workoutHistory.value = [next, ...workoutHistory.value].slice(0, 50);
  persist('workout_history', workoutHistory.value);
  pushRemote(() => addWorkoutRemote(currentUserId.value, next));
};

const saveSession = (list) => {
  session.value = asArray(list);
  persist('session', session.value);
  pushRemote(() => saveSessionRemote(currentUserId.value, session.value));
};

const savePlans = (next = {}) => {
  plans.value = normalizePlans(next);
  persist('plans', plans.value);
  pushRemote(() => savePlansRemote(currentUserId.value, plans.value));
};

const clearPlans = () => {
  savePlans({ workouts: [], meals: [] });
};

const saveSettings = async (patch = {}) => {
  const next = normalizeSettings({
    ...settings.value,
    ...patch,
    notifications: {
      ...settings.value.notifications,
      ...(patch.notifications || {}),
    },
  });

  settings.value = next;
  applyPreferences(next);
  persist('settings', next);

  if (!isCloudUser()) return { ok: true, localOnly: true };

  try {
    await saveSettingsRemote(currentUserId.value, next);
    markSynced();
    return { ok: true };
  } catch (error) {
    markFailed(error);
    return { ok: false, error: error?.message || 'Could not save preferences to Supabase.' };
  }
};

const exportUserData = () => ({
  exportedAt: new Date().toISOString(),
  account: {
    id: currentUserId.value,
    email: auth.user.value?.email || '',
  },
  profile: profile.value,
  settings: settings.value,
  water: water.value,
  meals: stripMealImages(mealHistory.value),
  workouts: workoutHistory.value,
  session: session.value,
  plans: plans.value,
});

const refreshData = () => hydrate(currentUserId.value);

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

const activeDateKeys = computed(() => {
  const keys = new Set();
  mealHistory.value.forEach((meal) => {
    const key = dateKeyFromValue(meal?.dateISO || meal?.date);
    if (key) keys.add(key);
  });
  workoutHistory.value.forEach((workout) => {
    const key = dateKeyFromValue(workout?.dateISO || workout?.date);
    if (key) keys.add(key);
  });
  Object.entries(water.value).forEach(([key, count]) => {
    if (Number(count) > 0) keys.add(key);
  });
  return keys;
});

const streak = computed(() => calculateStreak(activeDateKeys.value));

const statsForDate = (key) =>
  buildDayStats({
    key,
    profile: profile.value,
    mealHistory: mealHistory.value,
    workoutHistory: workoutHistory.value,
    water: water.value,
  });

const todayStats = computed(() => statsForDate(todayKey()));

const weekStats = computed(() =>
  getWeekDates(0).map((day) => ({ ...day, ...statsForDate(day.key) }))
);

const lastWeekStats = computed(() =>
  getWeekDates(-1).map((day) => ({ ...day, ...statsForDate(day.key) }))
);

const elapsedDays = computed(() => {
  const todayIndex = (new Date().getDay() + 6) % 7;
  return weekStats.value.slice(0, todayIndex + 1);
});

const weeklyAverage = computed(() => average(elapsedDays.value.map((day) => day.score)));

const lastWeekElapsed = computed(() => lastWeekStats.value.slice(0, elapsedDays.value.length));

const lastWeekAverage = computed(() => average(lastWeekElapsed.value.map((day) => day.score)));

const weeklyDelta = computed(() => {
  if (!lastWeekElapsed.value.length) return null;
  const previous = lastWeekAverage.value;
  const hasPreviousData = lastWeekElapsed.value.some((day) => day.hasActivity);
  if (!hasPreviousData) return null;
  return weeklyAverage.value - previous;
});

const daysOnTarget = computed(
  () => elapsedDays.value.filter((day) => day.score >= 70).length
);

const bestDay = computed(() => {
  const ranked = elapsedDays.value
    .filter((day) => day.hasActivity)
    .slice()
    .sort((a, b) => b.score - a.score);
  return ranked[0] || null;
});

const workoutsThisWeek = computed(() =>
  weekStats.value.reduce((total, day) => total + day.workouts.length, 0)
);

const workoutsLastWeek = computed(() =>
  lastWeekStats.value.reduce((total, day) => total + day.workouts.length, 0)
);

const trainingTrend = computed(() => {
  if (!workoutsLastWeek.value) return null;
  return workoutsThisWeek.value - workoutsLastWeek.value;
});

const calorieTarget = computed(() => Number(profile.value.dailyCalories) || 0);
const proteinTarget = computed(() => Number(profile.value.dailyProtein) || 0);
const waterTarget = computed(() => Number(profile.value.waterTarget) || 8);
const trainingTarget = computed(() => Number(profile.value.trainingTarget) || 4);

const todayCalories = computed(() => todayStats.value.calories);
const todayProtein = computed(() => todayStats.value.protein);
const todayMeals = computed(() => todayStats.value.meals);
const todayWorkouts = computed(() => todayStats.value.workouts);
const todayWater = computed(() => todayStats.value.glasses);
const todayScore = computed(() => todayStats.value.score);
const hasTodayActivity = computed(() => todayStats.value.hasActivity);

const caloriePercent = computed(() => percentOf(todayCalories.value, calorieTarget.value));
const proteinPercent = computed(() => percentOf(todayProtein.value, proteinTarget.value));
const waterPercent = computed(() => percentOf(todayWater.value, waterTarget.value));
const trainingPercent = computed(() => percentOf(workoutsThisWeek.value, trainingTarget.value));

const planProgress = computed(() => {
  if (!plans.value.workouts.length) return 0;
  return trainingPercent.value;
});

const calorieTrend = computed(() => {
  const previous = getWeekDates(-1)
    .map((day) => statsForDate(day.key))
    .filter((day) => day.meals.length > 0);
  if (!previous.length) return null;
  const previousAverage = average(previous.map((day) => day.calories));
  if (!previousAverage) return null;
  return Math.round(((todayCalories.value - previousAverage) / previousAverage) * 100);
});

const hydrationTrend = computed(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = dateKeyFromValue(yesterday);
  const previous = Number(water.value[key]) || 0;
  if (!previous) return null;
  return todayWater.value - previous;
});

const memberSince = computed(() => {
  const createdAt = auth.user.value?.created_at;
  if (!createdAt) return '';
  return formatShortDate(createdAt);
});

const memberSinceMonth = computed(() => {
  const createdAt = auth.user.value?.created_at;
  if (!createdAt) return '';
  return formatMonthYear(createdAt);
});

const completion = computed(() => profileCompletion(profile.value));

const labels = computed(() => ({
  goal: goalLabel(profile.value.goal),
  experience: experienceLabel(profile.value.experience),
  activity: activityLabel(profile.value.activityLevel),
  equipment: equipmentLabel(profile.value.equipment),
}));

const activeGoalCount = computed(() => {
  let count = 0;
  if (calorieTarget.value) count += 1;
  if (waterTarget.value) count += 1;
  if (trainingTarget.value) count += 1;
  if (profile.value.targetWeightKg) count += 1;
  return count;
});

const dailyTip = computed(() => {
  if (!hasTodayActivity.value) {
    return 'Log a meal, add water or finish a workout to start today’s progress.';
  }
  if (todayWater.value < waterTarget.value) {
    const remaining = waterTarget.value - todayWater.value;
    return `You are ${remaining} glass${remaining === 1 ? '' : 'es'} short of your hydration target today.`;
  }
  if (calorieTarget.value && todayCalories.value > calorieTarget.value * 1.1) {
    return 'You are above your calorie target today. Keep the rest of the day light.';
  }
  if (!todayWorkouts.value.length && trainingTarget.value) {
    return 'No workout logged today. A short session is enough to keep your streak moving.';
  }
  if (todayScore.value >= 70) {
    return 'You are on track today. Keep the same routine going.';
  }
  return 'A small step now will move today forward. Log what you can.';
});

const weeklyBars = computed(() =>
  weekStats.value.map((day) => ({
    ...day,
    height: Math.max(0, Math.min(100, day.score)),
  }))
);

const todayLabel = computed(() => formatShortDate(new Date()));

const formatCalories = (value) => formatNumber(value);

export const useUserData = () => ({
  profile,
  water,
  mealHistory,
  mealImages,
  workoutHistory,
  session,
  plans,
  settings,
  labels,
  saveProfile,
  saveSettings,
  addWater,
  removeWater,
  setWater,
  addMeal,
  deleteMeal,
  addWorkout,
  saveSession,
  savePlans,
  clearPlans,
  exportUserData,
  refreshData,
  dataLoading,
  dbStatus,
  dbError,
  lastSyncedAt,
  activeDateKeys,
  streak,
  todayStats,
  weekStats,
  lastWeekStats,
  elapsedDays,
  weeklyAverage,
  lastWeekAverage,
  weeklyDelta,
  daysOnTarget,
  bestDay,
  workoutsThisWeek,
  workoutsLastWeek,
  trainingTrend,
  calorieTarget,
  proteinTarget,
  waterTarget,
  trainingTarget,
  todayCalories,
  todayProtein,
  todayMeals,
  todayWorkouts,
  todayWater,
  todayScore,
  hasTodayActivity,
  caloriePercent,
  proteinPercent,
  waterPercent,
  trainingPercent,
  planProgress,
  calorieTrend,
  hydrationTrend,
  memberSince,
  memberSinceMonth,
  completion,
  activeGoalCount,
  dailyTip,
  weeklyBars,
  todayLabel,
  formatCalories,
});
