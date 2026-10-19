// ===== 輕量 SVG 圖表（無依賴） =====

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function emptyChart(el, msg = '尚無數據') {
  el.innerHTML = `<div style="text-align:center;color:var(--muted);padding:24px 0;font-size:13px">${esc(msg)}</div>`;
}

// 折線圖：力量曲線
export function lineChart(el, points, opts = {}) {
  const { color = '#22d3ee', unit = 'kg', height = 160 } = opts;
  if (!points || points.length < 1) { emptyChart(el); return; }

  const W = 320, H = height, padL = 30, padR = 14, padT = 18, padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const vals = points.map(p => p.value);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const span = (max - min) || 1;
  const yMax = max + span * 0.2;
  const yMin = Math.max(0, min - span * 0.3);

  const x = i => padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = v => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // 網格線（3 條）
  let grid = '';
  for (let g = 0; g <= 2; g++) {
    const gy = padT + (g / 2) * innerH;
    const gv = yMax - (g / 2) * (yMax - yMin);
    grid += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="#26345a" stroke-width="1" stroke-dasharray="3 3"/>`;
    grid += `<text x="${padL - 6}" y="${gy + 3}" fill="#8b9bc4" font-size="9" text-anchor="end">${Math.round(gv)}</text>`;
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  let dots = '';
  let labels = '';
  points.forEach((p, i) => {
    dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4" fill="${color}" stroke="#0b1220" stroke-width="2"/>`;
    dots += `<text x="${x(i).toFixed(1)}" y="${(y(p.value) - 8).toFixed(1)}" fill="${color}" font-size="10" font-weight="700" text-anchor="middle">${p.value}</text>`;
  });
  // x 軸標籤：最多 5 個
  const step = Math.max(1, Math.ceil(points.length / 5));
  points.forEach((p, i) => {
    if (i % step === 0 || i === points.length - 1) {
      labels += `<text x="${x(i).toFixed(1)}" y="${(H - 8).toFixed(1)}" fill="#8b9bc4" font-size="9" text-anchor="middle">${esc(p.label)}</text>`;
    }
  });

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${grid}
    <path d="${area}" fill="${color}" opacity="0.10"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}
  </svg>`;
}

// 長條圖：近 7 天熱量 / 蛋白質
export function barChart(el, opts = {}) {
  const { labels = [], values = [], color = '#fbbf24', maxHint = null, title = '' } = opts;
  if (!labels.length) { emptyChart(el); return; }

  const W = 320, H = 170, padT = 26, padB = 26, padL = 8, padR = 8;
  const innerH = H - padT - padB;
  const max = maxHint || Math.max(...values, 1) * 1.2;
  const bw = (W - padL - padR) / labels.length;
  const barW = Math.min(26, bw * 0.6);

  let bars = '';
  let labs = '';
  labels.forEach((l, i) => {
    const v = values[i] || 0;
    const h = Math.max(0, (v / max) * innerH);
    const bx = padL + i * bw + (bw - barW) / 2;
    const by = padT + innerH - h;
    bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${color}" opacity="0.9"/>`;
    bars += `<text x="${(bx + barW / 2).toFixed(1)}" y="${(by - 4).toFixed(1)}" fill="${color}" font-size="9" font-weight="700" text-anchor="middle">${v}</text>`;
    labs += `<text x="${(bx + barW / 2).toFixed(1)}" y="${(H - 9).toFixed(1)}" fill="#8b9bc4" font-size="9" text-anchor="middle">${esc(l)}</text>`;
  });

  let head = '';
  if (title) head = `<text x="${padL}" y="16" fill="#8b9bc4" font-size="10" font-weight="700">${esc(title)}</text>`;

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${head}${bars}${labs}</svg>`;
}
