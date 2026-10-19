// ===== 遊戲化 + AI 動態建議（純規則，不依賴外部 API） =====
import { dayTotals, addDays, todayKey, weekKey, workoutHistory, round1 } from './store.js';

// 等級門檻（累積 XP）
const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200];

export function levelInfo(xp) {
  let lv = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) lv = i + 1;
  const cur = LEVELS[lv - 1] || 0;
  const next = LEVELS[lv] !== undefined ? LEVELS[lv] : cur + 1500;
  const pct = Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100));
  return { lv, cur, next, pct, xp };
}

// XP 授予（一次性事件，由 app.js 呼叫）
export function grantXP(state, amount) {
  state.stats.xp = (state.stats.xp || 0) + amount;
  return state.stats.xp;
}

// 連續打卡
export function calcStreak(state) {
  const keys = Object.keys(state.logs).filter(k => {
    const t = dayTotals(state, k);
    return t.meals > 0 || t.workouts > 0;
  });
  if (keys.length === 0) return { streak: 0, best: state.stats.bestStreak || 0 };
  const sorted = keys.sort();
  let streak = 1;
  let prev = sorted[sorted.length - 1];
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i] === addDays(prev, -1)) { streak++; prev = sorted[i]; }
    else break;
  }
  // 若最後有記錄的日子不是今天或昨天，streak 視為中斷
  const last = sorted[sorted.length - 1];
  const tk = todayKey();
  const yk = addDays(tk, -1);
  if (last !== tk && last !== yk) streak = 0;
  const best = Math.max(streak, state.stats.bestStreak || 0);
  return { streak, best };
}

// 每日分數（擊敗昨天的自己）
export function dayScore(state, key) {
  const t = dayTotals(state, key);
  if (t.meals === 0 && t.workouts === 0) return 0;
  const s = state.settings;
  let score = t.meals * 3 + t.workouts * 20 + 5; // 有記錄就有出勤分
  if (t.protein >= s.protein) score += 15;
  if (s.calories > 0 && t.kcal <= s.calories * 1.15) score += 10;
  return score;
}

// ---- 成就徽章 ----
const BADGE_DEFS = [
  { id: 'first_log', emoji: '📝', name: '踏出第一步', desc: '記錄第一筆' },
  { id: 'first_workout', emoji: '🏋️', name: '初登場', desc: '完成第一次訓練' },
  { id: 'streak_3', emoji: '🔥', name: '三日不輟', desc: '連續 3 天' },
  { id: 'streak_7', emoji: '🌋', name: '七日之火', desc: '連續 7 天' },
  { id: 'streak_30', emoji: '☀️', name: '三十而立', desc: '連續 30 天' },
  { id: 'workout_10', emoji: '💪', name: '訓練狂人', desc: '完成 10 次訓練' },
  { id: 'workout_50', emoji: '🦾', name: '鐵人', desc: '完成 50 次訓練' },
  { id: 'pr_60', emoji: '🏆', name: '破 60kg', desc: '任一動作破 60kg' },
  { id: 'pr_100', emoji: '👑', name: '破 100kg', desc: '任一動作破 100kg' },
  { id: 'level_5', emoji: '⭐', name: '升到 5 級', desc: '到達 Lv.5' },
  { id: 'level_10', emoji: '🌟', name: '升到 10 級', desc: '到達 Lv.10' },
];

export function badgeDefs() { return BADGE_DEFS; }

export function earnedBadgeIds(state) {
  return new Set(state.stats.badges || []);
}

export function refreshBadges(state) {
  const earned = earnedBadgeIds(state);
  const t = dayTotals(state, todayKey());
  const { streak, best } = calcStreak(state);
  const wh = workoutHistory(state, 9999);
  const workouts = wh.length;
  const prMax = Math.max(0, ...Object.values(state.stats.prs || {}));
  const lv = levelInfo(state.stats.xp).lv;

  let totalMeals = 0;
  for (const k in state.logs) totalMeals += state.logs[k].meals.length;

  const checks = {
    first_log: totalMeals > 0,
    first_workout: workouts > 0,
    streak_3: best >= 3,
    streak_7: best >= 7,
    streak_30: best >= 30,
    workout_10: workouts >= 10,
    workout_50: workouts >= 50,
    pr_60: prMax >= 60,
    pr_100: prMax >= 100,
    level_5: lv >= 5,
    level_10: lv >= 10,
  };

  let changed = false;
  for (const b of BADGE_DEFS) {
    if (checks[b.id] && !earned.has(b.id)) {
      earned.add(b.id);
      changed = true;
    }
  }
  state.stats.badges = Array.from(earned);
  return changed;
}

// ---- 每週挑戰 ----
const CHALLENGES = [
  { id: 'log_5', title: '本週記錄飲食 5 天', goal: 5, unit: '天', type: 'logDays' },
  { id: 'protein_5', title: '本週蛋白質達標 5 天', goal: 5, unit: '天', type: 'proteinDays' },
  { id: 'workout_3', title: '本週訓練 3 次', goal: 3, unit: '次', type: 'workouts' },
];

export function ensureChallenge(state) {
  const wk = weekKey();
  const s = state.stats;
  if (!s.challenge || s.challenge.week !== wk) {
    // 依週次輪換挑選
    const idx = Math.floor(Date.parse(wk + 'T00:00:00') / (7 * 86400000)) % CHALLENGES.length;
    const c = CHALLENGES[idx];
    s.challenge = { week: wk, type: c.type, done: false, awarded: false };
  }
  return s.challenge;
}

export function challengeProgress(state) {
  const ch = ensureChallenge(state);
  const wk = ch.week;
  let progress = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(wk, i);
    const t = dayTotals(state, k);
    if (ch.type === 'logDays' && t.meals > 0) progress++;
    else if (ch.type === 'proteinDays' && t.protein >= state.settings.protein) progress++;
    else if (ch.type === 'workouts') progress += t.workouts;
  }
  return progress;
}

export function challengeMeta(state) {
  const ch = ensureChallenge(state);
  const def = CHALLENGES.find(c => c.type === ch.type) || CHALLENGES[0];
  const progress = challengeProgress(state);
  const done = progress >= def.goal;
  return { ...def, progress: Math.min(progress, def.goal), done };
}

// ---- AI 動態建議（規則版） ----
export function coachTip(state) {
  const tk = todayKey();
  const t = dayTotals(state, tk);
  const s = state.settings;

  // 近 7 天平均
  let kcalSum = 0, proSum = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const d = dayTotals(state, addDays(tk, -i));
    if (d.meals > 0) { kcalSum += d.kcal; proSum += d.protein; days++; }
  }
  const avgKcal = days ? kcalSum / days : 0;
  const avgPro = days ? proSum / days : 0;

  const tips = [];
  const name = s.name ? `${s.name}，` : '';

  if (t.meals === 0 && t.workouts === 0) {
    return `${name}今日仲未開始！㩒「⚡快速記」記低第一餐，或者「🏋️開始訓練」郁吓先，5 秒就搞掂。`;
  }

  if (days >= 2) {
    if (avgPro < s.protein * 0.8) {
      tips.push(`蛋白質明顯唔夠（近 7 日平均 ${round1(avgPro)}g，目標 ${s.protein}g）。每餐加一份雞胸／蛋／豆腐／無糖豆漿就最簡單。`);
    }
    if (s.calories > 0 && avgKcal > s.calories * 1.15) {
      tips.push(`熱量有啲超標（平均 ${round1(avgKcal)} kcal）。試吓將凍奶茶／凍檸茶改做少甜或凍檸水，白飯減半碗。`);
    } else if (s.calories > 0 && avgKcal < s.calories * 0.8) {
      tips.push(`熱量偏低（平均 ${round1(avgKcal)} kcal），小心餓過頭會暴食，加啲堅果、蛋撻、香蕉補返。`);
    } else {
      tips.push(`近 7 日熱量同蛋白質都幾穩定，繼續保持！下一步可以試吓突破一個新 PR。`);
    }
  } else {
    tips.push(`繼續每日記錄，儲夠 7 日數據，我就可以俾你更精準嘅建議。`);
  }

  // 訓練建議
  const prog = nextWorkoutAdvice(state);
  if (prog) tips.push(prog);

  return tips.slice(0, 2).join('\n');
}

// 依歷史數據的加重量建議
export function nextWorkoutAdvice(state) {
  const wh = workoutHistory(state, 3);
  if (wh.length === 0) return null;
  const last = wh[0];
  // 找有紀錄重量的動作
  for (const ex of last.exercises) {
    const weights = ex.sets.map(s => parseFloat(s.weight)).filter(w => w > 0);
    if (weights.length === 0) continue;
    const reps = ex.sets.map(s => parseFloat(s.reps)).filter(r => r > 0);
    const target = ex.targetReps || 10;
    const allHit = reps.length > 0 && reps.every(r => r >= target - 1);
    const max = Math.max(...weights);
    if (allHit && max >= state.stats.prs[ex.name]) {
      return `上次「${ex.name}」每組都做到 ${target} 下，下次試吓加 ${max >= 40 ? 2.5 : 1.25}kg 或者每組加 1 下，突破吓。`;
    }
  }
  return null;
}
