/* סימולטור Field Maps מונחה סכמה: שכבה ראשית (נקודה / קו / פוליגון) וכל הטבלאות הקשורות אליה, בכל עומק.
   משמש בשני מקומות:
   - סכמה עם sim.engine = 'generic' מקבלת את הסימולטור הזה כולו (Field Maps, טפסים, נתונים).
   - בכל סכמה אחרת (למשל השילוט), לשונית Field Maps שב-sim.js מציגה את המסכים מכאן (SimGen.fmView).
   הגדרות אופציונליות ב-S.sim:
     main, child                          ישות ראשית, ובן "ראשי" לכפתורי הפופאפ ולכרטיסים (ברירת מחדל: הבן הראשון)
     idField, statusField, titlePrefix    מזהה, שדה צבע/סטטוס, קידומת לכותרת
     templateField                        שדה שערכיו הם התבניות ב"בחר סוג" (ברירת מחדל: statusField כשהוגדר)
     colors: { ערך: צבע }
     newValue, continueValue              "חדש" ו"המשך": המשך מקבל את המזהה של "חדש" הסמוך ומאוחד בסקריפט הלילי
     editing (ברירת מחדל true: false = העריכה במפה כבויה, ללא כפתורי עריכה והעתקה), relatedList (ברירת מחדל true: false = ללא הרשומות הקשורות המובנות בפופאפ),
     chips, kpis: [{f, label, unit}], childTitle, childCard   תוכן פופאפ מעוצב (כמו פופאפ Arcade). בלעדיהם: רשימת שדות כמו בפופאפ ברירת המחדל
     auto: { שדה: 'now' | 'user' | 'area' | 'id' | 'weekday:<שדה>' | 'parent:<שדה באב>' | 'script' }
     survey123: { itemId }                הוספה ועריכה של ישות ראשית רק דרך Survey123 (למשל שילוט): ה-+ במפה לא פותח טופס Field Maps אלא מציג את קישור האיסוף, וכפתור העריכה בפופאפ הוא קישור Inbox. ביקורים (בן) ממשיכים להיפתח ב-Field Maps
     script: { title, desc, fill }, scenarios: [{ title, desc, near, main, child }], user, mapItemId
   בנוסף נקראים מהשדות עצמם: required / reqIf, rel, autoValue, readonlyOnEdit, pickFrom, fromVisit, derive, דומיינים מדורגים.
   נתוני דוגמה: S.demo (s = אינדקס השלט, v = אינדקס הביקור, p = אינדקס הרכיב, loc = {x,y} 0..1) או נתוני דמה מהשדות. */
(function () {
  'use strict';
  const C = () => window.SimCore;
  const esc = (s) => C().esc(s);
  const uid = () => C().uid();
  const g = { key: null, tab: 'fm', db: null, nav: [{ s: 'map' }], sel: null, log: [], link: '', online: true, sk: [], pending: 0, gopen: {}, toast: '', showReq: false };

  /* ---------- תצורה ---------- */
  const STATUS_COLORS = { 'תקין': '#35AC46', 'לא תקין': '#D83020', 'מתוכנן': '#9E559C', 'לפירוק': '#E8912E' };
  function cfg(S) {
    const sim = S.sim || {};
    const E = (n) => S.entities.find((e) => e.name === n);
    const main = E(sim.main) || S.entities.find((e) => e.kind !== 'table') || S.entities[0];
    const F = (ent, n) => ent && ent.fields.find((f) => f.name === n);
    const relsOf = (n) => S.relationships.filter((r) => r.origin === n && E(r.destination));
    const relTo = (n) => S.relationships.find((r) => r.destination === n && E(r.origin));
    const kids0 = relsOf(main.name);
    const childRel = kids0.find((r) => r.destination === sim.child) || kids0[0] || null;
    const statusField = sim.statusField || ((main.fields.find((f) => f.domain && /status/i.test(f.name)) || {}).name);
    const idField = sim.idField || ((main.fields.find((f) => f.type !== 'GUID' && /id$/i.test(f.name)) || {}).name);
    const sd = statusField && C().dom(S, F(main, statusField));
    const palette = ['#D83020', '#E8912E', '#007AC2', '#35AC46', '#9E559C', '#6A6A6A'];
    const colors = Object.assign({}, ...(sd ? sd.values.map((v, i) => ({ [v.label]: STATUS_COLORS[v.label] || palette[i % palette.length] })) : []), sim.colors || {});
    return {
      S, sim, E, F, main, relsOf, relTo, childRel, kid: childRel ? E(childRel.destination) : null,
      statusField, idField, colors,
      templateField: sim.templateField || (sim.statusField ? statusField : null),
      newValue: sim.newValue || (sd && sd.values[0] && sd.values[0].label),
      continueValue: sim.continueValue || null,
      auto: sim.auto || {},
      title: sim.titlePrefix || '',
      custom: !!(sim.kpis || sim.chips),
      s123: sim.survey123 || null, editing: sim.editing !== false, showRel: sim.relatedList !== false,
    };
  }
  const show = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(String(v == null ? '' : v)); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : (v == null ? '' : v); };
  const color = (K, rec) => K.colors[rec[K.statusField]] || '#6A6A6A';
  const rows = (n) => (g.db[n] = g.db[n] || []);
  const kidsOf = (rel, rec) => rows(rel.destination).filter((k) => k[rel.destKey] === rec.GlobalID);
  const findRec = (ent, gid) => rows(ent).find((r) => r.GlobalID === gid);
  function parentOf(K, ent, rec) { const r = K.relTo(ent); return r ? findRec(r.origin, rec[r.destKey]) : null; }
  function mainOf(K, ent, rec) { let e = ent, x = rec, n = 0; while (x && e !== K.main.name && n++ < 6) { const r = K.relTo(e); if (!r) return null; x = findRec(r.origin, x[r.destKey]); e = r.origin; } return x; }
  /* שם תצוגה לרשומה: מזהה בישות הראשית, אחרת השדה הראשון שהוא חובה / רשימה */
  function display(K, entName, rec) {
    const ent = K.E(entName);
    if (entName === K.main.name) return ((K.title ? K.title + ' ' : '') + (rec[K.idField] || '')).trim() || ent.alias;
    if (K.kid && entName === K.kid.name && K.sim.childTitle && rec[K.sim.childTitle]) return show(rec[K.sim.childTitle]);
    const f = ent.fields.find((x) => !C().hidden(x) && (x.required || x.domain) && rec[x.name]) || ent.fields.find((x) => !C().hidden(x) && rec[x.name] && x.type !== 'GUID');
    if (!f) return ent.alias;
    if (f.pickFrom) { const p = findRec(f.pickFrom, rec[f.name]); return p ? display(K, f.pickFrom, p) : ent.alias; }
    return show(rec[f.name]);
  }
  function subtitle(K, entName, rec) {
    const ent = K.E(entName), first = display(K, entName, rec);
    if (K.kid && entName === K.kid.name && K.sim.childCard) return K.sim.childCard.map((n) => show(rec[n] || '')).filter((x) => x && x !== first).slice(0, 2).join(' · ');
    return ent.fields.filter((f) => !C().hidden(f) && rec[f.name] && f.type !== 'GUID' && show(rec[f.name]) !== first).slice(0, 2).map((f) => show(rec[f.name])).join(' · ');
  }

  /* ---------- גיאומטריה מדומה (מפה 360×648) ---------- */
  const W = 360, H = 648, DUNAM_PER_PX = 0.03;
  function blob(cx, cy, r, seed) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 0.65 + 0.35 * Math.abs(Math.sin(seed * 7.3 + i * 2.1)); pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.8]); }
    return pts;
  }
  function ringArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); }
  const pts = (rec) => rec.__pt ? [rec.__pt] : (rec.__shape || []).flat();
  const centroid = (rec) => { const a = pts(rec); return a.length ? [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length] : [W / 2, H / 2]; };
  const area = (rec) => Math.round((rec.__shape || []).reduce((a, p) => a + ringArea(p), 0) * DUNAM_PER_PX * 10) / 10;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const GPS = [196, 330];

  /* ---------- ערכים אוטומטיים ---------- */
  const now = () => new Date().toISOString().slice(0, 16);
  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  function nextId(K, rec) {
    if (K.continueValue && rec[K.statusField] === K.continueValue && rec.__shape) {
      const c = centroid(rec); let best = null, bd = 1e9;
      rows(K.main.name).filter((m) => m !== rec && m[K.statusField] === K.newValue).forEach((m) => { const d = dist(c, centroid(m)); if (d < bd) { bd = d; best = m; } });
      return best && bd < 110 ? best[K.idField] : '';
    }
    if (rec[K.idField]) return rec[K.idField];
    if (!g.online) return '';
    return rows(K.main.name).reduce((a, m) => Math.max(a, Number(m[K.idField]) || 0), 0) + 1;
  }
  function autoFill(K, ent, vals, parent, isNew) {
    const S = K.S, isMain = ent.name === K.main.name;
    Object.entries(K.auto).forEach(([n, rule]) => {
      if (!ent.fields.some((f) => f.name === n)) return;
      if (rule === 'now') { if ((isNew && !g.seeding) || !vals[n]) vals[n] = now(); }
      else if (rule === 'user') { if ((isNew && !g.seeding) || !vals[n]) vals[n] = K.sim.user || 'משתמש מחובר'; }
      else if (rule === 'area') vals[n] = area(vals);
      else if (rule === 'id') vals[n] = nextId(K, vals);
      else if (rule.startsWith('weekday:')) { const d = vals[rule.slice(8)]; vals[n] = d ? 'יום ' + DAYS[new Date(d).getDay()] : ''; }
      else if (rule.startsWith('parent:') && parent) vals[n] = parent[rule.slice(7)] == null ? '' : parent[rule.slice(7)];
    });
    ent.fields.forEach((f) => {
      if (K.auto[f.name]) return;
      if (isMain && f.name === K.idField && f.type === 'TEXT' && C().readonly(f) && !vals[f.name] && isNew) vals[f.name] = C().newId();
      if (isMain && C().readonly(f) && !vals[f.name] && (vals.__pt || vals.__shape)) { const c = centroid(vals), gv = C().geoVal(f, { x: c[0] / W, y: c[1] / H }); if (gv != null && gv !== '' && C().isGeo(f)) vals[f.name] = gv; }
    });
    C().derive(S, ent, vals, parent || {}, !isNew);
  }
  /* שדות בשכבה הראשית שמתעדכנים מהרשומה הקשורה האחרונה (fromVisit) */
  function fromKid(K, kidEnt, kid) {
    const m = mainOf(K, kidEnt.name, kid); if (!m || kidEnt.name === K.main.name) return;
    K.main.fields.filter((f) => f.fromVisit && kidEnt.fields.some((x) => x.name === f.fromVisit)).forEach((f) => {
      if (kid[f.fromVisit] && (!f.fromVisitWhen || kid[f.fromVisitWhen.f] === f.fromVisitWhen.v)) m[f.name] = kid[f.fromVisit];
      else if (f.fromVisitWhen && kid[f.fromVisitWhen.f]) m[f.name] = '';
    });
    K.main.fields.filter((f) => f.fromVisit && f.rel && !C().relOk(f, m, {})).forEach((f) => { m[f.name] = ''; });
  }

  /* ---------- סגנון Field Maps ---------- */
  /* "בשלט חדש: ניתן לשינוי; בעריכה: קריאה בלבד" = נעול רק בעריכה */
  const editOnlyLock = (f) => /בעריכה:\s*קריאה בלבד/.test(f.visible || '') && f.mode !== 'אוטומטי';
  const roOf = (f, isNew) => (editOnlyLock(f) ? !isNew : C().readonly(f)) || (f.readonlyOnEdit && !isNew);
  const isReq = (f, vals, up) => f.required === true || (f.reqIf ? C().relOk({ rel: f.reqIf }, vals, up) : false);
  const FM = { blue: '#007AC2', text: '#151515', sub: '#6A6A6A', line: '#DFDFDF', bg: '#F3F3F3', red: '#D83020', font: "'Avenir Next', 'Segoe UI', Arial, sans-serif" };
  const ICON = {
    copy: '<rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" fill="none" stroke="currentColor" stroke-width="1.9"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    back: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    search: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 15l5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    layers: '<path d="M12 4l9 5-9 5-9-5 9-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 14l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
    more: '<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    gps: '<circle cx="12" cy="12" r="3.5" fill="currentColor"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    undo: '<path d="M9 7H15a5 5 0 010 10H8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4L9 7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
    chev: '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    down: '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z" fill="currentColor"/>',
    cloud: '<path d="M7 18h10a4 4 0 000-8 6 6 0 00-11.5 1.5A3.5 3.5 0 007 18z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.8"/>',
    table: '<rect x="4" y="5" width="16" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M10 10v9" stroke="currentColor" stroke-width="1.8"/>',
  };
  const ic = (n, s, col) => `<svg width="${s || 22}" height="${s || 22}" viewBox="0 0 24 24" style="display:block;color:${col || 'currentColor'}">${ICON[n]}</svg>`;
  const iconBtn = (n, on, title, col) => `<button title="${esc(title || '')}" onclick="${on}" style="background:none;border:0;padding:6px;cursor:pointer;color:${col || FM.text}">${ic(n, 22)}</button>`;
  const textBtn = (t, on, col, bold) => `<button onclick="${on}" style="background:none;border:0;color:${col || FM.blue};font:inherit;font-size:16px;font-weight:${bold ? 700 : 400};padding:8px 10px;cursor:pointer">${t}</button>`;
  const bar = (right, title, left, sub) => `<div style="height:52px;display:flex;align-items:center;gap:4px;padding:0 6px;background:#fff;border-bottom:1px solid ${FM.line};position:relative;z-index:3"><div style="display:flex;align-items:center;min-width:72px">${right}</div><div style="flex:1;text-align:center;min-width:0"><div style="font-weight:600;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>${sub ? `<div style="font-size:11px;color:${FM.sub};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>` : ''}</div><div style="display:flex;align-items:center;justify-content:flex-end;min-width:72px">${left}</div></div>`;
  const swatch = (K, kind, col) => kind === 'point' ? `<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="${col}" stroke="#fff" stroke-width="2"/></svg>` : kind === 'line' ? `<svg width="26" height="20" viewBox="0 0 26 20"><path d="M2 16 L10 6 L16 12 L24 3" fill="none" stroke="${col}" stroke-width="3"/></svg>` : `<svg width="26" height="20" viewBox="0 0 28 22"><path d="M3 15 L8 3 L22 5 L25 16 L12 20 Z" fill="${col}" fill-opacity=".45" stroke="${col}" stroke-width="2"/></svg>`;

  /* ---------- טופס ---------- */
  function control(K, ent, f, vals, up, isNew) {
    const S = K.S, d = C().dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], rule = K.auto[f.name];
    const ro = roOf(f, isNew);
    const req = isReq(f, vals, up), err = g.showReq && req && !ro && v === '';
    const box = `width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid ${err ? FM.red : '#CACACA'};border-radius:4px;font:inherit;font-size:15px;background:#fff;color:${FM.text}`;
    const on = (x) => `onchange="SimG.fv('${f.name}',${x})"`;
    const label = `<div style="font-size:13px;color:${FM.sub};margin:14px 0 5px;display:flex;gap:6px;align-items:center">${esc(f.alias || f.name)}${req && !ro ? `<span style="color:${FM.red}">*</span>` : ''}</div>`;
    let inp;
    if (ro) {
      const calc = C().readonly(f) && !editOnlyLock(f);
      const shown = f.pickFrom ? (findRec(f.pickFrom, v) ? display(K, f.pickFrom, findRec(f.pickFrom, v)) : '') : show(v);
      inp = `<div style="${box};background:${FM.bg};color:${FM.sub};display:flex;justify-content:space-between;align-items:center;gap:8px"><span>${shown !== '' ? esc(shown) : rule === 'script' ? 'ימולא בסקריפט הלילי' : '—'}</span>${calc ? `<span title="מחושב" style="color:${FM.blue}">${ic('bolt', 16)}</span>` : ''}</div>`;
    } else if (f.pickFrom) {
      const m = mainOf(K, ent.name, Object.assign({}, vals)) || (up && mainOf(K, K.relTo(ent.name).origin, up));
      const r = K.relTo(f.pickFrom), opts = rows(f.pickFrom).filter((p) => !m || !r || p[r.destKey] === m.GlobalID);
      inp = `<select style="${box}" ${on('this.value')}><option value="">בחר…</option>${opts.map((p) => `<option value="${p.GlobalID}" ${p.GlobalID === v ? 'selected' : ''}>${esc(display(K, f.pickFrom, p) + (subtitle(K, f.pickFrom, p) ? ' · ' + subtitle(K, f.pickFrom, p) : ''))}</option>`).join('')}</select>`;
    } else if (d && d.values.length) {
      const pf = C().parentField(S, ent, f), pv = pf ? vals[pf.name] : null;
      const opts = d.values.filter((x) => !pf || !x.parent || x.parent === pv);
      if (pf && !pv) inp = `<div style="${box};color:${FM.sub}">בחר קודם: ${esc(pf.alias)}</div>`;
      else if (opts.length <= 4) inp = opts.map((o) => `<label style="display:flex;align-items:center;gap:10px;padding:8px 2px;font-size:15px;cursor:pointer" onclick="SimG.fv('${f.name}','${esc(o.label).replace(/'/g, "\\'")}')"><span style="width:20px;height:20px;border-radius:50%;border:2px solid ${o.label === v ? FM.blue : '#9F9F9F'};display:inline-flex;align-items:center;justify-content:center;flex:none">${o.label === v ? `<span style="width:10px;height:10px;border-radius:50%;background:${FM.blue}"></span>` : ''}</span>${esc(o.label)}</label>`).join('');
      else inp = `<select style="${box}" ${on('this.value')}><option value="">${opts.length > 15 ? 'חפש או בחר…' : 'בחר…'}</option>${opts.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    } else if (f.type === 'DATE') inp = `<input type="${/שעה|שעת/.test(f.alias || '') ? 'datetime-local' : 'date'}" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" inputmode="decimal" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="3" style="${box}" ${on('this.value')}>${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${box}" value="${esc(v)}" ${on('this.value')}>`;
    return label + inp + (err ? `<div style="color:${FM.red};font-size:12px;margin-top:4px">נדרש</div>` : '');
  }
  const shownIn = (f, vals, up) => !C().hidden(f) && C().relOk(f, vals, up) !== false;
  function formGroups(K, ent, vals, up, isNew) {
    const groups = {};
    ent.fields.forEach((f) => { if (shownIn(f, vals, up)) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((gr) => {
      const editable = groups[gr].some((f) => !roOf(f, isNew)), key = ent.name + '|' + gr, open = g.gopen[key] != null ? g.gopen[key] : editable;
      const missingHere = g.showReq && groups[gr].some((f) => !roOf(f, isNew) && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === ''));
      return `<div style="background:#fff;margin:0 0 8px;border-top:1px solid ${FM.line};border-bottom:1px solid ${FM.line}"><div onclick="SimG.grp('${esc(key)}',${!open})" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer"><div><div style="font-weight:600;font-size:15px;color:${missingHere ? FM.red : FM.text}">${esc(gr)}</div>${!editable ? `<div style="font-size:12px;color:${FM.sub}">לקריאה בלבד</div>` : ''}</div><span style="color:${FM.sub};transform:rotate(${open ? 180 : 0}deg)">${ic('down', 20)}</span></div>${open ? `<div style="padding:0 16px 14px">${groups[gr].map((f) => control(K, ent, f, vals, up, isNew)).join('')}</div>` : ''}</div>`;
    }).join('');
  }
  function missing(ent, vals, up, isNew) {
    return ent.fields.filter((f) => shownIn(f, vals, up) && !roOf(f, isNew) && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === '')).map((f) => f.alias || f.name);
  }

  /* ---------- נתוני דוגמה ---------- */
  function seed(K) { g.seeding = true; try { seed0(K); } finally { g.seeding = false; } }
  function seed0(K) {
    const S = K.S;
    g.db = {}; g.sel = null; g.log = []; g.nav = [{ s: 'map' }]; g.pending = 0; g.gopen = {}; g.sk = []; g.link = '';
    const kind = K.main.kind;
    if (S.demo && S.demo[K.main.name]) {
      const dm = S.demo, byEnt = {};
      dm[K.main.name].forEach((r, i) => { const o = Object.assign({}, r); delete o.loc; o.GlobalID = uid(); const l = r.loc || { x: 0.2 + (i * 0.23) % 0.6, y: 0.2 + (i * 0.17) % 0.6 }; place(o, kind, l.x * W, 60 + l.y * (H - 140), i); rows(K.main.name).push(o); });
      byEnt[K.main.name] = rows(K.main.name);
      const walk = (ent) => K.relsOf(ent).forEach((rel) => {
        (dm[rel.destination] || []).forEach((r) => {
          const o = Object.assign({}, r); delete o.s; delete o.v; delete o.p; o.GlobalID = uid();
          const par = ent === K.main.name ? byEnt[ent][r.s] : byEnt[ent] && byEnt[ent][r.v != null ? r.v : r.s];
          if (!par) return; o[rel.destKey] = par.GlobalID;
          const pk = K.E(rel.destination).fields.find((f) => f.pickFrom);
          if (pk && r.p != null && byEnt[pk.pickFrom]) o[pk.name] = (byEnt[pk.pickFrom][r.p] || {}).GlobalID;
          rows(rel.destination).push(o);
        });
        byEnt[rel.destination] = rows(rel.destination); walk(rel.destination);
      });
      walk(K.main.name);
    } else {
      const spots = [[110, 190, 48], [250, 400, 58], [175, 165, 26], [255, 170, 32]];
      spots.forEach(([x, y, r], i) => {
        const m = C().sample(S, K.main, i); m.GlobalID = uid(); place(m, kind, x, y, i, r);
        K.main.fields.filter((f) => C().readonly(f)).forEach((f) => { m[f.name] = ''; });
        if (K.statusField) m[K.statusField] = i === 2 && K.continueValue ? K.continueValue : K.newValue || m[K.statusField];
        rows(K.main.name).push(m);
      });
      if (K.continueValue && kind === 'polygon') rows(K.main.name)[2].__shape = [blob(150, 222, 26, 3)];
      if (K.childRel) rows(K.main.name).forEach((m, i) => { if (i < 2) { const k = C().sample(S, K.kid, i); k.GlobalID = uid(); k[K.childRel.destKey] = m.GlobalID; rows(K.kid.name).push(k); } });
    }
    rows(K.main.name).forEach((m) => autoFill(K, K.main, m, null, true));
    rows(K.main.name).forEach((m) => autoFill(K, K.main, m, null, false));
    const fill = (ent) => K.relsOf(ent).forEach((rel) => { rows(rel.destination).forEach((k) => { autoFill(K, K.E(rel.destination), k, findRec(ent, k[rel.destKey]), true); fromKid(K, K.E(rel.destination), k); }); fill(rel.destination); });
    fill(K.main.name);
  }
  function place(o, kind, x, y, i, r) {
    if (kind === 'point') o.__pt = [Math.round(x), Math.round(y)];
    else if (kind === 'line') o.__shape = [[[x - 40, y + 10], [x - 10, y - 15], [x + 20, y + 5], [x + 45, y - 20]]];
    else o.__shape = [blob(x, y, r || 34, i + 1)];
  }

  /* ---------- סקריפט לילי ---------- */
  function nightly(K) {
    const out = [], sc = K.sim.script || {}, M = rows(K.main.name);
    if (K.continueValue) {
      M.filter((m) => m[K.statusField] === K.continueValue).slice().forEach((c) => {
        const tgt = M.find((m) => m !== c && m[K.statusField] === K.newValue && String(m[K.idField]) === String(c[K.idField]) && c[K.idField] !== '');
        if (!tgt) { out.push(`${display(K, K.main.name, c)}: "${K.continueValue}" ללא "${K.newValue}" באותו מזהה, לרשימת חריגים`); return; }
        tgt.__shape = tgt.__shape.concat(c.__shape);
        K.relsOf(K.main.name).forEach((rel) => kidsOf(rel, c).forEach((k) => { k[rel.destKey] = tgt.GlobalID; }));
        M.splice(M.indexOf(c), 1);
        out.push(`${display(K, K.main.name, tgt)}: אוחד חלק נוסף (Multi-Part), ה-GlobalID של הראשי נשמר`);
      });
    }
    M.forEach((m, i) => {
      Object.entries(K.auto).filter(([, r]) => r === 'script').forEach(([n]) => { const pool = (sc.fill || {})[n]; const f = K.F(K.main, n); if (!f) return; m[n] = pool ? pool[i % pool.length] : ['DOUBLE', 'FLOAT'].includes(f.type) ? Math.round(area(m) * (0.05 + ((i * 7 + n.length) % 10) / 40) * 10) / 10 : ['LONG', 'SHORT'].includes(f.type) ? 1 + ((i + n.length) % 6) : (f.alias || n) + ' ' + (i + 1); });
      autoFill(K, K.main, m, null, false);
      if (K.childRel) kidsOf(K.childRel, m).forEach((k) => autoFill(K, K.kid, k, m, false));
    });
    out.push(`עודכנו ${M.length} רשומות`);
    g.log = out.concat(g.log.length ? ['—'] : [], g.log).slice(0, 40);
  }

  /* ---------- קישורי עומק ---------- */
  function link(K, kind, ent, rec, rel, preset) {
    const base = 'https://fieldmaps.arcgis.app/?referenceContext=' + kind + '&itemID=' + (K.sim.mapItemId || '<MAP_ITEM_ID>');
    const src = '&featureSourceURL=<' + ent + '_URL>&featureID=' + rec.GlobalID;
    if (kind === 'addRelatedFeature') return base + src + '&relationshipID=<' + rel.name + '>' + (preset && Object.keys(preset).length ? '&featureAttributes=' + encodeURIComponent(JSON.stringify(preset)) : '');
    return base + src;
  }
  function parentPreset(K, rel, rec) { const pre = {}; Object.entries(K.auto).forEach(([n, r]) => { if (r.startsWith('parent:') && K.F(K.E(rel.destination), n) && rec[r.slice(7)] !== '' && rec[r.slice(7)] != null) pre[n] = rec[r.slice(7)]; }); return pre; }

  /* ---------- מפה ---------- */
  function basemap() {
    const patches = [[0, 0, 140, 120, '#B9C49A'], [140, 0, 220, 90, '#A9B98A'], [0, 120, 90, 200, '#8FA672'], [200, 90, 160, 150, '#C4C7A0'], [90, 260, 170, 120, '#9DB07C'], [0, 330, 110, 170, '#B5BF93'], [260, 240, 100, 140, '#A3B582'], [110, 470, 250, 178, '#BDC59C'], [0, 500, 110, 148, '#91A874']];
    const forest = [[60, 250, 70], [300, 520, 80], [200, 280, 50], [40, 560, 45], [320, 60, 40]];
    let s = `<rect width="${W}" height="${H}" fill="#AEBB8F"/>`;
    patches.forEach(([x, y, w, h, c]) => { s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`; });
    forest.forEach(([x, y, r], i) => { for (let k = 0; k < 14; k++) { const a = k * 2.4 + i, rr = r * (0.25 + (k % 5) / 7); s += `<circle cx="${(x + Math.cos(a) * rr).toFixed(1)}" cy="${(y + Math.sin(a) * rr).toFixed(1)}" r="${(r / 3.2).toFixed(1)}" fill="#5E7A45" opacity=".55"/>`; } });
    s += `<path d="M-10 300 C 80 280, 150 330, 230 300 S 330 250, 380 270" stroke="#EDE6D3" stroke-width="5" fill="none"/><path d="M190 -10 C 180 120, 220 240, 200 360 S 170 560, 210 660" stroke="#EDE6D3" stroke-width="4" fill="none"/><path d="M-10 470 C 90 450, 160 500, 380 440" stroke="#7FA7C9" stroke-width="3" fill="none" opacity=".8"/>`;
    return s;
  }
  function mapSvg(K, sketching) {
    const sel = g.sel, kind = K.main.kind, M = rows(K.main.name);
    const P = (p) => p.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ');
    const click = (i) => sketching ? '' : `onclick="event.stopPropagation();SimG.sel(${i})"`;
    const shapes = M.map((m, i) => {
      if (m.__pt) return `<circle cx="${m.__pt[0]}" cy="${m.__pt[1]}" r="9" fill="${color(K, m)}" stroke="${sel === i ? '#00FFFF' : '#fff'}" stroke-width="${sel === i ? 4 : 2.5}" ${click(i)} style="cursor:pointer"/>`;
      return (m.__shape || []).map((p) => kind === 'line' ? `<polyline points="${P(p)}" fill="none" stroke="${sel === i ? '#00FFFF' : color(K, m)}" stroke-width="${sel === i ? 6 : 4}" ${click(i)} style="cursor:pointer"/>` : `<polygon points="${P(p)}" fill="${color(K, m)}" fill-opacity=".4" stroke="${sel === i ? '#00FFFF' : color(K, m)}" stroke-width="${sel === i ? 3 : 2}" ${click(i)} style="cursor:pointer"/>`).join('');
    }).join('');
    const labels = kind === 'point' ? '' : M.map((m) => { const c = centroid(m); return `<text x="${c[0]}" y="${c[1] + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="#00000088" stroke-width="3" paint-order="stroke" pointer-events="none">${esc(m[K.idField] || '')}</text>`; }).join('');
    let sk = '';
    if (sketching && g.sk.length) {
      if (kind === 'point') sk = `<g transform="translate(${g.sk[0][0]},${g.sk[0][1]})"><path d="M0 0 C -9 -12 -9 -26 0 -26 C 9 -26 9 -12 0 0 Z" fill="${FM.blue}" stroke="#fff" stroke-width="2"/><circle cx="0" cy="-17" r="3.5" fill="#fff"/></g>`;
      else { const p = g.sk.map((q) => q.join(',')).join(' '); sk = (kind === 'polygon' && g.sk.length > 2 ? `<polygon points="${p}" fill="${K.colors[g.drawVal] || FM.blue}" fill-opacity=".35" stroke="${FM.blue}" stroke-width="2" stroke-dasharray="6 4"/>` : `<polyline points="${p}" fill="none" stroke="${FM.blue}" stroke-width="${kind === 'line' ? 3 : 2}" stroke-dasharray="6 4"/>`) + g.sk.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="${i === g.sk.length - 1 ? 7 : 5}" fill="#fff" stroke="${FM.blue}" stroke-width="2.5"/>`).join(''); }
    }
    const me = `<circle cx="${GPS[0]}" cy="${GPS[1]}" r="16" fill="#007AC2" opacity=".18"/><circle cx="${GPS[0]}" cy="${GPS[1]}" r="7" fill="#007AC2" stroke="#fff" stroke-width="2.5"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block;cursor:${sketching ? 'crosshair' : 'default'}" onclick="SimG.mapClick(event,this)">${basemap()}${shapes}${labels}${me}${sk}</svg>`;
  }

  /* ---------- פופאפ ---------- */
  function customContent(K, rec) {
    const sim = K.sim, rel = K.childRel, kids = rel ? kidsOf(rel, rec) : [];
    const chip = (t, bg, fg) => `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600">${esc(t)}</span>`;
    const chips = [rec[K.statusField] ? chip(rec[K.statusField], color(K, rec), '#fff') : ''].concat((sim.chips || []).map((n) => rec[n] ? chip(rec[n], '#F1F5F9', '#0F172A') : '')).join(' ');
    const kpis = (sim.kpis || []).map((k) => `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:#FFF7ED;border:1px solid #FED7AA"><div style="font-size:11px;color:#64748B">${esc(k.label)}</div><div style="font-size:17px;font-weight:700;color:#C2410C"><span dir="ltr">${esc(rec[k.f] === '' || rec[k.f] == null ? '-' : show(rec[k.f]))}</span> <small style="font-weight:400">${esc(k.unit || '')}</small></div></div>`).join('')
      + (K.kid ? `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:${kids.length ? '#EFF6FF' : '#FEF3C7'};border:1px solid ${kids.length ? '#BFDBFE' : '#FDE68A'}"><div style="font-size:11px;color:#64748B">${esc(K.kid.alias)}</div><div style="font-size:17px;font-weight:700">${kids.length}</div></div>` : '');
    const warn = K.kid && !kids.length && rec[K.statusField] !== K.continueValue ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#FEF3C7;color:#92400E;font-size:12px">עדיין אין ${esc(K.kid.alias)}</div>` : '';
    const lbtn = (l, on, fill) => `<a href="javascript:void(0)" onclick="${on}" style="flex:1;text-decoration:none;text-align:center;padding:10px;border-radius:10px;font-weight:700;border:1px solid ${fill ? '#C2410C' : '#1E3A8A'};background:${fill ? '#C2410C' : '#fff'};color:${fill ? '#fff' : '#1E3A8A'}">${l}</a>`;
    const acts = `<div style="display:flex;gap:6px;margin-top:8px">${rel ? lbtn('+ ' + esc(K.kid.alias), `SimG.addKid('${rel.name}','${rec.GlobalID}',true)`, true) : ''}${K.s123 ? lbtn('עריכת ' + esc(K.main.alias) + ' ב-Survey123', `SimG.s123Edit('${rec.GlobalID}')`, false) : lbtn('עריכת ' + esc(K.main.alias), `SimG.edit('${K.main.name}','${rec.GlobalID}',true)`, false)}</div>`;
    /* רשומות בן: כרטיס מתקפל. כותרת = תאריך + שני שדות ראשונים של childCard (צ'יפים); גוף = כל שאר השדות מעוצבים, ושורות הבן שלהן (למשל מצב רכיב). ללא קישור עריכה: ביקור קודם אינו נערך */
    const KC = sim.childCard || [], hf = KC.slice(0, 2);
    const lab = (t) => `<div style="font-size:11px;color:#64748B;margin-bottom:1px">${esc(t)}</div>`;
    const kidChip = (t) => { const c = K.colors[t]; return `<span style="display:inline-block;padding:1px 9px;border-radius:999px;font-size:11px;font-weight:600;background:${c || '#EEF2FF'};color:${c ? '#fff' : '#3730A3'}">${esc(show(t))}</span>`; };
    const detail = (k) => {
      const used = [sim.childTitle, 'ParentGlobalID'].concat(hf);
      const fl = K.kid.fields.filter((f) => used.indexOf(f.name) < 0 && !C().hidden(f) && f.type !== 'GUID' && !f.pickFrom && k[f.name] !== '' && k[f.name] != null);
      const grid = fl.map((f) => { const long = Number(f.length) >= 500 || String(show(k[f.name])).length > 28; return `<div style="grid-column:${long ? '1/-1' : 'auto'}">${lab(f.alias || f.name)}<div style="font-size:13px;color:#0F172A;line-height:1.45">${esc(show(k[f.name]))}</div></div>`; }).join('');
      const sub = K.relsOf(K.kid.name).map((r2) => {
        const ks = kidsOf(r2, k); if (!ks.length) return '';
        const E2 = K.E(r2.destination), pf = E2.fields.find((f) => f.pickFrom);
        const lines = ks.map((x) => {
          const part = pf && x[pf.name] ? findRec(pf.pickFrom, x[pf.name]) : null;
          const rest = E2.fields.filter((f) => f.name !== (pf && pf.name) && !C().hidden(f) && f.type !== 'GUID' && x[f.name] !== '' && x[f.name] != null);
          const st1 = rest[0], more = rest.slice(1).map((f) => esc(show(x[f.name]))).join(' · ');
          return `<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-top:1px solid #E2E8F0"><div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(part ? display(K, pf.pickFrom, part) : (E2.alias || ''))}</div>${more ? `<div style="font-size:12px;color:#475569;margin-top:1px">${more}</div>` : ''}</div>${st1 ? kidChip(x[st1.name]) : ''}</div>`;
        }).join('');
        return `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#F8FAFC;border:1px solid #E2E8F0"><div style="font-size:12px;font-weight:700;color:#334155;margin-bottom:2px">${esc(E2.alias)} (${ks.length})</div>${lines}</div>`;
      }).join('');
      return `<div style="padding:4px 12px 12px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px">${grid}</div>${sub}</div>`;
    };
    const cards = '<style>.sg-v>summary{display:flex;list-style:none;cursor:pointer}.sg-v>summary::-webkit-details-marker{display:none}.sg-v[open]>summary .sg-ch{transform:rotate(180deg)}.sg-v[open]{border-color:#93C5FD;box-shadow:0 1px 6px rgba(30,58,138,.12)}</style>' + kids.slice().reverse().map((k) => `<details class="sg-v" style="border:1px solid #E2E8F0;border-radius:12px;margin-top:8px;background:#fff;overflow:hidden"><summary style="align-items:center;gap:8px;padding:10px 12px;background:#F8FAFC"><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:#0F172A">${esc(show(k[sim.childTitle]) || display(K, K.kid.name, k))}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${hf.map((n) => k[n] ? kidChip(k[n]) : '').join('')}</div></div><span class="sg-ch" style="color:#64748B;font-size:12px;transition:transform .15s">▼</span></summary>${detail(k)}</details>`).join('');
    return `<div style="padding:12px 14px;font-family:Tahoma,sans-serif"><div style="display:flex;gap:4px;flex-wrap:wrap">${chips}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${kpis}</div>${warn}${acts}${cards}</div>`;
  }
  /* פופאפ ברירת מחדל של Field Maps: רשימת שדות (כינוי מעל ערך) */
  function fieldList(K, ent, rec) {
    return ent.fields.filter((f) => !C().hidden(f) && rec[f.name] !== '' && rec[f.name] != null && f.type !== 'GUID').map((f) => `<div style="padding:10px 16px;border-bottom:1px solid ${FM.line}"><div style="font-size:12px;color:${FM.sub}">${esc(f.alias || f.name)}</div><div style="font-size:15px;margin-top:2px">${esc(show(rec[f.name]))}</div></div>`).join('')
      + ent.fields.filter((f) => f.pickFrom && rec[f.name]).map((f) => { const p = findRec(f.pickFrom, rec[f.name]); return p ? `<div style="padding:10px 16px;border-bottom:1px solid ${FM.line}"><div style="font-size:12px;color:${FM.sub}">${esc(f.alias)}</div><div style="font-size:15px;margin-top:2px">${esc(display(K, f.pickFrom, p))}</div></div>` : ''; }).join('');
  }
  function relRows(K, ent, rec) {
    const rels = K.relsOf(ent);
    if (!rels.length) return '';
    return `<div style="padding:14px 16px 6px;font-size:13px;font-weight:600;color:${FM.sub}">רשומות קשורות</div>` + rels.map((rel) => { const n = kidsOf(rel, rec).length; return `<div onclick="SimG.push({s:'list',rel:'${rel.name}',gid:'${rec.GlobalID}'})" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid ${FM.line};cursor:pointer;background:#fff"><span style="color:${FM.sub}">${ic('table', 22)}</span><div style="flex:1"><div style="font-size:15px">${esc(K.E(rel.destination).alias)}</div><div style="font-size:12px;color:${FM.sub}">${n} רשומות</div></div><span style="color:${FM.sub}">${ic('chev', 20)}</span></div>`; }).join('') + `<div style="border-top:1px solid ${FM.line}"></div>`;
  }
  const popupBody = (K, ent, rec) => (ent === K.main.name && K.custom ? customContent(K, rec) : fieldList(K, K.E(ent), rec)) + (ent === K.main.name && !K.showRel ? '' : relRows(K, ent, rec));
  /* כפתורי הפעולה בראש הפופאפ ב-Field Maps (אין עיפרון בכותרת): עריכה והעתקה רק כשהעריכה במפה מופעלת. הפריסה גמישה: אופקית או אנכית לפי גודל הטקסט במכשיר */
  const popupActs = (K, ent, gid) => {
    const b = (icn, l, on) => `<button onclick="${on}" style="flex:1 1 150px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#EBEBEC;border:0;border-radius:10px;padding:12px 14px;font:inherit;font-size:15px;color:${FM.blue};cursor:pointer"><span>${l}</span>${ic(icn, 20, FM.blue)}</button>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px;background:#F3F3F3;border-bottom:1px solid ${FM.line}">${K.editing ? b('edit', 'עריכה', `SimG.edit('${ent}','${gid}')`) + (ent === K.main.name ? b('copy', 'העתקה', "SimG.note('העתקה: יוצר ישות חדשה עם אותם ערכים')") : '') : ''}${b('link', 'קישור', "SimG.note('קישור: העתקת קישור עומק לישות')")}${b('more', 'עוד', "SimG.note('עוד: ניווט, מצפן, מחיקה')")}</div>`;
  };

  /* ---------- מסכים ---------- */
  const top = () => g.nav[g.nav.length - 1];
  function screen(K) {
    const S = K.S, n = top(), Mrows = rows(K.main.name), rec = g.sel != null ? Mrows[g.sel] : null;
    const statusBar = `<div dir="ltr" style="height:26px;display:flex;justify-content:space-between;align-items:center;padding:0 18px;font-size:12px;font-weight:600;background:#fff">${new Date().toTimeString().slice(0, 5)}<span style="display:flex;gap:5px;align-items:center">${g.online ? '▂▄▆█' : '✈'} <span style="display:inline-block;width:22px;height:10px;border:1.5px solid #151515;border-radius:3px;position:relative"><span style="position:absolute;inset:1px;right:6px;background:#151515;border-radius:1px"></span></span></span></div>`;
    const toast = g.toast ? `<div style="position:absolute;bottom:22px;left:50%;transform:translateX(-50%);background:#323232;color:#fff;border-radius:6px;padding:9px 14px;font-size:13px;white-space:nowrap;z-index:9">${esc(g.toast)}</div>` : '';
    let head, body;
    if (n.s === 'tpl') {
      const tf = K.templateField && K.F(K.main, K.templateField), d = tf && C().dom(S, tf), items = d ? d.values.map((v) => v.label) : [''];
      head = bar(textBtn('ביטול', 'SimG.back()'), 'בחר סוג', '');
      body = `<div style="position:absolute;inset:0;overflow:auto;background:${FM.bg}"><div style="padding:10px 14px"><div style="background:#fff;border:1px solid ${FM.line};border-radius:4px;padding:8px 10px;color:${FM.sub};display:flex;gap:8px;align-items:center">${ic('search', 18)} חיפוש סוגים</div></div><div style="padding:6px 16px;font-size:13px;color:${FM.sub};font-weight:600">${esc(K.main.alias)}</div><div style="background:#fff;border-top:1px solid ${FM.line}">${items.map((l) => `<div onclick="SimG.tpl('${esc(l).replace(/'/g, "\\'")}')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid ${FM.line};cursor:pointer">${swatch(K, K.main.kind, K.colors[l] || FM.blue)}<span style="font-size:16px">${esc(l || K.main.alias)}</span></div>`).join('')}</div></div>`;
    } else if (n.s === 'sketch') {
      const kind = K.main.kind, minPts = kind === 'point' ? 1 : kind === 'line' ? 2 : 3, ok = g.sk.length >= minPts;
      head = bar(textBtn('ביטול', 'SimG.back()'), 'הוספת ' + esc(K.main.alias), textBtn('הבא', 'SimG.sketchDone()', ok ? FM.blue : '#B0B0B0', true), esc(g.drawVal || ''));
      const hint = kind === 'point' ? (g.sk.length ? 'הנקודה במיקום ה-GPS. הקשה במפה מזיזה אותה' : 'הקש במפה כדי למקם את הנקודה') : !ok ? `הקש במפה כדי להוסיף נקודות (${g.sk.length}/${minPts} לפחות)` : `${g.sk.length} נקודות${kind === 'polygon' ? ' · ' + area({ __shape: [g.sk] }) + ' דונם' : ''}`;
      body = `${mapSvg(K, true)}<div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.3);padding:6px 12px;font-size:13px;white-space:nowrap">${hint}</div>${kind === 'point' ? '' : `<div style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-top:1px solid ${FM.line};display:flex;justify-content:space-around;padding:6px 0 10px">${[['undo', 'בטל', 'SimG.skUndo()'], ['trash', 'נקה', 'SimG.skClear()'], ['gps', 'מיקומי', 'SimG.skGps()']].map(([ic0, l, on]) => `<button onclick="${on}" style="background:none;border:0;color:${FM.text};display:flex;flex-direction:column;align-items:center;font:inherit;font-size:11px;cursor:pointer">${ic(ic0, 22)}${l}</button>`).join('')}</div>`}`;
    } else if (n.s === 'form') {
      const ent = K.E(n.ent), up = n.parent ? findRec(n.parentEnt, n.parent) : null, miss = g.showReq ? missing(ent, n.vals, up || {}, n.isNew) : [];
      head = bar(textBtn('ביטול', 'SimG.back()'), (n.isNew ? esc(ent.alias) + ' חדש' : 'עריכת ' + esc(ent.alias)), textBtn(n.isNew ? 'שלח' : 'עדכן', 'SimG.save()', FM.blue, true), up ? 'קשור ל' + esc(display(K, n.parentEnt, up)) : '');
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:${FM.bg};padding-top:8px">${miss.length ? `<div style="margin:0 12px 8px;padding:10px 12px;border-radius:4px;background:#FCE9E7;color:${FM.red};font-size:13px">יש ${miss.length} שדות חובה ריקים: ${esc(miss.join(', '))}</div>` : ''}${formGroups(K, ent, n.vals, up || {}, n.isNew)}${!n.isNew ? `<div style="background:#fff;border-top:1px solid ${FM.line};border-bottom:1px solid ${FM.line};margin-top:8px"><button onclick="SimG.del()" style="width:100%;background:none;border:0;color:${FM.red};font:inherit;font-size:15px;padding:14px;cursor:pointer">מחק</button></div>` : ''}<div style="height:30px"></div></div>`;
    } else if (n.s === 'popup' && findRec(n.ent, n.gid)) {
      const r = findRec(n.ent, n.gid), isMain = n.ent === K.main.name;
      head = bar(isMain ? iconBtn('close', 'SimG.closePopup()', 'סגור') : iconBtn('back', 'SimG.back()', 'חזרה'), esc(display(K, n.ent, r)), '', esc(K.E(n.ent).alias));
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:#fff">${popupActs(K, n.ent, n.gid)}${popupBody(K, n.ent, r)}<div style="height:24px"></div></div>`;
    } else if (n.s === 'list') {
      const rel = K.S.relationships.find((x) => x.name === n.rel), par = findRec(rel.origin, n.gid), list = par ? kidsOf(rel, par).slice().reverse() : [];
      head = bar(iconBtn('back', 'SimG.back()', 'חזרה'), esc(K.E(rel.destination).alias), '', par ? esc(display(K, rel.origin, par)) : '');
      body = `<div data-sb style="position:absolute;inset:0;overflow:auto;background:${FM.bg}">${list.length ? `<div style="background:#fff;border-top:1px solid ${FM.line}">${list.map((k) => `<div onclick="SimG.push({s:'popup',ent:'${rel.destination}',gid:'${k.GlobalID}'})" style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid ${FM.line};cursor:pointer"><div style="flex:1;min-width:0"><div style="font-size:15px">${esc(display(K, rel.destination, k))}</div><div style="font-size:12px;color:${FM.sub};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(subtitle(K, rel.destination, k))}</div></div><span style="color:${FM.sub}">${ic('chev', 20)}</span></div>`).join('')}</div>` : `<div style="padding:40px 20px;text-align:center;color:${FM.sub}">אין רשומות קשורות</div>`}</div><div style="position:absolute;bottom:18px;left:18px">${fab('plus', `SimG.addKid('${rel.name}','${n.gid}')`)}</div>`;
    } else {
      g.nav = [{ s: 'map' }];
      head = bar(iconBtn('back', "SimG.note('חזרה לרשימת המפות')", 'מפות', FM.blue), esc(S.meta.title || 'מפה'), iconBtn('search', "SimG.note('חיפוש')", 'חיפוש') + iconBtn('layers', "SimG.note('רשימת שכבות')", 'שכבות') + iconBtn('more', "SimG.note('תפריט: מפות לא מקוונות, סנכרון, מדידה')", 'עוד'));
      const offline = !g.online || g.pending ? `<div style="position:absolute;top:8px;right:8px;left:8px;z-index:2;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3);padding:6px 10px;font-size:12px;display:flex;align-items:center;gap:8px">${ic('cloud', 18, g.online ? FM.blue : '#8F8F8F')}${g.online ? `${g.pending} עריכות ממתינות` : 'לא מקוון'}${g.online && g.pending ? `<button onclick="SimG.sync()" style="margin-inline-start:auto;border:0;background:${FM.blue};color:#fff;border-radius:4px;padding:3px 10px;cursor:pointer">סנכרן</button>` : g.pending ? ` · ${g.pending} עריכות ממתינות לסנכרון` : ''}</div>` : '';
      const peek = rec ? `<div onclick="SimG.push({s:'popup',ent:'${K.main.name}',gid:'${rec.GlobalID}'})" style="position:absolute;bottom:0;left:0;right:0;height:250px;background:#fff;border-radius:14px 14px 0 0;box-shadow:0 -2px 10px rgba(0,0,0,.25);z-index:4;overflow:hidden;cursor:pointer"><div style="padding:6px 16px 8px;border-bottom:1px solid ${FM.line}"><div style="width:36px;height:4px;border-radius:2px;background:#C8C8C8;margin:0 auto 8px"></div><div style="display:flex;align-items:center;gap:10px">${swatch(K, K.main.kind, color(K, rec))}<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:16px">${esc(display(K, K.main.name, rec))}</div><div style="font-size:12px;color:${FM.sub}">${esc(K.main.alias)}</div></div>${iconBtn('close', 'event.stopPropagation();SimG.closePopup()', 'סגור', FM.sub)}</div></div><div style="pointer-events:none">${popupBody(K, K.main.name, rec)}</div><div style="position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(rgba(255,255,255,0),#fff)"></div></div>` : '';
      body = `${mapSvg(K, false)}${offline}<div style="position:absolute;left:14px;bottom:${rec ? 266 : 24}px;z-index:3">${fab('plus', K.s123 ? 'SimG.s123New()' : "SimG.push({s:'tpl'})")}</div><div dir="ltr" style="position:absolute;right:10px;bottom:${rec ? 256 : 10}px;font-size:10px;color:#fff;text-shadow:0 0 2px #000;z-index:1">0 ── 200 m · Esri, Maxar</div>${peek}`;
    }
    return `<div style="width:380px;max-width:100%;height:780px;border:10px solid #111;border-radius:44px;background:#111;box-shadow:0 8px 28px rgba(0,0,0,.25);overflow:hidden;flex:none"><div dir="rtl" style="height:100%;background:#fff;border-radius:34px;overflow:hidden;display:flex;flex-direction:column;font-family:${FM.font};color:${FM.text};text-align:right">${statusBar}${head}<div style="position:relative;flex:1;overflow:hidden">${body}${toast}</div><div style="height:18px;display:flex;justify-content:center;align-items:center;background:${top().s === 'map' ? '#fff' : FM.bg}"><span style="width:120px;height:4px;border-radius:2px;background:#151515"></span></div></div></div>`;
  }
  const fab = (n, on) => `<button onclick="${on}" style="width:56px;height:56px;border-radius:50%;border:0;background:${FM.blue};color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer">${ic(n, 28)}</button>`;

  const STEPS = {
    map: 'מסך המפה. הקשה על ישות פותחת את הכרטיס שלה בתחתית, והקשה על הכרטיס פותחת את הפופאפ המלא. ה-+ מוסיף ישות חדשה.',
    tpl: 'בחירת סוג (תבנית). התבנית קובעת ערכי ברירת מחדל ואת הסמל במפה.',
    sketch: 'מיקום הישות: נקודה מתחילה במיקום ה-GPS. קו ופוליגון: כל הקשה מוסיפה קודקוד. "הבא" פותח את הטופס.',
    form: 'טופס Field Maps: קבוצות שנפתחות ונסגרות, ⚡ לשדה מחושב (Arcade), כוכבית לשדה חובה. אי אפשר לשלוח כשחסר שדה חובה.',
    popup: 'פופאפ: כפתורי פעולה בראש הפופאפ (עריכה והעתקה רק כשהעריכה במפה מופעלת; הפריסה אופקית או אנכית לפי גודל הטקסט במכשיר), תוכן הפופאפ, ורשומות קשורות בתחתית (אפשר להסתיר).',
    list: 'רשימת הרשומות הקשורות. ה-+ מוסיף רשומה שכבר מקושרת לרשומת האב.',
  };
  function fmTab(K) {
    const sc = (K.sim.scenarios || []).map((x, i) => `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:8px 10px;margin-bottom:6px;background:#fff"><b>${esc(x.title)}</b><div style="font-size:13px;color:#475569;margin:2px 0 6px">${esc(x.desc || '')}</div><button class="mini" onclick="SimG.sc(${i})">הרץ</button></div>`).join('');
    const lbl = { now: 'תאריך ושעה ביצירה', user: 'המשתמש המחובר', area: 'שטח גאודטי', id: 'מזהה (חדש: הגבוה + 1, המשך: של השטח הסמוך)' };
    const scr = Object.keys(K.auto).filter((n) => K.auto[n] === 'script');
    const autoList = Object.entries(K.auto).filter(([, r]) => r !== 'script').map(([n, r]) => [n, lbl[r] || r.replace('parent:', 'מהאב: ').replace('weekday:', 'יום בשבוע לפי ')]).concat(scr.length ? [[scr.length + ' שדות', 'סקריפט לילי: ' + scr.join(', ')]] : []);
    const tbl = (o) => `<tr><td style="padding:3px 6px;border:1px solid #E2E8F0" dir="ltr">${esc(o[0])}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(o[1])}</td></tr>`;
    const hasScript = K.continueValue || scr.length;
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${screen(K)}
      <div style="flex:1;min-width:260px">
        <div class="simnote"><b>${esc(STEPS[top().s] || STEPS.map)}</b></div>
        <label class="inl"><input type="checkbox" ${g.online ? 'checked' : ''} onchange="SimG.online(this.checked)"> מחובר לרשת (בלי רשת: עריכות ממתינות לסנכרון)</label>
        <div style="margin:10px 0">${hasScript ? `<button class="primary" onclick="SimG.nightly()">▶ הרץ ${esc((K.sim.script || {}).title || 'סקריפט לילי')}</button> ` : ''}<button class="mini" onclick="SimG.seed()">אפס נתוני דוגמה</button></div>
        ${(K.sim.script || {}).desc ? `<p style="font-size:13px;color:#475569">${esc(K.sim.script.desc)}</p>` : ''}
        ${g.log.length ? `<h4>יומן הסקריפט</h4><ul style="font-size:13px;line-height:1.7">${g.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
        ${g.link ? `<h4>קישור העומק שהופעל</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(g.link)}</pre><p style="font-size:12px;color:#64748B">באפליקציה הקישור נפתח מכפתור בתוך הפופאפ, ו-Field Maps פותחת את הטופס ישירות.</p>` : ''}
        ${sc ? `<h4>תרחישים</h4>${sc}` : ''}
        ${autoList.length ? `<details><summary style="cursor:pointer;font-weight:700;margin-top:12px">שדות מחושבים (${Object.keys(K.auto).length})</summary><table style="border-collapse:collapse;font-size:12px">${autoList.map(tbl).join('')}</table></details>` : ''}
      </div></div>`;
  }
  function allEnts(K) { const out = [K.main.name]; const walk = (e) => K.relsOf(e).forEach((r) => { if (!out.includes(r.destination)) { out.push(r.destination); walk(r.destination); } }); walk(K.main.name); return out.map(K.E); }
  function dataTab(K) {
    const t = (ent) => { const list = rows(ent.name), cs = ['GlobalID', ...(ent.kind !== 'table' ? ['חלקים'] : []), ...ent.fields.filter((f) => !C().hidden(f) || f.type === 'GUID').slice(0, 10).map((f) => f.name)]; return `<h3>${esc(ent.alias)} (${list.length})</h3>` + (list.length ? `<div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px"><tr>${cs.map((c) => `<th style="border:1px solid #CBD5E1;padding:3px 6px;background:#F1F5F9">${esc(c)}</th>`).join('')}</tr>${list.map((r) => `<tr>${cs.map((c) => `<td style="border:1px solid #E2E8F0;padding:3px 6px">${esc(/GlobalID/i.test(c) || (K.E(ent.name).fields.find((f) => f.name === c) || {}).type === 'GUID' ? String(r[c] || '').slice(0, 8) : c === 'חלקים' ? (r.__shape || [r.__pt]).length : show(r[c]))}</td>`).join('')}</tr>`).join('')}</table></div>` : '<small style="color:#64748B">אין רשומות</small>'); };
    return allEnts(K).map(t).join('');
  }
  function formsTab(K) {
    const row = (f) => { const r = K.auto[f.name]; const beh = C().hidden(f) ? 'מוסתר' : C().readonly(f) ? 'לקריאה בלבד' + (r ? ` · ${r === 'script' ? 'סקריפט לילי' : 'חישוב: ' + r}` : '') : f.rel ? 'מוצג כש-' + (f.visible || JSON.stringify(f.rel)) : f.pickFrom ? 'בחירה מ-' + f.pickFrom : f.domain ? 'רשימה (' + f.domain + ')' : 'עריכה'; return `<tr><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(f.category || '')}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(f.alias)}</td><td style="padding:3px 6px;border:1px solid #E2E8F0" dir="ltr">${esc(f.name)}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(beh)}${isReq(f, {}, {}) ? ' · חובה' : ''}${f.readonlyOnEdit ? ' · נעול בעריכה' : ''}</td></tr>`; };
    return allEnts(K).map((ent) => `<h3>טופס: ${esc(ent.alias)}</h3><table style="border-collapse:collapse;font-size:12px"><tr><th>קבוצה</th><th>שדה</th><th>שם</th><th>התנהגות בטופס</th></tr>${ent.fields.map(row).join('')}</table>`).join('');
  }
  function ensure(S) { const K = cfg(S); const key = S.meta.key + '|' + (S.meta.version || ''); if (g.key !== key || !g.db) { g.key = key; seed(K); } window.__simS = S; return K; }
  function render(S) {
    const K = ensure(S);
    const tabs = [['fm', 'Field Maps'], ['forms', 'טפסים'], ['data', 'נתונים']];
    const body = g.tab === 'forms' ? formsTab(K) : g.tab === 'data' ? dataTab(K) : fmTab(K);
    return `<div class="simroot"><div class="simtop"><div class="seg lg">${tabs.map(([k, l]) => `<button class="${g.tab === k ? 'on' : ''}" onclick="SimG.tab('${k}')">${l}</button>`).join('')}</div><span class="simver">סכמה v${esc(S.meta.version || '?')}</span></div>${body}</div>`;
  }
  const applies = (S) => !!(S.sim && S.sim.engine === 'generic');

  /* ---------- פעולות ---------- */
  const rr = () => {
    if (!(window.A && A.refresh)) return;
    const sb = [...document.querySelectorAll('[data-sb]')].map((e) => e.scrollTop), wy = window.scrollY, same = g.lastScr === top().s;
    A.refresh(); g.lastScr = top().s;
    if (same) { document.querySelectorAll('[data-sb]').forEach((e, i) => { e.scrollTop = sb[i] || 0; }); window.scrollTo(0, wy); }
  };
  let toastT = null;
  const toast = (t) => { g.toast = t; clearTimeout(toastT); toastT = setTimeout(() => { g.toast = ''; rr(); }, 2200); };
  const K0 = () => cfg(window.__simS);
  const commit = () => { if (!g.online) g.pending += 1; };
  function openForm(K, ent, vals, isNew, ref, parentEnt, parentGid) { g.showReq = false; g.nav.push({ s: 'form', ent, vals, isNew, ref, parentEnt, parent: parentGid }); }
  window.SimG = {
    tab(k) { g.tab = k; rr(); },
    seed() { seed(K0()); rr(); },
    online(v) { g.online = v; rr(); },
    sync() { const n = g.pending; g.pending = 0; const K = K0(); rows(K.main.name).forEach((m) => autoFill(K, K.main, m, null, false)); toast(`סונכרנו ${n} עריכות`); rr(); },
    note(t) { toast(t); rr(); },
    push(n) { g.nav.push(n); rr(); },
    back() { if (g.nav.length > 1) g.nav.pop(); g.showReq = false; rr(); },
    grp(k, v) { g.gopen[k] = v; rr(); },
    sel(i) { if (g.ext && g.ext.sel) { g.ext.sel(i); return; } g.sel = i; g.nav = [{ s: 'map' }]; rr(); },
    closePopup() { if (g.ext && g.ext.close) { g.ext.close(); return; } g.sel = null; g.nav = [{ s: 'map' }]; rr(); },
    tpl(val) { const K = K0(); g.drawVal = val; g.sel = null; g.sk = K.main.kind === 'point' ? [GPS.slice()] : []; g.nav.push({ s: 'sketch' }); rr(); },
    mapClick(ev, svg) {
      if (top().s !== 'sketch') { if (g.sel != null) { g.sel = null; rr(); } return; }
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse()), q = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
      if (K0().main.kind === 'point') g.sk = [q]; else g.sk.push(q); rr();
    },
    skUndo() { g.sk.pop(); rr(); }, skClear() { g.sk = []; rr(); },
    skGps() { g.sk.push([GPS[0] + (g.sk.length % 3) * 14 - 14, GPS[1] + (g.sk.length % 2) * 16 - 8]); toast('נוספה נקודה במיקום ה-GPS'); rr(); },
    sketchDone() {
      const K = K0(), kind = K.main.kind, min = kind === 'point' ? 1 : kind === 'line' ? 2 : 3;
      if (g.sk.length < min) { toast('חסרות נקודות'); rr(); return; }
      const v = { GlobalID: uid() };
      if (kind === 'point') v.__pt = g.sk[0].slice(); else v.__shape = [g.sk.slice()];
      if (K.templateField && g.drawVal) v[K.templateField] = g.drawVal;
      autoFill(K, K.main, v, null, true);
      g.nav.pop(); g.nav.pop(); openForm(K, K.main.name, v, true, null); rr();
    },
    fv(n, val) { const K = K0(), f = top(); f.vals[n] = val; const up = f.parent ? findRec(f.parentEnt, f.parent) : null; autoFill(K, K.E(f.ent), f.vals, up, false); rr(); },
    edit(ent, gid, viaLink) {
      if (g.ext && g.ext.ro) { toast('בתרחיש הזה הפעולה אינה פעילה: עריכה נעשית בכפתור Survey123, וביקורים בתרחיש "ביקור"'); rr(); return; }
      const K = K0(), r = findRec(ent, gid), rel = K.relTo(ent);
      if (viaLink) { g.link = link(K, 'updateFeature', ent, r); toast('קישור עומק: פותח את טופס העריכה'); }
      openForm(K, ent, Object.assign({}, r), false, r, rel && ent !== K.main.name ? rel.origin : null, rel && ent !== K.main.name ? r[rel.destKey] : null); rr();
    },
    s123Url(action, gid) { const K = K0(), id = (K.s123 && K.s123.itemId) || '<SURVEY_ITEM_ID>'; return 'arcgis-survey123://?itemID=' + id + (action === 'edit' ? '&action=edit&q:globalId=' + gid + '&folder=inbox&update=true' : '&action=collect') + '&callback=https://fieldmaps.arcgis.app'; },
    s123New() { g.link = SimG.s123Url('collect'); toast('הוספת ' + K0().main.alias + ' חדש: רק ב-Survey123 (קישור איסוף)'); rr(); },
    s123Edit(gid) { if (g.ext && g.ext.s123) { g.ext.s123(); return; } g.link = SimG.s123Url('edit', gid); toast('עריכה ב-Survey123: נפתחת הרשומה מה-Inbox'); rr(); },
    addKid(relName, pgid, viaLink) {
      if (g.ext && g.ext.ro) { toast('בתרחיש הזה הפעולה אינה פעילה: ביקורים בתרחיש "ביקור"'); rr(); return; }
      const K = K0(), rel = K.S.relationships.find((x) => x.name === relName), par = findRec(rel.origin, pgid), ent = K.E(rel.destination);
      const v = { GlobalID: uid(), [rel.destKey]: pgid }; autoFill(K, ent, v, par, true);
      if (viaLink) { g.link = link(K, 'addRelatedFeature', rel.origin, par, rel, parentPreset(K, rel, par)); toast('קישור עומק: טופס חדש, מקושר וממולא מראש'); }
      openForm(K, rel.destination, v, true, null, rel.origin, pgid); rr();
    },
    save() {
      const K = K0(), f = top(), ent = K.E(f.ent), up = f.parent ? findRec(f.parentEnt, f.parent) : null;
      if (missing(ent, f.vals, up || {}, f.isNew).length) { g.showReq = true; rr(); return; }
      autoFill(K, ent, f.vals, up, f.isNew);
      if (f.isNew) rows(f.ent).push(f.vals); else Object.assign(f.ref, f.vals);
      const saved = f.isNew ? f.vals : f.ref;
      if (f.ent !== K.main.name) fromKid(K, ent, saved);
      else K.relsOf(f.ent).forEach((rel) => kidsOf(rel, saved).forEach((k) => autoFill(K, K.E(rel.destination), k, saved, false)));
      commit(); toast(g.online ? (f.isNew ? 'נשלח' : 'עודכן') : 'נשמר במכשיר, ממתין לסנכרון');
      g.nav.pop(); g.showReq = false;
      if (f.isNew && f.ent === K.main.name) { g.nav = [{ s: 'map' }]; g.sel = rows(K.main.name).length - 1; }
      rr();
    },
    del() {
      const K = K0(), f = top();
      const drop = (ent, rec) => { K.relsOf(ent).forEach((rel) => kidsOf(rel, rec).forEach((k) => drop(rel.destination, k))); const a = rows(ent); a.splice(a.indexOf(rec), 1); };
      drop(f.ent, f.ref); commit(); toast('נמחק');
      if (f.ent === K.main.name) { g.sel = null; g.nav = [{ s: 'map' }]; } else { g.nav.pop(); if (top().s === 'popup') g.nav.pop(); }
      rr();
    },
    nightly() { nightly(K0()); g.sel = null; g.nav = [{ s: 'map' }]; rr(); },
    sc(i) {
      const K = K0(), x = K.sim.scenarios[i], M = rows(K.main.name);
      const anchor = x.near ? M.find((m) => m[K.statusField] === K.newValue) : null;
      let c = anchor ? centroid(anchor) : [80 + Math.random() * 200, 120 + Math.random() * 400];
      if (anchor) c = [c[0] + 44, c[1] + 40];
      const v = Object.assign({ GlobalID: uid() }, x.main || {}); place(v, K.main.kind, c[0], c[1], i + 5, 28);
      autoFill(K, K.main, v, null, true); M.push(v); g.sel = M.length - 1;
      if (x.child && K.childRel) { const k = Object.assign({ GlobalID: uid(), [K.childRel.destKey]: v.GlobalID }, x.child); autoFill(K, K.kid, k, v, true); rows(K.kid.name).push(k); }
      commit(); g.nav = [{ s: 'map' }]; toast('תרחיש: ' + x.title); rr();
    },
  };
  /* תצוגה לשימוש מתוך זרימת Field Maps <> Survey123 של sim.js.
     o.mode: 'map' | 'popup' (מסך אחד, הנתונים מסונכרנים מ-o.data) או 'auto' (טלפון אינטראקטיבי עצמאי).
     o.data: { שם ישות: שורות }, o.sel: אינדקס הישות הראשית הנבחרת, o.step: מזהה שלב (בשינויו הניווט מתאפס).
     o.ext: { sel, s123, close, ro } פעולות שמועברות חזרה לזרימה */
  function flowView(S, o) {
    const K = ensure(S), main = K.main.name;
    g.ext = o.ext || null;
    if (o.data) {
      Object.entries(o.data).forEach(([name, list]) => {
        if (!K.E(name)) return;
        const old = {}; rows(name).forEach((r) => { old[r.GlobalID] = r; });
        g.db[name] = (list || []).map((r, i) => {
          const c = Object.assign({}, r), e = old[r.GlobalID]; delete c.__ps;
          if (name === main) {
            if (r.__loc) place(c, K.main.kind, r.__loc.x * W, 60 + r.__loc.y * (H - 140), i);
            else if (e && (e.__pt || e.__shape)) { c.__pt = e.__pt; c.__shape = e.__shape; }
            else place(c, K.main.kind, 60 + (i * 83) % 240, 120 + (i * 61) % 380, i);
          }
          return c;
        });
      });
    }
    const fresh = g.flowStep !== o.step; g.flowStep = o.step;
    if (o.mode === 'auto') { if (fresh) { g.nav = [{ s: 'map' }]; g.sel = null; } }
    else {
      g.sel = o.sel == null ? null : o.sel;
      const rec = g.sel != null ? rows(main)[g.sel] : null;
      if (fresh || !rec) g.nav = o.mode === 'popup' && rec ? [{ s: 'map' }, { s: 'popup', ent: main, gid: rec.GlobalID }] : [{ s: 'map' }];
    }
    return screen(K);
  }
  window.SimGen = { render, applies, fmView(S) { g.ext = null; g.flowStep = null; return fmTab(ensure(S)); }, flowView, stepNote() { const K = cfg(window.__simS); return K.s123 && top().s === 'map' ? 'מסך המפה. הקשה על שלט פותחת את הכרטיס שלו, והקשה על הכרטיס פותחת את הפופאפ המלא. ה-+ לא מוסיף שלט ב-Field Maps: הוספה רק ב-Survey123.' : STEPS[top().s] || STEPS.map; } };
})();
