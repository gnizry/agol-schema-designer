/* סימולטור חוויית משתמש: Survey123 + Field Maps + נתונים — נבנה על הסכמה הפעילה.
   תנאי תצוגה מובנים נקראים משדה f.rel = {f:'שדה' | '^שדה-באב', op:'=' | 'in' | '!=', v: ערך | [ערכים]} */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })).toUpperCase();
  const st = { online: true, loc: null, pendingGeo: false, tab: 'flow', flow: 'edit', step: 0, inbox: true, col: {}, drafts: 0, outbox: 0, dlg: false, sent: 0, editId: null, tab0: 's123', variant: 'sign', auto: true, sign: {}, parts: [], visits: [], pi: 0, vi: 0, db: null, sel: null, modal: null, S: null };

  /* ---------- מבנה הסכמה ---------- */
  function model(S) {
    const main = S.entities.find((e) => e.kind === 'point') || S.entities[0];
    const kids = S.relationships.filter((r) => r.origin === main.name).map((r) => ({ rel: r, ent: S.entities.find((e) => e.name === r.destination) })).filter((k) => k.ent);
    return { main, A: kids[0], B: kids[1] };
  }
  const hidden = (f) => /^מוסתר/.test(f.visible || '') || f.mode === 'מערכת' || f.mode === 'היסטורי' || (f.type === 'GUID' && !f.pickFrom);
  const readonly = (f) => f.mode === 'אוטומטי' || /קריאה בלבד/.test(f.visible || '');
  /* readonly בעריכה בלבד: pulldata("@property",'mode')='edit' (Survey123 בלבד) */
  const lockEdit = (f) => !!(f.readonlyOnEdit && st.editId);
  /* תמונות לערכי רשימה (v.img = נתיב יחסי לתיקיית הארגון, למשל media/models/P3.1.png). נטענות מתיקיית הפרויקט הפתוחה */
  const Media = {
    cache: {}, resolver: null, onLoad: null,
    key(rel) { return ((window.__designer && window.__designer.cur) || '') + '|' + rel; },
    reset() { Object.keys(this.cache).forEach((k) => { if (typeof this.cache[k] === 'string') try { URL.revokeObjectURL(this.cache[k]); } catch (e) { /* */ } }); this.cache = {}; },
    get(rel) {
      if (!rel) return null;
      const k = this.key(rel), c = this.cache[k];
      if (typeof c === 'string') return c;
      if (c !== undefined || !this.resolver) return null;
      this.cache[k] = 0; // בטעינה
      this.resolver(rel).then((u) => { this.cache[k] = u || false; if (u && this.onLoad) this.onLoad(); }).catch(() => { this.cache[k] = false; });
      return null;
    },
  };
  window.Media = Media;
  function dom(S, f) { return f.domain && S.domains[f.domain] ? S.domains[f.domain] : null; }
  function parentField(S, ent, f) {
    const d = dom(S, f); if (!d || !d.values.some((v) => v.parent)) return null;
    const ps = new Set(d.values.map((v) => v.parent));
    return ent.fields.find((g) => g !== f && dom(S, g) && dom(S, g).values.some((v) => ps.has(v.label))) || null;
  }
  function relOk(f, vals, up) {
    const r = f.rel; if (!r) return true;
    if (r.all) return r.all.every((x) => relOk({ rel: x }, vals, up));
    if (r.any) return r.any.some((x) => relOk({ rel: x }, vals, up));
    let v = r.f[0] === '^' ? (up || {})[r.f.slice(1)] : vals[r.f]; if (v == null) v = '';
    const arr = Array.isArray(r.v) ? r.v : [r.v];
    if (r.op === 'in') return arr.includes(v);
    if (r.op === '!=') return !arr.includes(v);
    return v === r.v;
  }
  function isShown(f, vals, up) { return !hidden(f) && relOk(f, vals, up) !== false; }

  /* ---------- בקרי טופס ---------- */
  function control(S, ent, f, vals, up, onch) {
    const d = dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = readonly(f);
    const label = `<label style="display:block;font-weight:600;margin:10px 0 3px">${esc(f.alias || f.name)}${f.open ? ' <small style="color:#b45309">(פתוח)</small>' : ''}${ro ? ' <small style="color:#64748B">(אוטומטי)</small>' : ''}</label>`;
    const base = 'width:100%;padding:8px;border:1px solid #CBD5E1;border-radius:6px;font:inherit;box-sizing:border-box';
    let inp;
    if (f.pickFrom && !ro) { const ps = st.db.A.filter((p) => p.ParentGlobalID === (up || {}).GlobalID); inp = `<select style="${base}" onchange="${onch}('${f.name}',this.value)"><option value="">כלל השלט</option>${ps.map((p) => `<option value="${p.GlobalID}" ${p.GlobalID === v ? 'selected' : ''}>${esc((p.ComponentType || 'רכיב') + (p.Direction ? ' · ' + p.Direction : ''))}</option>`).join('')}</select>`; }
    else if (ro) inp = `<div style="${base};background:#F1F5F9;color:#64748B">${v ? esc(v) : '— יחושב אוטומטית —'}</div>`;
    else if (d) {
      const pf = parentField(S, ent, f); const pv = pf ? vals[pf.name] : null;
      const opts = d.values.filter((x) => !pf || !x.parent || x.parent === pv);
      inp = `<select style="${base}" onchange="${onch}('${f.name}',this.value)"><option value="">בחר…</option>${opts.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` + (pf && !pv ? `<small style="color:#b45309">נדרש לבחור קודם: ${esc(pf.alias)}</small>` : '');
    } else if (f.type === 'DATE') inp = `<input type="date" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="2" style="${base}" onchange="${onch}('${f.name}',this.value)">${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    return label + inp;
  }
  function formFields(S, ent, vals, up, onch) {
    const groups = {}; ent.fields.forEach((f) => { if (isShown(f, vals, up)) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((g) => `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:4px 12px 12px;margin:10px 0"><div style="font-weight:700;color:#1E3A8A;margin-top:8px">${esc(g)}</div>${groups[g].map((f) => control(S, ent, f, vals, up, onch)).join('')}</div>`).join('');
  }
  const phone = (title, inner) => `<div style="width:390px;max-width:100%;border:8px solid #0F172A;border-radius:26px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18)"><div style="background:#1E3A8A;color:#fff;padding:10px 14px;font-weight:700">${title}</div><div dir="rtl" style="padding:6px 10px 14px;max-height:640px;overflow:auto;text-align:right">${inner}</div></div>`;

  /* ---------- נתוני דוגמה ---------- */
  function sample(S, ent, i, up) {
    const o = {};
    ent.fields.forEach((f) => {
      if (f.type === 'GUID') return;
      const d = dom(S, f);
      if (d) { const pf = parentField(S, ent, f); const vals = d.values.filter((x) => !pf || x.parent === o[pf.name]); const pool = vals.length ? vals : d.values; if (pool.length) o[f.name] = pool[i % pool.length].label; }
      else if (f.type === 'DATE') o[f.name] = '2026-0' + (1 + (i % 9)) + '-1' + (i % 9);
      else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) o[f.name] = i + 1;
      else o[f.name] = f.alias ? f.alias + ' ' + (i + 1) : '';
    });
    return o;
  }
  function seed(S) {
    const M = model(S); st.db = { main: [], A: [], B: [] };
    for (let i = 0; i < 4; i++) {
      const s = sample(S, M.main, i * 3); s.GlobalID = uid(); st.db.main.push(s);
      for (let k = 0; k < 2 + (i % 2); k++) { const p = sample(S, M.A.ent, i + k * 2, s); p.GlobalID = uid(); p.ParentGlobalID = s.GlobalID; st.db.A.push(p); }
      if (M.B) for (let k = 0; k < i; k++) { const v = sample(S, M.B.ent, i + k, s); v.GlobalID = uid(); v.ParentGlobalID = s.GlobalID; st.db.B.push(v); }
    }
  }
  const ensure = (S) => { if (!st.db) seed(S); };

  /* ---------- שמירה (סימולציה של מה שקורה בשרת) ---------- */
  function applyAuto(S, M, signRec, visit) {
    if (!st.auto) return;
    if (visit.RelatedPartGlobalID) return;
    if (visit.StatusAtVisit) signRec.SignStatus = visit.StatusAtVisit;
    if (visit.SafetyHazardAtVisit) signRec.SafetyHazard = visit.SafetyHazardAtVisit;
  }
  function addVisit(S, M, signRec, parentRec, v) {
    v.GlobalID = uid(); v.ParentGlobalID = parentRec.GlobalID; st.db.B.push(v); applyAuto(S, M, signRec, v);
  }

  /* ---------- Survey123 ---------- */


  /* ---------- מיקום וכתובת יערנית מחושבת (הדמיה של pulldata @layer) ---------- */
  const GEO = {
    DistrictName: ['מרחב צפון', 'מרחב מרכז', 'מרחב דרום', 'מרחב ירושלים'], RegionName: [1, 2, 3, 4].map((n) => 'אזור דוגמה ' + n), GushName: [1, 2, 3, 4].map((n) => 'גוש דוגמה ' + n),
    ForestName: [1, 2, 3, 4].map((n) => 'יער דוגמה ' + n), ForestNumber: [101, 202, 303, 404], ResponsibleUnit: [1, 2, 3, 4].map((n) => 'יחידה אחראית דוגמה ' + n),
    RoadName: [1, 2, 3, 4].map((n) => 'דרך דוגמה ' + n), RoadColor: ['כחול', 'אדום', 'ירוק', 'שחור']
  };
  const calcFields = (M) => M.main.fields.filter((f) => f.calc);
  const geoFields = (M) => M.main.fields.filter((f) => /@layer/.test(f.calc || '') || (GEO[f.name] && f.mode === 'אוטומטי'));
  const newId = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return 'SGN-' + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + (1000 + Math.floor(Math.random() * 9000)); };
  /* שדות קודים/נגזרים: ערך שדה מקור (דומיין) → תכונת ext שלו, מחושב בשינוי */
  const today = () => new Date().toISOString().slice(0, 10);
  const autoVal = (f) => f.autoValue === 'today' ? today() : f.autoValue === 'username' ? 'משתמש מחובר' : f.autoValue === 'usernameList' ? ((dom(st.S, f) || { values: [] }).values[0] || {}).label || '' : '';
  const isReq = (f, vals, up) => f.required === true || (f.reqIf ? relOk({ rel: f.reqIf }, vals, up) : false);
  const newRow = (ent) => { const o = {}; ent.fields.forEach((f) => { if (f.autoValue && !f.autoOnCreate) o[f.name] = autoVal(f); }); return o; };
  function derive(ent, vals, up) {
    ent.fields.forEach((g) => { const pf = dom(st.S, g) && parentField(st.S, ent, g); if (pf && vals[g.name]) { const hit = dom(st.S, g).values.find((x) => x.label === vals[g.name]); if (!hit || (hit.parent && hit.parent !== vals[pf.name])) vals[g.name] = ''; } });
    ent.fields.forEach((g) => { const pf = dom(st.S, g) && parentField(st.S, ent, g); if (pf && !vals[g.name] && vals[pf.name]) { const o = dom(st.S, g).values.filter((x) => !x.parent || x.parent === vals[pf.name]); if (o.length === 1) vals[g.name] = o[0].label; } });
    ent.fields.forEach((f) => {
      if (f.derive) { const src = ent.fields.find((g) => g.name === f.derive.from), d = src && dom(st.S, src), hit = d && d.values.find((x) => x.label === vals[src.name]); vals[f.name] = hit ? (hit[f.derive.attr || 'ext'] || '') : ''; }
      if (f.rel && !relOk(f, vals, up)) { if (!f.fromVisit) vals[f.name] = ''; }
      else if (f.autoValue && !vals[f.name] && !(f.autoOnCreate && st.editId)) vals[f.name] = autoVal(f);
    });
  }
  /* עותק נוכחי בשלט מהביקור האחרון (indexed-repeat על שורת הביקור האחרונה) */
  function syncSign() {
    const M = model(st.S), lv = st.visits.filter((x) => !x.RelatedPartGlobalID).pop(); if (!lv) return;
    M.main.fields.filter((f) => f.fromVisit).forEach((f) => { if (lv[f.fromVisit] && (!f.fromVisitWhen || lv[f.fromVisitWhen.f] === f.fromVisitWhen.v)) st.sign[f.name] = lv[f.fromVisit]; else if (f.fromVisitWhen && lv[f.fromVisitWhen.f]) st.sign[f.name] = ''; });
    derive(M.main, st.sign, {});
  }
  function allDerive() { const M = model(st.S); derive(M.main, st.sign, {}); st.parts.forEach((p) => derive(M.A.ent, p, st.sign)); if (M.B) st.visits.forEach((v) => derive(M.B.ent, v, st.sign)); syncSign(); }
  function missing() {
    const M = model(st.S), out = [];
    if (!st.editId && !st.loc) out.push('מיקום השלט');
    const chk = (ent, vals, up, tag) => ent.fields.forEach((f) => { if (isShown(f, vals, up) && !readonly(f) && !lockEdit(f) && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === '')) out.push(tag + (f.alias || f.name)); });
    chk(M.main, st.sign, {}, '');
    st.parts.forEach((p, i) => chk(M.A.ent, p, st.sign, 'רכיב ' + (i + 1) + ': '));
    if (M.B && st.variant === 'sign') st.visits.forEach((v, i) => chk(M.B.ent, v, st.sign, 'ביקור ' + (i + 1) + ': '));
    return out;
  }
  const zoneOf = (loc) => (loc.x < 0.5 ? 0 : 1) + (loc.y < 0.5 ? 0 : 2);
  function zoneVal(f, zi) { const g = GEO[f.name]; return g ? g[zi] : ['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type) ? zi + 1 : (f.alias || f.name) + ' (דוגמה ' + (zi + 1) + ')'; }
  function applyGeo() {
    const M = model(st.S); if (!st.loc) return;
    const zi = zoneOf(st.loc);
    geoFields(M).forEach((f) => { st.sign[f.name] = st.online ? zoneVal(f, zi) : ''; });
    st.pendingGeo = !st.online;
  }

  /* ---------- מסכי אפליקציית Survey123 (מכויל לפי צילומי מסך אמיתיים מהאפליקציה) ---------- */
  const GREEN = '#2E7D32', BODY = '#EAF2E9', BAND = '#D3E2D1', BLUE = '#1F5FA8', LINE = '#ADB5AB';
  const svg = (p, c, s) => `<svg width="${s || 24}" height="${s || 24}" viewBox="0 0 24 24" fill="none" stroke="${c || '#fff'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${p}</svg>`;
  const IC = {
    menu: svg('<path d="M3 6h18M3 12h18M3 18h18"/>'),
    gps: (c) => svg('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>', c || '#fff'),
    cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', '#2F6FB5', 22),
    inbox: svg('<path d="M3 13l2.5-8h13L21 13v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M12 3v6M9 6.5L12 9l3-2.5"/>', '#fff', 32),
    send: svg('<path d="M3 11l18-8-7 18-3-8z"/><path d="M11 13L21 3"/>', '#fff', 30),
    pen: svg('<path d="M4 20l1-4 11-11 3 3L8 19z"/>', '#fff', 28),
    folder: svg('<path d="M3 6h6l2 2h10v11H3z"/>', '#6B766A', 30),
    camera: svg('<path d="M3 8h4l2-3h6l2 3h4v12H3z"/><circle cx="12" cy="13" r="3.5"/>', '#6B766A', 30),
    trash: (c) => svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', c, 24),
    plus: svg('<path d="M12 5v14M5 12h14"/>', '#444', 22)
  };
  function sPhone(inner, o) {
    o = o || {};
    const nav = o.close ? '✕' : o.back ? '›' : '';
    return `<div style="position:relative;width:390px;max-width:100%;border:8px solid #0F172A;border-radius:30px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18);font-family:Roboto,'Segoe UI',Tahoma,sans-serif">
<div dir="ltr" style="background:${GREEN};color:#fff;font-size:11px;display:flex;justify-content:space-between;padding:4px 14px"><span>9:41</span><span>▂▄▆ 100%</span></div>
<div dir="rtl" style="background:${GREEN};color:#fff;display:flex;align-items:center;gap:14px;padding:12px 14px"><span style="font-size:${o.close ? 20 : 28}px;width:22px;text-align:center;line-height:1">${nav}</span><b style="flex:1;font-size:21px;font-weight:500">${o.title || ''}</b>${IC.gps()}${IC.menu}</div>
<div data-sb="1" dir="rtl" style="max-height:560px;overflow:auto;text-align:right;color:#212121;background:${o.bg || '#fff'}">${inner}</div>${o.bottom || ''}${o.overlay || ''}</div>`;
  }
  /* כפתור "פיל" של מסך הכניסה: עיגול צבעוני מימין, כותרת, מונה וחץ משמאל */
  const pill = (bg, icon, t, cnt, onc) => `<div ${onc ? `onclick="${onc}"` : ''} dir="rtl" style="display:flex;align-items:center;gap:14px;background:#fff;border-radius:40px;box-shadow:0 1px 6px rgba(0,0,0,.2);padding:6px 8px 6px 18px;margin:0 10px 10px;cursor:${onc ? 'pointer' : 'default'}"><span style="width:56px;height:56px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:38px;line-height:1">${icon}</span><b style="flex:1;font-size:22px">${t}</b>${cnt != null ? `<span style="font-size:17px;font-weight:600;color:#333;margin-left:6px">${cnt}</span>` : ''}<span style="color:#777;font-size:26px">‹</span></div>`;
  function s123Home(S, M) {
    const dt = new Date(), fd = (x) => `${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}`, ft = (x) => `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`;
    const card = `<div dir="rtl" style="display:flex;gap:12px;padding:14px 12px;align-items:flex-start"><div style="flex:none;width:130px;height:72px;border-radius:6px;background:linear-gradient(135deg,#6FA86B,#2E5E2A);display:flex;align-items:center;justify-content:center;font-size:40px">🌲</div><div style="flex:1;line-height:1.35"><div style="font-weight:700;font-size:19px;margin-bottom:4px">${esc(S.meta.title || 'סקר שילוט')}</div><div style="font-size:14px;color:#444">בעלים: ${esc(S.meta.owner || '—')}</div><div style="font-size:14px;color:#444">נוצר: ${fd(dt)} ${ft(dt)}</div><div style="font-size:14px;color:#444">תאריך שינוי: ${fd(dt)} ${ft(dt)}</div></div></div>`;
    const pills = pill('#3B78B5', '+', 'איסוף', null, 'SimA.startNew()')
      + (st.inbox ? pill('#12B5EC', IC.inbox, 'דואר נכנס', st.db ? st.db.main.length : 0, 'SimA.step(2)') : '')
      + (st.drafts ? pill('#F28E2B', IC.pen, 'טיוטות', st.drafts) : '')
      + (st.outbox ? pill('#2E7D32', IC.send, 'דואר יוצא', st.outbox) : '')
      + pill('#7F7F7F', IC.send, 'נשלח', st.sent);
    return sPhone(`<div style="min-height:540px;display:flex;flex-direction:column;background:#F2F2F2">${card}<div style="margin-top:auto;padding-top:20px">${pills}</div></div>`, { title: esc(S.meta.title || 'סקר שילוט'), back: true, bg: '#F2F2F2' });
  }
  function s123Inbox(S, M) {
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    if (!st.inbox) return sPhone(`<div style="padding:24px 16px;color:#757575;text-align:center">התיקייה דואר נכנס אינה זמינה בסקר זה.<br><small>הפעלה: הגדרות הסקר › Inbox (מופעל).</small></div>`, { title: 'דואר נכנס', back: true });
    const card = sg ? `<div onclick="SimA.startEdit()" style="margin:10px 12px;border-radius:8px;padding:12px;cursor:pointer;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)"><div style="font-weight:700;font-size:17px">${esc(sg.SignID || 'שלט')}</div><div style="color:#757575;font-size:13px">${esc(sg.SignModel || '')}</div><div style="margin-top:4px">${chipHtml(sg.SignStatus)}</div></div>` : '<div style="padding:16px;color:#757575">אין רשומות</div>';
    const inner = `<div style="min-height:540px;background:#F2F2F2"><div style="padding:8px 12px;color:#757575;font-size:12px">מסונן לפי q:globalId · רשומה אחת</div>${card}<div style="padding:4px 16px;color:#757575;font-size:12px">בקישור עם update=true הרשימה מתרעננת לפני הפתיחה. רשומה יחידה נפתחת אוטומטית.</div></div>`;
    return sPhone(inner, { title: 'דואר נכנס', back: true, bg: '#F2F2F2' });
  }
  /* פס קבוצה מתקפל (begin group עם appearance=collapsible): כותרת מודגשת + משולש משמאל לטקסט */
  const isCol = (k) => st.col[k] === undefined ? /\|כתובת יערנית$/.test(k) : st.col[k];
  const band = (t, key, sum) => `<div onclick="SimA.grp('${key}')" dir="rtl" style="background:${BAND};padding:13px 16px;font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px"><span>${t}</span><span style="font-size:13px;color:#444">${isCol(key) ? '◂' : '▾'}</span>${sum && isCol(key) ? `<span style="font-weight:400;font-size:13px;color:#4F6B4C;margin-right:auto">${esc(sum)}</span>` : ''}</div>`;
  function mControl(S, ent, f, vals, up, onch) {
    const d = dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = readonly(f) || lockEdit(f);
    const req = !ro && isReq(f, vals, up), bad = req && st.showReq && (v === '' || v == null);
    const lab = `<div style="font-size:16px;margin:16px 0 5px;color:#222">${esc(f.alias || f.name)}${req ? ' <span style="color:#C62828">*</span>' : ''}</div>`;
    const box = `position:relative;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid ${bad ? '#C62828' : LINE};border-radius:3px;min-height:42px;padding:0 10px;box-sizing:border-box`;
    const clr = (has) => has && !ro ? `<span onclick="${onch}('${f.name}','')" style="position:relative;z-index:2;color:#5F6B5C;font-size:17px;cursor:pointer;line-height:1">⊗</span>` : '';
    const val = (t, ph) => `<span style="flex:1;color:${t ? BLUE : '#9AA39A'};min-height:20px">${t ? esc(t) : esc(ph || '')}</span>`;
    const inpS = `flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;color:${BLUE};padding:10px 0`;
    let inp;
    if (f.pickFrom && !ro) {
      const key = (p) => p.GlobalID || p.__k || (p.__k = uid()), lbl = (p, i) => (i + 1) + '. ' + (p.ComponentType || 'רכיב') + (p.Direction ? ' · ' + p.Direction : '') + (p.Level ? ' · ' + p.Level : '') + (p.WingNumber ? ' · כנף ' + p.WingNumber : '');
      const hit = st.parts.find((p, i) => key(p) === v);
      inp = `<div style="${box}">${val(hit ? lbl(hit, st.parts.indexOf(hit)) : '', st.parts.length ? '' : 'אין רכיבים בטופס')}${clr(v)}<span style="color:#555;font-size:15px">⌄</span><select style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer" onchange="${onch}('${f.name}',this.value)"><option value=""></option>${st.parts.map((p, i) => `<option value="${esc(key(p))}" ${key(p) === v ? 'selected' : ''}>${esc(lbl(p, i))}</option>`).join('')}</select></div>`;
    } else if (ro) inp = `<div style="${box};background:#F4F6F3;color:${v ? BLUE : '#7A837A'}">${v ? esc(v) : f.derive ? 'יחושב לאחר בחירת ' + ((ent.fields.find((g) => g.name === f.derive.from) || {}).alias || f.derive.from) : (f.calc && /@layer/.test(f.calc)) || GEO[f.name] ? (st.loc ? (st.online ? '—' : 'תחושב בשרת אחרי סנכרון') : 'יחושב לאחר בחירת מיקום') : '—'}</div>`;
    else if (d) {
      const pf = parentField(S, ent, f); const pv = pf ? vals[pf.name] : null;
      const opts = d.values.filter((x) => !pf || !x.parent || x.parent === pv);
      if (pf && !pv) inp = `<div style="${box};color:#8A938A;background:#F4F6F3">יש לבחור קודם: ${esc(pf.alias)}</div>`;
      else if (opts.some((o) => o.img)) {
        const th = (o) => { const u = Media.get(o.img); return u ? `<img src="${u}" alt="" style="width:76px;height:56px;object-fit:contain;background:#fff;border:1px solid ${LINE};border-radius:3px;flex:none">` : `<span style="width:76px;height:56px;flex:none;background:#F4F6F3;border:1px dashed #B8C0B6;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#8A938A;text-align:center">${o.img ? 'תמונה' : 'ללא תמונה'}</span>`; };
        const sel = opts.find((o) => o.label === v);
        inp = opts.map((o) => `<div data-v="${esc(o.label)}" onclick="${onch}('${f.name}',this.dataset.v)" style="display:flex;align-items:center;gap:10px;padding:6px 4px;cursor:pointer;border-bottom:1px solid #E6EAE4;background:${o.label === v ? '#EEF5EC' : 'transparent'}"><span style="width:18px;height:18px;flex:none;border-radius:50%;border:2px solid ${o.label === v ? GREEN : '#757575'};display:inline-flex;align-items:center;justify-content:center">${o.label === v ? `<span style="width:9px;height:9px;border-radius:50%;background:${GREEN}"></span>` : ''}</span>${th(o)}<span style="flex:1;font-size:14px">${esc(o.label)}</span></div>`).join('');
        if (sel && sel.img) { const u = Media.get(sel.img); inp += `<div style="margin-top:12px;border:1px solid ${LINE};border-radius:3px;padding:8px;background:#fff"><div style="font-size:13px;color:#4F6B4C;margin-bottom:6px">נבחר: <b>${esc(sel.label)}</b>. ודא שזה הסיווג הנכון לשלט שבשטח</div>${u ? `<img src="${u}" alt="" style="width:100%;max-height:300px;object-fit:contain;display:block">` : '<div style="height:120px;display:flex;align-items:center;justify-content:center;background:#F4F6F3;color:#8A938A;font-size:13px;text-align:center">התמונה נטענת מתיקיית הפרויקט הפתוחה ב-Chrome או Edge</div>'}</div>`; }
      }
      else if (f.appearance === 'radio') inp = opts.map((o) => `<div data-v="${esc(o.label)}" onclick="${onch}('${f.name}',this.dataset.v)" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer"><span style="width:18px;height:18px;border-radius:50%;border:2px solid ${o.label === v ? GREEN : '#757575'};display:inline-flex;align-items:center;justify-content:center">${o.label === v ? `<span style="width:9px;height:9px;border-radius:50%;background:${GREEN}"></span>` : ''}</span>${esc(o.label)}</div>`).join('');
      else inp = `<div style="${box}">${val(v, opts.length ? '' : 'הרשימה טרם נמסרה')}${clr(v)}<span style="color:#555;font-size:15px">⌄</span><select style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer" onchange="${onch}('${f.name}',this.value)"><option value=""></option>${opts.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>`;
    } else if (f.type === 'DATE') {
      const dd = v ? new Date(v) : null, t = dd && !isNaN(dd) ? dd.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      inp = `<div style="${box}">${IC.cal}${val(t, 'תאריך')}${clr(v)}<input type="date" value="${esc(v)}" style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer" onchange="${onch}('${f.name}',this.value)"></div>`;
    } else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<div style="${box}"><input type="number" inputmode="numeric" style="${inpS}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">${clr(v)}</div>`;
    else if (Number(f.length) >= 500) inp = `<div style="${box}"><textarea rows="3" style="${inpS}" onchange="${onch}('${f.name}',this.value)">${esc(v)}</textarea></div>`;
    else inp = `<div style="${box}"><input type="text" style="${inpS}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">${clr(v)}</div>`;
    const warn = f.warn === 'partsNotOk' && v === 'תקין' && st.visits.some((x) => x.RelatedPartGlobalID && ['לא תקין', 'חסר'].includes(x.PartStatusAtVisit)) ? `<div style="margin-top:6px;background:#FFF4D6;border:1px solid #F0C36D;border-radius:3px;padding:6px 10px;font-size:13px;color:#7A5200">שים לב: בביקור זה דווח רכיב לא תקין או חסר, והמצב שנבחר לשלט הוא תקין.</div>` : '';
    return lab + inp + (bad ? '<div style="color:#C62828;font-size:12px;margin-top:3px">זהו שדה חובה</div>' : '') + warn;
  }
  const attach = (ent) => ent.attachments ? `<div style="font-size:16px;margin:18px 0 4px">תמונה/ות</div><div style="display:flex;gap:30px;justify-content:center;padding:8px 0">${IC.folder}${IC.camera}</div>` : '';
  function mFields(S, ent, vals, up, onch, flat) {
    const vis = ent.fields.filter((f) => isShown(f, vals, up));
    if (flat) return `<div style="padding:0 10px 4px">${vis.map((f) => mControl(S, ent, f, vals, up, onch)).join('')}${attach(ent)}</div>`;
    const groups = {}; vis.forEach((f) => (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f));
    const ord = ent.groupOrder || []; return Object.keys(groups).sort((a, b) => (ord.indexOf(a) < 0 ? 99 : ord.indexOf(a)) - (ord.indexOf(b) < 0 ? 99 : ord.indexOf(b))).map((g) => { const k = ent.name + '|' + g; return band(esc(g), k, g === 'כתובת יערנית' ? vals.ForestName : '') + (isCol(k) ? '' : `<div style="padding:0 14px 8px">${groups[g].map((f) => mControl(S, ent, f, vals, up, onch)).join('')}</div>`); }).join('') + `<div style="padding:0 14px">${attach(ent)}</div>`;
  }
  const dms = (v, p, n) => { const a = Math.abs(v), d = Math.floor(a), m = Math.floor((a - d) * 60); return d + '°' + m + "'" + (v >= 0 ? p : n); };
  function s123Phone(S, M, title) {
    /* שאלת מיקום (geopoint): שורת קואורדינטות + דיוק, כפתור ⌖, מפה קטנה עם סיכה כחולה ועיגולי רשומות קיימות */
    const L = st.loc, lat = L ? 31.80 + (0.5 - L.y) * 0.04 : 0, lon = L ? 34.90 + (L.x - 0.5) * 0.04 : 0;
    const dots = ((st.db && st.db.main) || []).slice(0, 10).map((s, i) => `<span style="position:absolute;left:${(i * 37 + 11) % 88 + 5}%;top:${(i * 53 + 7) % 68 + 12}%;width:16px;height:16px;border-radius:50%;background:${statusColor(s.SignStatus)};border:2px solid #fff;opacity:.85;transform:translate(-50%,-50%);pointer-events:none"></span>`).join('');
    const pin = L ? `<span style="position:absolute;left:${L.x * 100}%;top:${L.y * 100}%;width:46px;height:46px;border-radius:50%;background:rgba(47,127,193,.22);border:1px solid rgba(47,127,193,.6);transform:translate(-50%,-50%);pointer-events:none"></span><svg width="26" height="34" viewBox="0 0 26 34" style="position:absolute;left:${L.x * 100}%;top:${L.y * 100}%;transform:translate(-50%,-100%);pointer-events:none"><path d="M13 33C13 33 2 20 2 12a11 11 0 0122 0c0 8-11 21-11 21z" fill="#2F7FC1" stroke="#fff" stroke-width="2"/><circle cx="13" cy="12" r="4" fill="#fff"/></svg>` : '';
    const zlab = (n, p) => `<span style="position:absolute;${p};font-size:10px;color:#4F7A4B;opacity:.85;pointer-events:none">יער דוגמה ${n}</span>`;
    const map = `<div onclick="SimA.pinAt(event,this)" style="position:relative;height:130px;overflow:hidden;background:#E6EDDA;cursor:crosshair"><svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none"><path d="M0 44C25 34 48 58 100 22" stroke="#fff" stroke-width="2.2" fill="none"/><path d="M0 14C30 20 55 6 100 12" stroke="#C9D6B8" stroke-width="1" fill="none"/><path d="M0 52C35 46 60 54 100 46" stroke="#C9D6B8" stroke-width="1" fill="none"/><path d="M50 0V60M0 30H100" stroke="#9FBE97" stroke-width=".5" stroke-dasharray="2 2"/></svg>${zlab(1, 'right:6px;top:4px')}${zlab(2, 'left:6px;top:4px')}${zlab(3, 'right:6px;bottom:14px')}${zlab(4, 'left:6px;bottom:14px')}${dots}${pin}<span style="position:absolute;left:6px;bottom:2px;font-size:9px;color:#555;pointer-events:none">50 מ׳</span><span style="position:absolute;right:6px;bottom:2px;font-size:9px;color:#777;pointer-events:none">Esri</span></div>`;
    const coord = L ? `<span dir="ltr" style="flex:1;font-size:13px;color:${BLUE};text-align:right">${dms(lat, 'N', 'S')} ${dms(lon, 'E', 'W')} ± 4.0 m</span>` : `<span style="flex:1;font-size:13px;color:#8A938A">לחץ על המפה להצבת הנקודה, או על ⌖ לקליטת GPS</span>`;
    const loc = st.editId ? '' : `<div style="padding:0 14px"><div style="font-size:16px;margin:16px 0 5px">מיקום השלט <span style="color:#C62828">*</span></div><div style="background:#fff;border:1px solid ${st.showReq && !L ? '#C62828' : LINE};border-radius:3px;overflow:hidden"><div dir="rtl" style="display:flex;align-items:center;gap:10px;padding:6px 10px"><span onclick="SimA.gps()" style="cursor:pointer;display:flex">${IC.gps('#2F6FB5')}</span>${coord}</div>${map}</div>${st.showReq && !L ? '<div style="color:#C62828;font-size:12px;margin-top:3px">זהו שדה חובה</div>' : ''}</div>`;
    /* חזרה (repeat): פס כותרת מתקפל, תת-טופס של הרשומה הנוכחית, ופס דפדוף: + משמאל, "1 מתוך N" באמצע, פח מימין */
    const repeat = (title, arr, idx, kind, ent, up, onchFn) => {
      const n = arr.length, i = Math.min(idx, Math.max(0, n - 1)), key = 'rep|' + kind;
      const arrow = (t, on, dis) => `<span onclick="${dis ? '' : on}" style="font-size:22px;padding:0 6px;color:${dis ? '#BDBDBD' : '#444'};cursor:${dis ? 'default' : 'pointer'}">${t}</span>`;
      const bar = `<div dir="ltr" style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px;border:1px solid ${LINE};border-radius:26px;background:#F4F8F3;padding:4px 8px"><span onclick="SimA.add('${kind}')" title="הוסף" style="width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid ${LINE};display:flex;align-items:center;justify-content:center;cursor:pointer">${IC.plus}</span><span style="display:flex;align-items:center;font-size:15px">${n > 1 ? arrow('‹', `SimA.pg('${kind}',-1)`, i <= 0) : ''}<span dir="rtl" style="min-width:70px;text-align:center">${n ? (i + 1) + ' מתוך ' + n : '0 מתוך 0'}</span>${n > 1 ? arrow('›', `SimA.pg('${kind}',1)`, i >= n - 1) : ''}</span><span onclick="${n ? `SimA.del('${kind}')` : ''}" title="מחק" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:${n ? 'pointer' : 'default'}">${IC.trash(n ? '#555' : '#BDBDBD')}</span></div>`;
      const body = n ? mFields(S, ent, arr[i], up, `${onchFn}.bind(null,${i})`, true) : `<div style="padding:14px 10px;color:#757575">אין רשומות. לחץ + להוספה.</div>`;
      return band(title, key) + (isCol(key) ? '' : `<div style="margin:0 8px;border:1px solid ${LINE};border-radius:4px;background:#DCE8DA;padding:0 4px 4px">${body}${bar}</div>`);
    };
    const rep = repeat(esc(M.A.ent.alias), st.parts, st.pi, 'parts', M.A.ent, st.sign, 'SimA.pv');
    const nOld = st.editId && M.B ? st.db.B.filter((v) => v.ParentGlobalID === st.editId).length : 0;
    const vis = M.B && st.variant === 'sign' ? (st.editId ? `<div style="padding:6px 16px;color:#5F6B5C;font-size:12px">קיימים ${nOld} ביקורים קודמים (לא מוצגים לעריכה; כאן מוסיפים ביקורים חדשים)</div>` : '') + repeat(esc(M.B.ent.alias), st.visits, st.vi, 'visits', M.B.ent, st.sign, 'SimA.vv') : '';
    const bottom = `<div dir="ltr" style="display:flex;justify-content:space-between;align-items:center;padding:6px 16px;border-top:1px solid #D0D5CE;background:#fff;box-shadow:0 -2px 6px rgba(0,0,0,.08)"><span onclick="SimA.dlg(true)" title="שליחה" style="font-size:30px;color:#444;cursor:pointer;padding:0 8px;line-height:1.3">✓</span><span style="color:#8A938A;font-size:12px">${st.editId ? 'עריכת רשומה' : 'רשומה חדשה'}</span></div>`;
    const dlg = st.dlg ? `<div dir="rtl" style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end"><div style="background:#fff;width:100%;border-radius:14px 14px 0 0;padding:6px 0"><div onclick="SimA.send()" style="padding:14px 18px;cursor:pointer">שלח עכשיו</div><div onclick="SimA.outbox()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בדואר יוצא</div><div onclick="SimA.draft()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בטיוטות</div><div onclick="SimA.dlg(false)" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE;color:#757575">המשך מילוי</div></div></div>` : '';
    return sPhone(`<div style="padding-bottom:16px">${loc}${mFields(S, M.main, st.sign, {}, 'SimA.sv')}${rep}${vis}</div>`, { title: esc(S.meta.title || title), close: true, bg: BODY, bottom: (st.showReq && missing().length ? `<div style="background:#C62828;color:#fff;padding:7px 14px;font-size:13px">חסרים ${missing().length} שדות חובה: ${esc(missing().slice(0, 3).join(', '))}${missing().length > 3 ? '…' : ''}</div>` : '') + bottom, overlay: dlg });
  }
  const ent_fields = (S, ent, vals, up, onch) => mFields(S, ent, vals, up, onch);
  function s123(S, M) {
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${s123Phone(S, M, 'Survey123 · ' + esc(M.main.alias))}<div style="flex:1;min-width:260px"><h3 style="margin-top:0">מה אתה בודק כאן</h3><ul style="line-height:1.9"><li>אילו שדות הסוקר רואה ובאיזה סדר; שדות אוטומטיים מוצגים אפורים.</li><li>תנאי תצוגה: מוצגים לפי <code>rel</code> בשדה (לדוגמה סיכון בטיחותי רק כש"לא תקין").</li><li>סינון דגם לפי משפחה (תת-דגם מסונן לפי הבחירה הקודמת).</li><li>כמה שדות וכמה Repeat צריך למלא כדי לתעד שלט אחד.</li></ul><p style="color:#64748B">שליחה יוצרת רשומות בטבלאות הסימולציה, ואפשר לראות אותן בלשונית Field Maps ובלשונית נתונים.</p></div></div>`;
  }

  /* ---------- זרימה: Field Maps ↔ Survey123 ---------- */
  const ITEM = '<SURVEY_ITEM_ID>';
  const FLOWS = {
    edit: ['Field Maps: בחירת שלט', 'Field Maps: פופאפ וקישור', 'Survey123: Inbox', 'Survey123: טופס עריכה', 'חזרה ל-Field Maps'],
    new: ['Survey123: מסך הסקר (איסוף)', 'Survey123: טופס חדש', 'בדיקה ב-Field Maps'],
    visitfm: ['Field Maps: בחירת שלט', 'Field Maps: פופאפ וסוג ביקור', 'Field Maps: טופס ביקור', 'תוצאה במפה'],
  };
  function dots(onc) {
    return st.db.main.map((s, i) => { const x = s.__loc ? 10 + s.__loc.x * 300 : 40 + (i * 83) % 280, y = s.__loc ? 10 + s.__loc.y * 210 : 40 + (i * 61) % 180; return `<div onclick="${onc}(${i})" style="position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:${statusColor(s.SignStatus)};border:3px solid ${st.sel === i ? '#0F172A' : '#fff'};box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`; }).join('');
  }
  const mapBox = (inner) => `<div style="position:relative;height:260px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${inner}</div>`;
  function flowTab(S, M) {
    ensure(S);
    const kind = st.flow === 'visit' ? (st.vch === 's123' ? 'edit' : 'visitfm') : st.flow;
    const steps = FLOWS[kind], cur = Math.min(st.step, steps.length - 1);
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    const gid = sg ? sg.GlobalID : '<GlobalID>';
    const urlE = `arcgis-survey123://?itemID=${ITEM}&action=edit&q:globalId=${gid}&folder=inbox&update=true&callback=https://fieldmaps.arcgis.app`;
    const urlN = `arcgis-survey123://?itemID=${ITEM}&action=collect&callback=https://fieldmaps.arcgis.app`;
    const chips = steps.map((l, i) => `<span style="padding:5px 10px;border-radius:14px;font-size:12px;border:1px solid ${i === cur ? '#1E3A8A' : '#CBD5E1'};background:${i === cur ? '#1E3A8A' : i < cur ? '#DBEAFE' : '#fff'};color:${i === cur ? '#fff' : '#0F172A'}">${i + 1}. ${esc(l)}</span>`).join('<span style="color:#94A3B8">›</span>');
    let screen = '', note = '';
    if (kind === 'edit') {
      if (cur === 0) { screen = phone('Field Maps · מפה', mapBox(dots('SimA.pick')) + `<div style="padding:8px;color:#64748B">${sg ? 'נבחר: ' + esc(sg.SignID || '') : 'הקש על שלט במפה'}</div>`); note = 'הקשה 1: בחירת השלט במפה.'; }
      else if (cur === 1 && sg) { screen = phone('Field Maps · פופאפ', `<div style="font-weight:700;color:#1E3A8A;font-size:16px">${esc(sg.SignID || '')}</div><div>${chipHtml(sg.SignStatus)}</div><div style="margin:8px 0;color:#64748B">${esc(sg.SignModel || '')}</div><a style="display:block;background:#1E3A8A;color:#fff;text-align:center;border-radius:8px;padding:10px;cursor:pointer" onclick="SimA.step(2)">ערוך ב-Survey123 ›</a>`); note = 'הקשה 2: קישור בפופאפ (ביטוי Arcade). הקישור פותח את Survey123 ישירות על הרשומה.'; }
      else if (cur === 2) {
        screen = s123Inbox(S, M);
        note = st.inbox ? 'ללא הקשות נוספות: רשומה אחת מסוננת נפתחת בעצמה.' : 'כשInbox כבוי הקישור לא מצליח לפתוח את הרשומה לעריכה.';
      }
      else if (cur === 3) { screen = s123Phone(S, M, 'Survey123 · עריכת שלט'); note = 'הרשומה והרכיבים הקיימים נטענו. הוספת ביקור חדש מעדכנת את מצב השלט אחרי שמירה.'; }
      else { screen = resultPhone(M); note = 'חזרה אוטומטית ל-Field Maps (callback). הצבע בנקודה משקף את המצב המעודכן.'; }
    } else if (kind === 'visitfm') {
      const vt = M.B ? (M.B.ent.fields.find((f) => f.name === 'VisitType') && dom(S, M.B.ent.fields.find((f) => f.name === 'VisitType'))) : null;
      const types = vt ? vt.values.map((v) => v.label) : [];
      if (cur === 0) { screen = phone('Field Maps · מפה', mapBox(dots('SimA.pick')) + `<div style="padding:8px;color:#64748B">${sg ? 'נבחר: ' + esc(sg.SignID || '') : 'הקש על שלט במפה'}</div>`); note = 'הקשה 1: בחירת השלט במפה. הפופאפ נפתח.'; }
      else if (cur === 1 && sg) {
        const img = (M.main.fields.some((f) => f.name === 'SignModel') && dom(S, M.main.fields.find((f) => f.name === 'SignModel')) || { values: [] }).values.find((v) => v.label === sg.SignModel);
        const u = img && img.img ? Media.get(img.img) : null;
        screen = phone('Field Maps · פופאפ', `<div style="font-weight:700;color:#1E3A8A;font-size:16px">${esc(sg.SignID || '')}</div><div>${chipHtml(sg.SignStatus)}</div><div style="margin:8px 0;color:#64748B">${esc(sg.SignModel || '')}</div>${u ? `<img src="${u}" alt="" style="width:100%;max-height:150px;object-fit:contain;border:1px solid #E2E8F0;border-radius:6px;margin-bottom:8px">` : ''}<div style="font-weight:700;margin:10px 0 6px">הוסף ביקור</div><div style="display:flex;gap:6px">${types.map((t) => `<button class="primary" style="flex:1;padding:10px 4px" onclick="SimA.vtype('${esc(t)}')">${esc(t)}</button>`).join('')}</div><div style="color:#64748B;font-size:12px;margin-top:8px">הכפתורים נבנים ב-Arcade בפופאפ. כל כפתור פותח את טופס הביקור ב-Field Maps עם סוג הביקור מלא מראש.</div>`);
        note = 'הקשה 2: בחירת סוג הביקור. הטופס נפתח עם סוג הביקור, הממפה והתאריך כבר מלאים.';
      }
      else if (cur === 2 && sg && M.B) {
        screen = phone('Field Maps · ביקור חדש (' + esc(st.vform.VisitType || '') + ')', formFields(S, M.B.ent, st.vform, sg, 'SimA.fv') + `<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.vsave()">שמור</button><button style="flex:1" onclick="SimA.step(1)">ביטול</button></div>`);
        note = 'טופס ביקור מוגדר בשכבת הטבלה ב-Field Maps. אותם שדות ותנאי תצוגה כמו ב-Survey123, ללא Inbox וללא מעבר בין אפליקציות.';
      }
      else { screen = resultPhone(M); note = 'הביקור נשמר כשורה חדשה, ומצב השלט הנוכחי התעדכן אוטומטית מהביקור (אם האפשרות מסומנת למעלה). הפופאפ מציג את הביקור בהיסטוריה.'; }
    } else {
      if (cur === 0) {
        screen = s123Home(S, M);
        note = 'המשתמש פותח בעצמו את Survey123 ובוחר את הסקר: אין דרך להציב כפתור פתיחה על מפת Field Maps. מסך הסקר: כפתור איסוף ותיקיות.';
      }
      else if (cur === 1) { screen = s123Phone(S, M, 'Survey123 · שלט חדש'); note = 'המיקום נקלט בטופס (GPS) ואפשר לתקנו במפה. מצב ושדות אחרים לפי תנאי התצוגה.'; }
      else { screen = resultPhone(M); note = 'השלט נשמר ב-Survey123. כדי לראות אותו במפה, המשתמש עובר ל-Field Maps ידנית (אין callback במסלול זה).'; }
    }
    const back = cur > 0 ? `<button onclick="SimA.step(${cur - 1})">‹ חזרה</button>` : '';
    const chk = (ok, t) => `<li style="color:${ok ? '#166534' : '#991B1B'}">${ok ? '✓' : '✗'} ${t}</li>`;
    const arcade = `var params = {\n  itemID: '${ITEM}',\n  action: 'edit',\n  'q:globalId': StandardizeGuid($feature.GlobalID, 'digits-hyphen'),\n  folder: 'inbox',\n  update: 'true',\n  callback: 'https://fieldmaps.arcgis.app'\n};\nreturn 'arcgis-survey123://?' + UrlEncode(params);`;
    const urlV = `https://fieldmaps.arcgis.app/?referenceContext=addRelatedFeature&itemID=<FM_MAP_ITEM_ID>&featureSourceURL=<SIGNS_LAYER_URL>&featureID=${gid}&relationshipID=<REL_ID_VISITS>&featureAttributes=${encodeURIComponent(JSON.stringify({ VisitType: st.vform && st.vform.VisitType || 'מעקב' }))}&callback=<ENCODED_RETURN_URL>`;
    const vside = kind === 'visitfm' ? `<h4>קישור (deep link) לכפתור</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlV)}</pre><p style="font-size:13px">addRelatedFeature פותח טופס בטבלה הקשורה, ו-featureAttributes ממלא שדות מראש (למשל VisitType). בניגוד לכך, ב-Survey123 קישור עריכה אינו יכול למלא שדה בשורת Repeat, ולכן סוג הביקור נבחר בתוך הטופס.</p>` : '';
    const side = `<div style="flex:1;min-width:280px"><div style="margin-bottom:10px"><b>${note}</b></div>${back}${vside}
      ${kind === 'edit' ? `<h4>קישור (עריכה)</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlE)}</pre>` : kind === 'visitfm' ? '' : `<h4>הדרכה למשתמש בשטח</h4><ol style="line-height:1.8"><li>פתח את אפליקציית Survey123 (לא Field Maps).</li><li>בחר את הסקר "${esc(S.meta.title || 'סקר שילוט')}".</li><li>לחץ "איסוף", אשר מיקום GPS ומלא את הטופס.</li><li>שלח. לצפייה בשלט במפה עבור ל-Field Maps.</li></ol><p style="color:#64748B;font-size:12px">קיצור דרך אפשרי: קישור פתיחה (<code dir="ltr">${esc(urlN)}</code>) כקיצור על מסך הבית, כ-QR או בהודעת הדרכה. לא כפתור במפה.</p>`}
      ${kind === 'edit' ? `<details><summary>ביטוי Arcade לקישור בפופאפ / Task</summary><pre dir="ltr" style="background:#F1F5F9;padding:8px;font-size:11px;overflow:auto">${esc(arcade)}</pre></details>` : ''}
      ${(() => { const cf = geoFields(M); if (!cf.length || st.flow !== 'new') return ''; const pend = st.db.main.filter((x) => x.__pending).length; const oth = calcFields(M).filter((f) => !/@layer/.test(f.calc)); return `<h4>חישוב כתובת יערנית מהמיקום</h4><ul style="line-height:1.7;font-size:12px">${cf.map((f) => `<li>${esc(f.alias)}: ${f.calc ? `<code dir="ltr" style="font-size:10px">${esc(f.calc)}</code>` : '<i style="color:#92400E">כלל טרם הוגדר, ערך הדמיה בלבד</i>'}</li>`).join('')}</ul><p style="color:#92400E;font-size:12px">pulldata("@layer") עובד רק ברשת. ללא קליטה השדות נשארים ריקים עד סנכרון ועיבוד בשרת. הערכים בסימולטור הם ערכי דמה.</p><button ${pend ? '' : 'disabled'} onclick="SimA.sync()">סנכרון והשלמה בשרת (${pend} ממתינים)</button>${oth.length ? `<h4>שדות מחושבים נוספים</h4><ul style="line-height:1.7;font-size:12px">${oth.map((f) => `<li>${esc(f.alias)}: <code dir="ltr" style="font-size:10px">${esc(f.calc)}</code></li>`).join('')}</ul>` : ''}`; })()}
      ${kind === 'visitfm' ? '' : `<h4>הגדרות נדרשות</h4><ul style="line-height:1.8"><li><label><input type="checkbox" ${st.inbox ? 'checked' : ''} onchange="SimA.inboxSet(this.checked)"> Inbox מופעל בטופס</label></li>${chk(st.flow === 'new' || true, 'הטופס פורסם מעל השכבה/הטבלאות (Repeat לרכיבים, לביקורים)')}${chk(true, 'המשתמש מחובר לאותו Portal ב-Field Maps וב-Survey123')}${chk(true, 'update=true מרענן את ה-Inbox לפני הפתיחה')}</ul>`}
      <p style="color:#64748B;font-size:12px">הערה: פרמטרי הקישור לפי דוגמאות קהילת Esri; לאמת מול התיעוד הרשמי ובגרסת האפליקציה בשטח.</p></div>`;
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center"><button class="${kind === 'edit' ? 'primary' : ''}" onclick="SimA.flowSet('edit')">עריכת שלט קיים</button><button class="${st.flow === 'new' ? 'primary' : ''}" onclick="SimA.flowSet('new')">הוספת שלט חדש</button><button class="${st.flow === 'visit' ? 'primary' : ''}" onclick="SimA.flowSet('visit')">ביקור: מעקב / פיקוח / טיפול</button>${st.flow === 'visit' ? `<span style="margin-inline-start:8px">ערוץ: <select onchange="SimA.vch(this.value)"><option value="fm" ${st.vch !== 's123' ? 'selected' : ''}>Field Maps (מומלץ)</option><option value="s123" ${st.vch === 's123' ? 'selected' : ''}>Survey123 (תבנית נוכחית)</option></select></span>` : ''}<button onclick="SimA.seed()">טען נתוני דוגמה</button></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">${chips}</div><div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${screen}${side}</div>`;
  }
  function chipHtml(t) { return t ? `<span style="background:${statusColor(t)};color:#fff;border-radius:10px;padding:2px 10px;font-size:12px">${esc(t)}</span>` : ''; }
  function resultPhone(M) {
    const sg = st.db.main[st.sel];
    return phone('Field Maps · מפה', mapBox(dots('SimA.sel0')) + `<div style="padding:8px">${sg ? `<b>${esc(sg.SignID || 'שלט')}</b> ${chipHtml(sg.SignStatus)}<div style="color:#64748B">נשמר. ${M.B ? 'ביקורים: ' + visitsOf(M, sg).length : ''}</div>` : ''}</div>`);
  }

  /* ---------- Field Maps ---------- */
  const statusColor = (s) => ({ 'תקין': '#a7c636', 'לא תקין': '#ed5151', 'מתוכנן': '#149ece', 'לפירוק': '#fc921f' }[s] || '#64748B');
  function visitsOf(M, sg) { if (!M.B) return []; if (st.variant === 'sign') return st.db.B.filter((v) => v.ParentGlobalID === sg.GlobalID); const ids = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID).map((p) => p.GlobalID); return st.db.B.filter((v) => ids.includes(v.ParentGlobalID)); }
  function fm(S, M) {
    ensure(S);
    const dots = st.db.main.map((s, i) => { const x = 40 + (i * 83) % 280, y = 50 + (i * 61) % 200; return `<div onclick="SimA.sel(${i})" title="${esc(s.SignID || '')}" style="position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:${statusColor(s.SignStatus)};border:3px solid ${st.sel === i ? '#0F172A' : '#fff'};box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`; }).join('');
    let popup = '<div style="color:#64748B;padding:10px">בחר שלט במפה</div>';
    if (st.sel != null && st.db.main[st.sel]) {
      const sg = st.db.main[st.sel], parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID), vs = visitsOf(M, sg);
      const shown = M.main.fields.filter((f) => isShown(f, sg, {}) && sg[f.name]).slice(0, 8);
      popup = `<div style="padding:6px 4px"><div style="font-weight:700;color:#1E3A8A;font-size:16px">${esc(sg.SignID || 'שלט')}</div><div style="margin:6px 0">${shown.map((f) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding:3px 0"><span style="color:#64748B">${esc(f.alias)}</span><span>${esc(sg[f.name])}</span></div>`).join('')}</div>
      <details open><summary style="font-weight:700;cursor:pointer">${esc(M.A.ent.alias)} (${parts.length})</summary>${parts.map((p) => `<div style="padding:3px 0;border-bottom:1px solid #E2E8F0">${esc(p.ComponentType || '')} ${esc((vs.filter((x) => x.RelatedPartGlobalID === p.GlobalID).pop() || {}).PartStatusAtVisit || 'לא דווח')}</div>`).join('') || '<small>אין</small>'}</details>
      ${M.B ? `<details open><summary style="font-weight:700;cursor:pointer">${esc(M.B.ent.alias)} (${vs.length})</summary>${vs.map((v) => `<div style="padding:3px 0;border-bottom:1px solid #E2E8F0">${esc(v.VisitDate || '')} · ${esc(v.VisitType || '')} · ${esc(v.StatusAtVisit || '')}</div>`).join('') || '<small>אין</small>'}</details><button class="primary" style="margin-top:8px;width:100%" onclick="SimA.addv()">+ הוסף ${esc(M.B.ent.alias)}</button>` : ''}</div>`;
    }
    const modal = st.modal ? `<div style="position:absolute;inset:0;background:#fff;overflow:auto;padding:8px"><b>${esc(M.B.ent.alias)} חדש</b>${st.variant === 'part' ? `<label style="display:block;font-weight:600;margin:10px 0 3px">ברכיב / תשתית</label><select style="width:100%;padding:8px" onchange="SimA.mp(this.value)"><option value="">בחר…</option>${st.db.A.filter((p) => p.ParentGlobalID === st.db.main[st.sel].GlobalID).map((p) => `<option value="${p.GlobalID}" ${st.modal.part === p.GlobalID ? 'selected' : ''}>${esc(p.ComponentType || '')}</option>`).join('')}</select>` : ''}${formFields(S, M.B.ent, st.modal.v, st.db.main[st.sel], 'SimA.mv')}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.savev()">שמור</button><button style="flex:1" onclick="SimA.cancel()">ביטול</button></div></div>` : '';
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${phone('Field Maps · מפה', `<div style="position:relative;height:300px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${dots}</div><div style="margin-top:8px;border-top:3px solid #1E3A8A;position:relative">${popup}${modal}</div>`)}
    <div style="flex:1;min-width:260px"><button class="primary" onclick="SimA.seed()">טען נתוני דוגמה</button><h3>מה אתה בודק כאן</h3><ul style="line-height:1.9"><li>הפופאפ מציג רשומות קשורות מהטבלאות (בפועל: Arcade).</li><li>הוספת ביקור מהשלט: ${st.variant === 'sign' ? 'מסך אחד, ללא בחירת רכיב.' : 'נדרשת בחירת רכיב לפני הביקור.'}</li><li>עדכון מצב השלט: ${st.auto ? 'אוטומטי מהביקור' : 'ידני (הצבע בעגול לא משתנה)'}.</li></ul></div></div>`;
  }

  /* ---------- נתונים ומדדים ---------- */
  function table(rows, cols) { if (!rows.length) return '<small style="color:#64748B">אין רשומות</small>'; return `<div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px"><tr>${cols.map((c) => `<th style="border:1px solid #CBD5E1;padding:3px 6px;background:#F1F5F9">${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td style="border:1px solid #E2E8F0;padding:3px 6px">${esc(/GlobalID/.test(c) ? String(r[c] || '').slice(0, 8) : r[c])}</td>`).join('')}</tr>`).join('')}</table></div>`; }
  function steps(M, v) {
    const editable = (e) => e.fields.filter((f) => !hidden(f) && !readonly(f)).length;
    const nv = M.B ? editable(M.B.ent) : 0;
    const base = 1 /*בחירת שלט*/ + 1 /*פתיחת ביקורים*/ + 1 /*הוספה*/ + 1 /*שמירה*/;
    return v === 'sign' ? { taps: base, fields: nv, note: 'בחירת שלט → ביקורים → הוסף → מלא → שמור' } : { taps: base + 2, fields: nv + 1, note: 'בחירת שלט → רכיבים → בחירת רכיב → ביקורים → הוסף → מלא → שמור (לכל רכיב בנפרד)' };
  }
  function data(S, M) {
    ensure(S);
    const sa = steps(M, 'sign'), sb = steps(M, 'part');
    const orphanA = st.db.A.filter((p) => !st.db.main.some((s) => s.GlobalID === p.ParentGlobalID)).length;
    const lst = (e, rows, k) => `<h4>${esc(e.alias)} · ${esc(e.name)} (${rows.length})</h4>${table(rows, ['GlobalID', 'ParentGlobalID'].concat(e.fields.filter((f) => !hidden(f)).slice(0, 5).map((f) => f.name)))}`;
    return `<h3 style="margin-top:0">השוואת ארכיטקטורה לביקור שגרתי אחד</h3><table style="border-collapse:collapse"><tr><th style="border:1px solid #CBD5E1;padding:5px 9px">וריאנט</th><th style="border:1px solid #CBD5E1;padding:5px 9px">הקשות</th><th style="border:1px solid #CBD5E1;padding:5px 9px">שדות למילוי</th><th style="border:1px solid #CBD5E1;padding:5px 9px">מסלול</th></tr>
    <tr><td style="border:1px solid #E2E8F0;padding:5px 9px">ביקור → שלט</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sa.taps}</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sa.fields}</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sa.note}</td></tr>
    <tr><td style="border:1px solid #E2E8F0;padding:5px 9px">ביקור → רכיב</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sb.taps}</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sb.fields}</td><td style="border:1px solid #E2E8F0;padding:5px 9px">${sb.note}</td></tr></table>
    <p style="color:#64748B">הערכה: מספר מסכים/הקשות לביקור אחד. בווריאנט רכיב החישוב כפול למספר הרכיבים שנבדקו.</p>
    <h3>בדיקת שלמות</h3><p>${orphanA ? `<b style="color:#b91c1c">${orphanA} רכיבים יתומים (ללא שלט אב)</b>` : '✓ אין יתומים'}</p>
    ${lst(M.main, st.db.main)}${lst(M.A.ent, st.db.A)}${M.B ? lst(M.B.ent, st.db.B) : ''}`;
  }

  /* ---------- שלד ---------- */
  function render(S) {
    st.S = S; const M = model(S); if (!M.A) return '<p>הסימולטור דורש שכבה עם לפחות טבלה מקושרת אחת.</p>';
    const tab = (k, l) => `<button class="${st.tab === k ? 'primary' : ''}" onclick="SimA.tab('${k}')">${l}</button>`;
    const body = st.tab === 'flow' ? flowTab(S, M) : st.tab === 's123' ? s123(S, M) : st.tab === 'fm' ? fm(S, M) : data(S, M);
    return `<div style="font-size:11px;color:#64748B;margin-bottom:4px">גרסת סכימה בסימולטור: v${S.meta.version || '?'}</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">${tab('flow', 'זרימה Field Maps ↔ Survey123')}${tab('s123', 'Survey123')}${tab('fm', 'Field Maps')}${tab('data', 'נתונים והשוואה')}<span style="margin-inline-start:16px">קשר ביקורים: <select onchange="SimA.variant(this.value)"><option value="sign" ${st.variant === 'sign' ? 'selected' : ''}>ביקור → שלט</option><option value="part" ${st.variant === 'part' ? 'selected' : ''}>ביקור → רכיב</option></select></span><label style="margin-inline-start:12px"><input type="checkbox" ${st.online ? 'checked' : ''} onchange="SimA.online(this.checked)"> מחובר לרשת</label><label style="margin-inline-start:12px"><input type="checkbox" ${st.auto ? 'checked' : ''} onchange="SimA.auto(this.checked)"> עדכון מצב שלט אוטומטי מהביקור</label></div>${body}`;
  }
  const rr = () => {
    if (!(window.A && A.refresh)) return;
    const key = [st.tab, st.flow, st.step, st.editId, st.variant].join('|'), same = key === st.rk;
    const dom0 = typeof document !== 'undefined', sb = dom0 ? [...document.querySelectorAll('[data-sb]')].map((e) => e.scrollTop) : [], wy = dom0 ? window.scrollY : 0;
    A.refresh(); st.rk = key;
    if (same && dom0) { document.querySelectorAll('[data-sb]').forEach((e, i) => { e.scrollTop = sb[i] || 0; }); window.scrollTo(0, wy); }
  };
  Media.onLoad = () => { try { rr(); } catch (e) { /* */ } };
  window.SimA = {
    vch(c) { st.vch = c; st.step = 0; st.sel = null; st.editId = null; st.sign = {}; st.parts = []; st.visits = []; rr(); },
    vtype(t) { const M = model(st.S); st.vform = newRow(M.B.ent); st.vform.VisitType = t; derive(M.B.ent, st.vform, st.db.main[st.sel]); st.step = 2; rr(); },
    fv(n, v) { const M = model(st.S); st.vform[n] = v; derive(M.B.ent, st.vform, st.db.main[st.sel]); rr(); },
    vsave() { const M = model(st.S), sg = st.db.main[st.sel]; addVisit(st.S, M, sg, sg, st.vform); st.vform = null; st.step = 3; rr(); },
    grp(k) { st.col[k] = !st.col[k]; rr(); },
    tab(k) { st.tab = k; rr(); }, variant(v) { st.variant = v; st.modal = null; rr(); }, auto(c) { st.auto = c; rr(); },
    sv(n, v) { st.sign[n] = v; allDerive(); rr(); }, pv(i, n, v) { st.parts[i][n] = v; allDerive(); rr(); }, vv(i, n, v) { st.visits[i][n] = v; allDerive(); rr(); },
    add(k) { const a = k === 'parts' ? st.parts : st.visits; a.push(newRow(k === 'parts' ? model(st.S).A.ent : model(st.S).B.ent)); if (k === 'parts') st.pi = a.length - 1; else st.vi = a.length - 1; allDerive(); rr(); },
    del(k) { const a = k === 'parts' ? st.parts : st.visits; const i = k === 'parts' ? st.pi : st.vi; a.splice(i, 1); if (k === 'parts') st.pi = Math.max(0, st.pi - 1); else st.vi = Math.max(0, st.vi - 1); allDerive(); rr(); },
    pg(k, d) { if (k === 'parts') st.pi = Math.max(0, Math.min(st.parts.length - 1, st.pi + d)); else st.vi = Math.max(0, Math.min(st.visits.length - 1, st.vi + d)); rr(); },
    send() {
      const S = st.S, M = model(S); ensure(S);
      let s; st.dlg = false;
      if (st.editId) {
        s = st.db.main.find((x) => x.GlobalID === st.editId);
        Object.keys(st.sign).forEach((k) => { if (k !== 'GlobalID') s[k] = st.sign[k]; });
        const keep = st.parts.map((p) => p.GlobalID).filter(Boolean);
        st.db.A = st.db.A.filter((p) => p.ParentGlobalID !== s.GlobalID || keep.includes(p.GlobalID));
        st.parts.forEach((p) => { if (p.GlobalID) Object.assign(st.db.A.find((x) => x.GlobalID === p.GlobalID), p); else st.db.A.push(Object.assign({}, p, { GlobalID: uid(), ParentGlobalID: s.GlobalID })); });
      } else {
        s = Object.assign({}, st.sign, { GlobalID: uid() }); if (st.loc) { s.__loc = st.loc; s.__pending = st.pendingGeo; } st.db.main.push(s);
        st.parts.forEach((p) => st.db.A.push(Object.assign({}, p, { GlobalID: uid(), ParentGlobalID: s.GlobalID })));
      }
      if (M.B && st.variant === 'sign') st.visits.forEach((v) => { if (v.VisitType || v.StatusAtVisit) addVisit(S, M, s, s, Object.assign({}, v)); });
      st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.loc = null; st.pendingGeo = false; st.editId = null; st.sent += 1; st.sel = st.db.main.indexOf(s);
      if (st.tab === 'flow') st.step = FLOWS[st.flow].length - 1; else st.tab = 'fm';
      rr();
    },
    pinAt(e, el) { const r = el.getBoundingClientRect(); st.loc = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }; applyGeo(); rr(); },
    gps() { st.loc = { x: 0.5 + (Math.random() - 0.5) * 0.6, y: 0.5 + (Math.random() - 0.5) * 0.6 }; applyGeo(); rr(); },
    online(c) { st.online = c; applyGeo(); rr(); },
    sync() { const M = model(st.S); st.db.main.forEach((sg) => { if (sg.__pending && sg.__loc) { geoFields(M).forEach((f) => { sg[f.name] = zoneVal(f, zoneOf(sg.__loc)); }); sg.__pending = false; } }); rr(); },
    dlg(v) { if (v && missing().length) { st.showReq = true; rr(); return; } st.dlg = v; rr(); },
    outbox() { st.dlg = false; st.outbox += 1; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 2; rr(); },
    draft() { st.dlg = false; st.drafts += 1; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 2; rr(); },
    flowSet(f) { st.loc = null; st.pendingGeo = false; st.flow = f; st.step = 0; st.editId = null; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; rr(); },
    step(n) { st.step = n; rr(); }, inboxSet(c) { st.inbox = c; rr(); },
    pick(i) { st.sel = i; st.step = 1; rr(); }, sel0(i) { st.sel = i; rr(); },
    startEdit() {
      const sg = st.db.main[st.sel]; if (!sg) return;
      st.editId = sg.GlobalID; st.sign = Object.assign({}, sg); st.parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID).map((p) => Object.assign({}, p)); st.visits = [newRow(model(st.S).B ? model(st.S).B.ent : { fields: [] })]; st.pi = 0; st.vi = 0; st.showReq = false; st.step = 3; allDerive(); rr();
    },
    startNew() { st.loc = null; st.pendingGeo = false; st.editId = null; st.sign = { SignID: newId() }; st.parts = []; st.visits = [newRow(model(st.S).B ? model(st.S).B.ent : { fields: [] })]; st.pi = 0; st.vi = 0; st.showReq = false; st.step = 1; allDerive(); rr(); },
    seed() { seed(st.S); st.sel = null; rr(); }, sel(i) { st.sel = i; st.modal = null; rr(); },
    addv() { st.modal = { v: newRow(model(st.S).B.ent), part: '' }; rr(); }, mv(n, v) { st.modal.v[n] = v; derive(model(st.S).B.ent, st.modal.v, st.db.main[st.sel]); rr(); }, mp(id) { st.modal.part = id; rr(); }, cancel() { st.modal = null; rr(); },
    savev() {
      const S = st.S, M = model(S), sg = st.db.main[st.sel];
      let parent = sg; if (st.variant === 'part') { parent = st.db.A.find((p) => p.GlobalID === st.modal.part); if (!parent) { alert('בווריאנט ביקור→רכיב חובה לבחור רכיב'); return; } }
      addVisit(S, M, sg, parent, Object.assign({}, st.modal.v)); st.modal = null; rr();
    },
  };
  window.Sim = { render };
})();
