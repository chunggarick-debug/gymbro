// ===== 狀態管理：localStorage 存取 + 資料助手 =====
import { FOOD_DB } from './data.js';

const KEY = 'gymbro_state_v1';

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function defaultState() {
  return {
    settings: {
      name: '',
      calories: 2000,
      protein: 120,
      apiKey: '',
      provider: 'deepseek',
      restSeconds: 90,
      gender: 'male',
      age: null,
      height: null,
      weight: null,
      activity: 'moderate',
    },
    logs: {},
    customFoods: [],
    stats: {
      xp: 0,
      badges: [],
      prs: {},
      daily: {},
      challenge: null,
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // 合併預設，避免未來新增欄位時缺 key
    const base = defaultState();
    return {
      settings: { ...base.settings, ...parsed.settings },
      logs: parsed.logs || {},
      customFoods: parsed.customFoods || [],
      stats: {
        ...base.stats,
        ...(parsed.stats || {}),
        daily: parsed.stats?.daily || {},
        prs: parsed.stats?.prs || {},
        badges: parsed.stats?.badges || [],
      },
    };
  } catch (e) {
    console.error('loadState error', e);
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

// ---- 日期 ----
export function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() { return dateKey(new Date()); }

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dateKey(dt);
}

export function formatDateCN(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const week = ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
  return `${m}/${d} 週${week}`;
}

export function weekKey(d = new Date()) {
  // ISO week 近似：以週一起算
  const day = (d.getDay() + 6) % 7; // 週一=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return dateKey(monday);
}

// ---- 日誌 ----
export function getLog(state, key) {
  if (!state.logs[key]) state.logs[key] = { meals: [], workouts: [] };
  return state.logs[key];
}

export function addMeal(state, key, meal) {
  const log = getLog(state, key);
  meal.id = meal.id || uid();
  meal.time = meal.time || new Date().toISOString();
  log.meals.push(meal);
  return meal;
}

export function removeMeal(state, key, mealId) {
  const log = getLog(state, key);
  log.meals = log.meals.filter(m => m.id !== mealId);
}

export function addWorkout(state, key, workout) {
  const log = getLog(state, key);
  workout.id = workout.id || uid();
  workout.time = workout.time || new Date().toISOString();
  log.workouts.push(workout);
  return workout;
}

export function removeWorkout(state, key, workoutId) {
  const log = getLog(state, key);
  log.workouts = log.workouts.filter(w => w.id !== workoutId);
}

export function mealTotals(m) {
  const base = m.base || { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
  const amt = m.amount || 1;
  return {
    kcal: round1((base.kcal || 0) * amt),
    protein: round1((base.protein || 0) * amt),
    carbs: round1((base.carbs || 0) * amt),
    fat: round1((base.fat || 0) * amt),
  };
}

export function dayTotals(state, key) {
  const log = state.logs[key];
  if (!log) return { kcal: 0, protein: 0, carbs: 0, fat: 0, meals: 0, workouts: 0 };
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const m of log.meals) {
    const t = mealTotals(m);
    kcal += t.kcal;
    protein += t.protein;
    carbs += t.carbs;
    fat += t.fat;
  }
  return { kcal: round1(kcal), protein: round1(protein), carbs: round1(carbs), fat: round1(fat), meals: log.meals.length, workouts: log.workouts.length };
}

export function round1(n) { return Math.round(n * 10) / 10; }

// 所有食物（內建 + 自訂），供搜尋/語音匹配
export function allFoods(state) {
  return [...FOOD_DB, ...state.customFoods];
}

export function findFood(state, name) {
  const n = name.trim();
  return allFoods(state).find(f => f.name === n);
}

export function searchFoods(state, q) {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return allFoods(state).filter(f => f.name.toLowerCase().includes(n) || f.category.includes(q));
}

// 最近常吃：按所有 log 出現次數排序
export function frequentFoods(state, limit = 8) {
  const count = {};
  for (const k in state.logs) {
    for (const m of state.logs[k].meals) {
      count[m.name] = (count[m.name] || 0) + 1;
    }
  }
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => findFood(state, name))
    .filter(Boolean);
}

// 訓練歷史（依時間倒序）
export function workoutHistory(state, limit = 10) {
  const all = [];
  for (const k in state.logs) {
    for (const w of state.logs[k].workouts) {
      all.push({ ...w, date: k });
    }
  }
  all.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  return all.slice(0, limit);
}

// PR 追蹤：某動作的最大重量
export function updatePRs(state, workout) {
  for (const ex of workout.exercises) {
    let max = 0;
    for (const s of ex.sets) {
      const w = parseFloat(s.weight);
      if (w > max) max = w;
    }
    if (max > 0 && (!state.stats.prs[ex.name] || max > state.stats.prs[ex.name])) {
      state.stats.prs[ex.name] = round1(max);
    }
  }
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}
