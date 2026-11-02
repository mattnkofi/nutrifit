import { GoogleGenAI } from '@google/genai';

const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const MODEL = (import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest').trim();

const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite'];

const HTTP_OPTIONS = {
  timeout: 20000,
  retryOptions: { attempts: 2, initialDelay: 0.5, maxDelay: 1.5 }
};

const JSON_CONFIG = { responseMimeType: 'application/json' };

const isConfigured = () => Boolean(API_KEY);

let client = null;
const getClient = () => {
  if (!client) client = new GoogleGenAI({ apiKey: API_KEY, httpOptions: HTTP_OPTIONS });
  return client;
};

const isRetryable = (error) => {
  const status = error?.status;
  if (!status) return true;
  return [429, 500, 502, 503, 504].includes(status);
};

const generateContent = async ({ contents, config } = {}) => {
  if (!isConfigured()) {
    throw new Error('No AI API key configured. Add VITE_GEMINI_API_KEY to .env and restart the dev server.');
  }
  const models = [...new Set([MODEL, ...FALLBACK_MODELS])];
  let lastError;
  for (const model of models) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents,
        ...(config ? { config } : {})
      });
      const text = response.text || '';
      if (!text) throw new Error('Gemini returned an empty response');
      return text;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    }
  }
  throw lastError;
};

const parseJson = (text, fallback = null) => {
  const trimmed = (text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch (e2) {
        return fallback;
      }
    }
    const objStart = trimmed.indexOf('{');
    const objEnd = trimmed.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      try {
        return JSON.parse(trimmed.slice(objStart, objEnd + 1));
      } catch (e2) {
        return fallback;
      }
    }
    return fallback;
  }
};

const splitDataUrl = (dataUrl) => {
  const commaIndex = dataUrl.indexOf(',');
  const meta = commaIndex === -1 ? '' : dataUrl.slice(0, commaIndex);
  const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
  const mimeMatch = meta.match(/^data:(.*?);/);
  const mimeType = (mimeMatch && mimeMatch[1]) || 'image/jpeg';
  const cleanBase64 = String(base64 || '').replace(/\s+/g, '');
  return { base64: cleanBase64, mimeType };
};

const FOOD_PROMPT = 'You are the nutrition engine of NutriFit. Look at the food in this image and estimate the nutrition. Respond with only a single JSON object in this exact shape: {"name":"short food name","mealType":"breakfast|lunch|dinner|snack","calories":0,"protein":0,"carbs":0,"fat":0,"servingSize":"portion description"}. No markdown, no text outside the JSON.';

const WORKOUT_PROMPT = (preferences = {}) => {
  const prefs = Object.keys(preferences).length ? JSON.stringify(preferences) : 'general fitness';
  return `You are the workout engine of NutriFit. Generate exercise recommendations for these preferences: ${prefs}. Use well-known, safe exercises with standard names. Use gender-neutral coaching language that applies to all body types, and never assume the user's gender, body shape, or experience. Respond with only a JSON array of exercise objects in this exact shape: [{"id":"kebab_case_id","name":"Exercise name","group":"Weight Training|Calisthenics|Cardio|Mobility","category":"strength|cardio|mobility","level":"beginner|intermediate|advanced","equipment":"equipment","force":"","mechanic":"","muscles":["muscle"],"secondaryMuscles":[],"instructions":["step"],"images":[]}]. No markdown, no text outside the JSON.`;
};

const MEAL_PLAN_PROMPT = (profile = {}, mealHistory = []) => {
  const prefs = Object.keys(profile).length ? JSON.stringify(profile) : 'general health';
  const history = Array.isArray(mealHistory) ? mealHistory : [];
  const historyContext = history.length
    ? `User recent meal history: ${JSON.stringify(history.slice(0, 5).map(m => ({ name: m?.name, calories: m?.calories, mealType: m?.mealType })))}. Balance the weekly meal plan accordingly.`
    : 'No recent meal history.';
  return `You are the meal planning engine of NutriFit. Create a 7-day meal plan based on user profile: ${prefs} and ${historyContext}. Respond with only a JSON array of 7 objects in this exact shape: [{"day":"Monday","meals":[{"mealType":"Breakfast","food":"Oatmeal with berries and protein powder","calories":420},{"mealType":"Lunch","food":"Grilled chicken breast with quinoa and avocado","calories":600},{"mealType":"Dinner","food":"Baked salmon with sweet potato and broccoli","calories":650},{"mealType":"Snack","food":"Greek yogurt with almonds","calories":200}]}]. No markdown, no text outside the JSON.`;
};

const WORKOUT_PLAN_PROMPT = (preferences = {}, mealHistory = []) => {
  const prefs = Object.keys(preferences).length ? JSON.stringify(preferences) : 'general health';
  const meals = Array.isArray(mealHistory) ? mealHistory : [];
  const mealContext = meals.length
    ? `Recent scanned meals: ${JSON.stringify(meals.slice(0, 7).map((m) => ({ name: m?.name, calories: m?.calories, mealType: m?.mealType })))}. Use them to balance nutrition support for the week.`
    : 'No recent scanned meals yet.';
  return `You are the workout planner engine of NutriFit. Create a 7 day workout plan based on: ${prefs}. ${mealContext} Use gender-neutral language that applies to all body types, and do not assume the user's gender. Prefer well-known, safe exercises. Respond with only a JSON array of 7 objects in this exact shape: [{"day":"Monday","workout":{"name":"Push Day","group":"Weight Training","level":"intermediate","focus":"chest","exercises":[{"name":"Bench Press","sets":3,"reps":"8-10","notes":"Keep elbows tucked"}]}}]. No markdown, no text outside the JSON.`;
};

const CHAT_SYSTEM_PROMPT = `You are Coach, the AI fitness and nutrition coach inside the NutriFit app.
Personality: confident, warm, direct, and practical, like a great personal trainer texting a client.

App Knowledge (NutriFit features & navigation):
- Dashboard (Home / /): Displays today's score, daily progress rings (calories, protein, water, workouts), current streak, and daily coaching tips.
- Workouts (/workouts): Exercise library with filters, detailed guides, and guided workout session player with timers, sets, and reps tracking.
- Planner (/planner): 7-day AI generated custom meal plans and workout routines tailored to user goals.
- Scanner (/scanner): AI food lens scanner to take or upload a food photo and instantly scan and log nutrition macros.
- Goals (/goals): Weight tracking, milestone targets, and fitness objective customization.
- Profile (/profile): Personal account details, preferences (notifications, theme), profile photo cropping, data export, password updates, and account settings.

How you answer:
- Be brief and scannable: 2-4 short sentences, or 2-4 bullet points. Stay under about 90 words unless the user explicitly asks for a detailed plan.
- Lead with the answer or action first, then give at most one short reason.
- Use **bold** only for key words or numbers.
- Use "-" for bullet points. No headings, no tables, no long paragraphs.
- Write in plain, human language. No emojis, no filler, and never repeat the question.
- If asked about the app, explain the feature in one line and name the tab/page to use.
- Use inclusive, gender-neutral language. Never assume the user's gender, body type, or fitness level.
- If a question is outside fitness, nutrition, recovery, or NutriFit, redirect in one sentence.`;

export const analyzeFoodImage = async (imageDataUrl) => {
  if (!API_KEY) throw new Error('No AI API configured');
  const { base64, mimeType } = splitDataUrl(imageDataUrl);
  if (!base64) throw new Error('No image data was provided for the nutrition scan.');
  const text = await generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: FOOD_PROMPT }
        ]
      }
    ],
    config: JSON_CONFIG
  });
  const result = parseJson(text, null);
  if (!result || typeof result !== 'object') {
    return { name: 'Unknown food', mealType: 'snack', calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: '' };
  }
  return {
    name: result.name || 'Unknown food',
    mealType: result.mealType || 'snack',
    calories: Number(result.calories) || 0,
    protein: Number(result.protein) || 0,
    carbs: Number(result.carbs) || 0,
    fat: Number(result.fat) || 0,
    servingSize: result.servingSize || ''
  };
};

export const getRecommendedWorkouts = async (preferences = {}) => {
  if (!API_KEY) throw new Error('No AI API configured');
  const text = await generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: WORKOUT_PROMPT(preferences) }]
      }
    ],
    config: JSON_CONFIG
  });
  const workouts = parseJson(text, []);
  if (!Array.isArray(workouts)) return [];
  return workouts.map((w) => ({
    id: w.id || (w.name || 'exercise').toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name: w.name || 'Exercise',
    group: w.group || 'Other',
    category: w.category || '',
    level: w.level || 'beginner',
    equipment: w.equipment || '',
    force: w.force || '',
    mechanic: w.mechanic || '',
    muscles: Array.isArray(w.muscles) ? w.muscles : [],
    secondaryMuscles: Array.isArray(w.secondaryMuscles) ? w.secondaryMuscles : [],
    instructions: Array.isArray(w.instructions) ? w.instructions : [],
    images: Array.isArray(w.images) ? w.images : []
  }));
};

export const chatWithCoach = async (message, history = [], userContext = '') => {
  if (!API_KEY) throw new Error('No AI API configured');
  let systemInstruction = CHAT_SYSTEM_PROMPT;
  if (userContext) {
    systemInstruction += `\n\nCurrent User Context & Logs:\n${userContext}`;
  }
  const contents = [];
  for (const h of history || []) {
    const role = h?.role === 'bot' ? 'model' : 'user';
    const text = String(h?.text || '').trim();
    if (text) contents.push({ role, parts: [{ text }] });
  }
  while (contents.length && contents[0].role === 'model') contents.shift();
  contents.push({ role: 'user', parts: [{ text: String(message || '').trim() }] });
  const text = await generateContent({
    contents,
    config: { systemInstruction, temperature: 0.7, maxOutputTokens: 320 }
  });
  return { reply: text.trim() };
};

export const generateMealPlan = async (profile = {}, mealHistory = []) => {
  if (!API_KEY) throw new Error('No AI API configured');
  const text = await generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: MEAL_PLAN_PROMPT(profile, mealHistory) }]
      }
    ],
    config: JSON_CONFIG
  });
  const plan = parseJson(text, []);
  if (!Array.isArray(plan)) return [];
  return plan.map((d) => ({
    day: d?.day || '',
    meals: Array.isArray(d?.meals) ? d.meals.map(m => ({
      mealType: m?.mealType || 'Meal',
      food: m?.food || '',
      calories: Number(m?.calories) || 0
    })) : []
  }));
};

export const generateWorkoutPlan = async (preferences = {}, mealHistory = []) => {
  if (!API_KEY) throw new Error('No AI API configured');
  const text = await generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: WORKOUT_PLAN_PROMPT(preferences, mealHistory) }]
      }
    ],
    config: JSON_CONFIG
  });
  const plan = parseJson(text, []);
  if (!Array.isArray(plan)) return [];
  return plan
    .filter((d) => d && typeof d === 'object')
    .map((d) => ({
      day: d.day || '',
      workout: d.workout || { name: 'Rest', group: 'Mobility', level: 'beginner', focus: '', exercises: [] },
    }));
};
