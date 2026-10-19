// ===== 語音輸入（Web Speech API，粵語） =====

export function voiceSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startVoiceRecognition({ onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onError && onError('此瀏覽器不支援語音辨識，請用 Chrome（桌面或手機）。');
    return null;
  }
  const rec = new SR();
  rec.lang = 'zh-HK';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  rec.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }
    onResult && onResult(text.trim());
  };
  rec.onerror = (e) => {
    let msg = '語音辨識失敗';
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') msg = '未取得麥克風權限，請在瀏覽器允許使用麥克風。';
    else if (e.error === 'no-speech') msg = '聽唔到聲，請再試一次。';
    else if (e.error === 'network') msg = '語音服務需連線，請檢查網絡。';
    onError && onError(msg);
  };
  rec.onend = () => onEnd && onEnd();

  try { rec.start(); } catch (err) { onError && onError('啟動語音失敗：' + err.message); }
  return rec;
}

export function stopVoiceRecognition(rec) {
  try { rec && rec.stop(); } catch (e) { /* ignore */ }
}
