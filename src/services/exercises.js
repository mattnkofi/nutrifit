import { getEquipmentLabel, normalizeLevel } from './exerciseGuide';

const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';
const IMAGE_FALLBACK_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

const CURATED_STARTERS = [
  'Pushups',
  'Bodyweight Squat',
  'Plank',
  'Reverse Crunch',
  'Single Leg Glute Bridge',
  'Inverted Row',
  'Dead Bug',
  'Superman',
  'Side Bridge',
  'Mountain Climbers',
  'Dumbbell Bench Press',
  'Dumbbell Squat',
  'Bent Over Two-Dumbbell Row',
  'Dumbbell Lunges',
  'Dumbbell Shoulder Press',
  'Dumbbell Bicep Curl',
  'Dumbbell Flyes',
  'Dumbbell Step Ups',
  'Barbell Squat',
  'Barbell Deadlift',
  'Barbell Bench Press - Medium Grip',
  'Bent Over Barbell Row',
  'Barbell Shoulder Press',
  'Romanian Deadlift',
  'Barbell Hip Thrust',
  'Wide-Grip Lat Pulldown',
  'Seated Cable Rows',
  'Face Pull',
  'Goblet Squat',
  'Band Pull Apart',
  'Lateral Raise - With Bands',
  'Band Good Morning',
  'Leg Press',
  'Leg Extensions',
  'Lying Leg Curls',
  'Calf Press On The Leg Press Machine',
  'Walking, Treadmill',
  'Rowing, Stationary',
  'Bicycling, Stationary',
  '90/90 Hamstring',
  'Ankle On The Knee',
];

const CURATED_INDEX = new Map(CURATED_STARTERS.map((name, index) => [name, index]));

const normalizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isBodyweightName = (name = '') =>
  /push|pull|chin|dip|plank|squat|lunge|crunch|sit up|bridge|raise|row|dead bug|superman|mountain climber|stretch|hamstring|adductor|quad|glute|hip|calf|neck|wrist|ankle|shoulder|chest|back|core/i.test(
    String(name).toLowerCase()
  );

const getGroup = (category, equipment, name) => {
  const bodyweight = equipment.includes('body') || (!equipment && isBodyweightName(name));
  if (category.includes('stretching')) return 'Mobility';
  if (category.includes('cardio') || category.includes('plyometrics')) return 'Cardio';
  if (
    category.includes('strength') ||
    category.includes('powerlifting') ||
    category.includes('strongman') ||
    category.includes('olympic')
  ) {
    return bodyweight ? 'Calisthenics' : 'Weight Training';
  }
  return bodyweight ? 'Calisthenics' : 'Other';
};

export function loadExercises() {
  return import('../data/exercises.json')
    .then((module) => {
      const data = module.default || module;
      return Array.isArray(data) ? data : [];
    })
    .catch(() => []);
}

export function normalizeExercise(ex) {
  const name = ex.name || '';
  const category = String(ex.category || '').toLowerCase();
  const equipment = String(ex.equipment || '').toLowerCase();
  const group = getGroup(category, equipment, name);
  const level = normalizeLevel(ex.level);
  const muscles = Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : [];
  const secondaryMuscles = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [];
  const instructions = Array.isArray(ex.instructions)
    ? ex.instructions.map((step) => String(step || '').trim()).filter(Boolean)
    : [];
  const images = Array.isArray(ex.images) ? ex.images.filter(Boolean) : [];
  const curatedIndex = CURATED_INDEX.has(name) ? CURATED_INDEX.get(name) : 999;
  const equipmentPenalty = /machine|other|cable/.test(equipment) ? 40 : /barbell|dumbbell|kettlebell|band/.test(equipment) ? 20 : 0;
  const levelPenalty = level === 'advanced' ? 30 : level === 'intermediate' ? 10 : 0;

  return {
    id: ex.id || name.replace(/\s+/g, '_'),
    name,
    group,
    category: ex.category,
    level,
    rawLevel: ex.level,
    equipment: ex.equipment,
    equipmentLabel: getEquipmentLabel({ equipment: ex.equipment, group }),
    force: ex.force,
    mechanic: ex.mechanic,
    muscles,
    secondaryMuscles,
    instructions,
    images,
    searchText: [name, group, category, equipment, level, ...muscles, ...secondaryMuscles].join(' ').toLowerCase(),
    rank: curatedIndex + equipmentPenalty + levelPenalty,
    raw: ex,
  };
}

let allExercisesCache = null;
let allExercisesPromise = null;

export async function getAllExercises() {
  if (allExercisesCache) return allExercisesCache;
  if (!allExercisesPromise) {
    allExercisesPromise = loadExercises()
      .then((data) => {
        allExercisesCache = (Array.isArray(data) ? data : []).map(normalizeExercise);
        return allExercisesCache;
      })
      .catch(() => []);
  }
  return allExercisesPromise;
}

export const getExerciseImage = (image) => {
  if (!image) return '';
  const value = typeof image === 'string' ? image : image.image;
  if (!value) return '';
  return String(value).startsWith('http') ? value : `${IMAGE_BASE}/${value}`;
};

export const getExerciseImageFallback = (image) => {
  if (!image) return '';
  const value = typeof image === 'string' ? image : image.image;
  if (!value || String(value).startsWith('http')) return '';
  return `${IMAGE_FALLBACK_BASE}/${value}`;
};

export const handleExerciseImageError = (event, image) => {
  const target = event?.target;
  if (!target) return;
  const fallback = getExerciseImageFallback(image);
  if (fallback && target.src !== fallback) {
    target.src = fallback;
    return;
  }
  target.style.visibility = 'hidden';
};

const RISKY_NAMES =
  /guillotine|atlas|axle|chain|board press|one arm chin|handstand|muscle up|snatch|clean and jerk|windmill|turkish get|sled|tire|stone|log press|yoke|farmer|bent press|planche|front lever|back lever|iron cross|human flag|deficit|manual/i;

const isSafeExercise = (exercise) => {
  const name = String(exercise.name || '');
  if (RISKY_NAMES.test(name)) return false;
  if (exercise.level === 'advanced' && /jump|plyo|explosive|depth/i.test(name)) return false;
  return true;
};

const matchesEquipmentPref = (exercise, equipmentPref) => {
  const pref = String(equipmentPref || '').toLowerCase();
  const equipment = String(exercise.equipment || '').toLowerCase();
  if (!pref || /full|gym|any|all/.test(pref)) return true;
  if (/body|none|home/.test(pref)) {
    return exercise.group === 'Calisthenics' || exercise.group === 'Cardio' || exercise.group === 'Mobility';
  }
  if (/dumbbell/.test(pref)) return exercise.group === 'Calisthenics' || /dumbbell/.test(equipment);
  if (/barbell/.test(pref)) return exercise.group === 'Calisthenics' || /barbell|e-z curl/.test(equipment);
  if (/band/.test(pref)) return exercise.group === 'Calisthenics' || /band/.test(equipment);
  if (/kettlebell/.test(pref)) return exercise.group === 'Calisthenics' || /kettlebell/.test(equipment);
  if (/machine|cable/.test(pref)) return exercise.group === 'Calisthenics' || /machine|cable/.test(equipment);
  return true;
};

const matchesLevelPref = (exercise, levelPref) => {
  const pref = normalizeLevel(levelPref);
  if (!levelPref || String(levelPref).toLowerCase() === 'all') return true;
  if (pref === 'beginner') return exercise.level === 'beginner';
  if (pref === 'intermediate') return exercise.level === 'beginner' || exercise.level === 'intermediate';
  return true;
};

const scoreExercise = (exercise, goal, level, equipmentPref) => {
  const equipment = String(exercise.equipment || '').toLowerCase();
  const pref = String(equipmentPref || '').toLowerCase();
  let score = CURATED_INDEX.has(exercise.name) ? 120 - CURATED_INDEX.get(exercise.name) : 0;

  if (/dumbbell/.test(pref) && /dumbbell/.test(equipment)) score += 30;
  if (/barbell/.test(pref) && /barbell/.test(equipment)) score += 30;
  if (/kettlebell/.test(pref) && /kettlebell/.test(equipment)) score += 30;
  if (/band/.test(pref) && /band/.test(equipment)) score += 30;
  if (/machine|cable/.test(pref) && /machine|cable/.test(equipment)) score += 30;
  if (exercise.mechanic === 'compound') score += 20;
  if (exercise.group === 'Calisthenics') score += 12;
  if (exercise.group === 'Cardio') score += goal === 'lose_fat' || goal === 'endurance' ? 18 : 4;
  if (exercise.group === 'Mobility') score += goal === 'mobility' || goal === 'flexibility' ? 24 : 2;
  if (goal === 'build_muscle' && exercise.group === 'Weight Training') score += 12;
  if (goal === 'build_muscle' && exercise.group === 'Calisthenics') score += 10;
  if (goal === 'lose_fat' && exercise.group === 'Calisthenics') score += 8;
  if (exercise.level === level) score += 6;
  if (/machine|other/.test(equipment)) score -= 8;
  if (/barbell/.test(equipment) && level === 'beginner') score -= 6;
  if (exercise.muscles.some((muscle) => /abdominal|glute|quadriceps|hamstrings|chest|lats|middle back|shoulders/i.test(muscle))) score += 4;

  return score;
};

export async function getRecommendations(userPrefs = {}) {
  const all = await getAllExercises();
  const goal = String(userPrefs.goal || 'general_fitness').toLowerCase();
  const level = normalizeLevel(userPrefs.level || 'beginner');
  const equipmentPref = userPrefs.equipment || 'bodyweight';

  const filtered = all.filter(
    (exercise) =>
      isSafeExercise(exercise) &&
      matchesLevelPref(exercise, level) &&
      matchesEquipmentPref(exercise, equipmentPref)
  );

  const ranked = (filtered.length ? filtered : all.filter(isSafeExercise))
    .slice()
    .sort(
      (a, b) =>
        scoreExercise(b, goal, level, equipmentPref) - scoreExercise(a, goal, level, equipmentPref) ||
        a.rank - b.rank ||
        a.name.localeCompare(b.name)
    );

  const picked = [];
  const muscleCounts = new Map();

  for (const exercise of ranked) {
    const key = String(exercise.muscles[0] || exercise.group || 'other').toLowerCase();
    if ((muscleCounts.get(key) || 0) >= 2) continue;
    picked.push(exercise);
    muscleCounts.set(key, (muscleCounts.get(key) || 0) + 1);
    if (picked.length >= 6) break;
  }

  if (picked.length < 6) {
    for (const exercise of ranked) {
      if (picked.some((item) => item.id === exercise.id)) continue;
      picked.push(exercise);
      if (picked.length >= 6) break;
    }
  }

  return picked.slice(0, 6);
}

const findBestMatch = (name, all, index) => {
  const key = normalizeName(name);
  if (!key) return null;
  if (index.has(key)) return index.get(key);

  const compact = key.replace(/\s+/g, '');
  let best = null;
  let bestScore = 0;

  for (const exercise of all) {
    const candidateKey = normalizeName(exercise.name);
    const candidateCompact = candidateKey.replace(/\s+/g, '');
    let score = 0;

    if (candidateCompact === compact) {
      score = 1;
    } else if (candidateCompact.includes(compact) || compact.includes(candidateCompact)) {
      score = 0.85;
    } else {
      const a = new Set(key.split(' '));
      const b = new Set(candidateKey.split(' '));
      let overlap = 0;
      a.forEach((token) => {
        if (b.has(token)) overlap += 1;
      });
      score = overlap / Math.max(a.size, b.size);
    }

    if (score > bestScore) {
      bestScore = score;
      best = exercise;
    }
  }

  return bestScore >= 0.6 ? best : null;
};

export async function resolveRecommendedExercises(recommendations = [], userPrefs = {}) {
  const all = await getAllExercises();
  const index = new Map(all.map((exercise) => [normalizeName(exercise.name), exercise]));
  const resolved = [];
  const seen = new Set();

  for (const recommendation of Array.isArray(recommendations) ? recommendations : []) {
    const name = recommendation?.name || recommendation?.exercise || '';
    const match = findBestMatch(name, all, index);
    if (match && !seen.has(match.id)) {
      resolved.push(match);
      seen.add(match.id);
    }
    if (resolved.length >= 6) break;
  }

  if (resolved.length < 3) {
    const fallback = await getRecommendations(userPrefs);
    for (const exercise of fallback) {
      if (resolved.length >= 6) break;
      if (seen.has(exercise.id)) continue;
      resolved.push(exercise);
      seen.add(exercise.id);
    }
  }

  return resolved.slice(0, 6);
}

const matchesEquipmentFilter = (exercise, filter) => {
  if (!filter || filter === 'All') return true;
  const equipment = String(exercise.equipment || '').toLowerCase();
  const value = String(filter).toLowerCase();
  if (value === 'bodyweight') return exercise.group === 'Calisthenics' || equipment.includes('body');
  if (value === 'dumbbell') return equipment.includes('dumbbell') || exercise.group === 'Calisthenics';
  if (value === 'barbell') return equipment.includes('barbell') || equipment.includes('e-z curl') || exercise.group === 'Calisthenics';
  if (value === 'bands') return equipment.includes('band') || exercise.group === 'Calisthenics';
  if (value === 'kettlebell') return equipment.includes('kettlebell') || exercise.group === 'Calisthenics';
  if (value === 'machine') return equipment.includes('machine') || equipment.includes('cable') || exercise.group === 'Calisthenics';
  if (value === 'cardio') return exercise.group === 'Cardio' || exercise.group === 'Mobility';
  return true;
};

export async function searchExercises(query = '', group = 'All', filters = {}) {
  const all = await getAllExercises();
  const q = normalizeName(query);
  const compactQuery = q.replace(/\s+/g, '');
  const level = filters.level || 'All';
  const equipment = filters.equipment || 'All';

  return all
    .filter((exercise) => {
      const matchesGroup = group === 'All' || exercise.group === group;
      if (!matchesGroup) return false;
      if (!matchesEquipmentFilter(exercise, equipment)) return false;
      if (level !== 'All' && exercise.level !== normalizeLevel(level)) return false;
      if (!q) return true;
      if (exercise.searchText.includes(q)) return true;
      return compactQuery.length > 1 && exercise.searchText.replace(/\s+/g, '').includes(compactQuery);
    })
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}

export async function getExercisesByNames(names = []) {
  const all = await getAllExercises();
  const index = new Map(all.map((exercise) => [normalizeName(exercise.name), exercise]));
  return (Array.isArray(names) ? names : []).map((name) => findBestMatch(name, all, index)).filter(Boolean);
}
