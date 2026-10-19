// ===== 拍照 + AI 辨識 / 食物營養估算（支援 DeepSeek 與 Gemini） =====

// 從相機或相簿挑選照片，回傳縮圖 dataURL（最大邊 1024px）
export function pickPhoto() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) { reject(new Error('no-file')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(downscale(reader.result, 1024));
      reader.onerror = () => reject(new Error('讀取圖片失敗'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function downscale(dataUrl, maxSide) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxSide && height <= maxSide) { resolve(dataUrl); return; }
      const scale = maxSide / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const IMAGE_PROMPT = `你是一位香港註冊營養師。請辨識相片中的食物與大概份量（以香港常見份量估計，例如：碗、碟、件、隻、杯）。只回傳 JSON，格式如下，不要任何其他文字：
{"foods":[{"name":"食物名稱","amount":1,"unit":"碗","kcal":250,"protein":10,"carbs":30,"fat":8}]}`;

// ---- 共用：呼叫各家 API ----
async function deepSeekChat(content, apiKey, model = 'deepseek-chat') {
  const url = 'https://api.deepseek.com/chat/completions';
  const body = {
    model,
    messages: [{ role: 'user', content }],
    temperature: 0.1,
    max_tokens: 1024,
  };
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('無法連線 DeepSeek（請檢查網絡）。');
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`DeepSeek 回傳錯誤 ${resp.status}：${t.slice(0, 120)}`);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('AI 無回傳結果，請再試一次。');
  return text;
}

async function geminiGenerate(parts, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  };
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('無法連線 Gemini（請檢查網絡）。');
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Gemini 回傳錯誤 ${resp.status}：${t.slice(0, 120)}`);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!text) throw new Error('AI 無回傳結果，請再試一次。');
  return text;
}

// 解析模型回傳的 JSON（容忍 ```json 包裹或前後雜訊）
function parseJSON(text) {
  let clean = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) clean = clean.slice(s, e + 1);
  try {
    return JSON.parse(clean);
  } catch (err) {
    throw new Error('AI 回傳格式無法解析，請再試一次。');
  }
}

// ---- 拍照辨識食物（回傳陣列） ----
export async function recognizeFood(dataUrl, apiKey, provider = 'deepseek') {
  if (!apiKey) throw new Error('尚未設定 API Key，請到「設定」填寫。');
  let text;
  if (provider === 'gemini') {
    const base64 = dataUrl.split(',')[1];
    const mime = (dataUrl.match(/^data:(.*?);/) || [,'image/jpeg'])[1];
    text = await geminiGenerate([
      { inline_data: { mime_type: mime, data: base64 } },
      { text: IMAGE_PROMPT },
    ], apiKey);
  } else {
    text = await deepSeekChat([
      { type: 'text', text: IMAGE_PROMPT },
      { type: 'image_url', image_url: { url: dataUrl } },
    ], apiKey, 'deepseek-flash');
  }

  const parsed = parseJSON(text);
  const foods = (parsed.foods || []).map(f => ({
    name: String(f.name || '未命名食物').trim(),
    amount: Number(f.amount) || 1,
    unit: String(f.unit || '份').trim(),
    kcal: Math.round(Number(f.kcal) || 0),
    protein: Math.round(Number(f.protein) || 0),
    carbs: Math.round(Number(f.carbs) || 0),
    fat: Math.round(Number(f.fat) || 0),
    emoji: '📷',
    source: 'photo',
  })).filter(f => f.name.length > 0);

  if (!foods.length) throw new Error('辨識唔到食物，請再影清楚啲或者改用手動記錄。');
  return foods;
}

// ---- 依名稱估算食物營養（回傳單一食物物件） ----
export async function estimateFoodNutrition(name, apiKey, provider = 'deepseek') {
  if (!apiKey) throw new Error('尚未設定 API Key，請到「設定」填寫。');
  const q = `你是一位香港註冊營養師。請估算食物「${name}」的營養（以香港常見一份為單位，例如：一碗、一碟、一件、一隻、一杯）。只回傳 JSON，不要任何其他文字，格式：
{"name":"${name}","unit":"份","kcal":250,"protein":10,"carbs":30,"fat":8}`;

  let text;
  if (provider === 'gemini') {
    text = await geminiGenerate([{ text: q }], apiKey);
  } else {
    text = await deepSeekChat(q, apiKey, 'deepseek-chat');
  }

  const obj = parseJSON(text);
  return {
    name: String(obj.name || name).trim(),
    unit: String(obj.unit || '份').trim(),
    kcal: Math.round(Number(obj.kcal) || 0),
    protein: Math.round(Number(obj.protein) || 0),
    carbs: Math.round(Number(obj.carbs) || 0),
    fat: Math.round(Number(obj.fat) || 0),
  };
}
