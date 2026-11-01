const normalizeKey = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compactKey = (value = '') => normalizeKey(value).replace(/\s+/g, '');

const unique = (items) => [...new Set(items.filter(Boolean))];

export const normalizeLevel = (level) => {
  const value = String(level || 'beginner').toLowerCase();
  if (value === 'expert' || value === 'advanced') return 'advanced';
  if (value === 'intermediate') return 'intermediate';
  return 'beginner';
};

export const getLevelLabel = (level) => {
  const value = normalizeLevel(level);
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const getEquipmentLabel = (exercise = {}) => {
  const raw = String(exercise.equipment || '').trim();
  if (!raw) return exercise.group === 'Calisthenics' ? 'Bodyweight' : 'Not specified';
  if (raw.toLowerCase() === 'body only') return 'Bodyweight';
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
};

const CURATED_LIST = [
  {
    keys: ['pushups', 'push up', 'push ups', 'pushup'],
    cues: [
      'Place your hands slightly wider than your shoulders.',
      'Keep a straight line from your head to your heels.',
      'Lower until your chest is just above the floor.',
      'Press the floor away and exhale as you rise.',
    ],
    mistakes: ['Letting the hips sag or pike', 'Flaring the elbows past 45 degrees', 'Stopping halfway through the range'],
    safety: ['Use an incline, a wall, or your knees if the floor version is too hard.'],
    breathing: 'Inhale as you lower, exhale as you press up.',
  },
  {
    keys: ['bodyweight squat', 'squat', 'air squat'],
    cues: [
      'Stand with your feet about shoulder-width apart.',
      'Sit your hips back and down while your chest stays tall.',
      'Keep your knees tracking in line with your toes.',
      'Drive through your whole foot to stand tall.',
    ],
    mistakes: ['Heels lifting off the floor', 'Knees caving inward', 'Rounding your lower back at the bottom'],
    safety: ['Use a chair or a wall for balance, or reduce the depth until you feel stable.'],
    breathing: 'Inhale as you sit down, exhale as you stand up.',
  },
  {
    keys: ['plank', 'front plank'],
    cues: [
      'Set your elbows under your shoulders.',
      'Squeeze your glutes and brace your abs.',
      'Keep your head neutral and your back long.',
      'Breathe steadily instead of holding your breath.',
    ],
    mistakes: ['Hips too high or too low', 'Shrugging the shoulders', 'Holding your breath'],
    safety: ['Drop to your knees or place your hands on a bench if your back starts to sag.'],
    breathing: 'Take slow, steady breaths through the hold.',
  },
  {
    keys: ['side bridge', 'side plank'],
    cues: [
      'Stack your elbow under your shoulder.',
      'Lift your hips so your body forms a straight line.',
      'Keep your top shoulder stacked over the bottom one.',
      'Reach long through the top arm if it feels comfortable.',
    ],
    mistakes: ['Hips dropping toward the floor', 'Rolling the chest forward', 'Shrugging the supporting shoulder'],
    safety: ['Bend your knees or use a shorter hold if your shoulder or back complains.'],
    breathing: 'Breathe evenly and keep your ribs stacked.',
  },
  {
    keys: ['reverse crunch'],
    cues: [
      'Press your lower back gently into the floor.',
      'Bring your knees toward your chest without swinging.',
      'Lift your hips slightly at the top of the curl.',
      'Lower slowly until your feet are just above the floor.',
    ],
    mistakes: ['Using momentum to swing the legs', 'Arching the lower back', 'Letting the feet drop too fast'],
    safety: ['Keep the range small if your lower back feels sensitive.'],
    breathing: 'Exhale as you curl up, inhale as you lower.',
  },
  {
    keys: ['single leg glute bridge', 'glute bridge', 'butt lift bridge'],
    cues: [
      'Lie on your back with one foot planted and the other leg extended or bent.',
      'Tuck your pelvis slightly and brace your core.',
      'Drive through the planted heel to lift your hips.',
      'Squeeze the glute at the top, then lower with control.',
    ],
    mistakes: ['Arching the lower back instead of using the glutes', 'Pushing through the toes', 'Rushing the lowering phase'],
    safety: ['Use both feet on the floor if the single-leg version feels unstable.'],
    breathing: 'Exhale as you lift, inhale as you lower.',
  },
  {
    keys: ['inverted row', 'bodyweight row'],
    cues: [
      'Set the bar or handles at a height you can control.',
      'Keep your body straight from head to heels.',
      'Pull your chest toward the bar and lead with your elbows.',
      'Lower slowly until your arms are straight.',
    ],
    mistakes: ['Sagging hips', 'Pulling with the arms only', 'Shrugging the shoulders'],
    safety: ['Raise the bar or bend your knees to make the movement easier.'],
    breathing: 'Exhale as you pull, inhale as you lower.',
  },
  {
    keys: ['dead bug'],
    cues: [
      'Lie on your back with your ribs stacked over your hips.',
      'Reach the opposite arm and leg away slowly.',
      'Keep your lower back gently pressed into the floor.',
      'Return to the start and switch sides.',
    ],
    mistakes: ['Letting the lower back arch', 'Moving too fast', 'Holding your breath'],
    safety: ['Shorten the reach if you cannot keep your back comfortable.'],
    breathing: 'Exhale as you reach, inhale as you return.',
  },
  {
    keys: ['superman'],
    cues: [
      'Lie face down with your arms and legs long.',
      'Gently lift your chest, arms, and legs away from the floor.',
      'Reach long instead of forcing height.',
      'Lower slowly and relax completely between reps.',
    ],
    mistakes: ['Cranking the neck upward', 'Lifting too high and arching hard', 'Bouncing at the top'],
    safety: ['Keep the lift small and stop if your lower back feels pinched.'],
    breathing: 'Exhale as you lift, inhale as you lower.',
  },
  {
    keys: ['mountain climbers', 'mountain climber'],
    cues: [
      'Start in a strong plank with your hands under your shoulders.',
      'Drive one knee toward your chest without lifting your hips.',
      'Switch legs smoothly and keep your core braced.',
      'Land softly and keep a steady rhythm.',
    ],
    mistakes: ['Hips bouncing up and down', 'Shoulders drifting behind the hands', 'Landing heavily'],
    safety: ['Slow the pace or step your feet instead of running if your wrists or back need a break.'],
    breathing: 'Breathe rhythmically and avoid holding your breath.',
  },
  {
    keys: ['dumbbell bench press', 'bench press'],
    cues: [
      'Set your shoulder blades back and down on the bench.',
      'Hold the weights over your chest with wrists stacked.',
      'Lower until your elbows are around 45 degrees from your ribs.',
      'Press up and slightly together without clanging the weights.',
    ],
    mistakes: ['Flaring the elbows straight out', 'Bouncing the weights off the chest', 'Lifting the hips off the bench'],
    safety: ['Use a spotter or a safe rack for heavy sets.'],
    breathing: 'Inhale as you lower, exhale as you press.',
  },
  {
    keys: ['dumbbell flyes', 'dumbbell fly', 'flyes'],
    cues: [
      'Start with the weights over your chest and a soft elbow bend.',
      'Open your arms in a wide arc until you feel a comfortable chest stretch.',
      'Keep the elbow angle the same throughout.',
      'Bring the weights back together with control.',
    ],
    mistakes: ['Straightening the elbows too much', 'Going deeper than your shoulders allow', 'Using heavy weights that turn it into a press'],
    safety: ['Choose a light load and stop before the stretch feels sharp.'],
    breathing: 'Inhale as you open, exhale as you bring the weights together.',
  },
  {
    keys: ['bent over two dumbbell row', 'bent over dumbbell row', 'one arm dumbbell row', 'dumbbell row'],
    cues: [
      'Hinge at the hips and keep your back long.',
      'Let your arms hang straight down from your shoulders.',
      'Pull your elbow toward your hip and squeeze your back.',
      'Lower slowly until your arm is straight again.',
    ],
    mistakes: ['Rounding the back', 'Shrugging the shoulder toward the ear', 'Swinging the weight with momentum'],
    safety: ['Support your free hand on a bench if the bent-over position feels hard on your back.'],
    breathing: 'Exhale as you pull, inhale as you lower.',
  },
  {
    keys: ['dumbbell shoulder press', 'shoulder press', 'overhead press'],
    cues: [
      'Brace your core and keep your ribs stacked over your hips.',
      'Start with the weights at shoulder height.',
      'Press overhead without arching your lower back.',
      'Lower with control to the starting position.',
    ],
    mistakes: ['Leaning back to press the weight', 'Flaring the ribs', 'Shrugging at the top'],
    safety: ['Seated support or a lighter load can help if your lower back arches.'],
    breathing: 'Exhale as you press, inhale as you lower.',
  },
  {
    keys: ['dumbbell bicep curl', 'bicep curl', 'barbell curl', 'curl'],
    cues: [
      'Stand tall with your elbows close to your ribs.',
      'Curl the weight without swinging your torso.',
      'Squeeze the biceps at the top without lifting the elbow forward.',
      'Lower slowly until your arm is almost straight.',
    ],
    mistakes: ['Swinging the body to lift the weight', 'Letting the elbows drift forward', 'Dropping the weight on the way down'],
    safety: ['Use a load you can lower under control for every rep.'],
    breathing: 'Exhale as you curl, inhale as you lower.',
  },
  {
    keys: ['dumbbell tricep extension', 'tricep extension', 'skull crusher', 'triceps extension'],
    cues: [
      'Keep your upper arms steady and close to your head or ribs.',
      'Bend only at the elbows to lower the weight.',
      'Extend the elbows fully without locking them hard.',
      'Keep the wrists straight throughout.',
    ],
    mistakes: ['Letting the elbows flare wide', 'Moving the upper arms', 'Using too much weight'],
    safety: ['Stop if you feel elbow discomfort and reduce the range or load.'],
    breathing: 'Inhale as you lower, exhale as you extend.',
  },
  {
    keys: ['dumbbell squat', 'goblet squat', 'plie dumbbell squat'],
    cues: [
      'Hold the weight close to your chest or at your sides.',
      'Set your feet about shoulder-width apart.',
      'Sit down between your hips with your chest tall.',
      'Drive through your whole foot to stand.',
    ],
    mistakes: ['Letting the chest collapse forward', 'Knees caving inward', 'Heels lifting'],
    safety: ['Reduce the load or depth if your knees or back feel uncomfortable.'],
    breathing: 'Inhale as you lower, exhale as you stand.',
  },
  {
    keys: ['dumbbell lunges', 'lunge', 'walking lunge', 'bodyweight walking lunge', 'barbell lunge'],
    cues: [
      'Take a comfortable step length and keep your torso tall.',
      'Lower until both knees are bent comfortably.',
      'Keep the front knee tracking over the foot.',
      'Push through the front foot to return or step through.',
    ],
    mistakes: ['Stepping too short and slamming the knee forward', 'Letting the front knee cave in', 'Leaning the torso far forward'],
    safety: ['Hold a wall or chair for balance, or use a shorter range if your knees complain.'],
    breathing: 'Inhale as you lower, exhale as you drive up.',
  },
  {
    keys: ['barbell squat', 'barbell full squat', 'back squat'],
    cues: [
      'Set the bar comfortably across your upper back.',
      'Brace your core before you unrack the weight.',
      'Sit your hips down and keep your chest tall.',
      'Drive through your whole foot to stand.',
    ],
    mistakes: ['Letting the knees cave inward', 'Rounding the lower back', 'Losing balance through the toes'],
    safety: ['Use a rack with safety arms and start with a load you can control.'],
    breathing: 'Take a breath and brace before you descend, exhale as you stand.',
  },
  {
    keys: ['barbell deadlift', 'deadlift'],
    cues: [
      'Set the bar over the middle of your feet.',
      'Hinge to the bar and keep your back long.',
      'Brace your core and push the floor away.',
      'Stand tall, then hinge the bar back down.',
    ],
    mistakes: ['Rounding the back', 'Letting the bar drift away from the legs', 'Jerking the bar off the floor'],
    safety: ['Use a load you can lift with a neutral spine and reset between reps if needed.'],
    breathing: 'Brace before the pull, exhale as you lock out, then reset.',
  },
  {
    keys: ['romanian deadlift', 'stiff legged dumbbell deadlift'],
    cues: [
      'Start tall with a soft knee bend.',
      'Push your hips back and keep the weights close to your legs.',
      'Lower until you feel a comfortable hamstring stretch.',
      'Drive your hips forward to stand tall.',
    ],
    mistakes: ['Rounding the back', 'Bending the knees too much', 'Letting the weights drift forward'],
    safety: ['Stop the descent when your back starts to round.'],
    breathing: 'Inhale as you hinge, exhale as you stand.',
  },
  {
    keys: ['bent over barbell row', 'barbell row'],
    cues: [
      'Hinge at the hips and keep your back long.',
      'Let the bar hang below your shoulders.',
      'Pull the bar toward your lower ribs and squeeze your back.',
      'Lower with control without dropping your chest.',
    ],
    mistakes: ['Standing up as you pull', 'Rounding the back', 'Bouncing the bar'],
    safety: ['Reduce the load if you cannot keep your back still.'],
    breathing: 'Exhale as you pull, inhale as you lower.',
  },
  {
    keys: ['barbell shoulder press', 'barbell overhead press'],
    cues: [
      'Stand tall with the bar at shoulder height.',
      'Brace your core and squeeze your glutes.',
      'Press the bar overhead without leaning back.',
      'Lower the bar with control to your shoulders.',
    ],
    mistakes: ['Arching the lower back', 'Pressing the bar forward of your head', 'Bouncing at the bottom'],
    safety: ['Use a rack and start with a load you can press without leaning back.'],
    breathing: 'Exhale as you press, inhale as you lower.',
  },
  {
    keys: ['barbell hip thrust', 'hip thrust'],
    cues: [
      'Set your upper back against a bench and your feet flat.',
      'Tuck your pelvis slightly and brace your core.',
      'Drive through your heels to lift the bar.',
      'Squeeze your glutes at the top, then lower with control.',
    ],
    mistakes: ['Overarching the lower back', 'Pushing through the toes', 'Using a range that feels pinchy'],
    safety: ['Use a bar pad and reduce the load if your hips feel uncomfortable.'],
    breathing: 'Exhale as you lift, inhale as you lower.',
  },
  {
    keys: ['wide grip lat pulldown', 'lat pulldown', 'close grip front lat pulldown', 'one arm lat pulldown'],
    cues: [
      'Set your thighs under the pad and grip the bar.',
      'Lift your chest and pull your shoulders down.',
      'Pull the bar toward your upper chest with your elbows.',
      'Let the bar rise slowly until your arms are straight.',
    ],
    mistakes: ['Leaning back too far', 'Pulling the bar behind your neck', 'Shrugging the shoulders'],
    safety: ['Use a load that lets you control the bar on the way up.'],
    breathing: 'Exhale as you pull, inhale as you return.',
  },
  {
    keys: ['seated cable rows', 'seated cable row', 'cable row'],
    cues: [
      'Sit tall with a soft knee bend and your feet planted.',
      'Start with your arms long and shoulders relaxed.',
      'Pull the handle toward your lower ribs.',
      'Return slowly without rounding your back.',
    ],
    mistakes: ['Rocking the torso back and forth', 'Shrugging the shoulders', 'Letting the back round at the end'],
    safety: ['Choose a load that lets you keep your torso still.'],
    breathing: 'Exhale as you pull, inhale as you return.',
  },
  {
    keys: ['face pull'],
    cues: [
      'Set the cable at face height and use a rope attachment.',
      'Stand tall with your arms long.',
      'Pull the rope toward your forehead and spread the ends.',
      'Squeeze your upper back, then return slowly.',
    ],
    mistakes: ['Using too much weight', 'Leaning back', 'Pulling with the biceps only'],
    safety: ['Keep the load light enough to feel your upper back working.'],
    breathing: 'Exhale as you pull, inhale as you return.',
  },
  {
    keys: ['lateral raise with bands', 'lateral raise', 'side lateral raise'],
    cues: [
      'Stand tall with a soft elbow bend.',
      'Raise the weights out to your sides, not in front.',
      'Stop around shoulder height or before it feels uncomfortable.',
      'Lower slowly and keep your shoulders relaxed.',
    ],
    mistakes: ['Swinging the weights up', 'Shrugging the shoulders', 'Raising above shoulder height with heavy load'],
    safety: ['Use a light load and stop if your shoulder pinches.'],
    breathing: 'Exhale as you raise, inhale as you lower.',
  },
  {
    keys: ['leg press'],
    cues: [
      'Set your feet about shoulder-width on the platform.',
      'Lower the platform until your knees are comfortably bent.',
      'Keep your knees tracking over your toes.',
      'Press through your whole foot without locking the knees hard.',
    ],
    mistakes: ['Letting the lower back lift off the pad', 'Knees caving inward', 'Locking the knees at the top'],
    safety: ['Set the safety stops and avoid a range that makes your back round.'],
    breathing: 'Inhale as you lower, exhale as you press.',
  },
  {
    keys: ['leg extensions', 'leg extension'],
    cues: [
      'Line your knee up with the machine pivot.',
      'Start with your knees bent comfortably.',
      'Extend your legs without swinging the weight.',
      'Lower slowly and keep your hips down.',
    ],
    mistakes: ['Kicking the weight up', 'Lifting the hips off the seat', 'Snapping into lockout'],
    safety: ['Use a light load if you have knee discomfort.'],
    breathing: 'Exhale as you extend, inhale as you lower.',
  },
  {
    keys: ['lying leg curls', 'leg curl', 'seated leg curl', 'standing leg curl'],
    cues: [
      'Set the machine so the pad sits comfortably above your heels.',
      'Curl your heels toward your glutes.',
      'Squeeze the hamstrings without lifting your hips.',
      'Lower slowly until your legs are almost straight.',
    ],
    mistakes: ['Using momentum', 'Lifting the hips', 'Letting the weight drop'],
    safety: ['Reduce the load if you feel cramping or knee discomfort.'],
    breathing: 'Exhale as you curl, inhale as you lower.',
  },
  {
    keys: ['calf press on the leg press machine', 'calf raise', 'calf raises'],
    cues: [
      'Set the balls of your feet on the platform or step.',
      'Let your heels lower until you feel a comfortable stretch.',
      'Press through the balls of your feet and rise tall.',
      'Pause at the top, then lower slowly.',
    ],
    mistakes: ['Bouncing at the bottom', 'Rolling the ankles outward', 'Using a range that feels unstable'],
    safety: ['Hold a support for balance and keep the range comfortable.'],
    breathing: 'Exhale as you rise, inhale as you lower.',
  },
  {
    keys: ['90 90 hamstring', 'ankle on the knee', 'hamstring stretch'],
    cues: [
      'Move into the stretch slowly and stop before it feels sharp.',
      'Keep your breathing calm and your shoulders relaxed.',
      'Hold a gentle stretch without bouncing.',
      'Switch sides and repeat.',
    ],
    mistakes: ['Bouncing into the stretch', 'Pushing into pain', 'Holding your breath'],
    safety: ['Ease off if you feel numbness, tingling, or sharp pain.'],
    breathing: 'Breathe slowly and let the stretch settle with each exhale.',
  },
];

const CURATED_MAP = new Map();
for (const item of CURATED_LIST) {
  for (const key of item.keys) {
    CURATED_MAP.set(normalizeKey(key), item);
  }
}

const findCurated = (name) => {
  const key = normalizeKey(name);
  if (!key) return null;
  if (CURATED_MAP.has(key)) return CURATED_MAP.get(key);
  const compact = compactKey(name);
  for (const [mapKey, item] of CURATED_MAP) {
    const mapCompact = compactKey(mapKey);
    if (compact === mapCompact || compact.includes(mapCompact) || mapCompact.includes(compact)) {
      return item;
    }
  }
  return null;
};

export const getPrescription = (exercise = {}) => {
  const level = normalizeLevel(exercise.level);
  const group = String(exercise.group || '').toLowerCase();
  const category = String(exercise.category || '').toLowerCase();
  const name = String(exercise.name || '').toLowerCase();
  const mechanic = String(exercise.mechanic || '').toLowerCase();
  const force = String(exercise.force || '').toLowerCase();
  const mobility = group === 'mobility' || category.includes('stretching');
  const cardio = group === 'cardio' || category.includes('cardio') || category.includes('plyometrics');
  const isometric = force === 'static' || /plank|wall sit|isometric|hold/i.test(name);
  const timed = mobility || cardio || isometric;
  const compound = mechanic === 'compound' || /squat|deadlift|press|row|lunge|push up|pull up|dip|thrust|bench/i.test(name);
  const isolation = mechanic === 'isolation';

  let sets = level === 'advanced' ? 4 : level === 'intermediate' ? 3 : 2;
  let reps = '8–12 reps';
  let workSeconds = 45;
  let rest = '60–90 sec';
  let restSeconds = 75;

  if (mobility) {
    sets = 2;
    reps = '20–30 sec hold';
    workSeconds = 30;
    rest = '15–20 sec';
    restSeconds = 20;
  } else if (isometric) {
    sets = level === 'advanced' ? 4 : 3;
    reps = '20–40 sec hold';
    workSeconds = 35;
    rest = '30–45 sec';
    restSeconds = 40;
  } else if (cardio) {
    sets = 3;
    reps = '30–45 sec';
    workSeconds = 40;
    rest = '30–45 sec';
    restSeconds = 40;
  } else if (isolation) {
    sets = level === 'advanced' ? 4 : 3;
    reps = '10–15 reps';
    workSeconds = 40;
    rest = '45–60 sec';
    restSeconds = 50;
  } else if (compound) {
    sets = level === 'advanced' ? 4 : level === 'intermediate' ? 3 : 2;
    reps = level === 'advanced' ? '6–10 reps' : '8–12 reps';
    workSeconds = 45;
    rest = level === 'beginner' ? '60–90 sec' : '60–90 sec';
    restSeconds = 75;
  }

  const tempo = mobility
    ? 'Slow and steady · no bouncing'
    : cardio
      ? 'Steady rhythm · land softly'
      : compound
        ? '2 sec down · 1 sec pause · 2 sec up'
        : '2 sec down · 1 sec squeeze · 2 sec up';

  const effort = level === 'advanced'
    ? 'Hard (RPE 7–9)'
    : level === 'intermediate'
      ? 'Moderate–hard (RPE 6–8)'
      : 'Easy–moderate (RPE 5–6)';

  return {
    level,
    sets,
    reps,
    rest,
    restSeconds,
    workSeconds,
    tempo,
    effort,
    timed,
    summary: `${sets} sets × ${reps}`,
  };
};

const fallbackCues = (exercise = {}) => {
  const force = String(exercise.force || '').toLowerCase();
  const muscles = [...(exercise.muscles || []), ...(exercise.secondaryMuscles || [])].map((muscle) => String(muscle).toLowerCase());
  const equipment = String(exercise.equipment || '').toLowerCase();
  const cues = [];

  if (force === 'push') {
    cues.push('Set a stable base and brace your core.', 'Lower with control, then press away.', 'Exhale as you push.');
  } else if (force === 'pull') {
    cues.push('Brace your core before you pull.', 'Lead with your elbows and squeeze your back.', 'Lower the weight slowly.');
  } else if (force === 'static') {
    cues.push('Find a comfortable position and relax into the hold.', 'Keep breathing steadily.', 'Stop before you feel sharp pain.');
  } else {
    cues.push('Start with an easy variation and a light load.', 'Move through a range you can control.', 'Keep breathing and stay relaxed.');
  }

  if (muscles.some((muscle) => muscle.includes('glute'))) cues.push('Squeeze your glutes at the top.');
  if (muscles.some((muscle) => muscle.includes('abdominal') || muscle.includes('core'))) cues.push('Keep your ribs stacked over your hips.');
  if (muscles.some((muscle) => muscle.includes('chest'))) cues.push('Keep your shoulder blades set and your chest tall.');
  if (muscles.some((muscle) => muscle.includes('back') || muscle.includes('lat'))) cues.push('Keep your spine long and your shoulders away from your ears.');
  if (/dumbbell|barbell|kettlebell|machine|cable|band/.test(equipment)) cues.push('Use a load that lets you keep clean form for every rep.');

  return unique(cues).slice(0, 5);
};

const fallbackMistakes = (exercise = {}) => {
  const force = String(exercise.force || '').toLowerCase();
  if (force === 'push') return ['Rushing the lowering phase', 'Letting the hips or ribs drift', 'Using momentum to finish the rep'];
  if (force === 'pull') return ['Yanking with the arms instead of the back', 'Shrugging the shoulders', 'Swinging the torso'];
  if (force === 'static') return ['Bouncing in the stretch', 'Holding your breath', 'Pushing into pain'];
  return ['Skipping the warm-up', 'Rushing the movement', 'Training through sharp pain'];
};

const fallbackSafety = (exercise = {}) => {
  const equipment = String(exercise.equipment || '').toLowerCase();
  const notes = ['Stop if you feel sharp pain, dizziness, or joint discomfort.'];
  if (/barbell|machine|cable/.test(equipment)) notes.push('Use a spotter or a safe rack for heavy sets.');
  notes.push('Choose the variation that matches your mobility and experience.');
  if (/dumbbell|barbell|kettlebell/.test(equipment)) notes.push('Start lighter than you think you need and add load gradually.');
  return notes;
};

const fallbackBreathing = (exercise = {}) => {
  const force = String(exercise.force || '').toLowerCase();
  if (force === 'push') return 'Inhale as you lower, exhale as you press.';
  if (force === 'pull') return 'Exhale as you pull, inhale as you return.';
  if (force === 'static') return 'Breathe slowly and evenly through the hold.';
  return 'Breathe steadily and avoid holding your breath.';
};

export const getExerciseGuide = (exercise = {}) => {
  const curated = findCurated(exercise.name);
  return {
    prescription: getPrescription(exercise),
    cues: curated?.cues || fallbackCues(exercise),
    mistakes: curated?.mistakes || fallbackMistakes(exercise),
    safety: curated?.safety || fallbackSafety(exercise),
    breathing: curated?.breathing || fallbackBreathing(exercise),
  };
};

export const getWorkoutSummary = (exercises = []) => {
  const list = Array.isArray(exercises) ? exercises : [];
  let sets = 0;
  let seconds = 0;
  const focus = new Set();

  list.forEach((exercise) => {
    const prescription = getPrescription(exercise);
    sets += prescription.sets;
    seconds += prescription.sets * (prescription.workSeconds + prescription.restSeconds);
    (exercise.muscles || []).slice(0, 2).forEach((muscle) => focus.add(muscle));
  });

  return {
    exercises: list.length,
    sets,
    minutes: Math.max(1, Math.round(seconds / 60)),
    focus: [...focus].slice(0, 3),
  };
};
