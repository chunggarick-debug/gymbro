// ===== 拍照 + AI 辨識 / 食物營養估算（支援 DeepSeek 與 Gemini） =====

// 從相機或圖庫挑選照片，回傳縮圖 dataURL（最大邊 1024px）
// source: 'camera'（開相機）| 'gallery'（開圖庫／檔案選擇）
export function pickPhoto(source = 'camera') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';

    let settled = false;
    const onFocus = () => setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener('focus', onFocus);
        reject(new Error('cancelled'));
      }
    }, 300);

    input.onchange = () => {
      settled = true;
      window.removeEventListener('focus', onFocus);
      const file = input.files && input.files[0];
      if (!file) { reject(new Error('no-file')); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(downscale(reader.result, 1024));
      reader.onerror = () => reject(new Error('讀取圖片失敗'));
      reader.readAsDataURL(file);
    };

    window.addEventListener('focus', onFocus);
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

const IMAGE_PROMPT = `你是一位香港食物辨識專家。請仔細辨識相片中的每一樣食物，用「香港常見名稱」描述（例如：叉燒飯、乾炒牛河、凍檸茶、蛋撻、燒味雙拼、雲吞麵）。不要加入品牌名，不要描述背景、餐具或裝飾。份量用香港常見單位估計（碗、碟、件、隻、杯、串）。若唔確定，寫最接近的常見食物。kcal 是相片中該食物「整份」的總熱量（amount 是份數）。只回傳 JSON，不要任何其他文字，格式：
{"foods":[{"name":"食物名稱","amount":1,"unit":"碗","kcal":250,"protein":10,"carbs":30,"fat":8}]}`;

// ---- 友好錯誤訊息 ----
function apiError(provider, status, bodyText) {
  let detail = '';
  try {
    const j = JSON.parse(bodyText);
    detail = j?.error?.message || j?.error?.code || j?.message || '';
  } catch (e) { /* ignore */ }

  const map = {
    400: '請求內容有問題（可能是圖片格式或大小）。',
    401: 'API Key 無效，請檢查是否貼對、有沒有多空格。',
    402: '帳戶餘額不足或配額用盡，請到平台儲值／檢查額度。',
    403: '沒有權限（Key 被限制或地區不支援）。',
    404: '模型名稱錯誤或不存在。',
    413: '圖片太大，請換張細啲嘅相。',
    429: '請求太頻繁，請等幾秒至一分鐘再試。',
  };
  const base = map[status] || `服務回傳錯誤 ${status}`;
  return detail ? `${base}\n（${detail.slice(0, 160)}）` : base;
}

// ---- 共用：呼叫各家 API ----
async function deepSeekChat(content, apiKey, model = 'deepseek-flash') {
  const url = 'https://api.deepseek.com/chat/completions';
  const body = {
    model,
    messages: [{ role: 'user', content }],
    thinking: { type: 'disabled' },
    temperature: 0,
    max_tokens: 2000,
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
    throw new Error(apiError('deepseek', resp.status, t));
  }
  const data = await resp.json();
  const msg = data?.choices?.[0]?.message || {};
  const text = msg.content || msg.reasoning_content || '';
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
    throw new Error(apiError('gemini', resp.status, t));
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
    text = await deepSeekChat(q, apiKey);
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
