// Supabase data layer.
//
// Every table is protected by row level security and keyed by auth.uid(), so
// the browser only ever reads or writes the signed-in person's rows. The app
// keeps a local mirror in userData.js for instant loads and offline use; this
// module is the source of truth when a session is available.

import { supabase } from './supabase';
import { DEFAULT_SETTINGS, normalizeSettings } from './preferences';

export const isDbConfigured = Boolean(supabase);

export class DbSetupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbSetupError';
    this.needsSetup = true;
  }
}

const SETUP_MESSAGE =
  'Supabase tables are not set up yet. Run supabase/migrations/0001_nutrifit_core.sql and 0002_nutrifit_storage.sql in the Supabase SQL editor, then reload. See DATABASE_SETUP.md.';

const client = () => {
  if (!supabase) {
    throw new DbSetupError(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.'
    );
  }
  return supabase;
};

const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

// Only remote URLs belong in the image columns. A base64 data URL stays in the
// local mirror until the Storage upload finishes.
const asImageUrl = (value) => {
  const text = String(value || '').trim();
  return /^https?:\/\//i.test(text) ? text : '';
};

// Meal photos are carried inside the existing meals.items JSONB so they reach
// other devices even when the optional Storage migration has not been run. The
// marker entry is removed before the app sees the food items.
const MEAL_IMAGE_KEY = '__nutrifit_image';

const splitMealItems = (items) => {
  const list = asArray(items);
  const marker = list.find(
    (item) => item && typeof item === 'object' && typeof item[MEAL_IMAGE_KEY] === 'string'
  );
  return {
    items: list.filter(
      (item) => !(item && typeof item === 'object' && typeof item[MEAL_IMAGE_KEY] === 'string')
    ),
    image: marker?.[MEAL_IMAGE_KEY] || '',
  };
};

const packMealItems = (items, image) => {
  const list = asArray(items).filter(
    (item) => !(item && typeof item === 'object' && MEAL_IMAGE_KEY in item)
  );
  const value = String(image || '');
  if (value) list.push({ [MEAL_IMAGE_KEY]: value });
  return list;
};

const dayKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isMissingTableError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'PGRST205' ||
    error?.code === 'PGRST125' ||
    error?.code === '42P01' ||
    message.includes('could not find the table') ||
    message.includes('does not exist') ||
    message.includes('invalid path specified')
  );
};

// The image columns arrive with 0002_nutrifit_storage.sql. Until that migration
// runs, retry the write without the new column so meals and profiles still sync.
//
// PostgREST answers with PGRST204 and a message such as
// "Could not find the 'avatar_url' column of 'profiles' in the schema cache",
// while Postgres itself uses 42703 and "<column> does not exist". Both mean the
// same thing here: the optional column is not in this database yet.
const MISSING_COLUMN_PATTERNS = [
  /could not find the '([^']+)' column/i,
  /column\s+"?([a-z0-9_]+)"?\s+does not exist/i,
  /could not find the "([^"]+)" column/i,
];

const missingColumnName = (error) => {
  const message = String(error?.message || '');
  for (const pattern of MISSING_COLUMN_PATTERNS) {
    const match = pattern.exec(message);
    if (match?.[1]) return match[1];
  }
  return '';
};

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  if (error?.code === 'PGRST204' || error?.code === '42703') return true;
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes('could not find the') && message.includes('column')) ||
    message.includes('schema cache')
  );
};

// null = unknown, true/false = remembered for this session so the app does not
// retry a missing column on every save.
let avatarColumnReady = null;
let imageColumnReady = null;

export const toDbError = (error) => {
  if (!error) return null;
  if (error.needsSetup) return error;
  if (isMissingTableError(error)) return new DbSetupError(SETUP_MESSAGE);
  return error;
};

const unwrap = (result) => {
  if (result?.error) throw toDbError(result.error);
  return result?.data;
};

const requireUserId = (userId) => {
  if (!userId || userId === 'guest') {
    throw new Error('Sign in to sync your NutriFit data.');
  }
  return userId;
};

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

const profileFromRow = (row) => {
  if (!row) return null;
  return {
    fullName: row.full_name || '',
    age: row.age ?? null,
    heightCm: row.height_cm ?? null,
    weightKg: row.weight_kg ?? null,
    targetWeightKg: row.target_weight_kg ?? null,
    goal: row.goal || '',
    experience: row.experience || '',
    activityLevel: row.activity_level || '',
    equipment: row.equipment || '',
    dailyCalories: row.daily_calories ?? null,
    dailyProtein: row.daily_protein ?? null,
    waterTarget: row.water_target ?? 8,
    trainingTarget: row.training_target ?? 4,
    avatarUrl: row.avatar_url || '',
    updatedAt: row.updated_at || '',
  };
};

const profileToRow = (userId, profile = {}) => ({
  id: userId,
  full_name: String(profile.fullName || '').trim(),
  age: profile.age ?? null,
  height_cm: profile.heightCm ?? null,
  weight_kg: profile.weightKg ?? null,
  target_weight_kg: profile.targetWeightKg ?? null,
  goal: profile.goal || '',
  experience: profile.experience || '',
  activity_level: profile.activityLevel || '',
  equipment: profile.equipment || '',
  daily_calories: profile.dailyCalories ?? null,
  daily_protein: profile.dailyProtein ?? null,
  water_target: profile.waterTarget ?? 8,
  training_target: profile.trainingTarget ?? 4,
  avatar_url: asImageUrl(profile.avatarUrl),
  updated_at: profile.updatedAt || new Date().toISOString(),
});

const mealFromRow = (row) => {
  const packed = splitMealItems(row.items);
  return {
    id: row.id,
    name: row.name || 'Meal',
    mealType: row.meal_type || '',
    calories: asNumber(row.calories),
    protein: asNumber(row.protein),
    carbs: asNumber(row.carbs),
    fat: asNumber(row.fat),
    servingSize: row.serving_size || '',
    items: packed.items,
    date: row.eaten_at ? new Date(row.eaten_at).toLocaleString() : row.day || '',
    dateISO: row.day || '',
    image: row.image_url || packed.image || '',
  };
};

const mealToRow = (userId, entry = {}) => {
  const day = entry.dateISO || dayKey(entry.date) || dayKey();
  return {
    user_id: userId,
    id: String(entry.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    name: entry.name || 'Meal',
    meal_type: entry.mealType || null,
    calories: Math.round(asNumber(entry.calories)),
    protein: asNumber(entry.protein),
    carbs: asNumber(entry.carbs),
    fat: asNumber(entry.fat),
    serving_size: entry.servingSize || null,
    items: packMealItems(entry.items, entry.imageUrl || entry.image),
    image_url: asImageUrl(entry.imageUrl || entry.image),
    day,
    eaten_at: entry.date && !Number.isNaN(new Date(entry.date).getTime())
      ? new Date(entry.date).toISOString()
      : new Date(`${day}T12:00:00`).toISOString(),
  };
};

const workoutFromRow = (row) => ({
  id: row.id,
  title: row.title || 'Workout',
  exercises: asNumber(row.exercises),
  sets: asNumber(row.sets),
  minutes: asNumber(row.minutes),
  focus: asArray(row.focus),
  items: asArray(row.items),
  date: row.performed_at || row.day || '',
  dateISO: row.day || '',
});

const workoutToRow = (userId, record = {}) => {
  const day = record.dateISO || dayKey(record.date) || dayKey();
  return {
    user_id: userId,
    id: String(record.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: record.title || 'Workout',
    exercises: Math.round(asNumber(record.exercises)),
    sets: Math.round(asNumber(record.sets)),
    minutes: Math.round(asNumber(record.minutes)),
    focus: asArray(record.focus),
    items: asArray(record.items),
    day,
    performed_at:
      record.date && !Number.isNaN(new Date(record.date).getTime())
        ? new Date(record.date).toISOString()
        : new Date(`${day}T12:00:00`).toISOString(),
  };
};

const settingsFromRow = (row) => {
  if (!row) return null;
  return normalizeSettings({
    notifications: row.notifications,
    theme: row.theme,
    language: row.language,
    units: row.units,
  });
};

const settingsToRow = (userId, settings = {}) => {
  const normalized = normalizeSettings(settings);
  return {
    user_id: userId,
    notifications: normalized.notifications,
    theme: normalized.theme,
    language: normalized.language,
    units: normalized.units,
    updated_at: new Date().toISOString(),
  };
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchUserData(userId) {
  const id = requireUserId(userId);
  const db = client();

  const [profileResult, waterResult, mealsResult, workoutsResult, sessionResult, plansResult, settingsResult] =
    await Promise.all([
      db.from('profiles').select('*').eq('id', id).maybeSingle(),
      db.from('water_logs').select('day, glasses').eq('user_id', id),
      db.from('meals').select('*').eq('user_id', id).order('eaten_at', { ascending: false }).limit(300),
      db.from('workouts').select('*').eq('user_id', id).order('performed_at', { ascending: false }).limit(50),
      db.from('workout_sessions').select('exercises').eq('user_id', id).maybeSingle(),
      db.from('plans').select('workouts, meals').eq('user_id', id).maybeSingle(),
      db.from('user_settings').select('*').eq('user_id', id).maybeSingle(),
    ]);

  const results = [profileResult, waterResult, mealsResult, workoutsResult, sessionResult, plansResult, settingsResult];
  const failed = results.find((result) => result?.error);
  if (failed) throw toDbError(failed.error);

  // `select('*')` also reveals which optional columns this database actually
  // has, so the first avatar or meal photo save does not need a failed try.
  if (profileResult.data) avatarColumnReady = 'avatar_url' in profileResult.data;
  const firstMeal = asArray(mealsResult.data)[0];
  if (firstMeal) imageColumnReady = 'image_url' in firstMeal;

  const water = {};
  asArray(waterResult.data).forEach((row) => {
    if (row?.day) water[row.day] = asNumber(row.glasses);
  });

  return {
    profile: profileFromRow(profileResult.data),
    water,
    meals: asArray(mealsResult.data).map(mealFromRow),
    workouts: asArray(workoutsResult.data).map(workoutFromRow),
    session: asArray(sessionResult.data?.exercises),
    plans: {
      workouts: asArray(plansResult.data?.workouts),
      meals: asArray(plansResult.data?.meals),
    },
    settings: settingsFromRow(settingsResult.data),
    hasProfileRow: Boolean(profileResult.data),
    hasPlansRow: Boolean(plansResult.data),
    hasSessionRow: Boolean(sessionResult.data),
    hasSettingsRow: Boolean(settingsResult.data),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function saveProfileRemote(userId, profile) {
  const id = requireUserId(userId);
  const row = profileToRow(id, profile);
  // An empty avatar is not worth a request: leave the optional column out until
  // there is a real URL, so accounts without 0002 never hit a PGRST204 for
  // nothing. Remember a missing column for the rest of the session.
  const sendsAvatar = avatarColumnReady !== false && Boolean(row.avatar_url);
  if (!sendsAvatar) delete row.avatar_url;

  let result = await client().from('profiles').upsert(row, { onConflict: 'id' });
  if (result.error && isMissingColumnError(result.error)) {
    const column = missingColumnName(result.error) || 'avatar_url';
    if (column === 'avatar_url') {
      avatarColumnReady = false;
      if ('avatar_url' in row) {
        const { avatar_url, ...legacy } = row;
        result = await client().from('profiles').upsert(legacy, { onConflict: 'id' });
      }
    }
  }
  if (!result.error && sendsAvatar && avatarColumnReady !== false) avatarColumnReady = true;
  unwrap(result);
  return profile;
}

export async function setWaterRemote(userId, day, glasses) {
  const id = requireUserId(userId);
  unwrap(
    await client().from('water_logs').upsert(
      {
        user_id: id,
        day,
        glasses: Math.max(0, Math.min(40, Math.round(asNumber(glasses)))),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,day' }
    )
  );
}

export async function upsertWaterRows(userId, water = {}) {
  const id = requireUserId(userId);
  const rows = Object.entries(water)
    .filter(([day, glasses]) => day && asNumber(glasses) > 0)
    .map(([day, glasses]) => ({
      user_id: id,
      day,
      glasses: Math.max(0, Math.min(40, Math.round(asNumber(glasses)))),
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return;
  unwrap(await client().from('water_logs').upsert(rows, { onConflict: 'user_id,day' }));
}

export async function addMealRemote(userId, entry) {
  const id = requireUserId(userId);
  const row = mealToRow(id, entry);
  // Only send image_url when Storage actually produced a public URL.
  const sendsImage = imageColumnReady !== false && Boolean(row.image_url);
  if (!sendsImage) delete row.image_url;

  let result = await client().from('meals').upsert(row, { onConflict: 'user_id,id' }).select().single();
  if (result.error && isMissingColumnError(result.error)) {
    const column = missingColumnName(result.error) || 'image_url';
    if (column === 'image_url') {
      imageColumnReady = false;
      if ('image_url' in row) {
        const { image_url, ...legacy } = row;
        result = await client().from('meals').upsert(legacy, { onConflict: 'user_id,id' }).select().single();
      }
    }
  }
  if (!result.error && sendsImage && imageColumnReady !== false) imageColumnReady = true;
  if (result.error) throw toDbError(result.error);
  return mealFromRow(result.data);
}

export async function upsertMeals(userId, entries = []) {
  const id = requireUserId(userId);
  let rows = asArray(entries).filter((entry) => entry?.name).map((entry) => mealToRow(id, entry));
  if (!rows.length) return;
  const sendsImage = imageColumnReady !== false && rows.some((row) => Boolean(row.image_url));
  if (!sendsImage) rows = rows.map(({ image_url, ...legacy }) => legacy);

  let result = await client().from('meals').upsert(rows, { onConflict: 'user_id,id' });
  if (result.error && isMissingColumnError(result.error)) {
    const column = missingColumnName(result.error) || 'image_url';
    if (column === 'image_url') {
      imageColumnReady = false;
      rows = rows.map(({ image_url, ...legacy }) => legacy);
      result = await client().from('meals').upsert(rows, { onConflict: 'user_id,id' });
    }
  }
  if (!result.error && sendsImage && imageColumnReady !== false) imageColumnReady = true;
  if (result.error) throw toDbError(result.error);
}

export async function deleteMealRemote(userId, mealId) {
  const id = requireUserId(userId);
  unwrap(await client().from('meals').delete().eq('user_id', id).eq('id', String(mealId)));
}

export async function addWorkoutRemote(userId, record) {
  const id = requireUserId(userId);
  const row = workoutToRow(id, record);
  const { data, error } = await client().from('workouts').upsert(row, { onConflict: 'user_id,id' }).select().single();
  if (error) throw toDbError(error);
  return workoutFromRow(data);
}

export async function upsertWorkouts(userId, records = []) {
  const id = requireUserId(userId);
  const rows = asArray(records).filter(Boolean).map((record) => workoutToRow(id, record));
  if (!rows.length) return;
  unwrap(await client().from('workouts').upsert(rows, { onConflict: 'user_id,id' }));
}

export async function saveSessionRemote(userId, exercises = []) {
  const id = requireUserId(userId);
  unwrap(
    await client().from('workout_sessions').upsert(
      {
        user_id: id,
        exercises: asArray(exercises),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  );
}

export async function savePlansRemote(userId, plans = {}) {
  const id = requireUserId(userId);
  unwrap(
    await client().from('plans').upsert(
      {
        user_id: id,
        workouts: asArray(plans.workouts),
        meals: asArray(plans.meals),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
  );
}

export async function saveSettingsRemote(userId, settings) {
  const id = requireUserId(userId);
  unwrap(
    await client().from('user_settings').upsert(settingsToRow(id, settings), { onConflict: 'user_id' })
  );
}

export async function deleteAccountRemote() {
  const db = client();
  const { error } = await db.rpc('delete_my_account');
  if (error) throw toDbError(error);
}

// ---------------------------------------------------------------------------
// First-run migration
// ---------------------------------------------------------------------------

const profileHasData = (profile) => {
  if (!profile) return false;
  return Boolean(
    String(profile.fullName || '').trim() ||
      profile.age ||
      profile.heightCm ||
      profile.weightKg ||
      profile.targetWeightKg ||
      profile.goal ||
      profile.experience ||
      profile.activityLevel ||
      profile.equipment ||
      profile.dailyCalories ||
      profile.dailyProtein ||
      profile.avatarUrl
  );
};

const plansHaveData = (plans) => Boolean(plans?.workouts?.length || plans?.meals?.length);
const sessionHasData = (session) => asArray(session).length > 0;
const settingsHaveData = (settings) => {
  if (!settings) return false;
  const normalized = normalizeSettings(settings);
  const defaults = normalizeSettings(DEFAULT_SETTINGS);
  return (
    normalized.theme !== defaults.theme ||
    normalized.language !== defaults.language ||
    normalized.units !== defaults.units ||
    Object.keys(defaults.notifications).some(
      (key) => normalized.notifications[key] !== defaults.notifications[key]
    )
  );
};

// Copies local data into an empty Supabase account, then returns the merged
// view so the app can render immediately without a second round trip.
export async function syncMissingRemote(userId, remote, local) {
  const jobs = [];
  const merged = {
    ...remote,
    profile: remote.profile,
    water: remote.water,
    meals: remote.meals,
    workouts: remote.workouts,
    session: remote.session,
    plans: remote.plans,
    settings: remote.settings,
  };

  if (!profileHasData(remote.profile) && profileHasData(local.profile)) {
    jobs.push(saveProfileRemote(userId, local.profile));
    merged.profile = local.profile;
  }

  if (!Object.keys(remote.water || {}).length && Object.keys(local.water || {}).length) {
    jobs.push(upsertWaterRows(userId, local.water));
    merged.water = local.water;
  }

  if (!remote.meals.length && local.mealHistory.length) {
    jobs.push(upsertMeals(userId, local.mealHistory));
    merged.meals = local.mealHistory;
  }

  if (!remote.workouts.length && local.workoutHistory.length) {
    jobs.push(upsertWorkouts(userId, local.workoutHistory));
    merged.workouts = local.workoutHistory;
  }

  if (!sessionHasData(remote.session) && sessionHasData(local.session)) {
    jobs.push(saveSessionRemote(userId, local.session));
    merged.session = local.session;
  }

  if (!plansHaveData(remote.plans) && plansHaveData(local.plans)) {
    jobs.push(savePlansRemote(userId, local.plans));
    merged.plans = local.plans;
  }

  if (
    (!remote.hasSettingsRow || !settingsHaveData(remote.settings)) &&
    settingsHaveData(local.settings)
  ) {
    jobs.push(saveSettingsRemote(userId, local.settings));
    merged.settings = normalizeSettings(local.settings);
  }

  if (jobs.length) await Promise.all(jobs);
  return merged;
}
