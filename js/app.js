// ===== GymBro.AI 主程式 =====
import * as store from './store.js';
import { FOOD_CATEGORIES, WORKOUT_TEMPLATES } from './data.js';
import * as engine from './engine.js';
import * as charts from './charts.js';
import { startVoiceRecognition, voiceSupported, stopVoiceRecognition } from './voice.js';
import { pickPhoto, recognizeFood, estimateFoodNutrition } from './photo.js';

let state = store.loadState();
let currentView = 'today';
let dietCategory = 'all';
let dietSearch = '';
let restTimerId = null;
let restRemaining = 0;
let voiceRec = null;
let historyDate = store.todayKey();

const $ = (sel) => document.querySelector(sel);

// ---------- 基礎工具 ----------
function refresh() {
  engine.refreshBadges(state);
  render();
  store.saveState(state);
}

function toast(msg, ms = 1800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), ms);
}

function switchView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  const view = $('#view-' + name);
  if (view) view.classList.add('active');
  if (name === 'settings') fillSettings();
}

function mealTotals(m) { return store.mealTotals(m); }

function addMealEntry(food, amount, source, unitOverride) {
  const base = { kcal: food.kcal || 0, protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0 };
  const meal = {
    id: store.uid(),
    name: food.name,
    emoji: food.emoji || '🍽️',
    unit: unitOverride || food.unit || '份',
    amount: amount || 1,
    base,
    source,
    time: new Date().toISOString(),
  };
  store.addMeal(state, store.todayKey(), meal);
  engine.grantXP(state, 5);
  awardProteinBonus();
  refresh();
  return meal;
}

function awardProteinBonus() {
  const tk = store.todayKey();
  const t = store.dayTotals(state, tk);
  if (!state.stats.daily[tk]) state.stats.daily[tk] = {};
  if (!state.stats.daily[tk].proteinAwarded && t.protein > 0 && t.protein >= state.settings.protein) {
    state.stats.daily[tk].proteinAwarded = true;
    engine.grantXP(state, 15);
    toast('🎉 今日蛋白質達標！+15 XP');
  }
}

// ---------- Modal ----------
function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $('#modal-backdrop').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modal-backdrop').classList.add('hidden');
  $('#modal').innerHTML = '';
}

// ---------- 渲染 ----------
function render() {
  renderHeader();
  renderToday();
  renderDiet();
  renderWorkout();
  renderProgress();
  renderHistory();
}

function renderHistory() {
  const days = Object.keys(state.logs)
    .filter(k => (state.logs[k].meals.length > 0 || state.logs[k].workouts.length > 0))
    .sort().reverse();
  if (!days.includes(historyDate)) historyDate = store.todayKey();

  $('#history-days').innerHTML = days.length
    ? days.map(d => `<button class="cat-tab ${d === historyDate ? 'active' : ''}" data-day="${d}">${store.formatDateCN(d)}</button>`).join('')
    : `<p class="hint">未有歷史記錄。</p>`;
  $('#history-days').querySelectorAll('[data-day]').forEach(b => b.onclick = () => { historyDate = b.dataset.day; renderHistory(); });

  $('#history-title').textContent = store.formatDateCN(historyDate);
  const log = state.logs[historyDate] || { meals: [], workouts: [] };

  $('#history-meals').innerHTML = `<p class="hint">🥗 飲食（${log.meals.length} 項）</p>` + (log.meals.map(m => {
    const mt = store.mealTotals(m);
    return `<div class="log-item">
      <div class="li-main"><span class="li-emoji">${m.emoji}</span>
        <div><div class="li-name">${m.name}${m.amount > 1 ? ` ×${m.amount}` : ''}</div>
        <div class="li-sub">${m.unit} · ${Math.round(mt.kcal)} kcal</div></div></div>
      <div style="display:flex;align-items:center;gap:6px">
        <button class="btn ghost" data-hedit="${m.id}" style="padding:4px 8px">✏️</button>
        <button class="li-del" data-hdel="${m.id}">×</button>
      </div>
    </div>`;
  }).join('') || `<p class="hint">無。</p>`);

  $('#history-meals').querySelectorAll('[data-hedit]').forEach(b => b.onclick = () => openEditAmount(historyDate, b.dataset.hedit));
  $('#history-meals').querySelectorAll('[data-hdel]').forEach(b => b.onclick = () => {
    store.removeMeal(state, historyDate, b.dataset.hdel);
    refresh();
  });

  $('#history-workouts').innerHTML = `<p class="hint">🏋️ 訓練（${log.workouts.length} 次）</p>` + (log.workouts.map(w =>
    `<div class="log-item">
      <div class="li-main"><span class="li-emoji">${w.emoji || '🏋️'}</span>
        <div><div class="li-name">${w.templateName || '訓練'}</div>
        <div class="li-sub">${w.exercises.length} 動作</div></div></div>
      <button class="li-del" data-wdel="${w.id}">×</button>
    </div>`
  ).join('') || `<p class="hint">無。</p>`);

  $('#history-workouts').querySelectorAll('[data-wdel]').forEach(b => b.onclick = () => {
    store.removeWorkout(state, historyDate, b.dataset.wdel);
    refresh();
  });
}

function renderHeader() {
  $('#header-date').textContent = store.formatDateCN(store.todayKey());
  const { streak } = engine.calcStreak(state);
  if (streak > (state.stats.bestStreak || 0)) state.stats.bestStreak = streak;
  $('#header-streak').textContent = `🔥 ${streak}`;
  $('#header-level').textContent = `Lv.${engine.levelInfo(state.stats.xp).lv}`;
  const li = engine.levelInfo(state.stats.xp);
  $('#xp-bar-fill').style.width = li.pct + '%';
  $('#xp-text').textContent = `${li.xp - li.cur} / ${li.next - li.cur} XP`;
}

function renderToday() {
  const tk = store.todayKey();
  const t = store.dayTotals(state, tk);
  const s = state.settings;

  const calPct = s.calories > 0 ? Math.min(100, (t.kcal / s.calories) * 100) : 0;
  const proPct = s.protein > 0 ? Math.min(100, (t.protein / s.protein) * 100) : 0;
  $('#cal-fill').style.width = calPct + '%';
  $('#protein-fill').style.width = proPct + '%';
  $('#cal-num').textContent = `${Math.round(t.kcal)} / ${s.calories} kcal`;
  $('#protein-num').textContent = `${Math.round(t.protein)} / ${s.protein} g 蛋白質`;
  $('#macro-mini').innerHTML = `碳水 <b>${Math.round(t.carbs)}g</b> · 脂肪 <b>${Math.round(t.fat)}g</b>`;

  // 擊敗昨天
  const today = engine.dayScore(state, tk);
  const yesterday = engine.dayScore(state, store.addDays(tk, -1));
  $('#battle-today').textContent = today;
  $('#battle-yesterday').textContent = yesterday;
  const bs = $('#battle-status');
  if (today === 0 && yesterday === 0) { bs.textContent = '等你開始'; bs.className = 'battle-status'; }
  else if (today >= yesterday) { bs.textContent = '✅ 領先！'; bs.className = 'battle-status win'; }
  else { bs.textContent = '追緊啲 💪'; bs.className = 'battle-status'; }

  // 今日列表
  const log = state.logs[tk] || { meals: [], workouts: [] };
  $('#today-meals').innerHTML = log.meals.map(m => {
    const mt = mealTotals(m);
    return `<div class="item"><span class="t">${m.emoji} ${m.name}${m.amount > 1 ? ` ×${m.amount}` : ''}</span><span class="v">${Math.round(mt.kcal)} kcal</span></div>`;
  }).join('');
  $('#today-workouts').innerHTML = log.workouts.map(w =>
    `<div class="item"><span class="t">${w.emoji || '🏋️'} ${w.templateName || '訓練'}</span><span class="v">${w.exercises.length} 動作</span></div>`
  ).join('');

  // 本週挑戰
  const cm = engine.challengeMeta(state);
  $('#challenge-title').textContent = `${cm.title}（${cm.progress}/${cm.goal}）`;
  $('#challenge-fill').style.width = Math.min(100, (cm.progress / cm.goal) * 100) + '%';
  $('#challenge-num').textContent = `${cm.progress} / ${cm.goal} ${cm.unit}`;

  // AI 教練
  $('#coach-tip').textContent = engine.coachTip(state);
}

function renderDiet() {
  // 分類
  $('#diet-categories').innerHTML = FOOD_CATEGORIES.map(c =>
    `<button class="cat-tab ${c.id === dietCategory && !dietSearch ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
  ).join('');

  let foods;
  if (dietSearch) {
    foods = store.searchFoods(state, dietSearch);
  } else {
    foods = store.allFoods(state).filter(f => dietCategory === 'all' || f.category === dietCategory);
  }

  let html = '';
  // 常用（無搜尋時顯示）
  if (!dietSearch && dietCategory === 'all') {
    const freq = store.frequentFoods(state, 8);
    if (freq.length) {
      html += `<p class="hint" style="margin-top:0">⚡ 你常吃（一鍵加入）：</p><div class="category-tabs" style="margin-top:0">` +
        freq.map(f => `<button class="cat-tab" data-quickfood="${f.name}">${f.emoji} ${f.name}</button>`).join('') +
        `</div>`;
    }
  }

  $('#food-grid').innerHTML = html + (foods.length
    ? foods.map(f => `
      <button class="food-item" data-food="${f.name}">
        <span class="fn">${f.emoji} ${f.name}</span>
        <span class="fm">每${f.unit} · ${f.kcal} kcal</span>
        <span class="fc">P ${f.protein}g · C ${f.carbs}g · F ${f.fat}g</span>
      </button>`).join('')
    : `<p class="hint">搵唔到「${dietSearch}」，可自訂食物。</p>`);

  // 今日紀錄
  const t = store.dayTotals(state, store.todayKey());
  $('#diet-total').textContent = `${Math.round(t.kcal)} kcal`;
  const log = state.logs[store.todayKey()] || { meals: [] };
  $('#diet-log').innerHTML = log.meals.map(m => {
    const mt = mealTotals(m);
    return `<div class="log-item" data-meal="${m.id}">
      <div class="li-main">
        <span class="li-emoji">${m.emoji}</span>
        <div><div class="li-name">${m.name}${m.amount > 1 ? ` ×${m.amount}` : ''}</div>
        <div class="li-sub">${m.unit} · P ${Math.round(mt.protein)}g</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="li-val">${Math.round(mt.kcal)}<br>kcal</span>
        <button class="li-del" data-del="${m.id}">×</button>
      </div>
    </div>`;
  }).join('') || `<p class="hint">今日未記錄任何食物。</p>`;
}

function renderWorkout() {
  $('#template-grid').innerHTML = WORKOUT_TEMPLATES.map(t =>
    `<button class="tpl-card" data-tpl="${t.id}">
      <div class="te">${t.emoji}</div>
      <div class="tn">${t.name}</div>
      <div class="td">${t.exercises.length} 個動作</div>
    </button>`).join('');

  const hist = store.workoutHistory(state, 8);
  $('#workout-history').innerHTML = hist.map(w =>
    `<div class="log-item">
      <div class="li-main"><span class="li-emoji">${w.emoji || '🏋️'}</span>
      <div><div class="li-name">${w.templateName || '訓練'}</div>
      <div class="li-sub">${store.formatDateCN(w.date)}</div></div></div>
      <span class="li-val">${w.exercises.length} 動作</span>
    </div>`).join('') || `<p class="hint">未有任何訓練，㩒上面揀個課表開始！</p>`;
}

function renderProgress() {
  // 力量曲線
  const prs = state.stats.prs || {};
  const exNames = Object.keys(prs).length ? Object.keys(prs) : WORKOUT_TEMPLATES.flatMap(t => t.exercises.map(e => e.name));
  const sel = $('#pr-exercise-select');
  const current = sel.value || exNames[0] || '';
  sel.innerHTML = exNames.map(n => `<option value="${n}" ${n === current ? 'selected' : ''}>${n}</option>`).join('');
  renderPRChart(current);

  // 近 7 天
  const tk = store.todayKey();
  const labels = [], calVals = [], proVals = [];
  for (let i = 6; i >= 0; i--) {
    const k = store.addDays(tk, -i);
    const t = store.dayTotals(state, k);
    labels.push(k.slice(5)); // MM-DD
    calVals.push(Math.round(t.kcal));
    proVals.push(Math.round(t.protein));
  }
  const wk = $('#week-chart');
  wk.innerHTML = '';
  const calEl = document.createElement('div'); calEl.style.marginBottom = '8px';
  const proEl = document.createElement('div');
  wk.appendChild(calEl); wk.appendChild(proEl);
  charts.barChart(calEl, { labels, values: calVals, color: '#fbbf24', maxHint: state.settings.calories * 1.3, title: '熱量 (kcal)' });
  charts.barChart(proEl, { labels, values: proVals, color: '#34d399', maxHint: state.settings.protein * 1.3, title: '蛋白質 (g)' });

  // PR 列表
  $('#pr-list').innerHTML = Object.entries(prs).sort((a, b) => b[1] - a[1]).map(([n, v]) =>
    `<div class="pr-item"><div class="pn">${n}</div><div class="pv">${v} kg</div></div>`
  ).join('') || `<p class="hint">記低訓練重量，就會出現個人紀錄（PR）。</p>`;

  // 成就牆
  const earned = engine.earnedBadgeIds(state);
  $('#badges-grid').innerHTML = engine.badgeDefs().map(b =>
    `<div class="badge ${earned.has(b.id) ? 'earned' : ''}"><div class="be">${b.emoji}</div><div class="bn">${b.name}</div><div class="bd">${b.desc}</div></div>`
  ).join('');

  // 數據
  const wh = store.workoutHistory(state, 9999);
  const { best } = engine.calcStreak(state);
  let totalMeals = 0; for (const k in state.logs) totalMeals += state.logs[k].meals.length;
  const li = engine.levelInfo(state.stats.xp);
  $('#stats-grid').innerHTML = `
    <div class="stat-item"><div class="sv">${best}</div><div class="sl">最長連續 🔥</div></div>
    <div class="stat-item"><div class="sv">${wh.length}</div><div class="sl">總訓練次數</div></div>
    <div class="stat-item"><div class="sv">${totalMeals}</div><div class="sl">總記錄餐數</div></div>
    <div class="stat-item"><div class="sv">${li.lv}</div><div class="sl">等級 Lv.</div></div>
  `;
}

function renderPRChart(exName) {
  const hist = store.workoutHistory(state, 9999).reverse(); // 舊→新
  const points = [];
  for (const w of hist) {
    const ex = w.exercises.find(e => e.name === exName);
    if (!ex) continue;
    const weights = ex.sets.map(s => parseFloat(s.weight)).filter(w => w > 0);
    if (weights.length) points.push({ label: w.date.slice(5), value: Math.max(...weights) });
  }
  charts.lineChart($('#pr-chart'), points, { color: '#22d3ee', unit: 'kg' });
}

function fillSettings() {
  $('#set-name').value = state.settings.name || '';
  $('#set-calories').value = state.settings.calories;
  $('#set-protein').value = state.settings.protein;
  $('#set-provider').value = state.settings.provider || 'deepseek';
  $('#set-apikey').value = state.settings.apiKey || '';
}

// ---------- 食物加入流程 ----------
function onFoodTap(name) {
  const f = store.findFood(state, name);
  if (!f) return;
  const m = addMealEntry(f, 1, 'quick');
  toast(`${m.emoji} 已記錄 ${m.name}（${Math.round(mealTotals(m).kcal)} kcal）`);
}

function onQuickFoodTap(name) {
  onFoodTap(name);
}

// 編輯份量（點擊今日紀錄）
function openEditAmount(dateKey, mealId) {
  const log = state.logs[dateKey];
  const m = (log?.meals || []).find(x => x.id === mealId);
  if (!m) return;
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>${m.emoji} ${m.name}</h3>
    <p class="hint">每份（${m.unit}）：${m.base.kcal} kcal · P ${m.base.protein}g · C ${m.base.carbs}g · F ${m.base.fat}g</p>
    <div style="display:flex;gap:8px;align-items:center;margin:16px 0">
      <button class="btn ghost" data-step="-1">−</button>
      <span id="amt-val" style="flex:1;text-align:center;font-size:28px;font-weight:800">${m.amount}</span>
      <button class="btn ghost" data-step="1">＋</button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${[0.5, 1, 1.5, 2].map(a => `<button class="btn ghost" data-preset="${a}">${a} 份</button>`).join('')}
    </div>
    <button class="btn primary full" data-save-amount>儲存</button>
  `);
  let amt = m.amount;
  $('#modal').querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    amt = Math.max(0.25, Math.round((amt + Number(b.dataset.step)) * 4) / 4);
    $('#amt-val').textContent = amt;
  });
  $('#modal').querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
    amt = Number(b.dataset.preset);
    $('#amt-val').textContent = amt;
  });
  $('#modal').querySelector('[data-save-amount]').onclick = () => {
    m.amount = amt;
    closeModal();
    refresh();
    toast('已更新份量');
  };
}

// 語音流程
function onVoice() {
  if (!voiceSupported()) { toast('此瀏覽器不支援語音，請用 Chrome'); return; }
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>🎤 話我知你食咗咩</h3>
    <p class="hint">例如：「一碗叉燒飯同埋杯凍奶茶」</p>
    <div id="voice-status" style="text-align:center;padding:20px">
      <div style="font-size:40px">🎙️</div>
      <p style="color:var(--accent);font-weight:700;margin-top:8px">收聽中…</p>
    </div>
    <div id="voice-results"></div>
    <button class="btn ghost full" data-retry>再講一次</button>
  `);
  startListening();
  $('#modal').querySelector('[data-retry]').onclick = startListening;
}

function startListening() {
  $('#voice-results').innerHTML = '';
  $('#voice-status').innerHTML = `<div style="font-size:40px">🎙️</div><p style="color:var(--accent);font-weight:700;margin-top:8px">收聽中…</p>`;
  stopVoiceRecognition(voiceRec);
  voiceRec = startVoiceRecognition({
    onResult: (text) => {
      $('#voice-status').innerHTML = `<p style="margin-top:8px">「${text}」</p>`;
      const matches = matchVoice(text);
      if (matches.length) {
        $('#voice-results').innerHTML = `<p class="hint">搵到以下食物，㩒一下加入：</p>` + matches.map(f =>
          `<button class="voice-result-item" data-vfood="${f.name}"><span>${f.emoji} ${f.name}</span><span style="color:var(--muted)">${f.kcal} kcal</span></button>`
        ).join('');
        $('#voice-results').querySelectorAll('[data-vfood]').forEach(b => b.onclick = () => {
          const f = store.findFood(state, b.dataset.vfood);
          addMealEntry(f, 1, 'voice');
          toast(`✅ 已記錄 ${f.name}`);
        });
      } else {
        $('#voice-results').innerHTML = `<p class="hint">聽唔出係邊款食物，可手動搜尋加入。</p>`;
      }
    },
    onError: (msg) => { $('#voice-status').innerHTML = `<p style="color:var(--red);margin-top:8px">${msg}</p>`; },
    onEnd: () => {},
  });
}

function matchVoice(text) {
  const t = text.replace(/\s/g, '');
  return store.allFoods(state).filter(f => {
    const n = f.name.replace(/[()（）]/g, '');
    return t.includes(n) || n.includes(t);
  }).sort((a, b) => b.name.length - a.name.length).slice(0, 6);
}

// 比對本地食物資料庫（拍照辨識命中就用資料庫的精準數值）
function matchFoodDB(name) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s()（）·、,，.。／/]/g, '');
  const n = norm(name);
  if (!n) return null;
  const foods = store.allFoods(state);
  let hit = foods.find(f => norm(f.name) === n);
  if (hit) return hit;
  hit = foods.filter(f => norm(f.name).length >= 2 && n.includes(norm(f.name))).sort((a, b) => b.name.length - a.name.length)[0];
  if (hit) return hit;
  hit = foods.filter(f => n.length >= 2 && norm(f.name).includes(n)).sort((a, b) => a.name.length - b.name.length)[0];
  return hit || null;
}

// 修改辨識結果（款式/份量/單位/營養）
function openPhotoEdit(item, onSave) {
  const options = store.allFoods(state).map(f => `<option value="${f.name}"></option>`).join('');
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>✏️ 修改辨識結果</h3>
    <label class="field"><span>食物名稱（可輸入或選擇）</span>
      <input id="pe-name" value="${item.name}" list="pe-food-list" />
      <datalist id="pe-food-list">${options}</datalist>
    </label>
    <div style="display:flex;gap:8px;align-items:center;margin:12px 0">
      <button class="btn ghost" data-step="-1">−</button>
      <span id="pe-amt" style="flex:1;text-align:center;font-size:26px;font-weight:800">${item.amount}</span>
      <button class="btn ghost" data-step="1">＋</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label class="field"><span>單位</span><input id="pe-unit" value="${item.unit}" /></label>
      <label class="field"><span>熱量/份 (kcal)</span><input type="number" id="pe-kcal" value="${item.kcal}" /></label>
      <label class="field"><span>蛋白質/份 (g)</span><input type="number" id="pe-p" value="${item.protein}" /></label>
      <label class="field"><span>碳水/份 (g)</span><input type="number" id="pe-c" value="${item.carbs}" /></label>
      <label class="field"><span>脂肪/份 (g)</span><input type="number" id="pe-f" value="${item.fat}" /></label>
    </div>
    <button class="btn primary full" data-save-edit>儲存修改</button>
  `);

  let amt = Number(item.amount) || 1;
  let emoji = item.emoji;
  const syncAmount = () => { $('#pe-amt').textContent = amt; };

  $('#modal').querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    amt = Math.max(0.25, Math.round((amt + Number(b.dataset.step)) * 4) / 4);
    syncAmount();
  });

  $('#pe-name').addEventListener('change', () => {
    const db = matchFoodDB($('#pe-name').value);
    if (db) {
      emoji = db.emoji;
      $('#pe-unit').value = db.unit;
      $('#pe-kcal').value = db.kcal;
      $('#pe-p').value = db.protein;
      $('#pe-c').value = db.carbs;
      $('#pe-f').value = db.fat;
    }
  });

  $('#modal').querySelector('[data-save-edit]').onclick = () => {
    const name = $('#pe-name').value.trim() || item.name;
    const db = matchFoodDB(name);
    if (db) emoji = db.emoji;
    onSave({
      name,
      emoji,
      unit: $('#pe-unit').value.trim() || '份',
      amount: amt,
      kcal: Number($('#pe-kcal').value) || 0,
      protein: Number($('#pe-p').value) || 0,
      carbs: Number($('#pe-c').value) || 0,
      fat: Number($('#pe-f').value) || 0,
      matched: !!db,
    });
    closeModal();
    toast('✅ 已修改');
  };
}

// 拍照流程
function onPhoto() {
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>📷 影低你食嘅嘢</h3>
    <p class="hint">需要喺「設定」填咗 API Key 先可以 AI 辨識。</p>
    <div id="photo-area" style="text-align:center;display:flex;gap:10px;justify-content:center">
      <button class="btn primary" data-shoot="camera">📸 影相</button>
      <button class="btn ghost" data-shoot="gallery">🖼️ 從圖庫揀</button>
    </div>
    <div id="photo-result"></div>
  `);

  const shoot = async (source) => {
    const btns = $('#modal').querySelectorAll('[data-shoot]');
    btns.forEach(b => b.disabled = true);
    let dataUrl;
    try {
      dataUrl = await pickPhoto(source);
    } catch (e) {
      btns.forEach(b => b.disabled = false);
      if (e && e.message !== 'cancelled') toast(e.message || '無法讀取相片');
      return;
    }
    $('#photo-area').innerHTML = `<img class="photo-preview" src="${dataUrl}" /><p style="color:var(--accent);font-weight:700">AI 辨識中…</p>`;
    try {
      const foods = await recognizeFood(dataUrl, state.settings.apiKey, state.settings.provider);
      const items = foods.map((f) => {
        const db = matchFoodDB(f.name);
        if (db) {
          return { name: db.name, emoji: db.emoji, unit: db.unit, amount: Number(f.amount) || 1, kcal: db.kcal, protein: db.protein, carbs: db.carbs, fat: db.fat, matched: true };
        }
        const a = Math.max(0.1, Number(f.amount) || 1);
        return { name: f.name, emoji: '📷', unit: f.unit, amount: a, kcal: (f.kcal || 0) / a, protein: (f.protein || 0) / a, carbs: (f.carbs || 0) / a, fat: (f.fat || 0) / a, matched: false };
      });

      const renderResults = () => {
        $('#photo-result').innerHTML = `<p class="hint">辨識結果（✅=資料庫精準 · 㩒「加入」記錄 · 㩒「✏️」改款式/份量）：</p>` + items.map((f, i) =>
          `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <button class="voice-result-item" style="flex:1" data-pfood="${i}"><span>${f.emoji} ${f.name}${f.matched ? ' ✅' : ''} ×${f.amount} ${f.unit}</span><span style="color:var(--muted)">${Math.round(f.kcal * f.amount)} kcal</span></button>
            <button class="btn ghost" data-edit="${i}" title="修改款式/份量">✏️</button>
          </div>`
        ).join('') + `<button class="btn primary full" style="margin-top:10px" data-addall>全部加入</button>`;

        $('#photo-result').querySelectorAll('[data-pfood]').forEach(b => b.onclick = () => {
          const f = items[Number(b.dataset.pfood)];
          addMealEntry(f, f.amount, 'photo', f.unit);
          toast(`✅ 已記錄 ${f.name}`);
        });
        $('#photo-result').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
          const idx = Number(b.dataset.edit);
          openPhotoEdit(items[idx], (updated) => { items[idx] = updated; renderResults(); });
        });
        const addAll = $('#photo-result').querySelector('[data-addall]');
        if (addAll) addAll.onclick = () => { items.forEach(f => addMealEntry(f, f.amount, 'photo', f.unit)); closeModal(); };
      };

      renderResults();
    } catch (e) {
      $('#photo-result').innerHTML = `<p style="color:var(--red);margin-top:10px;white-space:pre-wrap">${e.message}</p>
        <p class="hint">未設定金鑰？去「設定」貼上 API Key。</p>`;
    }
  };

  $('#modal').querySelectorAll('[data-shoot]').forEach(b => b.onclick = () => shoot(b.dataset.shoot));
}

// ---------- 訓練流程 ----------
function lastSetForExercise(name) {
  const hist = store.workoutHistory(state, 9999);
  for (const w of hist) {
    const ex = w.exercises.find(e => e.name === name);
    if (ex) {
      const withW = ex.sets.filter(s => parseFloat(s.weight) > 0);
      const withR = ex.sets.filter(s => parseFloat(s.reps) > 0);
      return { weight: withW.length ? withW[withW.length - 1].weight : '', reps: withR.length ? withR[withR.length - 1].reps : '' };
    }
  }
  return { weight: '', reps: '' };
}

function exerciseLibrary() {
  const seen = new Set();
  const list = [];
  for (const t of WORKOUT_TEMPLATES) {
    for (const ex of t.exercises) {
      if (!seen.has(ex.name)) { seen.add(ex.name); list.push({ name: ex.name, sets: ex.sets, reps: ex.reps }); }
    }
  }
  return list;
}

function openExercisePicker(tpl) {
  const selected = new Map(); // 預設全部不選取
  const lib = exerciseLibrary();
  const tplSets = (name) => {
    const e = tpl.exercises.find(x => x.name === name) || lib.find(x => x.name === name);
    return e ? { sets: e.sets, reps: e.reps } : { sets: 3, reps: 10 };
  };

  openModal(`
    <button class="close" data-close>✕</button>
    <h3>🏋️ 自訂今日動作 — ${tpl.emoji} ${tpl.name}</h3>
    <p class="hint">㩒一下選取／取消動作；下面可搜尋加入其他動作。</p>
    <div id="picker-list" class="category-tabs" style="margin-top:4px"></div>
    <div class="search-row" style="margin-top:12px"><input type="search" id="picker-search" placeholder="＋ 搜尋加入其他動作…（例如 飛鳥）" /></div>
    <div id="picker-add" class="category-tabs"></div>
    <div class="list-head" style="margin-top:12px"><h2>已選動作</h2><span id="picker-count">0 個</span></div>
    <div id="picker-selected" class="category-tabs"></div>
    <button class="btn primary full" style="margin-top:12px" data-start>開始訓練</button>
  `);

  const render = () => {
    // 模板動作（預設未選，點一下選取／再點取消）
    $('#picker-list').innerHTML = tpl.exercises.map(e => {
      const on = selected.has(e.name);
      return `<button class="cat-tab ${on ? 'active' : ''}" data-toggle="${e.name}">${on ? '✅' : '＋'} ${e.name} · ${e.sets}×${e.reps}</button>`;
    }).join('');
    $('#picker-list').querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
      const name = b.dataset.toggle;
      if (selected.has(name)) { selected.delete(name); }
      else { const s = tplSets(name); selected.set(name, { name, sets: s.sets, reps: s.reps }); }
      render();
    });

    // 已選清單（可移除）
    const entries = [...selected.values()];
    $('#picker-count').textContent = entries.length + ' 個';
    $('#picker-selected').innerHTML = entries.map(e =>
      `<button class="cat-tab active" data-remove="${e.name}">✅ ${e.name} ✕</button>`
    ).join('') || `<p class="hint">未選擇任何動作。</p>`;
    $('#picker-selected').querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
      selected.delete(b.dataset.remove);
      render();
    });

    renderAdd();
  };

  const renderAdd = () => {
    const q = ($('#picker-search').value || '').trim();
    if (!q) { $('#picker-add').innerHTML = ''; return; }
    const matches = lib.filter(e => e.name.includes(q) && !selected.has(e.name)).slice(0, 8);
    $('#picker-add').innerHTML = matches.map(e =>
      `<button class="cat-tab" data-add="${e.name}">＋ ${e.name} · ${e.sets}×${e.reps}</button>`
    ).join('') || `<p class="hint">搵唔到「${q}」。</p>`;
    $('#picker-add').querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const ex = lib.find(e => e.name === b.dataset.add);
      if (ex) { selected.set(ex.name, { name: ex.name, sets: ex.sets, reps: ex.reps }); render(); }
    });
  };

  $('#picker-search').addEventListener('input', renderAdd);

  $('#modal').querySelector('[data-start]').onclick = () => {
    const exercises = [...selected.values()];
    if (!exercises.length) { toast('請至少選擇一個動作'); return; }
    closeModal();
    openWorkoutSession({ name: tpl.name, emoji: tpl.emoji, exercises });
  };

  render();
}

function openWorkoutSession(tpl) {
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>${tpl.emoji} ${tpl.name}</h3>
    <div id="session-exercises"></div>
    <div class="rest-timer" data-rest>⏱️ 休息 ${state.settings.restSeconds}s</div>
    <button class="btn primary full" style="margin-top:14px" data-save-session>✅ 完成訓練</button>
  `);
  $('#session-exercises').innerHTML = tpl.exercises.map(ex => {
    const last = lastSetForExercise(ex.name);
    const pr = state.stats.prs[ex.name];
    let setsHtml = '';
    for (let i = 0; i < (ex.sets || 4); i++) {
      setsHtml += `<div class="set-row">
        <span class="set-no">${i + 1}</span>
        <input type="number" inputmode="decimal" class="set-w" placeholder="重量 kg" value="${last.weight}" />
        <input type="number" inputmode="numeric" class="set-r" placeholder="${ex.reps} 下" value="${last.reps}" />
        <button class="set-done" data-done>✓</button>
      </div>`;
    }
    return `<div class="session-exercise" data-ex="${ex.name}">
      <div class="se-head">
        <span class="se-name">${ex.name}</span>
        <div style="display:flex;align-items:center;gap:6px">
          ${pr ? `<span class="se-pr">PR ${pr}kg</span>` : `<span class="se-pr">目標 ${ex.reps}下</span>`}
          <button class="btn ghost" data-setminus style="padding:2px 9px">−組</button>
          <button class="btn ghost" data-setplus style="padding:2px 9px">＋組</button>
        </div>
      </div>
      <div class="set-list">${setsHtml}</div>
    </div>`;
  }).join('');

  const bindSetDone = (row) => { const d = row.querySelector('.set-done'); if (d) d.onclick = () => d.classList.toggle('done'); };
  const renumber = (list) => { list.querySelectorAll('.set-row').forEach((r, i) => { const no = r.querySelector('.set-no'); if (no) no.textContent = i + 1; }); };

  $('#session-exercises').querySelectorAll('.session-exercise').forEach(card => {
    const list = card.querySelector('.set-list');
    card.querySelectorAll('.set-row').forEach(bindSetDone);
    card.querySelector('[data-setplus]').onclick = () => {
      const rows = list.querySelectorAll('.set-row');
      const lastRow = rows[rows.length - 1];
      const newRow = lastRow.cloneNode(true);
      newRow.querySelector('.set-w').value = lastRow.querySelector('.set-w').value;
      newRow.querySelector('.set-r').value = lastRow.querySelector('.set-r').value;
      const d = newRow.querySelector('.set-done'); if (d) d.classList.remove('done');
      list.appendChild(newRow);
      bindSetDone(newRow);
      renumber(list);
    };
    card.querySelector('[data-setminus]').onclick = () => {
      const rows = list.querySelectorAll('.set-row');
      if (rows.length > 1) { rows[rows.length - 1].remove(); renumber(list); }
    };
  });

  const restBtn = $('#modal').querySelector('[data-rest]');
  restBtn.onclick = () => startRest(restBtn);

  $('#modal').querySelector('[data-save-session]').onclick = () => {
    const exercises = [];
    $('#modal').querySelectorAll('.session-exercise').forEach(el => {
      const name = el.dataset.ex;
      const sets = [];
      el.querySelectorAll('.set-row').forEach(row => {
        sets.push({ weight: row.querySelector('.set-w').value, reps: row.querySelector('.set-r').value, done: row.querySelector('.set-done').classList.contains('done') });
      });
      exercises.push({ name, sets });
    });
    const workout = { id: store.uid(), templateId: tpl.id || 'custom', templateName: tpl.name, emoji: tpl.emoji, exercises, time: new Date().toISOString() };
    store.addWorkout(state, store.todayKey(), workout);
    const before = JSON.stringify(state.stats.prs);
    store.updatePRs(state, workout);
    engine.grantXP(state, 20);
    const newPr = JSON.stringify(state.stats.prs) !== before;
    closeModal();
    refresh();
    toast(newPr ? '🏆 破個人紀錄！+20 XP' : '✅ 訓練完成 +20 XP');
  };
}

function startRest(btn) {
  clearInterval(restTimerId);
  restRemaining = state.settings.restSeconds;
  btn.textContent = `⏱️ 休息 ${restRemaining}s`;
  restTimerId = setInterval(() => {
    restRemaining--;
    if (restRemaining <= 0) {
      clearInterval(restTimerId);
      btn.textContent = `⏱️ 休息 ${state.settings.restSeconds}s`;
      beep();
      toast('💪 休息完畢，開始下一組！');
    } else {
      btn.textContent = `⏱️ 休息 ${restRemaining}s`;
    }
  }, 1000);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; g.gain.value = 0.12;
    o.start(); o.stop(ctx.currentTime + 0.35);
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}

// ---------- 自訂食物 ----------
function openCustomFood() {
  openModal(`
    <button class="close" data-close>✕</button>
    <h3>＋ 自訂食物</h3>
    <p class="hint">輸入名稱後按「🤖 AI 估算」自動填入營養，或手動填寫。</p>
    <label class="field"><span>名稱</span>
      <div style="display:flex;gap:8px">
        <input id="cf-name" placeholder="例如 乾炒牛河、黯然銷魂飯" style="flex:1" />
        <button class="btn primary" data-ai-est style="white-space:nowrap">🤖 AI 估算</button>
      </div>
    </label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <label class="field"><span>熱量 (kcal)</span><input type="number" id="cf-kcal" placeholder="500" /></label>
      <label class="field"><span>蛋白質 (g)</span><input type="number" id="cf-p" placeholder="20" /></label>
      <label class="field"><span>碳水 (g)</span><input type="number" id="cf-c" placeholder="60" /></label>
      <label class="field"><span>脂肪 (g)</span><input type="number" id="cf-f" placeholder="15" /></label>
    </div>
    <label class="field"><span>份量單位</span><input id="cf-unit" placeholder="份／碗／件" value="份" /></label>
    <p class="hint" id="cf-ai-status"></p>
    <button class="btn primary full" data-save-cf>儲存</button>
  `);

  const aiBtn = $('#modal').querySelector('[data-ai-est]');
  aiBtn.onclick = async () => {
    const name = $('#cf-name').value.trim();
    if (!name) { toast('請先輸入食物名稱'); return; }
    if (!state.settings.apiKey) { toast('請先到「設定」填 API Key'); return; }
    aiBtn.disabled = true;
    aiBtn.textContent = '估算中…';
    $('#cf-ai-status').textContent = '🤖 AI 估算中…';
    try {
      const est = await estimateFoodNutrition(name, state.settings.apiKey, state.settings.provider);
      $('#cf-kcal').value = est.kcal;
      $('#cf-p').value = est.protein;
      $('#cf-c').value = est.carbs;
      $('#cf-f').value = est.fat;
      if (est.unit) $('#cf-unit').value = est.unit;
      $('#cf-ai-status').textContent = `✅ 已估算：每${est.unit} ${est.kcal} kcal · 蛋白質 ${est.protein}g · 碳水 ${est.carbs}g · 脂肪 ${est.fat}g（可自行微調）`;
      aiBtn.textContent = '🤖 重新估算';
    } catch (e) {
      $('#cf-ai-status').textContent = '❌ ' + e.message;
      aiBtn.textContent = '🤖 AI 估算';
    } finally {
      aiBtn.disabled = false;
    }
  };

  $('#modal').querySelector('[data-save-cf]').onclick = () => {
    const name = $('#cf-name').value.trim();
    if (!name) { toast('請輸入名稱'); return; }
    const food = {
      name, emoji: '🍽️', category: '點心', unit: $('#cf-unit').value.trim() || '份',
      kcal: Number($('#cf-kcal').value) || 0,
      protein: Number($('#cf-p').value) || 0,
      carbs: Number($('#cf-c').value) || 0,
      fat: Number($('#cf-f').value) || 0,
    };
    state.customFoods.push(food);
    closeModal();
    refresh();
    toast(`✅ 已加入 ${name}`);
  };
}

// ---------- 事件綁定 ----------
function bindEvents() {
  // 導覽
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchView(b.dataset.view));

  // 免責聲明
  $('#btn-disclaimer').onclick = () => switchView('disclaimer');
  $('#btn-disclaimer-back').onclick = () => switchView('settings');

  // 快速動作
  $('[data-action="voice"]').onclick = onVoice;
  $('[data-action="photo"]').onclick = onPhoto;
  $('[data-action="quick"]').onclick = () => { currentView = 'diet'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); $('#view-diet').classList.add('active'); document.querySelectorAll('.nav-btn').forEach(n => n.classList.toggle('active', n.dataset.view === 'diet')); $('#diet-search').focus(); };
  $('[data-action="workout"]').onclick = () => { currentView = 'workout'; document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); $('#view-workout').classList.add('active'); document.querySelectorAll('.nav-btn').forEach(n => n.classList.toggle('active', n.dataset.view === 'workout')); };

  // 飲食
  $('#diet-search').addEventListener('input', e => { dietSearch = e.target.value.trim(); renderDiet(); });
  $('#diet-categories').addEventListener('click', e => {
    const cat = e.target.closest('[data-cat]');
    if (cat) { dietCategory = cat.dataset.cat; dietSearch = ''; $('#diet-search').value = ''; renderDiet(); }
  });
  $('#food-grid').addEventListener('click', e => {
    const f = e.target.closest('[data-food]');
    if (f) onFoodTap(f.dataset.food);
  });
  $('#diet-categories').addEventListener('click', e => {
    const q = e.target.closest('[data-quickfood]');
    if (q) onQuickFoodTap(q.dataset.quickfood);
  });
  $('#diet-log').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { store.removeMeal(state, store.todayKey(), del.dataset.del); refresh(); return; }
    const m = e.target.closest('[data-meal]');
    if (m) openEditAmount(store.todayKey(), m.dataset.meal);
  });
  $('#btn-add-custom-food').onclick = openCustomFood;

  // 訓練
  $('#template-grid').addEventListener('click', e => {
    const t = e.target.closest('[data-tpl]');
    if (t) { const tpl = WORKOUT_TEMPLATES.find(x => x.id === t.dataset.tpl); if (tpl) openExercisePicker(tpl); }
  });

  // 進度
  $('#pr-exercise-select').addEventListener('change', e => renderPRChart(e.target.value));

  // 設定
  $('#btn-save-settings').onclick = () => {
    state.settings.name = $('#set-name').value.trim();
    state.settings.calories = Number($('#set-calories').value) || 2000;
    state.settings.protein = Number($('#set-protein').value) || 120;
    refresh();
    toast('✅ 目標已儲存');
  };
  $('#btn-save-apikey').onclick = () => {
    state.settings.provider = $('#set-provider').value;
    state.settings.apiKey = $('#set-apikey').value.trim();
    store.saveState(state);
    toast(state.settings.apiKey ? '✅ 設定已儲存' : '已清除金鑰');
  };
  $('#btn-export').onclick = () => {
    const blob = new Blob([store.exportJSON(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gymbro-backup-' + store.todayKey() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#btn-import').onclick = () => $('#import-file').click();
  $('#import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const base = store.defaultState();
        state = {
          settings: { ...base.settings, ...data.settings },
          logs: data.logs || {},
          customFoods: data.customFoods || [],
          stats: { ...base.stats, ...(data.stats || {}), daily: data.stats?.daily || {}, prs: data.stats?.prs || {}, badges: data.stats?.badges || [] },
        };
        refresh();
        toast('✅ 已匯入備份');
      } catch (err) { toast('匯入失敗：檔案格式錯誤'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
  $('#btn-reset').onclick = () => {
    if (confirm('確定清除全部資料？此動作無法復原。')) {
      state = store.defaultState();
      refresh();
      fillSettings();
      toast('已清除全部資料');
    }
  };

  // Modal 關閉
  $('#modal-backdrop').onclick = closeModal;
  $('#modal').addEventListener('click', e => {
    if (e.target.closest('[data-close]')) { closeModal(); stopVoiceRecognition(voiceRec); }
  });
}

// ---------- 啟動 ----------
function init() {
  const fv = $('#footer-version');
  if (fv) fv.textContent = 'GymBro.AI v1.8 · 資料只存在你這個瀏覽器，不需帳號。';
  bindEvents();
  fillSettings();
  render();
  store.saveState(state);
  // 註冊 Service Worker（PWA 離線快取，需 http/https）
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
