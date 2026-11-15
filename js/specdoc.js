/* מסמך אפיון: מייצר מהסכמה הפעילה מסמך Word (.docx) או PDF (הדפסה מהדפדפן). מודל אחד, שני מציגים.
   ספריית docx נטענת רק בעת ייצוא Word (js/vendor/docx.iife.js). */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const KIND = { point: 'שכבת נקודות', line: 'שכבת קווים', polygon: 'שכבת פוליגונים', table: 'טבלה' };
  const kind = (k) => KIND[k] || k || '';
  const slug = (s) => String(s || '').replace(/[^A-Za-z0-9_\-֐-׿]+/g, '_').slice(0, 40);
  const toast = (m) => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 6000); };

  /* ---------- תרשים ישויות (SVG מחושב, ללא תלות ב-DOM) ---------- */
  function erdSvg(S) {
    const rels = S.relationships || [], W = 250, GAPX = 50, GAPY = 80, PAD = 20;
    const lv = {};
    const up = (n, d) => (d > 10 ? 0 : rels.filter((r) => r.destination === n).reduce((m, r) => Math.max(m, up(r.origin, d + 1) + 1), 0));
    S.entities.forEach((e) => { lv[e.name] = up(e.name, 0); });
    const max = Math.max(0, ...Object.values(lv)), rows = [];
    for (let i = 0; i <= max; i++) { const es = S.entities.filter((e) => lv[e.name] === i); if (es.length) rows.push(es); }
    const box = (e) => {
      const fks = rels.filter((r) => r.destination === e.name);
      const L = (t) => '\u2066' + t + '\u2069', lines = [L('GlobalID · PK')].concat(fks.map((r) => L(r.destKey + ' · FK → ' + r.origin))).concat([e.fields.length + ' שדות']);
      return { e, lines, h: 54 + lines.length * 17 };
    };
    const laid = rows.map((r) => r.map(box));
    const rowW = laid.map((r) => r.length * W + (r.length - 1) * GAPX), totalW = Math.max(...rowW) + PAD * 2;
    let y = PAD; const pos = {};
    laid.forEach((r, i) => {
      let x = PAD + (totalW - PAD * 2 - rowW[i]) / 2; const h = Math.max(...r.map((b) => b.h));
      r.forEach((b) => { pos[b.e.name] = { x, y, w: W, h: b.h, b }; x += W + GAPX; });
      y += h + GAPY;
    });
    const H = y - GAPY + PAD;
    let o = '';
    const pairs = {};
    rels.forEach((r) => {
      const a = pos[r.origin], b = pos[r.destination]; if (!a || !b) return;
      const key = r.origin + '>' + r.destination, k = pairs[key] = (pairs[key] || 0) + 1, off = (k - 1) * 14;
      const x1 = a.x + a.w / 2 + off, y1 = a.y + a.h, x2 = b.x + b.w / 2 + off, y2 = b.y, my = (y1 + y2) / 2;
      o += `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2 - 2}" fill="none" stroke="#64748B" stroke-width="1.6" ${r.type === 'COMPOSITE' ? '' : 'stroke-dasharray="6 4"'} marker-end="url(#ar)"/>`;
      o += `<text x="${(x1 + x2) / 2 + 8}" y="${my - 3}" font-size="12" fill="#475569" text-anchor="end" direction="rtl">${esc((r.forward || r.name) + ' · אחד לרבים')}</text>`;
    });
    Object.values(pos).forEach((p) => {
      const e = p.b.e;
      o += `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8" fill="#fff" stroke="#1E3A8A" stroke-width="1.6"/><rect x="${p.x}" y="${p.y}" width="${p.w}" height="40" rx="8" fill="#1E3A8A"/><rect x="${p.x}" y="${p.y + 30}" width="${p.w}" height="10" fill="#1E3A8A"/>`;
      o += `<text x="${p.x + p.w / 2}" y="${p.y + 18}" font-size="15" font-weight="700" fill="#fff" text-anchor="middle" direction="rtl">${esc(e.alias)}</text><text x="${p.x + p.w / 2}" y="${p.y + 34}" font-size="11" fill="#CBD5E1" text-anchor="middle">${esc(e.name + ' · ' + kind(e.kind))}</text>`;
      p.b.lines.forEach((l, i) => { o += `<text x="${p.x + p.w - 12}" y="${p.y + 60 + i * 17}" font-size="12" fill="#334155" text-anchor="start" direction="rtl">${esc(l)}</text>`; });
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" font-family="Segoe UI, Arial, sans-serif"><defs><marker id="ar" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#64748B"/></marker></defs><rect width="100%" height="100%" fill="#fff"/>${o}</svg>`;
    return { svg, w: totalW, h: H };
  }
  async function svgPng(d) {
    const img = new Image(), url = URL.createObjectURL(new Blob([d.svg], { type: 'image/svg+xml;charset=utf-8' }));
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });
    const k = 2, c = document.createElement('canvas'); c.width = d.w * k; c.height = d.h * k;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return new Promise((ok) => c.toBlob(async (b) => ok(new Uint8Array(await b.arrayBuffer())), 'image/png'));
  }

  /* ---------- המודל ---------- */
  function model(S) {
    const B = [], date = new Date().toLocaleDateString('he-IL'), m = S.meta || {};
    B.push({ t: 'title', text: 'מסמך אפיון נתונים', sub: m.title || m.key });
    B.push({ t: 'kv', rows: [['פרויקט', m.project || m.key], ['גרסת סכמה', 'v' + (m.version || 1)], ['תאריך הפקה', date], ['מערכת קואורדינטות', (m.spatialRef || '') + (m.spatialRefName ? ' · ' + m.spatialRefName : '')], ['מקור', m.source || '']].filter((r) => r[1]) });
    B.push({ t: 'pb' });
    B.push({ t: 'h1', text: '1. סקירה' });
    B.push({ t: 'p', text: 'הפתרון בנוי מ-' + S.entities.length + ' ישויות נתונים (שכבות וטבלאות), ' + (S.relationships || []).length + ' קשרים ו-' + Object.keys(S.domains || {}).length + ' דומיינים. הקשרים בין הישויות מבוססים על GlobalID של האב ו-ParentGlobalID בבן.' });
    if (m.rules) B.push({ t: 'p', text: 'כללי עיצוב: ' + [m.rules.minTextLength ? 'שדות טקסט באורך מינימלי ' + m.rules.minTextLength : '', m.rules.domainCodeEqualsLabel ? 'בדומיינים הקוד והתווית זהים' : ''].filter(Boolean).join(' · ') + '.' });
    B.push({ t: 'table', head: ['שם טכני', 'כינוי', 'סוג', 'שדות', 'תיאור'], w: [18, 18, 14, 8, 42], rows: S.entities.map((e) => [e.name, e.alias, kind(e.kind), String(e.fields.length), e.description || '']) });
    B.push({ t: 'h1', text: '2. ישויות וקשרים' });
    B.push({ t: 'erd' });
    if ((S.relationships || []).length) B.push({ t: 'table', head: ['שם הקשר', 'אב', 'בן', 'מפתח באב', 'מפתח בבן', 'סוג'], w: [24, 16, 16, 12, 16, 16], rows: S.relationships.map((r) => [r.name, r.origin, r.destination, r.originKey, r.destKey, 'אחד לרבים · ' + (r.type === 'COMPOSITE' ? 'מורכב' : 'פשוט')]) });
    B.push({ t: 'h1', text: '3. ישויות ושדות' });
    S.entities.forEach((e) => {
      B.push({ t: 'h2', text: e.alias + ' (' + e.name + ')' });
      B.push({ t: 'p', text: kind(e.kind) + ' · Attachments: ' + (e.attachments ? 'כן' : 'לא') + ' · Editor Tracking: ' + (e.editorTracking ? 'כן' : 'לא') + (e.description ? '. ' + e.description : '') });
      B.push({ t: 'table', head: ['#', 'נושא', 'שדה', 'כינוי', 'סוג', 'אורך', 'דומיין', 'קלט', 'תצוגה בטופס', 'הערה'], w: [3, 9, 13, 13, 6, 5, 11, 8, 11, 21],
        rows: e.fields.map((f, i) => [String(i + 1), f.category || '', f.name, f.alias || '', f.type || '', f.length ? String(f.length) : '', f.domain || '', f.mode || '', f.visible || '', [f.open ? '⚠ פתוח' : '', f.required ? 'חובה' : '', f.reqIf ? 'חובה אם: ' + f.reqIf : '', f.note || ''].filter(Boolean).join('. ')]) });
    });
    const dk = Object.keys(S.domains || {});
    if (dk.length) {
      B.push({ t: 'h1', text: '4. דומיינים' });
      dk.forEach((k) => {
        const d = S.domains[k], vals = d.values || [], hasP = vals.some((v) => v.parent), hasE = vals.some((v) => v.ext);
        B.push({ t: 'h2', text: d.name + (d.desc ? ' — ' + d.desc : '') + ' (' + vals.length + ' ערכים)' });
        const head = ['קוד', 'תווית'].concat(hasP ? ['הורה'] : []).concat(hasE ? ['מפתח חיצוני'] : []);
        B.push({ t: 'table', head, w: head.length === 2 ? [50, 50] : head.length === 3 ? [34, 33, 33] : [25, 25, 25, 25], rows: vals.map((v) => [v.code, v.label].concat(hasP ? [v.parent || ''] : []).concat(hasE ? [v.ext || ''] : [])) });
      });
    }
    const dec = S.decisions || [], open = [];
    S.entities.forEach((e) => e.fields.forEach((f) => { if (f.open) open.push([e.name + '.' + f.name, f.alias || '', f.note || '']); }));
    if (dec.length || open.length) {
      B.push({ t: 'h1', text: '5. נושאים פתוחים' });
      if (dec.length) { B.push({ t: 'h2', text: 'החלטות' }); B.push({ t: 'table', head: ['#', 'נושא', 'סטטוס', 'הערה'], w: [6, 40, 12, 42], rows: dec.map((d) => [d.id || '', d.title || '', d.status === 'closed' ? 'סגור' : 'פתוח', d.note || '']) }); }
      if (open.length) { B.push({ t: 'h2', text: 'שדות המסומנים כפתוחים (' + open.length + ')' }); B.push({ t: 'table', head: ['שדה', 'כינוי', 'הערה'], w: [28, 22, 50], rows: open }); }
    }
    const dg = S.diagrams || {}, comps = (dg.components && dg.components.nodes) || [], flows = dg.flows || [];
    if (comps.length || flows.length) {
      B.push({ t: 'h1', text: '6. נספח: רכיבי הפתרון ותהליכים' });
      if (comps.length) {
        const layers = {}; ((dg.components.layers) || []).forEach((l) => { layers[l.id] = l.title; });
        B.push({ t: 'h2', text: 'רכיבי הפתרון' });
        B.push({ t: 'table', head: ['שכבה', 'רכיב', 'תיאור', 'פריטים'], w: [18, 22, 30, 30], rows: comps.map((n) => [layers[n.layer] || n.layer || '', n.title || '', n.sub || '', (n.items || []).map((i) => i === '@entities' ? S.entities.map((e) => e.alias).join(', ') : i === '@domains' ? Object.keys(S.domains || {}).length + ' דומיינים' : i).join(', ')]) });
      }
      flows.forEach((f) => {
        const lane = {}; (f.lanes || []).forEach((l) => { lane[l.id] = l.label; });
        B.push({ t: 'h2', text: 'תהליך: ' + f.title });
        B.push({ t: 'table', head: ['#', 'גורם', 'צעד', 'הערה', 'ישויות'], w: [5, 18, 38, 24, 15], rows: (f.steps || []).map((s, i) => [String(i + 1), lane[s.lane] || s.lane || '', s.text || '', s.note || '', (s.ent || []).join(', ')]) });
      });
    }
    return B;
  }

  /* ---------- PDF: דף הדפסה בתוך iframe ---------- */
  function html(S, B, erd) {
    const css = '@page{size:A4 landscape;margin:12mm}body{font-family:"Segoe UI",Arial,sans-serif;color:#0F172A;direction:rtl;font-size:11px;line-height:1.5}h1{color:#1E3A8A;font-size:20px;margin:18px 0 6px;break-after:avoid}h2{color:#1E3A8A;font-size:15px;margin:14px 0 4px;break-after:avoid}.title{font-size:30px;font-weight:800;color:#1E3A8A;margin:60px 0 6px}.sub{font-size:18px;color:#475569;margin-bottom:30px}table{border-collapse:collapse;width:100%;margin:6px 0 10px}th{background:#1E3A8A;color:#fff;text-align:right;padding:4px 6px;font-size:10.5px}td{border:1px solid #CBD5E1;padding:3px 6px;vertical-align:top;word-break:break-word}tr{break-inside:avoid}thead{display:table-header-group}.kv td:first-child{width:160px;background:#F1F5F9;font-weight:700}.pb{break-after:page}.erd{text-align:center;margin:8px 0}.erd svg{max-width:100%;height:auto}p{margin:4px 0}';
    const wsum = (w) => w.reduce((a, b) => a + b, 0);
    const body = B.map((b) => {
      if (b.t === 'title') return '<div class="title">' + esc(b.text) + '</div><div class="sub">' + esc(b.sub) + '</div>';
      if (b.t === 'kv') return '<table class="kv"><tbody>' + b.rows.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') + '</tbody></table>';
      if (b.t === 'pb') return '<div class="pb"></div>';
      if (b.t === 'h1' || b.t === 'h2') return '<' + b.t + '>' + esc(b.text) + '</' + b.t + '>';
      if (b.t === 'p') return '<p>' + esc(b.text) + '</p>';
      if (b.t === 'erd') return '<div class="erd">' + erd.svg + '</div>';
      if (b.t === 'table') return '<table><thead><tr>' + b.head.map((h, i) => '<th style="width:' + (b.w[i] * 100 / wsum(b.w)).toFixed(1) + '%">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' + b.rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      return '';
    }).join('\n');
    return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>מסמך אפיון · ' + esc(S.meta.title || S.meta.key) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
  }
  async function pdf(S) {
    const B = model(S), erd = erdSvg(S), f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html(S, B, erd)); f.contentDocument.close();
    await new Promise((r) => setTimeout(r, 400));
    f.contentWindow.focus(); f.contentWindow.print();
    setTimeout(() => f.remove(), 60000);
  }

  /* ---------- Word ---------- */
  function loadDocx() {
    if (window.docx) return Promise.resolve();
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'js/vendor/docx.iife.js'; s.onload = ok; s.onerror = () => no(new Error('לא נטענה ספריית Word (js/vendor/docx.iife.js)')); document.head.appendChild(s); });
  }
  async function word(S) {
    await loadDocx();
    const D = window.docx, B = model(S), erd = erdSvg(S), png = await svgPng(erd);
    const FONT = { ascii: 'Arial', hAnsi: 'Arial', cs: 'Arial' }, USABLE = 14800;
    const run = (text, o) => new D.TextRun(Object.assign({ text: String(text == null ? '' : text), rightToLeft: true, font: FONT }, o || {}));
    const para = (text, o, po) => new D.Paragraph(Object.assign({ bidirectional: true, alignment: D.AlignmentType.START, spacing: { after: 80 }, children: [run(text, o)] }, po || {}));
    const border = { style: D.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, borders = { top: border, bottom: border, left: border, right: border };
    const cell = (text, wDxa, head) => new D.TableCell({ width: { size: wDxa, type: D.WidthType.DXA }, borders, margins: { top: 40, bottom: 40, left: 80, right: 80 },
      shading: head ? { type: D.ShadingType.CLEAR, fill: '1E3A8A', color: 'auto' } : undefined,
      children: [para(text, head ? { bold: true, color: 'FFFFFF', size: 18 } : { size: 18 }, { spacing: { after: 0 } })] });
    const table = (b) => {
      const sum = b.w.reduce((a, c) => a + c, 0), cols = b.w.map((x) => Math.round(USABLE * x / sum));
      return new D.Table({ visuallyRightToLeft: true, width: { size: USABLE, type: D.WidthType.DXA }, columnWidths: cols, layout: D.TableLayoutType.FIXED,
        rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: b.head.map((h, i) => cell(h, cols[i], true)) })].concat(b.rows.map((r) => new D.TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, cols[i])) }))) });
    };
    const kids = [];
    B.forEach((b) => {
      if (b.t === 'title') { kids.push(para(b.text, { bold: true, size: 64, color: '1E3A8A' }, { spacing: { before: 1800, after: 120 } })); kids.push(para(b.sub, { size: 36, color: '475569' }, { spacing: { after: 600 } })); }
      else if (b.t === 'kv') kids.push(table({ head: ['נושא', 'ערך'], w: [25, 75], rows: b.rows }));
      else if (b.t === 'pb') kids.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      else if (b.t === 'h1') kids.push(para(b.text, { bold: true, size: 36, color: '1E3A8A' }, { heading: D.HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, keepNext: true }));
      else if (b.t === 'h2') kids.push(para(b.text, { bold: true, size: 28, color: '1E3A8A' }, { heading: D.HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, keepNext: true }));
      else if (b.t === 'p') kids.push(para(b.text, { size: 21 }));
      else if (b.t === 'erd') { const mw = 880, k = Math.min(1, mw / erd.w); kids.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ type: 'png', data: png, transformation: { width: Math.round(erd.w * k), height: Math.round(erd.h * k) } })] })); }
      else if (b.t === 'table') { kids.push(table(b)); kids.push(new D.Paragraph({ spacing: { after: 120 }, children: [] })); }
    });
    const doc = new D.Document({
      creator: 'מעצב פתרונות AGOL', title: 'מסמך אפיון · ' + (S.meta.title || S.meta.key),
      styles: { default: { document: { run: { font: FONT, size: 21, rightToLeft: true }, paragraph: { }, } } },
      sections: [{
        properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } }, bidi: true },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, bidirectional: true, children: [run((S.meta.title || '') + ' · v' + (S.meta.version || 1) + ' · עמוד ', { size: 16, color: '64748B' }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: '64748B' })] })] }) },
        children: kids }]
    });
    return D.Packer.toBlob(doc);
  }
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  window.SpecDoc = { model, erdSvg, word, pdf, html };
  const mb = $('b-menu'), mp = $('menu-pop');
  if (mb && mp) { mb.onclick = (e) => { e.stopPropagation(); mp.hidden = !mp.hidden; }; document.addEventListener('click', (e) => { if (!mp.hidden && !mp.contains(e.target)) mp.hidden = true; }); }
  const act = (id, fn) => { const b = $(id); if (b) b.onclick = async () => { b.disabled = true; try { await fn(window.__designer.S); } catch (e) { toast('שגיאת ייצוא: ' + e.message); } finally { b.disabled = false; const p = $('menu-pop'); if (p) p.hidden = true; } }; };
  act('b-doc-word', async (S) => { const blob = await word(S); download('spec-' + slug(S.meta.key) + '-v' + (S.meta.version || 1) + '.docx', blob); toast('מסמך Word הורד'); });
  act('b-doc-pdf', async (S) => { await pdf(S); toast('בחלון ההדפסה בחר "שמירה כ-PDF"'); });
})();
