// Per-user NutriFit data.
//
// Everything a person enters (profile details, water, meals, workouts, plans)
// is stored in Supabase under their user id. A local mirror is kept so the app
// still opens instantly and stays usable offline. Nothing here ships with
// sample values: a brand-new account starts empty and every number shown in
// the app is derived from what that person actually logged.

import { getLocale } from './preferences';

export const GOAL_OPTIONS = [
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'lose_fat', label: 'Lose fat' },
  { value: 'endurance', label: 'Improve endurance' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'mobility', label: 'Mobility' },
];

export const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Lightly active' },
  { value: 'moderate', label: 'Moderately active' },
  { value: 'active', label: 'Very active' },
  { value: 'athlete', label: 'Athlete' },
];

export const EQUIPMENT_OPTIONS = [
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'bands', label: 'Bands' },
  { value: 'kettlebell', label: 'Kettlebell' },
];

const PROFILE_FIELDS = [
  'age',
  'heightCm',
  'weightKg',
  'targetWeightKg',
  'goal',
  'experience',
  'activityLevel',
  'equipment',
  'dailyCalories',
  'dailyProtein',
];

export const createEmptyProfile = () => ({
  fullName: '',
  age: null,
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  goal: '',
  experience: '',
  activityLevel: '',
  equipment: '',
  dailyCalories: null,
  dailyProtein: null,
  waterTarget: 8,
  trainingTarget: 4,
  updatedAt: '',
});

const toPositiveNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const isOneOf = (options, value) => options.some((option) => option.value === value);

export const normalizeProfile = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const base = createEmptyProfile();

  return {
    ...base,
    fullName: String(source.fullName || '').trim(),
    age: toPositiveNumber(source.age),
    heightCm: toPositiveNumber(source.heightCm),
    weightKg: toPositiveNumber(source.weightKg),
    targetWeightKg: toPositiveNumber(source.targetWeightKg),
    goal: isOneOf(GOAL_OPTIONS, source.goal) ? source.goal : '',
    experience: isOneOf(EXPERIENCE_OPTIONS, source.experience) ? source.experience : '',
    activityLevel: isOneOf(ACTIVITY_OPTIONS, source.activityLevel) ? source.activityLevel : '',
    equipment: isOneOf(EQUIPMENT_OPTIONS, source.equipment) ? source.equipment : '',
    dailyCalories: toPositiveNumber(source.dailyCalories),
    dailyProtein: toPositiveNumber(source.dailyProtein),
    waterTarget: toPositiveNumber(source.waterTarget) || base.waterTarget,
    trainingTarget: toPositiveNumber(source.trainingTarget) || base.trainingTarget,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
  };
};

export const optionLabel = (options, value, fallback = 'Not set') =>
  options.find((option) => option.value === value)?.label || fallback;

export const goalLabel = (value) => optionLabel(GOAL_OPTIONS, value);
export const experienceLabel = (value) => optionLabel(EXPERIENCE_OPTIONS, value);
export const activityLabel = (value) => optionLabel(ACTIVITY_OPTIONS, value);
export const equipmentLabel = (value) => optionLabel(EQUIPMENT_OPTIONS, value);

export const profileCompletion = (profile = {}) => {
  const filled = PROFILE_FIELDS.filter((field) => {
    const value = profile[field];
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return Boolean(String(value || '').trim());
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
};

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export const dateKey = (date = new Date()) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const dateKeyFromValue = (value) => {
  if (!value) return '';
  return dateKey(value);
};

export const todayKey = () => dateKey(new Date());

const startOfWeek = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const offset = (value.getDay() + 6) % 7; // Monday = 0
  value.setDate(value.getDate() - offset);
  return value;
};

export const getWeekDates = (weekOffset = 0) => {
  const start = startOfWeek();
  start.setDate(start.getDate() + weekOffset * 7);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const longLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return labels.map((label, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return {
      key: dateKey(day),
      label,
      longLabel: longLabels[index],
      dayNumber: day.getDate(),
      date: day,
    };
  });
};

export const formatShortDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatMonthYear = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(), { month: 'short', year: 'numeric' }).format(date);
};

export const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 0 }).format(number);
};

// ---------------------------------------------------------------------------
// Derived metrics
// ---------------------------------------------------------------------------

const sumBy = (items, pick) => items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);

export const mealCalories = (meal) => Number(meal?.calories) || 0;
export const mealProtein = (meal) => Number(meal?.protein) || 0;

const withinKey = (item, key) => {
  const value = item?.dateISO || item?.date;
  return dateKeyFromValue(value) === key;
};

export const buildDayStats = ({ key, profile, mealHistory, workoutHistory, water }) => {
  const meals = mealHistory.filter((meal) => withinKey(meal, key));
  const workouts = workoutHistory.filter((workout) => withinKey(workout, key));
  const calories = sumBy(meals, mealCalories);
  const protein = sumBy(meals, mealProtein);
  const glasses = Number(water?.[key]) || 0;

  const calorieTarget = Number(profile?.dailyCalories) || 0;
  const waterTarget = Number(profile?.waterTarget) || 8;

  const parts = [];
  if (calorieTarget > 0) {
    parts.push({ weight: 0.35, value: Math.min(1, calories / calorieTarget) });
  }
  parts.push({ weight: 0.25, value: Math.min(1, glasses / waterTarget) });
  parts.push({ weight: 0.25, value: workouts.length > 0 ? 1 : 0 });
  parts.push({ weight: 0.15, value: meals.length > 0 ? 1 : 0 });

  const weight = parts.reduce((total, part) => total + part.weight, 0);
  const score = weight
    ? Math.round((parts.reduce((total, part) => total + part.weight * part.value, 0) / weight) * 100)
    : 0;

  return {
    key,
    meals,
    workouts,
    calories,
    protein,
    glasses,
    score,
    hasActivity: meals.length > 0 || workouts.length > 0 || glasses > 0,
  };
};

export const calculateStreak = (activeDateKeys, from = new Date()) => {
  const set = activeDateKeys instanceof Set ? activeDateKeys : new Set(activeDateKeys || []);
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  // An ongoing streak is not broken until the current day is over.
  if (!set.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (set.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const average = (values = []) => {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

export const percentOf = (value, target) => {
  const denominator = Number(target) || 0;
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((Number(value) / denominator) * 100));
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'nutrifit:v1';

const storageKey = (userId, key) => `${STORAGE_PREFIX}:${userId || 'guest'}:${key}`;

export const readUserStore = (userId, key, fallback) => {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(storageKey(userId, key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

export const writeUserStore = (userId, key, value) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId, key), JSON.stringify(value));
  } catch (error) {
    // Storage can fail in private mode or when the quota is full. The app keeps
    // working with in-memory state for the current session.
  }
};

export const clearUserStore = (userId) => {
  if (typeof localStorage === 'undefined') return;
  ['profile', 'water', 'meal_history', 'meal_images', 'workout_history', 'session', 'plans', 'settings'].forEach((key) => {
    try {
      localStorage.removeItem(storageKey(userId, key));
    } catch (error) {
      // ignore
    }
  });
};
