// ===== 拍照 + AI 辨識（支援 DeepSeek 與 Gemini） =====

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

const PROMPT = `你是一位香港註冊營養師。請辨識相片中的食物與大概份量（以香港常見份量估計，例如：碗、碟、件、隻、杯）。只回傳 JSON，格式如下，不要任何其他文字：
{"foods":[{"name":"食物名稱","amount":1,"unit":"碗","kcal":250,"protein":10,"carbs":30,"fat":8}]}`;

export async function recognizeFood(dataUrl, apiKey, provider = 'deepseek') {
  if (!apiKey) throw new Error('尚未設定 API Key，請到「設定」填寫。');
  if (provider === 'gemini') return recognizeGemini(dataUrl, apiKey);
  return recognizeDeepSeek(dataUrl, apiKey);
}

// 解析模型回傳的 JSON（容忍 ```json 包裹或前後雜訊）
function parseFoods(text) {
  let clean = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s >= 0 && e > s) clean = clean.slice(s, e + 1);

  let parsed;
  try { parsed = JSON.parse(clean); }
  catch (err) { throw new Error('AI 回傳格式無法解析，請重拍或改用手動記錄。'); }

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

async function recognizeDeepSeek(dataUrl, apiKey) {
  const url = 'https://api.deepseek.com/chat/completions';
  const body = {
    model: 'deepseek-flash',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    }],
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
    const errText = await resp.text().catch(() => '');
    throw new Error(`DeepSeek 回傳錯誤 ${resp.status}：${errText.slice(0, 120)}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('AI 無回傳結果，請再試一次。');
  return parseFoods(text);
}

async function recognizeGemini(dataUrl, apiKey) {
  const base64 = dataUrl.split(',')[1];
  const mime = (dataUrl.match(/^data:(.*?);/) || [,'image/jpeg'])[1];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime, data: base64 } },
        { text: PROMPT },
      ],
    }],
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
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini 回傳錯誤 ${resp.status}：${errText.slice(0, 120)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!text) throw new Error('AI 無回傳結果，請再試一次。');
  return parseFoods(text);
}
