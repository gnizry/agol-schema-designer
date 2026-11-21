/* סימולטור כללי לשכבה ראשית (נקודה / קו / פוליגון) עם טבלה קשורה אחת, מונחה סכמה.
   הסימולטור של השילוט (sim.js) נשאר לסכמות עם שלוש רמות. כאן הכול נגזר מ-S.sim ומהשדות עצמם:
   S.sim = {
     engine: 'generic',
     main, child,                         // שמות ישויות (ברירת מחדל: הישות הראשונה שאינה טבלה והבן הראשון שלה)
     idField, statusField, titlePrefix,   // מזהה, שדה צבע/סטטוס, קידומת לכותרת בפופאפ
     colors: { ערך: צבע },
     newValue, continueValue,             // ערכי סטטוס: "חדש" ו"המשך" (המשך מקבל את המזהה של "חדש" שנוגע בו ומאוחד בלילה)
     chips: [שדות], kpis: [{f, label, unit}], childTitle: שדה, childCard: [שדות],
     auto: { שדה: 'now' | 'user' | 'area' | 'id' | 'weekday:<שדה>' | 'parent:<שדה באב>' | 'script' },
     script: { title, desc, fill: { שדה: [ערכים] } },  // הסקריפט הלילי: איחוד "המשך" ומילוי שדות 'script'
     scenarios: [{ title, desc, near: bool, main: {...}, child: {...} }],
     deepLinks: true, user: 'שם משתמש לדוגמה', mapItemId: 'מזהה מפת Field Maps לקישורי העומק'
   } */
(function () {
  'use strict';
  const C = () => window.SimCore;
  const esc = (s) => C().esc(s);
  const uid = () => C().uid();
  const g = { key: null, tab: 'fm', db: null, sel: null, form: null, log: [], link: '', online: true, scr: 'map', sk: [], pending: 0, gopen: {}, toast: '' };

  /* ---------- תצורה ---------- */
  function cfg(S) {
    const sim = S.sim || {};
    const main = S.entities.find((e) => e.name === sim.main) || S.entities.find((e) => e.kind !== 'table') || S.entities[0];
    const rel = S.relationships.find((r) => r.origin === main.name && (!sim.child || r.destination === sim.child));
    const kid = rel ? S.entities.find((e) => e.name === rel.destination) : null;
    const F = (ent, n) => ent && ent.fields.find((f) => f.name === n);
    const statusField = sim.statusField || ((main.fields.find((f) => f.domain && /status/i.test(f.name)) || {}).name);
    const idField = sim.idField || ((main.fields.find((f) => ['LONG', 'SHORT'].includes(f.type) && /id$/i.test(f.name)) || {}).name);
    const sd = statusField && C().dom(S, F(main, statusField));
    const palette = ['#ed5151', '#fc921f', '#149ece', '#a7c636', '#9e559c', '#64748B'];
    const colors = Object.assign({}, ...(sd ? sd.values.map((v, i) => ({ [v.label]: palette[i % palette.length] })) : []), sim.colors || {});
    return {
      sim, main, kid, rel, F, statusField, idField, colors,
      newValue: sim.newValue || (sd && sd.values[0] && sd.values[0].label),
      continueValue: sim.continueValue || null,
      auto: sim.auto || {},
      fk: rel ? rel.destKey : 'ParentGlobalID',
      title: sim.titlePrefix || main.alias,
    };
  }
  /* תאריך לתצוגה: DD/MM/YYYY [HH:mm] */
  const show = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(v == null ? '' : v)); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : (v == null ? '' : v); };
  const color = (K, rec) => K.colors[rec[K.statusField]] || '#64748B';
  const kidsOf = (K, rec) => g.db.kids.filter((k) => k[K.fk] === rec.GlobalID);

  /* ---------- גיאומטריה מדומה (מפה 360×648) ---------- */
  const W = 360, H = 648, DUNAM_PER_PX = 0.03;
  function blob(cx, cy, r, seed) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.65 + 0.35 * Math.abs(Math.sin(seed * 7.3 + i * 2.1)); pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.8]); }
    return pts;
  }
  function ringArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); }
  const centroid = (parts) => { const all = parts.flat(); return [all.reduce((a, p) => a + p[0], 0) / all.length, all.reduce((a, p) => a + p[1], 0) / all.length]; };
  const area = (rec) => Math.round((rec.__shape || []).reduce((a, p) => a + ringArea(p), 0) * DUNAM_PER_PX * 10) / 10;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  /* ---------- ערכים אוטומטיים ---------- */
  const now = () => new Date().toISOString().slice(0, 16);
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function nextId(K, rec) {
    if (K.continueValue && rec[K.statusField] === K.continueValue && rec.__shape) {
      const c = centroid(rec.__shape); let best = null, bd = 1e9;
      g.db.main.filter((m) => m !== rec && m[K.statusField] === K.newValue && m.__shape).forEach((m) => { const d = dist(c, centroid(m.__shape)); if (d < bd) { bd = d; best = m; } });
      if (best && bd < 90) return best[K.idField];
      return '';
    }
    if (rec[K.idField]) return rec[K.idField];
    if (!g.online) return '';
    return g.db.main.reduce((a, m) => Math.max(a, Number(m[K.idField]) || 0), 0) + 1;
  }
  function applyAuto(S, K, ent, vals, parent, isNew) {
    Object.entries(K.auto).forEach(([n, rule]) => {
      if (!ent.fields.some((f) => f.name === n)) return;
      if (rule === 'now') { if (isNew || !vals[n]) vals[n] = now(); }
      else if (rule === 'user') { if (isNew || !vals[n]) vals[n] = K.sim.user || 'משתמש מחובר'; }
      else if (rule === 'area') vals[n] = area(vals);
      else if (rule === 'id') vals[n] = nextId(K, vals);
      else if (rule.startsWith('weekday:')) { const d = vals[rule.slice(8)]; vals[n] = d ? 'יום ' + DAYS[new Date(d).getDay()] : ''; }
      else if (rule.startsWith('parent:') && parent) vals[n] = parent[rule.slice(7)] == null ? '' : parent[rule.slice(7)];
    });
  }

  /* ---------- טפסים (בסגנון Field Maps) ---------- */
  const isReq = (f, vals, up) => f.required === true || (f.reqIf ? C().relOk({ rel: f.reqIf }, vals, up) : false);
  const FM = { blue: '#007AC2', text: '#151515', sub: '#6A6A6A', line: '#DFDFDF', bg: '#F3F3F3', red: '#D83020', font: "'Avenir Next', 'Segoe UI', Arial, sans-serif" };
  const ICON = {
    back: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    layers: '<path d="M12 4l9 5-9 5-9-5 9-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 14l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    more: '<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    loc: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    nav: '<path d="M12 3l7 18-7-4-7 4 7-18z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    undo: '<path d="M9 7H15a5 5 0 010 10H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4L9 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    check: '<path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
    chev: '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" fill="currentColor"/>',
    cloud: '<path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8"/>',
    table: '<rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M10 10v9" stroke="currentColor" stroke-width="1.8"/>',
  };
  const ic = (n, s, col) => `<svg width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" style="display:block;color:${col || 'currentColor'}">${ICON[n]}</svg>`;
  const iconBtn = (n, on, title, col) => `<button title="${esc(title || '')}" onclick="${on}" style="background:none;border:0;padding:6px;cursor:pointer;color:${col || FM.text}">${ic(n, 22)}</button>`;

  function control(S, K, ent, f, vals, up) {
    const d = C().dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = C().readonly(f), rule = K.auto[f.name];
    const req = isReq(f, vals, up), err = g.showReq && req && !ro && v === '';
    const box = `width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid ${err ? FM.red : '#CACACA'};border-radius:4px;font:inherit;font-size:15px;background:#fff;color:${FM.text}`;
    const on = (x) => `onchange="SimG.fv('${f.name}',${x})"`;
    const label = `<div style="font-size:13px;color:${FM.sub};margin:14px 0 5px;display:flex;gap:6px;align-items:center">${esc(f.alias || f.name)}${req && !ro ? `<span style="color:${FM.red}">*</span>` : ''}</div>`;
    let inp;
    if (ro) inp = `<div style="${box};background:${FM.bg};color:${FM.sub};display:flex;justify-content:space-between;align-items:center;gap:8px"><span>${v !== '' ? esc(show(v)) : rule === 'script' ? 'ימולא בסקריפט הלילי' : '—'}</span><span title="מחושב" style="color:${FM.blue}">${ic('bolt', 16)}</span></div>`;
    else if (d && d.values.length <= 4) inp = d.values.map((o) => `<label style="display:flex;align-items:center;gap:10px;padding:8px 2px;font-size:15px;cursor:pointer" onclick="SimG.fv('${f.name}','${esc(o.label).replace(/'/g, "\\'")}')"><span style="width:20px;height:20px;border-radius:50%;border:2px solid ${o.label === v ? FM.blue : '#9F9F9F'};display:inline-flex;align-items:center;justify-content:center;flex:none">${o.label === v ? `<span style="width:10px;height:10px;border-radius:50%;background:${FM.blue}"></span>` : ''}</span>${esc(o.label)}</label>`).join('');
    else if (d) inp = `<select style="${box}" ${on('this.value')}><option value="">${d.values.length > 15 ? 'חפש או בחר…' : 'בחר…'}</option>${d.values.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'DATE') inp = `<input type="${/שעה|שעת/.test(f.alias || '') ? 'datetime-local' : 'date'}" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" inputmode="decimal" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="3" style="${box}" ${on('this.value')}>${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    return label + inp + (err ? `<div style="color:${FM.red};font-size:12px;margin-top:4px">נדרש</div>` : '');
  }
  function formGroups(S, K, ent, vals, up) {
    const groups = {};
    ent.fields.forEach((f) => { if (!C().hidden(f) && C().relOk(f, vals, up) !== false) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((gr) => {
      const editable = groups[gr].some((f) => !C().readonly(f)), key = ent.name + '|' + gr, open = g.gopen[key] != null ? g.gopen[key] : editable;
      const missingHere = g.showReq && groups[gr].some((f) => !C().readonly(f) && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === ''));
      return `<div style="background:#fff;margin:0 0 8px;border-top:1px solid ${FM.line};border-bottom:1px solid ${FM.line}"><div onclick="SimG.grp('${esc(key)}',${!open})" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer"><div><div style="font-weight:600;font-size:15px;color:${missingHere ? FM.red : FM.text}">${esc(gr)}</div>${!editable ? `<div style="font-size:12px;color:${FM.sub}">מחושב אוטומטית</div>` : ''}</div><span style="color:${FM.sub};transform:rotate(${open ? 180 : 0}deg)">${ic('down', 20)}</span></div>${open ? `<div style="padding:0 16px 14px">${groups[gr].map((f) => control(S, K, ent, f, vals, up)).join('')}</div>` : ''}</div>`;
    }).join('');
  }
  function missing(K, ent, vals, up) {
    return ent.fields.filter((f) => !C().hidden(f) && !C().readonly(f) && C().relOk(f, vals, up) !== false && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === '')).map((f) => f.alias || f.name);
  }

  /* ---------- נתוני דוגמה ---------- */
  function seed(S, K) {
    g.db = { main: [], kids: [] }; g.sel = null; g.form = null; g.log = []; g.scr = 'map'; g.pending = 0; g.gopen = {};
    const spots = [[110, 190, 48], [250, 400, 58], [175, 165, 26], [255, 170, 32]];
    spots.forEach(([x, y, r], i) => {
      const m = C().sample(S, K.main, i); m.GlobalID = uid(); m.__shape = [blob(x, y, r, i + 1)];
      K.main.fields.filter((f) => C().readonly(f)).forEach((f) => { m[f.name] = ''; });
      if (K.statusField) m[K.statusField] = i === 2 && K.continueValue ? K.continueValue : K.newValue;
      g.db.main.push(m);
    });
    if (K.continueValue) { const c = g.db.main[2]; c.__shape = [blob(150, 222, 26, 3)]; }
    g.db.main.forEach((m) => applyAuto(S, K, K.main, m, null, true));
    g.db.main.forEach((m) => applyAuto(S, K, K.main, m, null, false));
    if (K.kid) g.db.main.forEach((m, i) => { if (i === 0 || i === 1) { const k = C().sample(S, K.kid, i); k.GlobalID = uid(); k[K.fk] = m.GlobalID; applyAuto(S, K, K.kid, k, m, true); g.db.kids.push(k); } });
  }

  /* ---------- סקריפט לילי ---------- */
  function nightly(S, K) {
    const out = []; const sc = K.sim.script || {};
    if (K.continueValue) {
      g.db.main.filter((m) => m[K.statusField] === K.continueValue).slice().forEach((c) => {
        const tgt = g.db.main.find((m) => m !== c && m[K.statusField] === K.newValue && String(m[K.idField]) === String(c[K.idField]) && c[K.idField] !== '');
        if (!tgt) { out.push(`${K.title} ${c[K.idField] || '(ללא מזהה)'}: "${K.continueValue}" ללא שטח "${K.newValue}" באותו מזהה, לרשימת חריגים`); return; }
        tgt.__shape = tgt.__shape.concat(c.__shape);
        kidsOf(K, c).forEach((k) => { k[K.fk] = tgt.GlobalID; });
        g.db.main.splice(g.db.main.indexOf(c), 1);
        out.push(`${K.title} ${tgt[K.idField]}: אוחד חלק נוסף (Multi-Part), ה-GlobalID של השטח הראשי נשמר`);
      });
    }
    g.db.main.forEach((m, i) => {
      Object.entries(K.auto).filter(([, r]) => r === 'script').forEach(([n]) => { const pool = (sc.fill || {})[n]; const f = K.F(K.main, n); if (!f) return; m[n] = pool ? pool[i % pool.length] : ['DOUBLE', 'FLOAT'].includes(f.type) ? Math.round(area(m) * (0.05 + ((i * 7 + n.length) % 10) / 40) * 10) / 10 : ['LONG', 'SHORT'].includes(f.type) ? 1 + ((i + n.length) % 6) : (f.alias || n) + ' ' + (i + 1); });
      applyAuto(S, K, K.main, m, null, false);
      if (K.kid) kidsOf(K, m).forEach((k) => applyAuto(S, K, K.kid, k, m, false));
    });
    out.push(`עודכנו ${g.db.main.length} שטחים`);
    g.log = out.concat(g.log.length ? ['—'] : [], g.log).slice(0, 40);
  }

  /* ---------- קישורי עומק ---------- */
  function link(K, kind, rec) {
    const item = K.sim.mapItemId || '<MAP_ITEM_ID>';
    const base = 'https://fieldmaps.arcgis.app/?referenceContext=' + (kind === 'updateChild' ? 'updateFeature' : kind) + '&itemID=' + item;
    if (kind === 'addRelatedFeature') {
      const pre = {}; Object.entries(K.auto).forEach(([n, r]) => { if (r.startsWith('parent:') && rec[r.slice(7)] !== '' && rec[r.slice(7)] != null) pre[n] = rec[r.slice(7)]; });
      return base + '&featureSourceURL=<' + K.main.name + '_URL>&featureID=' + rec.GlobalID + '&relationshipID=0&featureAttributes=' + encodeURIComponent(JSON.stringify(pre));
    }
    if (kind === 'updateChild') return base + '&featureSourceURL=<' + K.kid.name + '_URL>&featureID=' + rec.GlobalID;
    return base + '&featureSourceURL=<' + K.main.name + '_URL>&featureID=' + rec.GlobalID;
  }

  /* ---------- מפה ---------- */
  function basemap() {
    // תצלום אוויר מדומה: חלקות, כתמי יער, דרכים ונחל. קבוע (לא אקראי) כדי שלא יקפוץ בכל רענון
    const patches = [[0, 0, 140, 120, '#B9C49A'], [140, 0, 220, 90, '#A9B98A'], [0, 120, 90, 200, '#8FA672'], [200, 90, 160, 150, '#C4C7A0'], [90, 260, 170, 120, '#9DB07C'], [0, 330, 110, 170, '#B5BF93'], [260, 240, 100, 140, '#A3B582'], [110, 470, 250, 178, '#BDC59C'], [0, 500, 110, 148, '#91A874']];
    const forest = [[60, 250, 70], [300, 520, 80], [200, 280, 50], [40, 560, 45], [320, 60, 40]];
    let s = `<rect width="${W}" height="${H}" fill="#AEBB8F"/>`;
    patches.forEach(([x, y, w, h, c]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; });
    forest.forEach(([x, y, r], i) => { for (let k = 0; k < 14; k++) { const a = k * 2.4 + i, rr = r * (0.25 + (k % 5) / 7); s += `<circle cx="${(x + Math.cos(a) * rr).toFixed(1)}" cy="${(y + Math.sin(a) * rr).toFixed(1)}" r="${(r / 3.2).toFixed(1)}" fill="#5E7A45" opacity=".55"/>`; } });
    s += `<path d="M-10 300 C 80 280, 150 330, 230 300 S 330 250, 380 270" stroke="#EDE6D3" stroke-width="5" fill="none"/><path d="M190 -10 C 180 120, 220 240, 200 360 S 170 560, 210 660" stroke="#EDE6D3" stroke-width="4" fill="none"/><path d="M-10 470 C 90 450, 160 500, 380 440" stroke="#7FA7C9" stroke-width="3" fill="none" opacity=".8"/>`;
    return s;
  }
  function mapSvg(K) {
    const sel = g.sel;
    const shapes = g.db.main.map((m, i) => (m.__shape || []).map((p) => `<polygon points="${p.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${color(K, m)}" fill-opacity="${sel === i ? 0.55 : 0.4}" stroke="${color(K, m)}" stroke-width="2" ${g.scr === 'sketch' ? '' : `onclick="event.stopPropagation();SimG.sel(${i})"`} style="cursor:pointer"/>${sel === i ? `<polygon points="${p.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#00FFFF" stroke-width="3" pointer-events="none"/>` : ''}`).join('')).join('');
    const labels = g.db.main.map((m) => { if (!m.__shape) return ''; const c = centroid(m.__shape); return `<text x="${c[0]}" y="${c[1] + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#00000088" stroke-width="3" paint-order="stroke" pointer-events="none">${esc(m[K.idField] || '')}</text>`; }).join('');
    let sk = '';
    if (g.scr === 'sketch' && g.sk.length) {
      const pts = g.sk.map((q) => q.join(',')).join(' ');
      sk = (g.sk.length > 2 ? `<polygon points="${pts}" fill="${K.colors[g.drawStatus] || FM.blue}" fill-opacity=".35" stroke="${FM.blue}" stroke-width="2" stroke-dasharray="6 4"/>` : `<polyline points="${pts}" fill="none" stroke="${FM.blue}" stroke-width="2" stroke-dasharray="6 4"/>`) + g.sk.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${i === g.sk.length - 1 ? 7 : 5}" fill="#fff" stroke="${FM.blue}" stroke-width="2.5"/>`).join('');
    }
    const me = `<circle cx="196" cy="330" r="16" fill="#007AC2" opacity=".18"/><circle cx="196" cy="330" r="7" fill="#007AC2" stroke="#fff" stroke-width="2.5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block;cursor:${g.scr === 'sketch' ? 'crosshair' : 'default'}" onclick="SimG.mapClick(event,this)">${basemap()}${shapes}${labels}${me}${sk}</svg>`;
  }
  const fab = (n, on, bg, fg, size, extra) => `<button onclick="${on}" style="width:${size}px;height:${size}px;border-radius:50%;border:0;background:${bg};color:${fg};box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;${extra || ''}">${ic(n, size > 50 ? 28 : 22)}</button>`;

  /* ---------- מסכי האפליקציה ---------- */
  const bar = (right, title, left, sub) => `<div style="height:52px;display:flex;align-items:center;gap:4px;padding:0 6px;background:#fff;border-bottom:1px solid ${FM.line};position:relative;z-index:3"><div style="display:flex;align-items:center;min-width:72px">${right}</div><div style="flex:1;text-align:center;min-width:0"><div style="font-weight:600;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>${sub ? `<div style="font-size:11px;color:${FM.sub}">${sub}</div>` : ''}</div><div style="display:flex;align-items:center;justify-content:flex-end;min-width:72px">${left}</div></div>`;
  const textBtn = (t, on, col, bold) => `<button onclick="${on}" style="background:none;border:0;color:${col || FM.blue};font:inherit;font-size:16px;font-weight:${bold ? 700 : 400};padding:8px 10px;cursor:pointer">${t}</button>`;

  function popupContent(S, K, rec) {
    const sim = K.sim, kids = kidsOf(K, rec);
    const chip = (t, bg, fg) => `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600">${esc(t)}</span>`;
    const chips = [rec[K.statusField] ? chip(rec[K.statusField], color(K, rec), '#fff') : ''].concat((sim.chips || []).map((n) => rec[n] ? chip(rec[n], '#F1F5F9', '#0F172A') : '')).join(' ');
    const kpis = (sim.kpis || []).map((k) => `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:#FFF7ED;border:1px solid #FED7AA"><div style="font-size:11px;color:#64748B">${esc(k.label)}</div><div style="font-size:17px;font-weight:700;color:#C2410C"><span dir="ltr">${esc(rec[k.f] === '' || rec[k.f] == null ? '-' : show(rec[k.f]))}</span> <small style="font-weight:400">${esc(k.unit || '')}</small></div></div>`).join('')
      + (K.kid ? `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:${kids.length ? '#EFF6FF' : '#FEF3C7'};border:1px solid ${kids.length ? '#BFDBFE' : '#FDE68A'}"><div style="font-size:11px;color:#64748B">${esc(K.kid.alias)}</div><div style="font-size:17px;font-weight:700">${kids.length}</div></div>` : '');
    const warn = K.kid && !kids.length && rec[K.statusField] !== K.continueValue ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#FEF3C7;color:#92400E;font-size:12px">עדיין אין ${esc(K.kid.alias)}</div>` : '';
    const lbtn = (l, on, fill) => `<a href="javascript:void(0)" onclick="${on}" style="flex:1;text-decoration:none;text-align:center;padding:10px;border-radius:10px;font-weight:700;border:1px solid ${fill ? '#C2410C' : '#1E3A8A'};background:${fill ? '#C2410C' : '#fff'};color:${fill ? '#fff' : '#1E3A8A'}">${l}</a>`;
    const acts = `<div style="display:flex;gap:6px;margin-top:8px">${K.kid ? lbtn('+ ' + esc(K.kid.alias), 'SimG.addKid(true)', true) : ''}${lbtn('עריכת ' + esc(K.main.alias), 'SimG.editMain(true)', false)}</div>`;
    const cards = kids.slice().reverse().map((k) => `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:6px 10px;margin-top:6px"><div style="display:flex;justify-content:space-between;gap:6px"><b style="font-size:13px">${esc(sim.childTitle && k[sim.childTitle] ? ((K.F(K.kid, sim.childTitle) || {}).alias || '') + ' ' + show(k[sim.childTitle]) : K.kid.alias)}</b><a href="javascript:void(0)" onclick="SimG.editKid('${k.GlobalID}',true)" style="font-size:12px;color:#1E3A8A">עריכת דוח</a></div><div style="font-size:12px;color:#475569;margin-top:2px">${(sim.childCard || []).map((n) => k[n] ? esc((K.F(K.kid, n) || {}).alias || n) + ': ' + esc(show(k[n])) : '').filter(Boolean).join(' · ')}</div></div>`).join('');
    return `<div style="font-family:Tahoma,sans-serif"><div style="display:flex;gap:4px;flex-wrap:wrap">${chips}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${kpis}</div>${warn}${acts}${cards}</div>`;
  }
  const toolbar = (items) => `<div style="display:flex;justify-content:space-around;padding:6px 8px 10px;border-bottom:1px solid ${FM.line}">${items.map(([n, l, on]) => `<button onclick="${on}" style="background:none;border:0;cursor:pointer;color:${FM.blue};display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit;font-size:12px"><span style="width:40px;height:40px;border-radius:50%;background:#E8F3FA;display:flex;align-items:center;justify-content:center">${ic(n, 20)}</span>${l}</button>`).join('')}</div>`;
  function relRow(K, rec) { const n = kidsOf(K, rec).length; return `<div onclick="SimG.go('rel')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid ${FM.line};cursor:pointer;background:#fff"><span style="color:${FM.sub}">${ic('table', 22)}</span><div style="flex:1"><div style="font-size:15px">${esc(K.kid.alias)}</div><div style="font-size:12px;color:${FM.sub}">${n} רשומות</div></div><span style="color:${FM.sub}">${ic('chev', 20)}</span></div>`; }

  function screen(S, K) {
    const rec = g.sel != null ? g.db.main[g.sel] : null;
    const statusBar = `<div dir="ltr" style="height:26px;display:flex;justify-content:space-between;align-items:center;padding:0 18px;font-size:12px;font-weight:600;background:#fff">${new Date().toTimeString().slice(0, 5)}<span style="display:flex;gap:5px;align-items:center">${g.online ? '▂▄▆█' : '✈'} <span style="display:inline-block;width:22px;height:10px;border:1.5px solid #151515;border-radius:3px;position:relative"><span style="position:absolute;inset:1px;right:6px;background:#151515;border-radius:1px"></span></span></span></div>`;
    const offline = !g.online || g.pending ? `<div style="position:absolute;top:8px;right:8px;left:8px;z-index:2;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3);padding:6px 10px;font-size:12px;display:flex;align-items:center;gap:8px">${ic('cloud', 18, g.online ? FM.blue : '#8F8F8F')}${g.online ? `${g.pending} עריכות ממתינות` : 'לא מקוון'}${g.online && g.pending ? `<button onclick="SimG.sync()" style="margin-inline-start:auto;border:0;background:${FM.blue};color:#fff;border-radius:4px;padding:3px 10px;cursor:pointer">סנכרן</button>` : g.pending ? ` · ${g.pending} עריכות ממתינות לסנכרון` : ''}</div>` : '';
    const toast = g.toast ? `<div style="position:absolute;bottom:22px;left:50%;transform:translateX(-50%);background:#323232;color:#fff;border-radius:6px;padding:9px 14px;font-size:13px;white-space:nowrap;z-index:9">${esc(g.toast)}</div>` : '';
    let top, body;
    const mapTitle = esc(S.meta.title || 'מפה');
    if (g.scr === 'tpl') {
      const sd = K.statusField && C().dom(S, K.F(K.main, K.statusField));
      const items = sd ? sd.values.map((v) => v.label) : [''];
      top = bar(textBtn('ביטול', "SimG.go('map')"), 'בחר סוג', '');
      body = `<div style="position:absolute;inset:0;overflow:auto;background:${FM.bg}"><div style="padding:10px 14px"><div style="background:#fff;border:1px solid ${FM.line};border-radius:4px;padding:8px 10px;color:${FM.sub};display:flex;gap:8px;align-items:center">${ic('search', 18)} חיפוש סוגים</div></div><div style="padding:6px 16px;font-size:13px;color:${FM.sub};font-weight:600">${esc(K.main.alias)}</div><div style="background:#fff;border-top:1px solid ${FM.line};border-bottom:1px solid ${FM.line}">${items.map((l) => `<div onclick="SimG.tpl('${esc(l)}')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid ${FM.line};cursor:pointer"><svg width="28" height="22" viewBox="0 0 28 22"><path d="M3 15 L8 3 L22 5 L25 16 L12 20 Z" fill="${K.colors[l] || FM.blue}" fill-opacity=".45" stroke="${K.colors[l] || FM.blue}" stroke-width="2"/></svg><span style="font-size:16px">${esc(l || K.main.alias)}</span></div>`).join('')}</div><div style="padding:12px 16px;font-size:12px;color:${FM.sub}">טבלאות קשורות לא מופיעות כאן. רשומה קשורה נוספת מתוך הפופאפ של השטח.</div></div>`;
    } else if (g.scr === 'sketch') {
      top = bar(textBtn('ביטול', "SimG.go('map')"), 'הוספת ' + esc(K.main.alias), textBtn('הבא', 'SimG.sketchDone()', g.sk.length > 2 ? FM.blue : '#B0B0B0', true), esc(g.drawStatus || ''));
      body = `${mapSvg(K)}<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);padding:6px 12px;font-size:13px;white-space:nowrap">${g.sk.length < 3 ? `הקש במפה כדי להוסיף נקודות (${g.sk.length}/3 לפחות)` : `${g.sk.length} נקודות · ${area({ __shape: [g.sk] })} דונם`}</div><div style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-top:1px solid ${FM.line};display:flex;justify-content:space-around;padding:6px 0 10px">${[['undo', 'בטל', 'SimG.skUndo()'], ['trash', 'נקה', 'SimG.skClear()'], ['loc', 'מיקומי', 'SimG.skGps()']].map(([n, l, on]) => `<button onclick="${on}" style="background:none;border:0;color:${FM.text};display:flex;flex-direction:column;align-items:center;font:inherit;font-size:11px;cursor:pointer">${ic(n, 22)}${l}</button>`).join('')}</div>`;
    } else if (g.scr === 'form') {
      const f = g.form, ent = f.kind === 'kid' ? K.kid : K.main, up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : {};
      const miss = g.showReq ? missing(K, ent, f.vals, up) : [];
      top = bar(textBtn('ביטול', 'SimG.cancel()'), (f.isNew ? esc(ent.alias) + ' חדש' : 'עריכת ' + esc(ent.alias)), textBtn(f.isNew ? 'שלח' : 'עדכן', 'SimG.save()', FM.blue, true), f.kind === 'kid' && up ? 'קשור ל' + esc(K.title) + ' ' + esc(up[K.idField] || '') : '');
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:${FM.bg};padding-top:8px">${miss.length ? `<div style="margin:0 12px 8px;padding:10px 12px;border-radius:4px;background:#FCE9E7;color:${FM.red};font-size:13px">יש ${miss.length} שדות חובה ריקים: ${esc(miss.join(', '))}</div>` : ''}${formGroups(S, K, ent, f.vals, up)}${!f.isNew ? `<div style="background:#fff;border-top:1px solid ${FM.line};border-bottom:1px solid ${FM.line};margin-top:8px"><button onclick="SimG.del()" style="width:100%;background:none;border:0;color:${FM.red};font:inherit;font-size:15px;padding:14px;cursor:pointer">מחק</button></div>` : ''}<div style="height:30px"></div></div>`;
    } else if (g.scr === 'popup' && rec) {
      top = bar(iconBtn('close', 'SimG.closePopup()', 'סגור'), esc(K.title) + ' ' + esc(rec[K.idField] || ''), iconBtn('more', '', 'עוד'), esc(K.main.alias));
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:#fff">${toolbar([['edit', 'עריכה', 'SimG.editMain()'], ['nav', 'ניווט', "SimG.note('ניווט: פותח ניווט לשטח באפליקציית הניווט')"], ['loc', 'התמקד', "SimG.note('ממרכז את המפה על השטח')"]])}<div style="padding:12px 14px">${popupContent(S, K, rec)}</div>${K.kid ? relRow(K, rec) : ''}<div style="height:24px"></div></div>`;
    } else if (g.scr === 'rel' && rec) {
      const kids = kidsOf(K, rec).slice().reverse();
      top = bar(iconBtn('back', "SimG.go('popup')", 'חזרה'), esc(K.kid.alias), '', esc(K.title) + ' ' + esc(rec[K.idField] || ''));
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:${FM.bg}">${kids.length ? `<div style="background:#fff;border-top:1px solid ${FM.line}">${kids.map((k) => `<div onclick="SimG.kidPopup('${k.GlobalID}')" style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid ${FM.line};cursor:pointer"><div style="flex:1"><div style="font-size:15px">${esc(K.sim.childTitle ? show(k[K.sim.childTitle]) || K.kid.alias : K.kid.alias)}</div><div style="font-size:12px;color:${FM.sub}">${(K.sim.childCard || []).slice(1, 3).map((n) => esc(show(k[n] || ''))).filter(Boolean).join(' · ')}</div></div><span style="color:${FM.sub}">${ic('chev', 20)}</span></div>`).join('')}</div>` : `<div style="padding:40px 20px;text-align:center;color:${FM.sub}">אין רשומות קשורות</div>`}<div style="position:absolute;bottom:18px;left:18px">${fab('plus', 'SimG.addKid()', FM.blue, '#fff', 56)}</div></div>`;
    } else if (g.scr === 'kid' && g.kidSel) {
      const k = g.db.kids.find((x) => x.GlobalID === g.kidSel);
      const fields = K.kid.fields.filter((f) => !C().hidden(f) && k[f.name] !== '' && k[f.name] != null);
      top = bar(iconBtn('back', "SimG.go('rel')", 'חזרה'), esc(K.kid.alias), '', '');
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:#fff">${toolbar([['edit', 'עריכה', `SimG.editKid('${k.GlobalID}')`]])}${fields.map((f) => `<div style="padding:10px 16px;border-bottom:1px solid ${FM.line}"><div style="font-size:12px;color:${FM.sub}">${esc(f.alias)}</div><div style="font-size:15px;margin-top:2px">${esc(show(k[f.name]))}</div></div>`).join('')}</div>`;
    } else {
      top = bar(`${iconBtn('back', "SimG.note('חזרה לרשימת המפות')", 'מפות', FM.blue)}`, mapTitle, iconBtn('search', "SimG.note('חיפוש לפי מזהה שריפה')", 'חיפוש') + iconBtn('layers', "SimG.note('רשימת שכבות')", 'שכבות') + iconBtn('more', "SimG.note('תפריט: מפות לא מקוונות, סנכרון, מדידה')", 'עוד'));
      const peek = rec ? `<div style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:14px 14px 0 0;box-shadow:0 -2px 10px rgba(0,0,0,.25);z-index:4"><div onclick="SimG.go('popup')" style="cursor:pointer;padding:6px 16px 4px"><div style="width:36px;height:4px;border-radius:2px;background:#C8C8C8;margin:0 auto 8px"></div><div style="display:flex;align-items:center;gap:10px"><svg width="26" height="20" viewBox="0 0 28 22"><path d="M3 15 L8 3 L22 5 L25 16 L12 20 Z" fill="${color(K, rec)}" fill-opacity=".5" stroke="${color(K, rec)}" stroke-width="2"/></svg><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:16px">${esc(K.title)} ${esc(rec[K.idField] || '')}</div><div style="font-size:12px;color:${FM.sub}">${esc(K.main.alias)} · ${esc(rec[K.statusField] || '')}</div></div>${iconBtn('close', 'event.stopPropagation();SimG.closePopup()', 'סגור', FM.sub)}</div></div>${toolbar([['edit', 'עריכה', 'SimG.editMain()'], ['nav', 'ניווט', "SimG.note('ניווט לשטח')"], ['table', esc(K.kid ? K.kid.alias : 'פרטים'), K.kid ? "SimG.go('rel')" : "SimG.go('popup')"]])}<div onclick="SimG.go('popup')" style="text-align:center;font-size:12px;color:${FM.blue};padding:6px 0 10px;cursor:pointer">הצג פרטים מלאים ▴</div></div>` : '';
      body = `${mapSvg(K)}${offline}<div style="position:absolute;left:14px;bottom:${rec ? 190 : 24}px;display:flex;flex-direction:column;gap:12px;z-index:3">${fab('loc', "SimG.note('מתמקד במיקום הנוכחי')", '#fff', FM.text, 42)}${fab('plus', "SimG.go('tpl')", FM.blue, '#fff', 56)}</div><div dir="ltr" style="position:absolute;right:10px;bottom:${rec ? 178 : 10}px;font-size:10px;color:#fff;text-shadow:0 0 2px #000;z-index:1">0 ── 200 m · Esri, Maxar</div>${peek}`;
    }
    return `<div style="width:380px;max-width:100%;height:780px;border:10px solid #111;border-radius:44px;background:#111;box-shadow:0 8px 28px rgba(0,0,0,.25);overflow:hidden;flex:none"><div dir="rtl" style="height:100%;background:#fff;border-radius:34px;overflow:hidden;display:flex;flex-direction:column;font-family:${FM.font};color:${FM.text};text-align:right">${statusBar}${top}<div style="position:relative;flex:1;overflow:hidden">${body}${toast}</div><div style="height:18px;display:flex;justify-content:center;align-items:center;background:${g.scr === 'map' ? '#fff' : FM.bg}"><span style="width:120px;height:4px;border-radius:2px;background:#151515"></span></div></div></div>`;
  }

  const STEPS = {
    map: 'מסך המפה. הקש על שטח כדי לפתוח את הכרטיס שלו, או על + כדי להוסיף שטח חדש.',
    tpl: 'בחירת סוג (תבנית). כל סוג קובע ערך ברירת מחדל לסטטוס, וכך גם הצבע במפה.',
    sketch: 'שרטוט: כל הקשה במפה מוסיפה קודקוד. כמו באפליקציה, אפשר גם "מיקומי" כדי להוסיף נקודה במיקום ה-GPS. "הבא" פותח את הטופס.',
    form: 'טופס Field Maps: קבוצות שנפתחות ונסגרות, ⚡ לשדה מחושב (Arcade), כוכבית לשדה חובה. "שלח" לא מאפשר שמירה כשחסר שדה חובה.',
    popup: 'הפופאפ המלא: סרגל פעולות של האפליקציה, תוכן ה-Arcade (כולל כפתורי קישור העומק) ורשומות קשורות בתחתית.',
    rel: 'רשימת הרשומות הקשורות. ה-+ מוסיף רשומה שכבר מקושרת לשטח.',
    kid: 'רשומה קשורה: רשימת שדות, ועריכה מהסרגל.',
  };
  function fmTab(S, K) {
    const sc = (K.sim.scenarios || []).map((x, i) => `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:8px 10px;margin-bottom:6px;background:#fff"><b>${esc(x.title)}</b><div style="font-size:13px;color:#475569;margin:2px 0 6px">${esc(x.desc || '')}</div><button class="mini" onclick="SimG.sc(${i})">הרץ</button></div>`).join('');
    const lbl = { now: 'תאריך ושעה ביצירה', user: 'המשתמש המחובר', area: 'שטח גאודטי', id: 'מזהה (חדש: הגבוה + 1, המשך: של השטח הסמוך)' };
    const scr = Object.keys(K.auto).filter((n) => K.auto[n] === 'script');
    const autoList = Object.entries(K.auto).filter(([, r]) => r !== 'script').map(([n, r]) => [n, lbl[r] || r.replace('parent:', 'מהאב: ').replace('weekday:', 'יום בשבוע לפי ')]).concat(scr.length ? [[scr.length + ' שדות', 'סקריפט לילי: ' + scr.join(', ')]] : []);
    const tbl = (o) => `<tr><td style="padding:3px 6px;border:1px solid #E2E8F0" dir="ltr">${esc(o[0])}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(o[1])}</td></tr>`;
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${screen(S, K)}
      <div style="flex:1;min-width:260px">
        <div class="simnote"><b>${esc(STEPS[g.scr] || STEPS.map)}</b></div>
        <label class="inl"><input type="checkbox" ${g.online ? 'checked' : ''} onchange="SimG.online(this.checked)"> מחובר לרשת (בלי רשת: עריכות ממתינות לסנכרון, ומזהה לשריפה חדשה לא מחושב)</label>
        <div style="margin:10px 0"><button class="primary" onclick="SimG.nightly()">▶ הרץ ${esc((K.sim.script || {}).title || 'סקריפט לילי')}</button> <button class="mini" onclick="SimG.seed()">אפס נתוני דוגמה</button></div>
        ${(K.sim.script || {}).desc ? `<p style="font-size:13px;color:#475569">${esc(K.sim.script.desc)}</p>` : ''}
        ${g.log.length ? `<h4>יומן הסקריפט</h4><ul style="font-size:13px;line-height:1.7">${g.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
        ${g.link ? `<h4>קישור העומק שהופעל</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(g.link)}</pre><p style="font-size:12px;color:#64748B">באפליקציה הקישור נפתח מתוך הפופאפ, Field Maps פותחת את הטופס ישירות, ובסיום חוזרת לשטח (callback).</p>` : ''}
        ${sc ? `<h4>תרחישים</h4>${sc}` : ''}
        ${autoList.length ? `<details><summary style="cursor:pointer;font-weight:700;margin-top:12px">שדות מחושבים (${Object.keys(K.auto).length})</summary><table style="border-collapse:collapse;font-size:12px">${autoList.map(tbl).join('')}</table></details>` : ''}
      </div></div>`;
  }
  function dataTab(S, K) {
    const cols = (ent, extra) => [...extra, ...ent.fields.filter((f) => !C().hidden(f)).slice(0, 9).map((f) => f.name)];
    const t = (rows, cs, map) => rows.length ? `<div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px"><tr>${cs.map((c) => `<th style="border:1px solid #CBD5E1;padding:3px 6px;background:#F1F5F9">${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cs.map((c) => `<td style="border:1px solid #E2E8F0;padding:3px 6px">${esc(map(r, c))}</td>`).join('')}</tr>`).join('')}</table></div>` : '<small style="color:#64748B">אין רשומות</small>';
    const m = (r, c) => c === 'GlobalID' || c === K.fk ? String(r[c] || '').slice(0, 8) : c === 'חלקים' ? (r.__shape || []).length : show(r[c]);
    return `<h3>${esc(K.main.alias)} (${g.db.main.length})</h3>${t(g.db.main, cols(K.main, ['GlobalID', 'חלקים']), m)}${K.kid ? `<h3>${esc(K.kid.alias)} (${g.db.kids.length})</h3>${t(g.db.kids, cols(K.kid, ['GlobalID', K.fk]), m)}` : ''}`;
  }
  function formsTab(S, K) {
    const row = (ent, f) => { const r = K.auto[f.name]; const beh = C().hidden(f) ? 'מוסתר' : C().readonly(f) ? 'לקריאה בלבד' + (r ? ` · ${r === 'script' ? 'סקריפט לילי' : 'חישוב: ' + r}` : '') : f.rel ? 'מוצג כש-' + (f.visible || JSON.stringify(f.rel)) : f.domain ? 'רשימה (' + f.domain + ')' : 'עריכה'; return `<tr><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(f.category || '')}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(f.alias)}</td><td style="padding:3px 6px;border:1px solid #E2E8F0" dir="ltr">${esc(f.name)}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(beh)}${isReq(f, {}, {}) ? ' · חובה' : ''}</td></tr>`; };
    const one = (ent) => `<h3>טופס: ${esc(ent.alias)}</h3><table style="border-collapse:collapse;font-size:12px"><tr><th>קבוצה</th><th>שדה</th><th>שם</th><th>התנהגות בטופס</th></tr>${ent.fields.map((f) => row(ent, f)).join('')}</table>`;
    return one(K.main) + (K.kid ? one(K.kid) : '');
  }
  function render(S) {
    const K = cfg(S);
    if (g.key !== S.meta.key + '|' + (S.meta.version || '') || !g.db) { g.key = S.meta.key + '|' + (S.meta.version || ''); seed(S, K); }
    const tabs = [['fm', 'Field Maps'], ['forms', 'טפסים'], ['data', 'נתונים']];
    const body = g.tab === 'forms' ? formsTab(S, K) : g.tab === 'data' ? dataTab(S, K) : fmTab(S, K);
    return `<div class="simroot"><div class="simtop"><div class="seg lg">${tabs.map(([k, l]) => `<button class="${g.tab === k ? 'on' : ''}" onclick="SimG.tab('${k}')">${l}</button>`).join('')}</div><span class="simver">סכמה v${esc(S.meta.version || '?')}</span></div>${body}</div>`;
  }
  const applies = (S) => !!(S.sim && S.sim.engine === 'generic');

  /* ---------- פעולות ---------- */
  const rr = () => {
    if (!(window.A && A.refresh)) return;
    const sb = typeof document !== 'undefined' ? [...document.querySelectorAll('[data-sb]')].map((e) => e.scrollTop) : [], wy = typeof window !== 'undefined' ? window.scrollY : 0, same = g.lastScr === g.scr;
    A.refresh(); g.lastScr = g.scr;
    if (same && typeof document !== 'undefined') { document.querySelectorAll('[data-sb]').forEach((e, i) => { e.scrollTop = sb[i] || 0; }); window.scrollTo(0, wy); }
  };
  let toastT = null;
  const toast = (t) => { g.toast = t; clearTimeout(toastT); toastT = setTimeout(() => { g.toast = ''; rr(); }, 2200); };
  const S0 = () => window.__simS;
  const K0 = () => cfg(S0());
  const commit = () => { if (!g.online) g.pending += 1; };
  window.SimG = {
    tab(k) { g.tab = k; rr(); },
    seed() { seed(S0(), K0()); rr(); },
    online(v) { g.online = v; rr(); },
    sync() { const n = g.pending; g.pending = 0; const S = S0(), K = K0(); g.db.main.forEach((m) => applyAuto(S, K, K.main, m, null, false)); toast(`סונכרנו ${n} עריכות`); rr(); },
    note(t) { toast(t); rr(); },
    go(s) { g.scr = s; if (s === 'map' || s === 'tpl') g.sk = []; rr(); },
    grp(k, v) { g.gopen[k] = v; rr(); },
    sel(i) { g.sel = i; g.scr = 'map'; rr(); },
    closePopup() { g.sel = null; g.scr = 'map'; rr(); },
    tpl(status) { g.drawStatus = status; g.sk = []; g.sel = null; g.scr = 'sketch'; rr(); },
    mapClick(ev, svg) {
      if (g.scr !== 'sketch') { if (g.sel != null) { g.sel = null; rr(); } return; }
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      g.sk.push([Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]); rr();
    },
    skUndo() { g.sk.pop(); rr(); }, skClear() { g.sk = []; rr(); },
    skGps() { g.sk.push([196 + (g.sk.length % 3) * 14 - 14, 330 + (g.sk.length % 2) * 16 - 8]); toast('נוספה נקודה במיקום ה-GPS'); rr(); },
    sketchDone() {
      if (g.sk.length < 3) { toast('פוליגון צריך לפחות 3 נקודות'); rr(); return; }
      const S = S0(), K = K0(), v = { GlobalID: uid(), __shape: [g.sk.slice()] };
      if (K.statusField && g.drawStatus) v[K.statusField] = g.drawStatus;
      applyAuto(S, K, K.main, v, null, true);
      g.form = { kind: 'main', isNew: true, vals: v, back: 'map' }; g.showReq = false; g.scr = 'form'; rr();
    },
    fv(n, val) { const S = S0(), K = K0(), f = g.form; f.vals[n] = val; const up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : null; applyAuto(S, K, f.kind === 'kid' ? K.kid : K.main, f.vals, up, false); rr(); },
    editMain(viaLink) { const K = K0(), rec = g.db.main[g.sel]; g.link = viaLink ? link(K, 'updateFeature', rec) : g.link; if (viaLink) toast('קישור עומק: פותח את טופס העריכה'); g.form = { kind: 'main', isNew: false, vals: Object.assign({}, rec), ref: rec, back: g.scr }; g.showReq = false; g.scr = 'form'; rr(); },
    addKid(viaLink) { const S = S0(), K = K0(), rec = g.db.main[g.sel], v = { GlobalID: uid(), [K.fk]: rec.GlobalID }; applyAuto(S, K, K.kid, v, rec, true); if (viaLink) { g.link = link(K, 'addRelatedFeature', rec); toast('קישור עומק: טופס חדש, מקושר וממולא מראש'); } g.form = { kind: 'kid', isNew: true, vals: v, back: viaLink ? 'popup' : 'rel' }; g.showReq = false; g.scr = 'form'; rr(); },
    editKid(gid, viaLink) { const K = K0(), k = g.db.kids.find((x) => x.GlobalID === gid); if (viaLink) { g.link = link(K, 'updateChild', k); toast('קישור עומק: עריכת הדוח'); } g.form = { kind: 'kid', isNew: false, vals: Object.assign({}, k), ref: k, back: viaLink ? 'popup' : 'kid' }; g.kidSel = gid; g.showReq = false; g.scr = 'form'; rr(); },
    kidPopup(gid) { g.kidSel = gid; g.scr = 'kid'; rr(); },
    save() {
      const S = S0(), K = K0(), f = g.form, ent = f.kind === 'kid' ? K.kid : K.main, up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : null;
      if (missing(K, ent, f.vals, up).length) { g.showReq = true; rr(); return; }
      applyAuto(S, K, ent, f.vals, up, false);
      if (f.isNew) { if (f.kind === 'kid') g.db.kids.push(f.vals); else { g.db.main.push(f.vals); g.sel = g.db.main.length - 1; } }
      else Object.assign(f.ref, f.vals);
      if (f.kind === 'main' && !f.isNew) g.db.kids.filter((k) => k[K.fk] === f.vals.GlobalID).forEach((k) => applyAuto(S, K, K.kid, k, f.ref, false));
      commit(); toast(g.online ? (f.isNew ? 'נשלח' : 'עודכן') : 'נשמר במכשיר, ממתין לסנכרון');
      g.scr = f.isNew && f.kind === 'main' ? 'map' : f.back === 'kid' ? 'kid' : f.kind === 'kid' ? (f.back === 'popup' ? 'popup' : 'rel') : (f.back === 'popup' ? 'popup' : 'map');
      g.form = null; g.sk = []; rr();
    },
    cancel() { const b = g.form && g.form.back; g.form = null; g.scr = b && b !== 'form' ? b : 'map'; g.sk = []; rr(); },
    del() { const K = K0(), f = g.form; if (f.kind === 'kid') { g.db.kids.splice(g.db.kids.indexOf(f.ref), 1); g.scr = 'rel'; } else { g.db.kids = g.db.kids.filter((k) => k[K.fk] !== f.ref.GlobalID); g.db.main.splice(g.db.main.indexOf(f.ref), 1); g.sel = null; g.scr = 'map'; } commit(); g.form = null; toast('נמחק'); rr(); },
    nightly() { nightly(S0(), K0()); g.sel = null; g.form = null; g.scr = 'map'; rr(); },
    sc(i) {
      const S = S0(), K = K0(), x = K.sim.scenarios[i];
      const anchor = x.near ? g.db.main.find((m) => m[K.statusField] === K.newValue) : null;
      let c = anchor ? centroid(anchor.__shape) : [80 + Math.random() * 200, 120 + Math.random() * 400];
      if (anchor) c = [c[0] + 44, c[1] + 40];
      const v = Object.assign({ GlobalID: uid(), __shape: [blob(c[0], c[1], 28, i + 5)] }, x.main || {});
      applyAuto(S, K, K.main, v, null, true); g.db.main.push(v); g.sel = g.db.main.length - 1;
      if (x.child && K.kid) { const k = Object.assign({ GlobalID: uid(), [K.fk]: v.GlobalID }, x.child); applyAuto(S, K, K.kid, k, v, true); g.db.kids.push(k); }
      commit(); g.form = null; g.scr = 'map'; toast('תרחיש: ' + x.title); rr();
    },
  };
  window.SimGen = { render(S) { window.__simS = S; return render(S); }, applies };
})();
