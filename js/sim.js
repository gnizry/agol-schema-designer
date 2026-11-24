/* סימולטור חוויית משתמש: Survey123 + Field Maps + נתונים — נבנה על הסכמה הפעילה.
   תנאי תצוגה מובנים נקראים משדה f.rel = {f:'שדה' | '^שדה-באב', op:'=' | 'in' | '!=', v: ערך | [ערכים]} */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })).toUpperCase();
  const st = { online: true, loc: null, pendingGeo: false, tab: 'flow', flow: 'edit', step: 0, inbox: true, col: {}, drafts: 0, outbox: 0, dlg: false, sent: 0, editId: null, tab0: 's123', variant: 'sign', auto: true, sign: {}, parts: [], visits: [], pi: 0, vi: 0, db: null, sel: null, modal: null, S: null, psi: {}, cv: null, psform: null, pendPart: '' };

  /* ---------- מבנה הסכמה ---------- */
  function model(S) {
    const main = S.entities.find((e) => e.kind === 'point') || S.entities[0];
    const kids = S.relationships.filter((r) => r.origin === main.name).map((r) => ({ rel: r, ent: S.entities.find((e) => e.name === r.destination) })).filter((k) => k.ent);
    const C = kids[1] ? (() => { const r = S.relationships.find((x) => x.origin === kids[1].ent.name), e = r && S.entities.find((y) => y.name === r.destination); return e ? { rel: r, ent: e } : null; })() : null;
    return { main, A: kids[0], B: kids[1], C };
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
  function isShown(f, vals, up) { return !hidden(f) && !(f.editOnly && !st.editId) && relOk(f, vals, up) !== false; }

  /* ---------- בקרי טופס ---------- */
  function control(S, ent, f, vals, up, onch) {
    const d = dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = readonly(f);
    const label = `<label style="display:block;font-weight:600;margin:10px 0 3px">${esc(f.alias || f.name)}${f.open ? ' <small style="color:#b45309">(פתוח)</small>' : ''}${ro ? ' <small style="color:#64748B">(אוטומטי)</small>' : ''}</label>${f.hint ? `<div style="font-size:12px;color:#64748B;margin:-2px 0 4px">${esc(f.hint)}</div>` : ''}`;
    const base = 'width:100%;padding:8px;border:1px solid #CBD5E1;border-radius:6px;font:inherit;box-sizing:border-box';
    let inp;
    if (f.pickFrom && !ro) { const ps = st.db.A.filter((p) => p.ParentGlobalID === (up || {}).GlobalID); inp = `<select style="${base}" onchange="${onch}('${f.name}',this.value)"><option value="">בחר רכיב…</option>${ps.map((p) => `<option value="${p.GlobalID}" ${p.GlobalID === v ? 'selected' : ''}>${esc((p.ComponentType || 'רכיב') + (p.Direction ? ' · ' + p.Direction : ''))}</option>`).join('')}</select>`; }
    else if (ro) inp = `<div style="${base};background:#F1F5F9;color:#64748B">${v ? esc(v) : '— יחושב אוטומטית —'}</div>`;
    else if (d) {
      const pf = parentField(S, ent, f); const pv = pf ? vals[pf.name] : null;
      const opts = d.values.filter((x) => (!pf || !x.parent || x.parent === pv) && !(x.notIn && up && x.notIn.indexOf(up.ModelFamily) >= 0));
      inp = `<select style="${base}" onchange="${onch}('${f.name}',this.value)"><option value="">בחר…</option>${opts.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>` + (pf && !pv ? `<small style="color:#b45309">נדרש לבחור קודם: ${esc(pf.alias)}</small>` : '');
    } else if (f.type === 'DATE') inp = `<input type="date" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="2" style="${base}" onchange="${onch}('${f.name}',this.value)">${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${base}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    return label + inp;
  }
  const fmAttach = (ent, vals) => ent.attachments ? `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;margin:10px 0"><div style="font-weight:700;color:#1E3A8A">${/Visit/i.test(ent.name) ? 'תמונות מהביקור' : 'קבצים מצורפים'}</div><div style="display:flex;gap:8px;margin-top:8px"><div style="flex:1;border:2px dashed #94A3B8;border-radius:10px;padding:12px;text-align:center;color:#475569">📷 צלם</div><div style="flex:1;border:2px dashed #94A3B8;border-radius:10px;padding:12px;text-align:center;color:#475569">🖼 מהגלריה</div></div></div>` : '';
  function formFields(S, ent, vals, up, onch) {
    const groups = {}; ent.fields.forEach((f) => { if (isShown(f, vals, up)) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((g) => `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:4px 12px 12px;margin:10px 0"><div style="font-weight:700;color:#1E3A8A;margin-top:8px">${esc(g)}</div>${groups[g].map((f) => control(S, ent, f, vals, up, onch)).join('')}</div>`).join('') + fmAttach(ent, vals);
  }
  const phone = (title, inner) => `<div style="width:390px;max-width:100%;border:8px solid #0F172A;border-radius:26px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18)"><div style="background:#1E3A8A;color:#fff;padding:10px 14px;font-weight:700">${title}</div><div dir="rtl" style="padding:6px 10px 14px;max-height:min(88vh,1150px);overflow:auto;text-align:right">${inner}</div></div>`;

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
  /* מערך דוגמה מלא מהסכמה (S.demo): שלטים, רכיבים, ביקורים ושורות מצב. ללא S.demo: נתוני דמה גנריים */
  function seedDemo(S, M, dm) {
    const rows = (n) => (n && dm[n]) || [];
    rows(M.main.name).forEach((r) => { const o = Object.assign({}, r); delete o.loc; o.GlobalID = uid(); if (r.loc) { o.__loc = r.loc; geoFields(M).forEach((f) => { o[f.name] = zoneVal(f, zoneOf(r.loc)); }); } derive(M.main, o, {}); st.db.main.push(o); });
    rows(M.A && M.A.ent.name).forEach((r) => { const o = Object.assign({}, r); delete o.s; o.GlobalID = uid(); o.ParentGlobalID = st.db.main[r.s].GlobalID; derive(M.A.ent, o, st.db.main[r.s]); st.db.A.push(o); });
    rows(M.B && M.B.ent.name).forEach((r, vi) => {
      const sg = st.db.main[r.s], o = Object.assign({}, r); delete o.s; derive(M.B.ent, o, sg);
      o.__ps = rows(M.C && M.C.ent.name).filter((x) => x.v === vi).map((x) => { const q = Object.assign({}, x); delete q.v; delete q.p; q.RelatedPartGlobalID = st.db.A[x.p].GlobalID; return q; });
      addVisit(S, M, sg, sg, o);
    });
  }
  function seed(S) {
    const M = model(S); st.db = { main: [], A: [], B: [], C: [] };
    if (S.demo) { seedDemo(S, M, S.demo); return; }
    for (let i = 0; i < 4; i++) {
      const s = sample(S, M.main, i * 3); s.GlobalID = uid(); st.db.main.push(s);
      for (let k = 0; k < 2 + (i % 2); k++) { const p = sample(S, M.A.ent, i + k * 2, s); p.GlobalID = uid(); p.ParentGlobalID = s.GlobalID; st.db.A.push(p); }
      if (M.B) for (let k = 0; k < i; k++) { const v = sample(S, M.B.ent, i + k, s); v.GlobalID = uid(); v.ParentGlobalID = s.GlobalID; st.db.B.push(v);
        if (M.C && (k + i) % 2 === 1) { const pp = st.db.A.filter((p) => p.ParentGlobalID === s.GlobalID); pp.slice(0, 1 + (k % 2)).forEach((p, j) => { const r = sample(S, M.C.ent, i + k + j, v); r.GlobalID = uid(); r.ParentGlobalID = v.GlobalID; r.RelatedPartGlobalID = p.GlobalID; st.db.C.push(r); }); }
      }
    }
  }
  const ensure = (S) => { if (!st.db) seed(S); };

  /* ---------- שמירה (סימולציה של מה שקורה בשרת) ---------- */
  function applyAuto(S, M, signRec, visit) {
    if (!st.auto) return;
    M.main.fields.filter((f) => f.fromVisit).forEach((f) => { if (visit[f.fromVisit] && (!f.fromVisitWhen || visit[f.fromVisitWhen.f] === f.fromVisitWhen.v)) signRec[f.name] = visit[f.fromVisit]; else if (f.fromVisitWhen && visit[f.fromVisitWhen.f]) signRec[f.name] = ''; });
    M.main.fields.filter((f) => f.fromVisit && f.rel && !relOk(f, signRec, {})).forEach((f) => { signRec[f.name] = ''; });
  }
  /* ביקור (רמה 2) + שורות מצב רכיב תחתיו (רמה 3, v.__ps) */
  function addVisit(S, M, signRec, parentRec, v) {
    const ps = v.__ps || []; delete v.__ps;
    v.GlobalID = uid(); v.ParentGlobalID = parentRec.GlobalID; st.db.B.push(v); applyAuto(S, M, signRec, v);
    if (M.C) ps.forEach((r) => { if (!r.RelatedPartGlobalID && !r.PartStatusAtVisit) return; st.db.C.push(Object.assign({}, r, { GlobalID: uid(), ParentGlobalID: v.GlobalID }));
      M.A.ent.fields.filter((f) => f.fromPartStatus).forEach((f) => { const pt = st.db.A.find((p) => p.GlobalID === r.RelatedPartGlobalID); if (pt && r[f.fromPartStatus]) pt[f.name] = r[f.fromPartStatus]; }); });
  }
  const psOf = (vg) => (st.db.C || []).filter((r) => r.ParentGlobalID === vg);
  /* מצב נוכחי של רכיב = השורה האחרונה שדיווחה עליו (ב-Arcade: שאילתה בשתי רמות) */
  function partState(M, sg, pg) { let hit = null; st.db.B.filter((v) => v.ParentGlobalID === sg.GlobalID).forEach((v) => psOf(v.GlobalID).forEach((r) => { if (r.RelatedPartGlobalID === pg) hit = { r, v }; })); return hit; }
  const psRows = (tag) => { const v = tag === 'm' ? st.modal.v : st.visits[+tag]; return v.__ps || (v.__ps = []); };


  /* טבלת סיכום מחוץ ל-Repeat: calculate בתוך החזרה + join ב-note */
  function summaryNote(S, ent, arr, cur) {
    const STs = (S.sim && S.sim.survey123 && S.sim.survey123.options && S.sim.survey123.options.summaryTables) || {}, ST = STs[ent.name];
    if (ST) {
      if (!arr.length) return '';
      const fd = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.toLocaleDateString('en-GB') : '-'; };
      const th = (t, al) => `<th style="color:#1F5A52;padding:8px;text-align:${al || 'right'}">${esc(t)}</th>`;
      const td = (x, al) => `<td style="background:#fff;padding:8px;text-align:${al || 'right'}">${x}</td>`;
      const rows = arr.map((r, i) => `<tr>${td(i + 1, 'center')}${ST.cols.map((c) => td(c.date ? fd(r[c.f]) : esc(r[c.f] || '-'))).join('')}</tr>`).join('');
      return `<div dir="rtl" style="margin:10px 8px 6px;text-align:center"><div style="font-size:19px;font-weight:700;color:#1F5A52;margin-bottom:6px">${esc(ST.title)}</div><table dir="rtl" cellspacing="0" cellpadding="0" style="width:100%;background:#bcdccf;border:1px solid #7fa99b;border-collapse:separate;border-spacing:1px"><tr>${th('#', 'center')}${ST.cols.map((c) => th(c.l)).join('')}</tr>${rows}</table></div>`;
    }
    const skip = /ParentGlobalID|GlobalID|Notes|Summary/;
    const cols = ent.fields.filter((f) => !skip.test(f.name) && !hidden(f) && arr.some((r) => r[f.name])).slice(0, 5);
    if (!arr.length) return '';
    const idn = (n) => '${' + n + '}';
    const rowCalc = "concat('<tr><td>'," + cols.map((f) => idn(f.name)).join(",'</td><td>',") + ",'</td></tr>')";
    const head = cols.map((f) => `<th style="border:1px solid #CBD5C8;padding:3px 5px;background:#EEF3EC;font-weight:600;text-align:right">${esc(f.alias)}</th>`).join('');
    const rows = arr.map((r, i) => `<tr style="${i === cur ? 'background:#F1F8E9' : ''}"><td style="border:1px solid #E0E6DE;padding:3px 5px;color:#7A857A">${i + 1}</td>${cols.map((f) => `<td style="border:1px solid #E0E6DE;padding:3px 5px">${esc(r[f.name] || '')}</td>`).join('')}</tr>`).join('');
    return `<div style="margin:8px 8px 4px;border:1px solid #D0D5CE;border-radius:4px;background:#fff;padding:8px 10px"><div style="font-size:13px;font-weight:700;margin-bottom:4px">סיכום ${esc(ent.alias)} (${arr.length})</div><div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px;width:100%"><tr><th style="border:1px solid #CBD5C8;padding:3px 5px;background:#EEF3EC">#</th>${head}</tr>${rows}</table></div><details style="margin-top:6px"><summary style="font-size:11px;color:#5F6B5C;cursor:pointer">איך זה נבנה ב-XLSForm</summary><pre dir="ltr" style="font-size:10px;background:#F1F5F9;padding:6px;white-space:pre-wrap;word-break:break-all;margin:4px 0 0">calculate (בתוך ה-Repeat), שם: row_html
${esc(rowCalc)}

note (אחרי ה-Repeat), label:
concat('&lt;table&gt;&lt;tr&gt;${cols.map((f) => '&lt;th&gt;' + f.alias + '&lt;/th&gt;').join('')}&lt;/tr&gt;', join('', \${row_html}), '&lt;/table&gt;')</pre></details></div>`;
  }

  /* ---------- Survey123 ---------- */
  /* רמה 3 ב-Survey123: חזרה בתוך חזרת הביקור (מצב רכיב). ליצירה בלבד */
  function psBlock(S, M, tag, v) {
    const rows = v.__ps || [], n = rows.length, ent = M.C.ent, i = Math.min(st.psi[tag] || 0, Math.max(0, n - 1)), key = 'rep|ps|' + tag, sy = rsty(S, ent.name);
    const arrow = (t, on, dis) => `<span onclick="${dis ? '' : on}" style="font-size:22px;padding:0 6px;color:${dis ? '#BDBDBD' : '#444'};cursor:${dis ? 'default' : 'pointer'}">${t}</span>`;
    const bar = `<div dir="ltr" style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px;border:1px solid ${LINE};border-radius:26px;background:#F4F8F3;padding:4px 8px"><span onclick="SimA.psadd('${tag}')" title="הוסף" style="width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid ${LINE};display:flex;align-items:center;justify-content:center;cursor:pointer">${IC.plus}</span><span style="display:flex;align-items:center;font-size:15px">${n > 1 ? arrow('‹', `SimA.pspg('${tag}',-1)`, i <= 0) : ''}<span dir="rtl" style="min-width:70px;text-align:center">${n ? (i + 1) + ' מתוך ' + n : '0 מתוך 0'}</span>${n > 1 ? arrow('›', `SimA.pspg('${tag}',1)`, i >= n - 1) : ''}</span><span onclick="${n ? `SimA.psdel('${tag}')` : ''}" title="מחק" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:${n ? 'pointer' : 'default'}">${IC.trash(n ? '#555' : '#BDBDBD')}</span></div>`;
    const body = n ? mFields(S, ent, rows[i], st.sign, `SimA.psv.bind(null,'${tag}',${i})`, true) : '<div style="padding:14px 10px;color:#757575">אין רשומות. לחץ + להוספה (רק לרכיב שנבדק או שיש בו ממצא).</div>';
    return '<div style="margin-top:10px">' + band(esc(ent.alias) + ' (' + n + ')', key, '', sy, '', '') + (isCol(key) ? '' : `<div style="margin:0 ${sy ? 0 : 8}px;border:${sy ? (badge(S) ? '2px' : '1px') + ' solid ' + sy.c : '1px solid ' + LINE};border-radius:${sy ? '0 0 6px 6px' : '4px'};background:${sy ? tint(sy.c, 0.88) : '#DCE8DA'};padding:0 4px 4px">${body}${bar}</div>` + (n ? summaryNote(S, ent, rows, i) : '')) + '</div>';
  }


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
  /* מספור אוטומטי (autoIncrement): בבחירת כנף ללא מספר מוצע max+1 מבין הרכיבים בשלט; המשתמש יכול לשנות */
  function autoNum(i) { const A = model(st.S).A; if (!A) return; A.ent.fields.filter((f) => f.autoIncrement).forEach((f) => { const row = st.parts[i]; if (row[f.name] !== '' && row[f.name] != null) return; if (relOk(f, row, st.sign) === false) return; const nums = st.parts.map((p) => parseInt(p[f.name], 10)).filter((n) => !isNaN(n)); row[f.name] = nums.length ? Math.max.apply(null, nums) + 1 : 1; }); }
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
    const M = model(st.S), lv = st.visits[st.visits.length - 1]; if (!lv) return;
    M.main.fields.filter((f) => f.fromVisit).forEach((f) => { if (lv[f.fromVisit] && (!f.fromVisitWhen || lv[f.fromVisitWhen.f] === f.fromVisitWhen.v)) st.sign[f.name] = lv[f.fromVisit]; else if (f.fromVisitWhen && lv[f.fromVisitWhen.f]) st.sign[f.name] = ''; });
    derive(M.main, st.sign, {});
  }
  function allDerive() { const M = model(st.S); derive(M.main, st.sign, {}); st.parts.forEach((p) => derive(M.A.ent, p, st.sign)); if (M.B) st.visits.forEach((v) => { derive(M.B.ent, v, st.sign); if (M.C) (v.__ps || []).forEach((r) => derive(M.C.ent, r, st.sign)); }); syncSign(); }
  function missing() {
    const M = model(st.S), out = [];
    if (!st.editId && !st.loc) out.push('מיקום השלט');
    const chk = (ent, vals, up, tag) => ent.fields.forEach((f) => { if (isShown(f, vals, up) && !readonly(f) && !lockEdit(f) && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === '')) out.push(tag + (f.alias || f.name)); });
    chk(M.main, st.sign, {}, '');
    st.parts.forEach((p, i) => chk(M.A.ent, p, st.sign, 'רכיב ' + (i + 1) + ': '));
    if (M.B && st.variant === 'sign') st.visits.forEach((v, i) => { chk(M.B.ent, v, st.sign, 'ביקור ' + (i + 1) + ': '); if (M.C) (v.__ps || []).forEach((r, j) => chk(M.C.ent, r, st.sign, 'ביקור ' + (i + 1) + ' · רכיב ' + (j + 1) + ': ')); });
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
    const nav = o.close ? '✕' : o.back ? '<span dir="ltr">›</span>' : '';
    const TH = (st.S && st.S.sim && st.S.sim.survey123 && st.S.sim.survey123.theme) || {}, HB = (TH.header && TH.header.backgroundColor) || GREEN, HT = (TH.header && TH.header.textColor) || '#fff', FB = (TH.footer && TH.footer.backgroundColor) || '#fff';
    return `<div style="position:relative;width:390px;max-width:100%;border:8px solid #0F172A;border-radius:30px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18);font-family:Roboto,'Segoe UI',Tahoma,sans-serif">
<div dir="ltr" style="background:${HB};color:${HT};font-size:11px;display:flex;justify-content:space-between;padding:4px 14px"><span>9:41</span><span>▂▄▆ 100%</span></div>
<div dir="rtl" style="background:${HB};color:${HT};display:flex;align-items:center;gap:14px;padding:12px 14px"><span style="font-size:${o.close ? 20 : 28}px;width:22px;text-align:center;line-height:1">${nav}</span><b style="flex:1;font-size:21px;font-weight:500">${o.title || ''}</b>${IC.gps()}${IC.menu}</div>
<div data-sb="1" dir="rtl" style="max-height:min(86vh,1150px);overflow:auto;text-align:right;color:#212121;background:${o.bg || '#fff'}">${inner}</div>${o.bottom ? o.bottom.replace('background:#fff;box-shadow', 'background:' + FB + ';box-shadow') : ''}${o.overlay || ''}</div>`;
  }
  /* כפתור "פיל" של מסך הכניסה: עיגול צבעוני מימין, כותרת, מונה וחץ משמאל */
  const pill = (bg, icon, t, cnt, onc) => `<div ${onc ? `onclick="${onc}"` : ''} dir="rtl" style="display:flex;align-items:center;gap:14px;background:#fff;border-radius:40px;box-shadow:0 1px 6px rgba(0,0,0,.2);padding:6px 8px 6px 18px;margin:0 10px 10px;cursor:${onc ? 'pointer' : 'default'}"><span style="width:56px;height:56px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:#fff;font-size:38px;line-height:1">${icon}</span><b style="flex:1;font-size:22px">${t}</b>${cnt != null ? `<span style="font-size:17px;font-weight:600;color:#333;margin-left:6px">${cnt}</span>` : ''}<span dir="ltr" style="color:#777;font-size:26px">‹</span></div>`;
  function s123Home(S, M) {
    const dt = new Date(), fd = (x) => `${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}`, ft = (x) => `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`;
    const card = `<div dir="rtl" style="display:flex;gap:12px;padding:14px 12px;align-items:flex-start"><div style="flex:none;width:130px;height:72px;border-radius:6px;background:linear-gradient(135deg,#6FA86B,#2E5E2A);display:flex;align-items:center;justify-content:center;font-size:40px">🌲</div><div style="flex:1;line-height:1.35"><div style="font-weight:700;font-size:19px;margin-bottom:4px">${esc(S.meta.title || 'סקר שילוט')}</div><div style="font-size:14px;color:#444">בעלים: ${esc(S.meta.owner || '—')}</div><div style="font-size:14px;color:#444">נוצר: ${fd(dt)} ${ft(dt)}</div><div style="font-size:14px;color:#444">תאריך שינוי: ${fd(dt)} ${ft(dt)}</div></div></div>`;
    const pills = pill('#3B78B5', '+', 'איסוף', null, 'SimA.startNew()')
      + (st.inbox ? pill('#12B5EC', IC.inbox, 'דואר נכנס', st.db ? st.db.main.length : 0, 'SimA.ibox(\'list\')') : '')
      + (st.drafts ? pill('#F28E2B', IC.pen, 'טיוטות', st.drafts) : '')
      + (st.outbox ? pill('#2E7D32', IC.send, 'דואר יוצא', st.outbox) : '');
    return sPhone(`<div style="min-height:540px;display:flex;flex-direction:column;background:#F2F2F2">${card}<div style="margin-top:auto;padding-top:20px">${pills}</div></div>`, { title: esc(S.meta.title || 'סקר שילוט'), back: true, bg: '#F2F2F2' });
  }
  /* דף Inbox של Survey123 (פתיחה ידנית מהמסך הראשי): רשימת הרשומות הקיימות, ובתחתית בורר בין רשימה למפה */
  /* שם מופע (settings.instance_name): מזהה שלט | יער | דגם | מצב | תאריך */
  const instName = (S, sg) => { const o = (S.sim && S.sim.survey123 && S.sim.survey123.options) || {}, d = sg.UpdatedAt || sg.CreationDate || new Date(); const dd = new Date(d), f = (x) => String(x).padStart(2, '0'); return [sg.SignID || 'שלט חדש'].concat((o.instanceFields || []).map((n) => sg[n]).filter(Boolean), [f(dd.getDate()) + '/' + f(dd.getMonth() + 1) + '/' + dd.getFullYear() + ' ' + f(dd.getHours()) + ':' + f(dd.getMinutes())]).join(' | '); };
  function s123InboxList(S, M) {
    const all = (st.db && st.db.main) || [], mode = st.ibox === 'map' ? 'map' : 'list';
    const card = (sg, i) => `<div onclick="SimA.ibEdit(${i})" style="margin:8px 12px;border-radius:8px;padding:12px;cursor:pointer;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:16px">${esc(instName(S, sg))}</b>${chipHtml(sg.SignStatus)}</div><div style="color:#757575;font-size:12px;margin-top:2px">${esc(sg.SignModel || '')}</div></div>`;
    const sel = st.sel != null ? all[st.sel] : null;
    const body = mode === 'list' ? all.map(card).join('') || '<div style="padding:16px;color:#757575">אין רשומות</div>' : `<div style="margin:10px 12px">${mapBox(dots('SimA.ibPick'))}</div>${sel ? card(sel, st.sel) : '<div style="padding:8px 16px;color:#757575;font-size:13px">הקש על נקודה במפה</div>'}`;
    const seg = (m, t) => `<span onclick="SimA.ibox('${m}')" style="flex:1;text-align:center;padding:9px 0;cursor:pointer;font-size:14px;font-weight:600;background:${mode === m ? '#12B5EC' : '#fff'};color:${mode === m ? '#fff' : '#555'}">${t}</span>`;
    const bottom = `<div dir="rtl" style="display:flex;border-top:1px solid #D0D5CE;background:#fff;padding:8px 14px"><div style="display:flex;flex:1;border:1px solid #12B5EC;border-radius:20px;overflow:hidden">${seg('list', 'רשימה')}${seg('map', 'מפה')}</div></div>`;
    return sPhone(`<div style="min-height:520px;background:#F2F2F2;padding-bottom:8px"><div style="padding:8px 12px;color:#757575;font-size:12px">${all.length} רשומות</div>${body}</div>`, { title: 'דואר נכנס', back: true, bg: '#F2F2F2', bottom });
  }
  function s123Inbox(S, M) {
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    if (!st.inbox) return sPhone(`<div style="padding:24px 16px;color:#757575;text-align:center">התיקייה דואר נכנס אינה זמינה בסקר זה.<br><small>הפעלה: הגדרות הסקר › Inbox (מופעל).</small></div>`, { title: 'דואר נכנס', back: true });
    const card = sg ? `<div onclick="SimA.startEdit()" style="margin:10px 12px;border-radius:8px;padding:12px;cursor:pointer;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)"><div style="font-weight:700;font-size:17px">${esc(sg.SignID || 'שלט')}</div><div style="color:#757575;font-size:13px">${esc(sg.SignModel || '')}</div><div style="margin-top:4px">${chipHtml(sg.SignStatus)}</div></div>` : '<div style="padding:16px;color:#757575">אין רשומות</div>';
    const inner = `<div style="min-height:540px;background:#F2F2F2"><div style="padding:8px 12px;color:#757575;font-size:12px">מסונן לפי q:globalId · רשומה אחת</div>${card}<div style="padding:4px 16px;color:#757575;font-size:12px">בקישור עם update=true הרשימה מתרעננת לפני הפתיחה. רשומה יחידה נפתחת אוטומטית.</div></div>`;
    return sPhone(inner, { title: 'דואר נכנס', back: true, bg: '#F2F2F2' });
  }
  /* פס קבוצה מתקפל (begin group עם appearance=collapsible): כותרת מודגשת + משולש משמאל לטקסט */
  const collRep = (k) => { const o = st.S && st.S.sim && st.S.sim.survey123 && st.S.sim.survey123.options, m = /^rep\|(parts|visits)$/.exec(k); const en = m && st.S && model(st.S)[m[1] === 'parts' ? 'A' : 'B']; return !!(o && en && (o.collapsedRepeats || []).indexOf(en.ent.name) >= 0); };
  const isCol = (k) => st.col[k] === undefined ? (st.defColl && !/^rep\|/.test(k) ? true : collRep(k) ? true : /\|כתובת יערנית$/.test(k)) : st.col[k];
  /* עיצוב טופס Survey123 (S.sim.survey123.style): צבע ואייקון לכל קבוצה ולכל חזרה. קבוצות בגווני קרים, חזרות בגווני חמים, כדי שהמשתמש יבין אם הוא בקבוצה חד-פעמית או ברשימה שחוזרת */
  const shade = (c, a) => { const n = parseInt(String(c).slice(1), 16), m = (x) => Math.round(x * (1 - a)).toString(16).padStart(2, '0'); return '#' + m(n >> 16) + m((n >> 8) & 255) + m(n & 255); };
  const tint = (c, a) => { const n = parseInt(String(c).slice(1), 16), m = (x) => Math.round(x + (255 - x) * a).toString(16).padStart(2, '0'); return '#' + m(n >> 16) + m((n >> 8) & 255) + m(n & 255); };
  const SYL = (S) => (S.sim && S.sim.survey123 && S.sim.survey123.style) || null;
  const secSeq = (S) => { const sy = SYL(S); if (!sy) return []; const main = S.entities.find((e) => e.name === S.sim.main), ks = (S.relationships || []).filter((r) => r.origin === main.name).map((r) => r.destination), after = main.repeatAfter || {}, seq = []; (main.groupOrder || []).forEach((c) => { seq.push(c); ks.forEach((k) => { if (after[k] === c) seq.push(k); }); }); ks.forEach((k) => { if (seq.indexOf(k) < 0) seq.push(k); }); return seq; };
  const secNo = (S, name) => { const i = secSeq(S).indexOf(name); return i < 0 ? '' : i + 1; };
  const gsty = (S, g) => { const sy = SYL(S); return sy && sy.groups && sy.groups[g] ? sy.groups[g] : null; };
  const rsty = (S, e) => { const sy = SYL(S); return sy && sy.repeats && sy.repeats[e] ? sy.repeats[e] : null; };
  const badge = (S) => !!(S.sim && S.sim.survey123 && S.sim.survey123.style && S.sim.survey123.style.labelStyle === 'badge');
  const band = (t, key, sum, sy, no, tag) => sy && !badge(st.S) ? `<div onclick="SimA.grp('${key}')" dir="rtl" style="background:${tint(sy.c, /^rep\|/.test(key) ? 0.9 : 0.94)};border:1px solid ${sy.c};border-radius:${isCol(key) ? '6px' : '6px 6px 0 0'};color:${shade(sy.c, 0.35)};padding:11px 12px;font-weight:700;font-size:17px;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:10px"><span style="font-size:12px;color:#777">${isCol(key) ? '◂' : '▾'}</span><span>${sy.i ? sy.i + ' ' : ''}${t}${tag ? ' <span style="font-weight:400;font-size:15px;color:#555">(' + tag + ')</span>' : ''}</span>${sum && isCol(key) ? `<span style="font-weight:400;font-size:13px;opacity:.85">${esc(sum)}</span>` : ''}</div>` : sy ? `<div onclick="SimA.grp('${key}')" dir="rtl" style="background:${sy.c};color:#fff;padding:11px 14px;font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:16px;border-radius:8px 8px 0 0">${no ? `<span style="min-width:24px;height:24px;border-radius:12px;background:#fff;color:${sy.c};font-size:13px;display:flex;align-items:center;justify-content:center">${no}</span>` : ''}<span>${sy.i ? sy.i + ' ' : ''}${t}</span>${tag ? `<span style="font-size:11px;font-weight:600;background:rgba(255,255,255,.25);border-radius:10px;padding:1px 8px">${tag}</span>` : ''}<span style="font-size:13px;margin-right:auto">${isCol(key) ? '◂' : '▾'}</span>${sum && isCol(key) ? `<span style="font-weight:400;font-size:13px;opacity:.9">${esc(sum)}</span>` : ''}</div>` : `<div onclick="SimA.grp('${key}')" dir="rtl" style="background:${BAND};padding:13px 16px;font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:14px"><span>${t}</span><span style="font-size:13px;color:#444">${isCol(key) ? '◂' : '▾'}</span>${sum && isCol(key) ? `<span style="font-weight:400;font-size:13px;color:#4F6B4C;margin-right:auto">${esc(sum)}</span>` : ''}</div>`;
  function mControl(S, ent, f, vals, up, onch) {
    const d = dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = readonly(f) || lockEdit(f);
    const req = !ro && isReq(f, vals, up), bad = req && st.showReq && (v === '' || v == null);
    const lab = `<div style="font-size:16px;margin:16px 0 5px;color:#222">${esc(f.alias || f.name)}${req ? ' <span style="color:#C62828">*</span>' : ''}</div>${f.hint ? `<div style="font-size:13px;color:#6B7280;margin:-2px 0 6px">${esc(f.hint)}</div>` : ''}`;
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
      const opts = d.values.filter((x) => (!pf || !x.parent || x.parent === pv) && !(x.notIn && up && x.notIn.indexOf(up.ModelFamily) >= 0));
      if (pf && !pv) inp = `<div style="${box};color:#8A938A;background:#F4F6F3">יש לבחור קודם: ${esc(pf.alias)}</div>`;
      else if (f.appearance === 'autocomplete') {
        const sel = opts.find((o) => o.label === v), id = 'ac_' + f.name;
        const th = (o) => { if (!o.img) return ''; const u = Media.get(o.img); return u ? `<img src="${u}" alt="" style="width:64px;height:46px;object-fit:contain;background:#fff;border:1px solid ${LINE};border-radius:3px;flex:none">` : `<span style="width:64px;height:46px;flex:none;background:#F4F6F3;border:1px dashed #B8C0B6;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#8A938A">תמונה</span>`; };
        const items = opts.map((o) => `<div class="acit" data-t="${esc(o.label)}" data-v="${esc(o.label)}" onmousedown="${onch}('${f.name}',this.dataset.v)" style="display:flex;align-items:center;gap:10px;padding:6px 10px;cursor:pointer;border-bottom:1px solid #E6EAE4;background:${o.label === v ? '#EEF5EC' : '#fff'}">${th(o)}<span style="flex:1;font-size:14px">${esc(o.label)}</span></div>`).join('');
        inp = `<div style="position:relative"><div style="${box}"><input type="text" autocomplete="off" placeholder="הקלד לחיפוש או בחר מהרשימה" style="${inpS}" value="${esc(v)}" onfocus="document.getElementById('${id}').style.display='block';this.select()" onblur="setTimeout(function(){var e=document.getElementById('${id}');if(e)e.style.display='none'},150)" oninput="(function(i){var q=i.value.trim();[].forEach.call(document.querySelectorAll('#${id} .acit'),function(e){e.style.display=!q||e.dataset.t.indexOf(q)>=0?'flex':'none'})})(this)">${clr(v)}<span style="color:#555;font-size:15px">⌄</span></div><div id="${id}" style="display:none;position:absolute;z-index:5;right:0;left:0;max-height:300px;overflow:auto;background:#fff;border:1px solid ${LINE};box-shadow:0 4px 12px rgba(0,0,0,.2)">${items}</div></div>`;
        if (sel && sel.img) { const u = Media.get(sel.img); if (u) inp += `<div style="margin-top:10px;border:1px solid ${LINE};border-radius:3px;padding:8px;background:#fff"><div style="font-size:13px;color:#4F6B4C;margin-bottom:6px">נבחר: <b>${esc(sel.label)}</b></div><img src="${u}" alt="" style="width:100%;max-height:260px;object-fit:contain;display:block"></div>`; }
      }
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
    const warn = f.warn === 'partsNotOk' && v === 'תקין' && (vals.__ps || []).some((x) => ['לא תקין', 'חסר'].includes(x.PartStatusAtVisit)) ? `<div style="margin-top:6px;background:#FFF4D6;border:1px solid #F0C36D;border-radius:3px;padding:6px 10px;font-size:13px;color:#7A5200">שים לב: בביקור זה דווח רכיב לא תקין או חסר, והמצב שנבחר לשלט הוא תקין.</div>` : '';
    const dup = f.uniqueInParent && v !== '' && v != null && ent === (model(S).A && model(S).A.ent) && st.parts.filter((p) => String(p[f.name]) === String(v)).length > 1;
    return lab + inp + (dup ? `<div style="color:#C62828;font-size:12px;margin-top:3px">${esc(f.constraintMsg || 'הערך כבר קיים')}</div>` : '') + (bad ? '<div style="color:#C62828;font-size:12px;margin-top:3px">זהו שדה חובה</div>' : '') + warn;
  }
  const attach = (ent) => ent.attachments ? `<div style="font-size:16px;margin:18px 0 4px">${/Visit/i.test(ent.name) ? 'תמונות מהביקור' : 'תמונה/ות'}</div><div style="display:flex;gap:30px;justify-content:center;padding:8px 0">${IC.folder}${IC.camera}</div>` : '';
  /* כרטיס כתובת יערנית (S.sim.survey123.options.addressCard): תאי HTML בשתי עמודות, RTL */
  function addrCard(S, ent, g, vals) {
    const AC = S.sim && S.sim.survey123 && S.sim.survey123.options && S.sim.survey123.options.addressCard;
    if (!AC || g !== 'כתובת יערנית' || ent.name !== S.sim.main) return '';
    const cells = AC.fields.map((n) => ent.fields.find((f) => f.name === n)).filter(Boolean).map((f) => `<td dir="rtl" width="50%" style="width:50%;padding:8px 10px;vertical-align:top;text-align:right;border-bottom:1px solid #e3ebe7"><small style="color:#6b8f82;font-size:12px">${esc(f.alias || f.name)}</small><br><b style="color:#1F5A52;font-size:15px">${esc(vals[f.name] || '—')}</b></td>`);
    const trs = []; for (let i = 0; i < cells.length; i += 2) trs.push('<tr>' + cells[i] + (cells[i + 1] || '<td></td>') + '</tr>');
    return `<div dir="rtl" style="margin:12px 0 6px;background:#fff;border:1px solid #cfdcd6;border-radius:10px;overflow:hidden"><table dir="rtl" width="100%" style="border-collapse:collapse;width:100%">${trs.join('')}</table></div>`;
  }
  function mFields(S, ent, vals, up, onch, flat, afterFn) {
    const vis = ent.fields.filter((f) => isShown(f, vals, up));
    if (flat) return `<div style="padding:0 10px 4px">${vis.map((f) => mControl(S, ent, f, vals, up, onch)).join('')}${attach(ent)}</div>`;
    const groups = {}; vis.forEach((f) => (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f));
    const ord = ent.groupOrder || []; return Object.keys(groups).sort((a, b) => (ord.indexOf(a) < 0 ? 99 : ord.indexOf(a)) - (ord.indexOf(b) < 0 ? 99 : ord.indexOf(b))).map((g) => { const k = ent.name + '|' + g; const sy = gsty(S, g), vo = sy && !flat && groups[g].length && groups[g].every((f) => readonly(f) || lockEdit(f) || (st.editId && /בעריכה: קריאה בלבד/.test(f.visible || ''))); return band(esc(g), k, g === 'כתובת יערנית' ? vals.ForestName : '', sy, sy ? secNo(S, g) : '', vo ? 'לצפייה בלבד' : '') + (isCol(k) ? '' : `<div style="padding:0 14px 8px;${sy ? 'background:' + tint(sy.c, 0.94) + (badge(S) ? ';border-right:5px solid ' + sy.c + ';border-bottom:1px solid ' + tint(sy.c, 0.6) : ';border:1px solid ' + sy.c + ';border-top:0;border-radius:0 0 6px 6px') : ''}">${addrCard(S, ent, g, vals) || groups[g].map((f) => mControl(S, ent, f, vals, up, onch)).join('')}</div>`) + (afterFn ? afterFn(g) : ''); }).join('') + `<div style="padding:0 14px">${attach(ent)}</div>`;
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
    const loc = st.editId ? '' : `<div style="padding:0 14px"><div style="font-size:16px;margin:16px 0 5px">${esc((S.sim && S.sim.survey123 && S.sim.survey123.options && S.sim.survey123.options.locationLabel) || 'מיקום השלט')} <span style="color:#C62828">*</span></div><div style="background:#fff;border:1px solid ${st.showReq && !L ? '#C62828' : LINE};border-radius:3px;overflow:hidden"><div dir="rtl" style="display:flex;align-items:center;gap:10px;padding:6px 10px"><span onclick="SimA.gps()" style="cursor:pointer;display:flex">${IC.gps('#2F6FB5')}</span>${coord}</div>${map}</div>${st.showReq && !L ? '<div style="color:#C62828;font-size:12px;margin-top:3px">זהו שדה חובה</div>' : ''}</div>`;
    /* חזרה (repeat): פס כותרת מתקפל, תת-טופס של הרשומה הנוכחית, ופס דפדוף: + משמאל, "1 מתוך N" באמצע, פח מימין */
    const repeat = (title, arr, idx, kind, ent, up, onchFn) => {
      const n = arr.length, i = Math.min(idx, Math.max(0, n - 1)), key = 'rep|' + kind;
      const arrow = (t, on, dis) => `<span onclick="${dis ? '' : on}" style="font-size:22px;padding:0 6px;color:${dis ? '#BDBDBD' : '#444'};cursor:${dis ? 'default' : 'pointer'}">${t}</span>`;
      const bar = `<div dir="ltr" style="display:flex;align-items:center;justify-content:space-between;margin:12px 0 6px;border:1px solid ${LINE};border-radius:26px;background:#F4F8F3;padding:4px 8px"><span onclick="SimA.add('${kind}')" title="הוסף" style="width:38px;height:38px;border-radius:50%;background:#fff;border:1px solid ${LINE};display:flex;align-items:center;justify-content:center;cursor:pointer">${IC.plus}</span><span style="display:flex;align-items:center;font-size:15px">${n > 1 ? arrow('‹', `SimA.pg('${kind}',-1)`, i <= 0) : ''}<span dir="rtl" style="min-width:70px;text-align:center">${n ? (i + 1) + ' מתוך ' + n : '0 מתוך 0'}</span>${n > 1 ? arrow('›', `SimA.pg('${kind}',1)`, i >= n - 1) : ''}</span><span onclick="${n ? `SimA.del('${kind}')` : ''}" title="מחק" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:${n ? 'pointer' : 'default'}">${IC.trash(n ? '#555' : '#BDBDBD')}</span></div>`;
      const sumNote = summaryNote(S, ent, arr, i);
      const body = n ? mFields(S, ent, arr[i], up, `${onchFn}.bind(null,${i})`, true) + (kind === 'visits' && M.C ? psBlock(S, M, String(i), arr[i]) : '') : `<div style="padding:14px 10px;color:#757575">אין רשומות. לחץ + להוספה.</div>`;
      const sy = rsty(S, ent.name);
      return band(title + ' (' + n + ')', key, '', sy, sy ? secNo(S, ent.name) : '', '') + (isCol(key) ? '' : `<div style="margin:0 ${sy ? 0 : 8}px;border:${sy ? (badge(S) ? '2px' : '1px') + ' solid ' + sy.c : '1px solid ' + LINE};border-radius:${sy ? '0 0 6px 6px' : '4px'};background:${sy ? tint(sy.c, 0.88) : '#DCE8DA'};padding:0 4px 4px">${body}${bar}</div>` + sumNote);
    };
    const rep = repeat(esc(M.A.ent.alias), st.parts, st.pi, 'parts', M.A.ent, st.sign, 'SimA.pv');
    const repG = (M.main.repeatAfter || {})[M.A.ent.name] || null; // קבוצה שאחריה מוצג ה-Repeat של הרכיבים
    const nOld = st.editId && M.B ? st.db.B.filter((v) => v.ParentGlobalID === st.editId).length : 0;
    const vis = M.B && st.variant === 'sign' ? (st.editId ? `<div style="padding:6px 16px;color:#5F6B5C;font-size:12px">קיימים ${nOld} ביקורים קודמים (לא מוצגים לעריכה; כאן מוסיפים ביקורים חדשים)</div>` : '') + repeat(esc(M.B.ent.alias), st.visits, st.vi, 'visits', M.B.ent, st.sign, 'SimA.vv') : '';
    const bottom = `<div dir="ltr" style="display:flex;justify-content:space-between;align-items:center;padding:6px 16px;border-top:1px solid #D0D5CE;background:#fff;box-shadow:0 -2px 6px rgba(0,0,0,.08)"><span onclick="SimA.dlg(true)" title="שליחה" style="font-size:30px;color:#444;cursor:pointer;padding:0 8px;line-height:1.3">✓</span><span style="color:#8A938A;font-size:12px">${st.editId ? 'עריכת רשומה' : 'רשומה חדשה'}</span></div>`;
    const dlg = st.dlg ? `<div dir="rtl" style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end"><div style="background:#fff;width:100%;border-radius:14px 14px 0 0;padding:6px 0"><div onclick="SimA.send()" style="padding:14px 18px;cursor:pointer">שלח עכשיו</div><div onclick="SimA.outbox()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בדואר יוצא</div><div onclick="SimA.draft()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בטיוטות</div><div onclick="SimA.dlg(false)" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE;color:#757575">המשך מילוי</div></div></div>` : '';
    st.defColl = !!(SYL(S) && SYL(S).groupAppearance === 'compact');
    const syl = SYL(S), mapNote = syl && syl.map ? `<div dir="rtl" style="margin:10px 10px 0;padding:8px 10px;background:#fff;border:1px solid ${LINE};border-radius:8px"><div style="font-size:12px;color:#5F6B5C;margin-bottom:5px">צבעי הטופס · גוון קר = קבוצה חד-פעמית, חם = רשימה שחוזרת</div><div style="display:flex;flex-wrap:wrap;gap:4px">${secSeq(S).map((n) => { const sy = gsty(S, n) || rsty(S, n); return sy ? `<span style="background:${sy.c};color:#fff;border-radius:10px;padding:2px 9px;font-size:12px">${secNo(S, n)} ${sy.i ? sy.i + ' ' : ''}${esc(sy.t || n)}</span>` : ''; }).join('')}</div></div>` : '';
    const bu = Media.get((S.sim && S.sim.survey123 && S.sim.survey123.banner && 'media/' + S.sim.survey123.banner.image) || ''), banner = bu ? `<img src="${bu}" alt="" style="width:100%;display:block">` : `<div dir="rtl" style="background:linear-gradient(135deg,#1F5A52,#2E7D6B);color:#fff;padding:18px 16px;font-weight:700;font-size:20px">${esc((S.meta && S.meta.title) || '')}</div>`;
    return sPhone(`<div style="padding-bottom:16px">${banner}${mapNote}${loc}${mFields(S, M.main, st.sign, {}, 'SimA.sv', false, repG ? (g) => g === repG ? rep : '' : null)}${repG ? '' : rep}${vis}</div>`, { title: esc(S.meta.title || title), close: true, bg: badge(S) ? BODY : "#fff", bottom: (st.showReq && missing().length ? `<div style="background:#C62828;color:#fff;padding:7px 14px;font-size:13px">חסרים ${missing().length} שדות חובה: ${esc(missing().slice(0, 3).join(', '))}${missing().length > 3 ? '…' : ''}</div>` : '') + bottom, overlay: dlg });
  }
  const ent_fields = (S, ent, vals, up, onch) => mFields(S, ent, vals, up, onch);
  function s123(S, M) {
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${s123Phone(S, M, 'Survey123 · ' + esc(M.main.alias))}<div style="flex:1;min-width:260px"><h3 style="margin-top:0">מה אתה בודק כאן</h3><ul style="line-height:1.9"><li>אילו שדות הסוקר רואה ובאיזה סדר; שדות אוטומטיים מוצגים אפורים.</li><li>תנאי תצוגה: מוצגים לפי <code>rel</code> בשדה (לדוגמה סיכון בטיחותי רק כש"לא תקין").</li><li>סינון דגם לפי משפחה (תת-דגם מסונן לפי הבחירה הקודמת).</li><li>כמה שדות וכמה Repeat צריך למלא כדי לתעד שלט אחד.</li></ul><p style="color:#64748B">שליחה יוצרת רשומות בטבלאות הסימולציה, ואפשר לראות אותן בלשונית Field Maps ובלשונית נתונים.</p></div></div>`;
  }

  /* ---------- זרימה: Field Maps ↔ Survey123 ---------- */
  const ITEM = '<SURVEY_ITEM_ID>';
  const FLOWS = {
    edit: ['Field Maps: בחירת שלט', 'Field Maps: פופאפ וקישור', 'Survey123: טופס העריכה (נפתח ישירות)', 'חזרה ל-Field Maps'],
    new: ['Survey123: מסך הסקר (איסוף)', 'Survey123: טופס חדש', 'בדיקה ב-Field Maps'],
    visitfm: ['Field Maps: בחירת שלט', 'Field Maps: פופאפ וסוג ביקור', 'Field Maps: טופס ביקור (רמה 2)', 'Field Maps: חזרה לפופאפ, כרטיס ביקור פתוח וכפתורי רכיב (רמה 3)', 'תוצאה במפה'],
  };
  function dots(onc) {
    return st.db.main.map((s, i) => { const x = s.__loc ? 10 + s.__loc.x * 300 : 40 + (i * 83) % 280, y = s.__loc ? 10 + s.__loc.y * 210 : 40 + (i * 61) % 180; return `<div onclick="${onc}(${i})" style="position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:${statusColor(s.SignStatus)};border:3px solid ${st.sel === i ? '#0F172A' : '#fff'};box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`; }).join('');
  }
  const mapBox = (inner) => `<div style="position:relative;height:260px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${inner}</div>`;

  /* ---------- תרחישי ביקור על כמה רכיבים ---------- */
  /* הערכת עומס: מספר טפסים והקשות (פתיחה, שדות שממלאים, שליחה). הערכה בלבד, לא מדידה */
  function scCost(x) {
    const vf = 1 + (x.visit.StatusAtVisit === 'לא תקין' ? 2 : 0), pf = (r) => 1 + (['לא תקין', 'חסר'].includes(r.PartStatusAtVisit) ? 1 : 0);
    const fm = 2 + vf + x.ps.reduce((a, r) => a + 2 + pf(r), 0);
    const s123 = 3 + vf + x.ps.reduce((a, r) => a + 2 + pf(r), 0);
    return { fm, s123, taps: x.ps.length };
  }
  function scenarios(M) {
    const sg = st.sel != null ? st.db.main[st.sel] : null, parts = sg ? st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID) : [];
    const pn = (i) => parts[i] ? parts[i].ComponentType : 'רכיב ' + (i + 1);
    return [
      { t: 'א. מעקב שגרתי, הכול תקין', d: 'לא עוברים על הרכיבים. טופס אחד ושמירה אחת, בלי שום תוספת.', visit: { VisitType: 'מעקב', StatusAtVisit: 'תקין', VisitSummary: 'ללא ממצאים' }, ps: [] },
      { t: 'ב. פיקוח עם רכיב אחד לא תקין', d: 'ביקור אחד, ושורת מצב רק לרכיב עם הממצא.', visit: { VisitType: 'פיקוח', StatusAtVisit: 'לא תקין', SafetyHazardAtVisit: 'לא סכנה בטיחותית', VisitSummary: 'נמצא רכיב פגוע' }, ps: [{ part: 0, PartStatusAtVisit: 'לא תקין', PartNotes: 'פגיעה ברכיב' }] },
      { t: 'ג. פיקוח מלא: שלושה רכיבים', d: 'ביקור אחד ושורת מצב לכל רכיב שנבדק. ב-Field Maps: + ליד כל רכיב בפופאפ הביקור. ב-Survey123: חזרה בתוך הביקור, שליחה אחת.', visit: { VisitType: 'פיקוח', StatusAtVisit: 'לא תקין', VisitSummary: 'פיקוח על כל הרכיבים' }, ps: [{ part: 0, PartStatusAtVisit: 'תקין' }, { part: 1, PartStatusAtVisit: 'לא תקין', PartNotes: 'פגיעה' }, { part: 2, PartStatusAtVisit: 'חסר' }] },
      { t: 'ד. טיפול והחלפת רכיב', d: 'ביקור טיפול אחד ושורת מצב לרכיב שהוחלף.', visit: { VisitType: 'טיפול', StatusAtVisit: 'תקין', VisitSummary: 'הוחלף רכיב' }, ps: [{ part: 0, PartStatusAtVisit: 'תקין', PartNotes: 'הוחלף' }] },
    ].map((x) => Object.assign(x, { cost: scCost(x), forms: 1 + x.ps.length, ps: x.ps.map((r) => Object.assign({}, r, { partName: pn(r.part) })), usable: !!sg && x.ps.every((r) => parts[r.part]) }));
  }
  /* מגבלת Field Maps: טופס רשומה מציג רמה אחת בלבד ואין בו הוספת רשומת בת */
  const limitBox = (txt) => `<div style="margin-top:10px;background:#FFF4D6;border:1px solid #F0C36D;border-radius:8px;padding:8px 10px;font-size:12px;color:#7A5200;line-height:1.6"><b>מגבלת Field Maps:</b> ${txt || 'טופס עריכה מציג רמה אחת בלבד, ואי אפשר להוסיף בו רשומת בת. כדי לדווח מצב רכיב שומרים את הביקור, פותחים אותו מהרשימה, ומוסיפים כל רכיב בנפרד.'}</div>`;
  /* הערכת מאמץ (הנחות, לא מדידה): הקשות, טפסים ומעברי מסך לפי ערוץ */
  function effort(sc) {
    const v = sc.visit, n = sc.ps.length, hz = v.SafetyHazardAtVisit && v.SafetyHazardAtVisit !== 'לא סכנה בטיחותית' || v.StatusAtVisit === 'לא תקין' ? 1 : 0, sm = v.VisitSummary ? 1 : 0;
    const part = (r, fm) => (fm ? 1 : 2) + 1 + (r.PartNotes ? 1 : 0) + (fm ? 1 : 0);
    const fm = { taps: 1 /*בחירת שלט*/ + 1 /*כפתור סוג*/ + 1 /*מצב*/ + hz + sm + 1 /*שמירה*/ + (n ? 1 : 0) /*פתיחת הביקור מהרשימה*/ + sc.ps.reduce((a, r) => a + part(r, true), 0), forms: 1 + n, moves: 2 + (n ? 1 + 2 * n : 0) };
    const s1 = { taps: 1 /*בחירת שלט*/ + 1 /*כפתור Survey123*/ + 1 /*סוג*/ + 1 /*מצב*/ + hz + sm + sc.ps.reduce((a, r) => a + part(r, false), 0) + 2 /*שליחה*/, forms: 1, moves: 2 };
    return { fm, s1 };
  }
  function effortTable(M) {
    const th = 'border:1px solid #E2E8F0;padding:3px 6px;background:#F1F5F9;font-weight:600;text-align:center', td = 'border:1px solid #E2E8F0;padding:3px 6px;text-align:center';
    const rows = scenarios(M).map((x) => { const e = effort(x), better = e.fm.taps <= e.s1.taps ? 'fm' : 's'; return `<tr><td style="${td};text-align:right">${esc(x.t)}</td><td style="${td}">${x.ps.length}</td><td style="${td};${better === 'fm' ? 'background:#ECFCCB' : ''}"><b>${e.fm.taps}</b> · ${e.fm.forms} טפסים · ${e.fm.moves} מעברים</td><td style="${td};${better === 's' ? 'background:#ECFCCB' : ''}"><b>${e.s1.taps}</b> · ${e.s1.forms} טופס · ${e.s1.moves} מעברים</td></tr>`; }).join('');
    return `<div style="overflow:auto;margin:8px 0"><table style="border-collapse:collapse;font-size:12px;width:100%"><tr><th style="${th}">תרחיש</th><th style="${th}">רכיבים</th><th style="${th}">Field Maps: הקשות · טפסים · מעברי מסך</th><th style="${th}">Survey123 (יצירה בלבד)</th></tr>${rows}</table></div><div style="font-size:11px;color:#64748B;line-height:1.6">הערכה להשוואה בלבד, לא מדידה. הנחות: הקשה לכל בחירת שלט, כפתור, רשימה, שמירה ושליחה (2); שדה טקסט נספר הקשה אחת; ב-Field Maps כל רכיב = + , מצב, הערה (אם יש) ושמירה, ובנוסף הקשה אחת לפתיחת הביקור מהרשימה; ב-Survey123 כל רכיב = + , בחירת רכיב, מצב והערה. לא נכללים זמני טעינה, קליטה וגלילה. B2 (מילוי הרכיב מהקישור) נחשב כעובד: אם לא, נוספות 2 הקשות לרכיב ב-Field Maps.</div>`;
  }
  function scenarioPanel(S, M) {
    if (!M.B || !M.C) return '';
    const th = 'border:1px solid #E2E8F0;padding:3px 6px;background:#F1F5F9;font-weight:600';
    const td = 'border:1px solid #E2E8F0;padding:3px 6px';
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    const cards = scenarios(M).map((x, i) => `<div style="border:1px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:10px;background:#fff"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(x.t)}</b><span style="font-size:12px;color:#64748B">Field Maps: ${x.forms} טפסים · כ-${x.cost.fm} הקשות &nbsp;|&nbsp; Survey123: טופס אחד · כ-${x.cost.s123}</span></div><div style="font-size:13px;color:#475569;margin:4px 0 8px">${esc(x.d)}</div><div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px;width:100%"><tr><th style="${th}">#</th><th style="${th}">טבלה</th><th style="${th}">סוג ביקור / רכיב</th><th style="${th}">מצב</th></tr><tr><td style="${td}">1</td><td style="${td}">${esc(M.B.ent.alias)}</td><td style="${td}">${esc(x.visit.VisitType)}</td><td style="${td}">${esc(x.visit.StatusAtVisit || '')}</td></tr>${x.ps.map((r, k) => `<tr><td style="${td}">${k + 2}</td><td style="${td}">${esc(M.C.ent.alias)}</td><td style="${td}">${esc(r.partName)}</td><td style="${td}">${esc(r.PartStatusAtVisit || '')}</td></tr>`).join('')}</table></div><div style="font-size:12px;color:#475569;margin-top:6px">${(() => { const e = effort(x); return `Field Maps: ${e.fm.taps} הקשות, ${e.fm.forms} טפסים · Survey123: ${e.s1.taps} הקשות, טופס אחד`; })()}</div><button class="mini" style="margin-top:8px" ${x.usable && st.vch !== 's123' ? '' : 'disabled'} onclick="SimA.applySc(${i})">הוסף לשלט הנבחר ${sg ? '(' + esc(sg.SignID || '') + ')' : ''}</button></div>`).join('');
    return `<details open style="margin-top:14px"><summary style="cursor:pointer;font-weight:700;font-size:15px">איך מתועד ביקור שמכסה כמה רכיבים</summary><p style="font-size:13px;line-height:1.7;margin:8px 0">כלל אחד: <b>שורת ביקור אחת לשלט</b> (סוג, מצב שלט, סכנה, סיכום וצילום), ו<b>מתחתיה שורת מצב רק לרכיב שנבדק או שיש בו ממצא</b>. רכיב שלא דווח מוצג "לא דווח" ולא נכתבת עבורו שורה. ב-Survey123 הכול בטופס אחד (חזרה בתוך חזרה, ליצירה בלבד). ב-Field Maps: טופס ביקור, ואז + ליד כל רכיב בפופאפ הביקור. עריכה ותיקון בדיעבד תמיד ב-Field Maps.</p>${limitBox()}<h4 style="margin:12px 0 4px">כמה זה מסרבל: השוואת ערוצים לכל תרחיש</h4>${effortTable(M)}${cards}</details>`;
  }

  /* כרטיס "ביקור פתוח" בתוך פופאפ השלט: ביקור של היום עם כל הרכיבים וכפתור + לכל אחד.
     Field Maps מציג טופס עריכה לרמה אחת בלבד ואין בו הוספת רשומת בת, לכן כל יצירה ברמה 3 יוצאת מכפתור בפופאפ
     (קישור addRelatedFeature עם הרכיב ממולא), ואחרי שליחה חוזרים לאותו פופאפ. */
  function openVisitCard(S, M, sg) {
    if (!M.C) return '';
    const v = st.cv && st.cv.ParentGlobalID === sg.GlobalID ? st.cv : visitsOf(M, sg).filter((x) => x.VisitDate === today()).slice(-1)[0];
    if (!v) return '';
    const rows = psOf(v.GlobalID), parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID);
    const pn = (p) => (p.ComponentType || 'רכיב') + (p.Direction ? ' · ' + p.Direction : '') + (p.WingNumber ? ' · כנף ' + p.WingNumber : '');
    const bad = rows.some((r) => ['לא תקין', 'חסר'].includes(r.PartStatusAtVisit));
    const warn = v.StatusAtVisit === 'תקין' && bad ? '<div style="margin-top:8px;background:#FFF4D6;border:1px solid #F0C36D;border-radius:8px;padding:6px 10px;font-size:13px;color:#7A5200">שים לב: דווח רכיב לא תקין או חסר, ומצב השלט בביקור הוא תקין.</div>' : '';
    const list = parts.map((p) => { const r = rows.find((x) => x.RelatedPartGlobalID === p.GlobalID); return `<div style="padding:8px 0;border-bottom:1px solid #FDE7C7;display:flex;align-items:center;justify-content:space-between;gap:8px"><div><b style="font-size:14px">${esc(pn(p))}</b>${r && r.PartNotes ? `<div style="font-size:12px;color:#64748B">${esc(r.PartNotes)}</div>` : ''}</div><div style="display:flex;align-items:center;gap:6px">${pchip(r ? (r.PartStatusAtVisit || 'דווח') : 'לא דווח', r ? statusColor(r.PartStatusAtVisit) : '#94A3B8')}<button title="${r ? 'עריכת שורה' : 'דווח מצב'}" onclick="SimA.psnew('${p.GlobalID}')" style="cursor:pointer;border:0;border-radius:50%;width:30px;height:30px;background:#1E3A8A;color:#fff;font-size:${r ? 14 : 18}px;line-height:1">${r ? '✎' : '+'}</button></div></div>`; }).join('') || '<small style="color:#64748B">אין רכיבים בשלט</small>';
    return `<div style="margin-top:12px;border:1.5px solid #FDBA74;border-radius:12px;background:#FFF9F1;padding:10px 12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b style="font-size:14px">ביקור פתוח להיום</b><span>${pchip(v.VisitType || 'ביקור', VCOL(v.VisitType))} ${v.StatusAtVisit ? pchip(v.StatusAtVisit, statusColor(v.StatusAtVisit)) : ''}</span></div><div style="font-size:12px;color:#64748B;margin-top:2px">דווחו ${rows.length} מתוך ${parts.length} רכיבים. מדווחים רק על רכיב שנבדק או שיש בו ממצא.</div>${warn}${list}${st.tab === 'flow' ? '<button onclick="SimA.step(4)" style="margin-top:8px;width:100%;cursor:pointer;border:0;border-radius:10px;padding:8px;background:#1E3A8A;color:#fff;font-weight:700">סיום</button>' : ''}</div>`;
  }
  function psFormView(S, M, sg) {
    return `<div style="font-weight:700;margin-bottom:4px">${esc(M.C.ent.alias)} <span style="font-weight:400;color:#64748B">(${st.psform.__edit ? 'עריכה' : 'חדש'})</span></div>${formFields(S, M.C.ent, st.psform, sg, 'SimA.pf')}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.pfsave()">שמור</button><button style="flex:1" onclick="SimA.pfcancel()">ביטול</button></div>`;
  }
  function psModalBlock(S, M, sg, v) {
    const rows = v.__ps || [];
    return `<div style="margin-top:12px;font-weight:700">${esc(M.C.ent.alias)} (${rows.length})</div>` + rows.map((r, j) => `<div style="border:1px solid #E2E8F0;border-radius:8px;padding:6px;margin-top:6px">${formFields(S, M.C.ent, r, sg, `SimA.psv.bind(null,'m',${j})`)}<button class="mini" onclick="SimA.psdel('m',${j})">מחק שורה</button></div>`).join('') + `<button class="mini" style="margin-top:6px" onclick="SimA.psadd('m')">+ רכיב</button>`;
  }

  function flowTab(S, M) {
    ensure(S);
    const kind = st.flow === 'visit' ? (st.vch === 's123' ? 'edit' : 'visitfm') : st.flow;
    const autoFM = kind === 'visitfm' && !!window.SimGen, steps = FLOWS[kind], cur = autoFM ? 0 : Math.min(st.step, steps.length - 1);
    const fmv = (mode) => { if (!window.SimGen) return null; if (autoFM) return SimGen.flowView(S, { mode: 'auto', step: 'auto' }); const data = {}; [['main', M.main], ['A', M.A && M.A.ent], ['B', M.B && M.B.ent], ['C', M.C && M.C.ent]].forEach(([k, e]) => { if (e) data[e.name] = st.db[k]; }); return SimGen.flowView(S, { mode, step: kind + ':' + cur + ':' + st.sel, sel: st.sel, data, ext: { sel: (i) => SimA.pick(i), s123: () => SimA.step(2), close: () => SimA.step(0), ro: true } }); };
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    const gid = sg ? sg.GlobalID : '<GlobalID>';
    const urlE = `arcgis-survey123://?itemID=${ITEM}&action=edit&q:globalId=${gid}&folder=inbox&update=true&callback=https://fieldmaps.arcgis.app`;
    const urlN = `arcgis-survey123://?itemID=${ITEM}&action=collect&callback=https://fieldmaps.arcgis.app`;
    const chips = steps.map((l, i) => `<div class="stp ${i === cur ? 'on' : i < cur ? 'done' : ''}" onclick="SimA.step(${i})"><b>${i < cur ? '✓' : i + 1}</b><span>${esc(l)}</span></div>`).join('<i class="stl"></i>');
    let screen = '', note = '';
    if (kind === 'edit') {
      if (cur === 0) { screen = fmv('map') || phone('Field Maps · מפה', mapBox(dots('SimA.pick')) + `<div style="padding:8px;color:#64748B">${sg ? 'נבחר: ' + esc(sg.SignID || '') : 'הקש על שלט במפה'}</div>`); note = 'הקשה 1: בחירת השלט במפה.'; }
      else if (cur === 1 && sg) { screen = fmv('popup') || phone('Field Maps · פופאפ', `${signPopup(S, M, sg)}<a style="display:block;background:#1E3A8A;color:#fff;text-align:center;border-radius:8px;padding:10px;margin-top:8px;cursor:pointer" onclick="SimA.step(2)">ערוך ב-Survey123 ›</a>`); note = 'הקשה 2: קישור בפופאפ (ביטוי Arcade). הקישור פותח את Survey123 ישירות בטופס העריכה של השלט.'; }
      else if (cur === 2) {
        if (st.inbox) { screen = s123Phone(S, M, 'Survey123 · עריכת שלט'); note = 'הקישור (q:globalId + update=true) מסנן את ה-Inbox לרשומה אחת, ו-Survey123 פותח אותה ישירות בטופס העריכה: אין מסך Inbox ואין הקשה נוספת. הרשומה והרכיבים הקיימים נטענו; הוספת ביקור חדש מעדכנת את מצב השלט אחרי שמירה.'; }
        else { screen = s123Inbox(S, M); note = 'כש-Inbox כבוי הקישור לא מצליח לפתוח את הרשומה לעריכה.'; }
      }
      else { screen = fmv('map') || resultPhone(M); note = 'חזרה אוטומטית ל-Field Maps (callback). הצבע בנקודה משקף את המצב המעודכן.'; }
    } else if (kind === 'visitfm') {
      const vt = M.B ? (M.B.ent.fields.find((f) => f.name === 'VisitType') && dom(S, M.B.ent.fields.find((f) => f.name === 'VisitType'))) : null;
      const types = vt ? vt.values.map((v) => v.label) : [];
      if (cur === 0) { screen = fmv('map') || phone('Field Maps · מפה', mapBox(dots('SimA.pick')) + `<div style="padding:8px;color:#64748B">${sg ? 'נבחר: ' + esc(sg.SignID || '') : 'הקש על שלט במפה'}</div>`); note = 'הקשה 1: בחירת השלט במפה. הפופאפ נפתח.'; }
      else if (cur === 1 && sg) {
        screen = phone('Field Maps · פופאפ', `<div style="position:relative">${signPopup(S, M, sg)}${editModal(S, M)}</div>`);
        note = 'הקשה 2: כפתור סוג ביקור (ביקור אחד לשלט). הסוג, הממפה והתאריך כבר מלאים. אין כפתורי רכיב בפופאפ השלט: מצב רכיב מדווח מפופאפ הביקור.';
      }
      else if (cur === 2 && sg && M.B) {
        screen = phone('Field Maps · ביקור חדש (' + esc(st.vform.VisitType || '') + ')', formFields(S, M.B.ent, st.vform, sg, 'SimA.fv') + `<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.vsave()">שמור</button><button style="flex:1" onclick="SimA.step(1)">ביטול</button></div>` + (M.C ? limitBox() : ''));
        note = 'טופס הביקור (רמה 2) מוגדר בטבלת הביקורים: מצב שלט, סכנה, סיכום וצילום. אותם תנאי תצוגה כמו ב-Survey123, ללא Inbox וללא מעבר בין אפליקציות.';
      }
      else if (cur === 3 && sg && M.C) {
        screen = phone('Field Maps · ' + (st.psform ? 'מצב רכיב (רמה 3)' : 'פופאפ'), st.psform ? psFormView(S, M, sg) : `<div style="position:relative">${signPopup(S, M, sg)}</div>`);
        note = st.psform ? 'טופס מצב רכיב (רמה 3): הרכיב ממולא מראש מהקישור, ונשארים רק מצב, הערה וצילום ושליחה. אחרי שליחה חוזרים אוטומטית לפופאפ השלט (callback).' : 'אחרי שליחת הביקור חוזרים לפופאפ השלט, ובו כרטיס "ביקור פתוח להיום" עם כל הרכיבים. Field Maps מציג טופס עריכה לרמה אחת ואין בו הוספת רשומת בת, לכן כל דיווח על רכיב יוצא מכפתור + בפופאפ: הקישור פותח ישר את טופס הרכיב ברמה 3 עם הרכיב ממולא, ואחרי שליחה חוזרים לאותו פופאפ. ✎ עורך שורה קיימת. רכיב שלא נבדק נשאר בלי שורה.';
      }
      else { screen = phone('Field Maps · פופאפ', `<div style="position:relative">${signPopup(S, M, st.db.main[st.sel])}${editModal(S, M)}</div>`); note = 'הביקור נשמר כשורה אחת ומתחתיה שורות מצב לרכיבים שדווחו. מצב השלט הנוכחי התעדכן אוטומטית מהביקור (אם האפשרות מסומנת למעלה), ומצב כל רכיב מוצג מהשורה האחרונה שדיווחה עליו.'; }
    } else {
      if (cur === 0 && st.ibox === 'form') { screen = s123Phone(S, M, 'Survey123 · עריכת שלט'); note = 'נפתח הטופס של הרשומה שנבחרה מתוך Inbox (פתיחה ידנית, ללא קישור).'; }
      else if (cur === 0 && st.ibox) { screen = s123InboxList(S, M); note = 'דואר נכנס: כל הרשומות הקיימות בטופס. בתחתית בורר בין תצוגת רשימה לתצוגת מפה. הקשה על רשומה פותחת אותה לעריכה. הנשלחו כבוי (המלצת Esri כשמפעילים Inbox): הרשומות שנשלחו לא מופיעות שם ולכן אין תיקיית נשלח.'; }
      else if (cur === 0) {
        screen = s123Home(S, M);
        note = 'המשתמש פותח בעצמו את Survey123 ובוחר את הסקר: אין דרך להציב כפתור פתיחה על מפת Field Maps. מסך הסקר: כפתור איסוף ותיקיות.';
      }
      else if (cur === 1) { screen = s123Phone(S, M, 'Survey123 · שלט חדש'); note = 'המיקום נקלט בטופס (GPS) ואפשר לתקנו במפה. מצב ושדות אחרים לפי תנאי התצוגה.'; }
      else { screen = fmv('map') || resultPhone(M); note = 'השלט נשמר ב-Survey123. כדי לראות אותו במפה, המשתמש עובר ל-Field Maps ידנית (אין callback במסלול זה).'; }
    }
    if (autoFM) note = SimGen.stepNote();
    const back = kind === 'new' && cur === 0 && st.ibox ? `<button onclick="SimA.ibBack()">‹ חזרה</button>` : cur > 0 ? `<button onclick="SimA.step(${kind === 'visitfm' && cur >= 3 ? 1 : cur - 1})">‹ חזרה</button>` : '';
    const chk = (ok, t) => `<li style="color:${ok ? '#166534' : '#991B1B'}">${ok ? '✓' : '✗'} ${t}</li>`;
    const arcade = `var params = {\n  itemID: '${ITEM}',\n  action: 'edit',\n  'q:globalId': StandardizeGuid($feature.GlobalID, 'digits-hyphen'),\n  folder: 'inbox',\n  update: 'true',\n  callback: 'https://fieldmaps.arcgis.app'\n};\nreturn 'arcgis-survey123://?' + UrlEncode(params);`;
    const urlV = `https://fieldmaps.arcgis.app/?referenceContext=addRelatedFeature&itemID=<FM_MAP_ITEM_ID>&featureSourceURL=<SIGNS_LAYER_URL>&featureID=${gid}&relationshipID=<REL_ID_VISITS>&featureAttributes=${encodeURIComponent(JSON.stringify({ VisitType: st.vform && st.vform.VisitType || 'מעקב' }))}&callback=<ENCODED_RETURN_URL>`;
    const urlPS = `https://fieldmaps.arcgis.app/?referenceContext=addRelatedFeature&itemID=<FM_MAP_ITEM_ID>&featureSourceURL=<VISITS_TABLE_URL>&featureID=${st.cv ? st.cv.GlobalID : '<VISIT_GlobalID>'}&relationshipID=<REL_ID_PARTSTATUS>&featureAttributes=${encodeURIComponent(JSON.stringify({ RelatedPartGlobalID: '<PART_GlobalID>' }))}&callback=<ENCODED_VISIT_POPUP_URL>`;
    const vside = kind === 'visitfm' ? `<h4>קישור (deep link) לכפתור</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlV)}</pre><p style="font-size:13px">addRelatedFeature פותח טופס בטבלה הקשורה, ו-featureAttributes ממלא שדות מראש (למשל VisitType). בניגוד לכך, ב-Survey123 קישור עריכה אינו יכול למלא שדה בשורת Repeat, ולכן סוג הביקור נבחר בתוך הטופס.</p><h4>קישור לרמה 3 (כפתור + ליד רכיב בפופאפ הביקור)</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlPS)}</pre><p style="font-size:13px">האב כאן הוא רשומת ביקור בטבלה, לא שלט: featureSourceURL הוא כתובת טבלת הביקורים ו-relationshipID שייך לקשר ביקור ← מצב רכיב. אין תיעוד שמאשר אב מסוג טבלה בקישור הזה (בדיקה B2). אם זה לא נתמך, בוחרים את הרכיב ידנית בטופס הרכיב, וב-Survey123 הרכיבים נבחרים ממילא מתוך הטופס.</p>` : '';
    const side = `<div><div class="simnote"><b>${note}</b></div>${back}${autoFM ? '<button class="mini" onclick="SimG.seed()">אפס נתוני דוגמה</button>' : ''}${vside}${st.flow === 'visit' && !autoFM ? scenarioPanel(S, M) : ''}
      ${kind === 'edit' ? `<h4>קישור (עריכה)</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlE)}</pre>` : kind === 'visitfm' ? '' : `<h4>הדרכה למשתמש בשטח</h4><ol style="line-height:1.8"><li>פתח את אפליקציית Survey123 (לא Field Maps).</li><li>בחר את הסקר "${esc(S.meta.title || 'סקר שילוט')}".</li><li>לחץ "איסוף", אשר מיקום GPS ומלא את הטופס.</li><li>שלח. לצפייה בשלט במפה עבור ל-Field Maps.</li></ol><p style="color:#64748B;font-size:12px">קיצור דרך אפשרי: קישור פתיחה (<code dir="ltr">${esc(urlN)}</code>) כקיצור על מסך הבית, כ-QR או בהודעת הדרכה. לא כפתור במפה.</p>`}
      ${kind === 'edit' ? `<details><summary>ביטוי Arcade לקישור בפופאפ / Task</summary><pre dir="ltr" style="background:#F1F5F9;padding:8px;font-size:11px;overflow:auto">${esc(arcade)}</pre></details>` : ''}
      ${(() => { const cf = geoFields(M); if (!cf.length || st.flow !== 'new') return ''; const pend = st.db.main.filter((x) => x.__pending).length; const oth = calcFields(M).filter((f) => !/@layer/.test(f.calc)); return `<h4>חישוב כתובת יערנית מהמיקום</h4><ul style="line-height:1.7;font-size:12px">${cf.map((f) => `<li>${esc(f.alias)}: ${f.calc ? `<code dir="ltr" style="font-size:10px">${esc(f.calc)}</code>` : '<i style="color:#92400E">כלל טרם הוגדר, ערך הדמיה בלבד</i>'}</li>`).join('')}</ul><p style="color:#92400E;font-size:12px">pulldata("@layer") עובד רק ברשת. ללא קליטה השדות נשארים ריקים עד סנכרון ועיבוד בשרת. הערכים בסימולטור הם ערכי דמה.</p><button ${pend ? '' : 'disabled'} onclick="SimA.sync()">סנכרון והשלמה בשרת (${pend} ממתינים)</button>${oth.length ? `<h4>שדות מחושבים נוספים</h4><ul style="line-height:1.7;font-size:12px">${oth.map((f) => `<li>${esc(f.alias)}: <code dir="ltr" style="font-size:10px">${esc(f.calc)}</code></li>`).join('')}</ul>` : ''}`; })()}
      ${kind === 'visitfm' ? '' : `<h4>הגדרות נדרשות</h4><ul style="line-height:1.8"><li><label><input type="checkbox" ${st.inbox ? 'checked' : ''} onchange="SimA.inboxSet(this.checked)"> Inbox מופעל בטופס</label></li>${chk(st.flow === 'new' || true, 'הטופס פורסם מעל השכבה/הטבלאות (Repeat לרכיבים, לביקורים)')}${chk(true, 'המשתמש מחובר לאותו Portal ב-Field Maps וב-Survey123')}${chk(true, 'update=true מרענן את ה-Inbox לפני הפתיחה')}</ul>`}
      <p style="color:#64748B;font-size:12px">הערה: פרמטרי הקישור לפי דוגמאות קהילת Esri; לאמת מול התיעוד הרשמי ובגרסת האפליקציה בשטח.</p></div>`;
    const seg = (cur0, items) => `<div class="seg">${items.map(([k, l, on]) => `<button class="${on ? 'on' : ''}" onclick="${k}">${l}</button>`).join('')}</div>`;
    const modeSeg = seg(0, [["SimA.flowSet('edit')", 'עריכת שלט קיים', st.flow === 'edit'], ["SimA.flowSet('new')", 'הוספת שלט חדש', st.flow === 'new'], ["SimA.flowSet('visit')", 'ביקור: מעקב / פיקוח / טיפול', st.flow === 'visit']]);
    const chanSeg = st.flow === 'visit' ? `<div class="simrow"><span class="simlbl">ערוץ הביקור</span>${seg(0, [["SimA.vch('fm')", 'Field Maps (מומלץ)', st.vch !== 's123'], ["SimA.vch('s123')", 'Survey123 (גיבוי לקליטה חלשה)', st.vch === 's123']])}</div>` : '';
    return `<div class="simcard"><div class="simrow"><span class="simlbl">תרחיש</span>${modeSeg}</div>${chanSeg}${autoFM ? '' : `<div class="simrow"><span class="simlbl">שלבים</span><div class="stepper">${chips}</div></div>`}</div><div class="simgrid"><div class="simphone">${screen}</div><div class="simside">${side}</div></div>`;
  }
  function chipHtml(t) { return t ? `<span style="background:${statusColor(t)};color:#fff;border-radius:10px;padding:2px 10px;font-size:12px">${esc(t)}</span>` : ''; }
  function resultPhone(M) {
    const sg = st.db.main[st.sel];
    return phone('Field Maps · מפה', mapBox(dots('SimA.sel0')) + `<div style="padding:8px">${sg ? `<b>${esc(sg.SignID || 'שלט')}</b> ${chipHtml(sg.SignStatus)}<div style="color:#64748B">נשמר. ${M.B ? 'ביקורים: ' + visitsOf(M, sg).length : ''}</div>` : ''}</div>`);
  }

  /* ---------- Field Maps ---------- */
  const statusColor = (s) => ({ 'תקין': '#a7c636', 'לא תקין': '#ed5151', 'מתוכנן': '#149ece', 'לפירוק': '#fc921f' }[s] || '#64748B');
  function visitsOf(M, sg) { if (!M.B) return []; if (st.variant === 'sign') return st.db.B.filter((v) => v.ParentGlobalID === sg.GlobalID); const ids = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID).map((p) => p.GlobalID); return st.db.B.filter((v) => ids.includes(v.ParentGlobalID)); }

  /* ---------- פופאפ שלט עשיר (כמו בפופאפ ה-Arcade) ---------- */
  const VCOL = (t) => ({ 'מעקב': '#149ece', 'פיקוח': '#fc921f', 'טיפול': '#a7c636' }[t] || '#64748B');
  const pchip = (t, c) => `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:700;color:${c};border:1px solid ${c};background:#fff;white-space:nowrap">${esc(t)}</span>`;
  function modelImg(S, M, sg) { const f = M.main.fields.find((x) => x.name === 'SignModel'), d = f && dom(S, f), v = d && d.values.find((x) => x.label === sg.SignModel); return v && v.img ? Media.get(v.img) : null; }
  function acc(title, n, body, accent, open) { return `<details ${open ? 'open' : ''} style="margin-top:10px;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;background:#fff"><summary style="cursor:pointer;padding:11px 13px;background:#F8FAFC;border-right:5px solid ${accent};font-weight:700;font-size:14px;color:#0F172A">${title}${n >= 0 ? ` <span style="color:#64748B;font-weight:400">(${n})</span>` : ''}</summary><div style="padding:10px 13px;border-top:1px solid #E2E8F0">${body}</div></details>`; }
  function signPopup(S, M, sg) {
    const parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID), vs = visitsOf(M, sg), vrev = vs.slice().reverse();
    const vtf = M.B && M.B.ent.fields.find((f) => f.name === 'VisitType'), vd = vtf && dom(S, vtf), types = vd ? vd.values.map((v) => v.label) : [];
    const stf = M.main.fields.find((f) => f.name === 'SignStatus'), sd = stf && dom(S, stf), states = sd ? sd.values.map((v) => v.label) : ['תקין', 'לא תקין', 'מתוכנן', 'לפירוק'];
    const al = (ent, n) => { const f = ent.fields.find((x) => x.name === n); return f ? f.alias : n; };
    const u = modelImg(S, M, sg), last = vrev[0];
    const bar = `<div style="display:flex;gap:5px;margin-top:10px">${states.map((x) => { const on = x === sg.SignStatus; return `<div style="flex:1;text-align:center;padding:5px 2px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ${on ? statusColor(x) : '#E2E8F0'};background:${on ? statusColor(x) : '#fff'};color:${on ? '#fff' : '#94A3B8'}">${esc(x)}</div>`; }).join('')}</div>`;
    const hz = sg.SafetyHazard && /סכנה/.test(sg.SafetyHazard) && !/^לא/.test(sg.SafetyHazard) ? `<div style="margin-top:8px;background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:8px;padding:7px 10px;font-size:13px;font-weight:700">${esc(sg.SafetyHazard)}${sg.FaultNotes ? ': ' + esc(sg.FaultNotes) : ''}</div>` : (sg.FaultNotes && sg.SignStatus === 'לא תקין' ? `<div style="margin-top:8px;background:#FEF3C7;border:1px solid #FDE68A;color:#92400E;border-radius:8px;padding:7px 10px;font-size:13px">${esc(sg.FaultNotes)}</div>` : '');
    const vbtn = (t, gid, small) => `<button onclick="SimA.vstart('${esc(t)}','${gid || ''}')" style="cursor:pointer;flex:1;border:0;border-radius:${small ? 7 : 10}px;padding:${small ? '5px 2px' : '10px 4px'};background:${VCOL(t)};color:#fff;font-weight:700;font-size:${small ? 12 : 14}px">${esc(t)}</button>`;
    const actions = M.B ? `<div style="margin-top:12px;font-size:12px;color:#64748B">הוסף ביקור לשלט</div><div style="display:flex;gap:6px;margin-top:4px">${types.map((t) => vbtn(t, '')).join('')}</div><button onclick="SimA.toS123()" style="margin-top:6px;width:100%;cursor:pointer;border:1px dashed #64748B;color:#334155;background:#F8FAFC;border-radius:10px;padding:8px;font-weight:600">ביקור ב-Survey123 (חיבור חלש)</button><button onclick="SimA.editSign()" style="margin-top:6px;width:100%;cursor:pointer;border:1px solid #1E3A8A;color:#1E3A8A;background:#fff;border-radius:10px;padding:8px;font-weight:700">עריכת פרטי שלט</button>` : '';
    const pk = ['SignContentText', 'LocationDescription', 'RoadName', 'RoadColor', 'PlacementDate', 'MappingDate', 'MapperName', 'NewSignageTheory'], gk = ['DistrictName', 'RegionName', 'GushName', 'ForestName', 'ResponsibleUnit'];
    const grid = (ks) => { const r = ks.filter((k) => sg[k]).map((k) => `<div><div style="font-size:11px;color:#64748B">${esc(al(M.main, k))}</div><div style="font-size:13px">${esc(sg[k])}</div></div>`).join(''); return r ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px">${r}</div>` : '<small style="color:#64748B">אין נתונים</small>'; };
    const pm = ['WingNumber', 'Direction', 'Level', 'PictogramCode', 'SupplierName'];
    const partsHtml = M.A ? (parts.map((p) => {
      const ph = M.C ? partState(M, sg, p.GlobalID) : null, lv = ph && ph.v, state = ph && ph.r.PartStatusAtVisit || 'לא דווח';
      const meta = pm.filter((k) => p[k]).map((k) => `${esc(al(M.A.ent, k))}: ${esc(p[k])}`).join(' · ');
      return `<div style="padding:9px 0;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:14px">${esc(p.ComponentType || 'רכיב')}</b>${pchip(state, statusColor(state))}</div>${meta ? `<div style="font-size:12px;color:#64748B;margin-top:2px">${meta}</div>` : ''}${lv ? `<div style="font-size:11px;color:#94A3B8">דווח ${esc(lv.VisitDate || '')}</div>` : ''}</div>`;
    }).join('') || '<small style="color:#64748B">אין רכיבים</small>') : '';
    const partName = (id) => { const p = st.db.A.find((x) => x.GlobalID === id); return p ? p.ComponentType : ''; };
    const visHtml = vrev.map((v) => `<div style="border-right:3px solid ${VCOL(v.VisitType)};padding:4px 11px;margin-bottom:11px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><span style="font-size:12px;color:#64748B">${esc(v.VisitDate || '')}</span><span>${pchip(v.VisitType || 'ביקור', VCOL(v.VisitType))} ${v.StatusAtVisit ? pchip(v.StatusAtVisit, statusColor(v.StatusAtVisit)) : ''}</span></div>${M.C ? psOf(v.GlobalID).map((r) => `<div style="font-size:13px;margin-top:3px"><b>${esc(partName(r.RelatedPartGlobalID))}</b>: ${pchip(r.PartStatusAtVisit || 'דווח', statusColor(r.PartStatusAtVisit))}${r.PartNotes ? ' ' + esc(r.PartNotes) : ''}</div>`).join('') : ''}${v.VisitSummary ? `<div style="font-size:13px;margin-top:3px">${esc(v.VisitSummary)}</div>` : ''}${v.VisitNotes ? `<div style="font-size:12px;color:#64748B">${esc(v.VisitNotes)}</div>` : ''}${v.VisitorName ? `<div style="font-size:11px;color:#94A3B8">${esc(v.VisitorName)}</div>` : ''}${M.C ? `<button onclick="SimA.openV('${v.GlobalID}')" style="margin-top:4px;cursor:pointer;border:1px solid #CBD5E1;background:#fff;border-radius:8px;padding:3px 10px;font-size:12px;color:#1E3A8A">פתח ביקור ›</button>` : ''}</div>`).join('') || '<small style="color:#64748B">אין ביקורים</small>';
    return `<div style="padding:4px 2px"><div style="font-size:20px;font-weight:800;color:#1E3A8A">${esc(sg.SignID || 'שלט')}</div><div style="font-size:14px;margin-top:2px">${esc(sg.SignModel || '')}</div><div style="font-size:12px;color:#64748B;margin-top:2px">${last ? 'ביקור אחרון: ' + esc(last.VisitDate || '') + ' (' + esc(last.VisitType || '') + ')' : 'טרם בוצע ביקור'} · ${vs.length} ביקורים</div>${u ? `<img src="${u}" alt="" style="width:100%;max-height:150px;object-fit:contain;border:1px solid #E2E8F0;border-radius:10px;margin-top:8px;background:#fff">` : ''}${bar}${hz}${actions}${openVisitCard(S, M, sg)}
    <div style="margin-top:12px;border:1px solid #E2E8F0;border-radius:12px;padding:12px">${grid(pk)}</div>
    ${M.A ? acc(esc(M.A.ent.alias), parts.length, partsHtml, '#149ece', true) : ''}${M.B ? acc(esc(M.B.ent.alias), vs.length, visHtml, '#fc921f', true) : ''}${acc('כתובת יערנית ואחראים', -1, grid(gk), '#a7c636', false)}</div>`;
  }
  function editModal(S, M) { return st.emod ? `<div style="position:absolute;inset:0;background:#fff;overflow:auto;padding:8px;z-index:5"><b>עריכת פרטי שלט</b>${formFields(S, M.main, st.emod, {}, 'SimA.es')}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.esave()">שמור</button><button style="flex:1" onclick="SimA.ecancel()">ביטול</button></div></div>` : ''; }
  function fm(S, M) {
    if (window.SimGen) return SimGen.fmView(S);
    ensure(S);
    const dots = st.db.main.map((s, i) => { const x = 40 + (i * 83) % 280, y = 50 + (i * 61) % 200; return `<div onclick="SimA.sel(${i})" title="${esc(s.SignID || '')}" style="position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:${statusColor(s.SignStatus)};border:3px solid ${st.sel === i ? '#0F172A' : '#fff'};box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`; }).join('');
    let popup = '<div style="color:#64748B;padding:10px">בחר שלט במפה</div>';
    if (st.sel != null && st.db.main[st.sel]) {
      popup = st.psform ? psFormView(S, M, st.db.main[st.sel]) : signPopup(S, M, st.db.main[st.sel]);
    }
    const modal = st.modal ? `<div style="position:absolute;inset:0;background:#fff;overflow:auto;padding:8px"><b>${esc(M.B.ent.alias)} חדש</b>${st.variant === 'part' ? `<label style="display:block;font-weight:600;margin:10px 0 3px">ברכיב / תשתית</label><select style="width:100%;padding:8px" onchange="SimA.mp(this.value)"><option value="">בחר…</option>${st.db.A.filter((p) => p.ParentGlobalID === st.db.main[st.sel].GlobalID).map((p) => `<option value="${p.GlobalID}" ${st.modal.part === p.GlobalID ? 'selected' : ''}>${esc(p.ComponentType || '')}</option>`).join('')}</select>` : ''}${formFields(S, M.B.ent, st.modal.v, st.db.main[st.sel], 'SimA.mv')}${M.C ? limitBox('אי אפשר להוסיף מצב רכיב בתוך טופס הביקור. שמור, ופתח את הביקור מהרשימה.') : ''}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.savev()">שמור</button><button style="flex:1" onclick="SimA.cancel()">ביטול</button></div></div>` : '';
    const emodal = editModal(S, M);
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${phone('Field Maps · מפה', `<div style="position:relative;height:300px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${dots}</div><div style="margin-top:8px;border-top:3px solid #1E3A8A;position:relative">${popup}${modal}${emodal}</div>`)}
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
    ${lst(M.main, st.db.main)}${lst(M.A.ent, st.db.A)}${M.B ? lst(M.B.ent, st.db.B) : ''}${M.C ? lst(M.C.ent, st.db.C) : ''}`;
  }

  /* ---------- מבנה מלא: שכבה, טבלאות, קשרים וכל השדות ---------- */
  function structure(S, M) {
    ensure(S);
    const ents = [M.main, M.A && M.A.ent, M.B && M.B.ent, M.C && M.C.ent].filter(Boolean).concat(S.entities.filter((e) => ![M.main, M.A && M.A.ent, M.B && M.B.ent, M.C && M.C.ent].includes(e)));
    const parentRel = (e) => S.relationships.find((r) => r.destination === e.name);
    const condTxt = (c, ent) => {
      if (!c) return '';
      if (c.all) return c.all.map((x) => condTxt(x, ent)).join(' וגם ');
      if (c.any) return c.any.map((x) => condTxt(x, ent)).join(' או ');
      const up = String(c.f)[0] === '^', k = up ? c.f.slice(1) : c.f, fld = (up ? M.main : ent).fields.find((f) => f.name === k), v = Array.isArray(c.v) ? c.v.join(' / ') : c.v;
      return (up ? 'באב: ' : '') + (fld ? fld.alias : k) + (c.op === 'in' ? ' ∈ ' : c.op === '!=' ? ' ≠ ' : ' = ') + (v === '' ? '(ריק)' : v);
    };
    const th = 'border:1px solid #E2E8F0;padding:4px 7px;background:#F1F5F9;font-weight:600;text-align:right;white-space:nowrap', td = 'border:1px solid #E2E8F0;padding:4px 7px;vertical-align:top;text-align:right';
    const tag = (t, c) => `<span style="display:inline-block;padding:1px 7px;border-radius:9px;font-size:11px;background:${c};color:#fff;margin-inline-end:3px">${esc(t)}</span>`;
    const MODE = { 'אוטומטי': '#149ece', 'רשימה': '#6161ff', 'ידני': '#64748B', 'מערכת': '#94A3B8', 'היסטורי': '#B45309' };
    const lvl = (e) => { let n = 0, cur = e; while (parentRel(cur) && n < 5) { cur = S.entities.find((x) => x.name === parentRel(cur).origin); n++; } return n; };
    const tree = `<div style="display:flex;align-items:stretch;gap:0;flex-wrap:wrap;margin:6px 0 14px">${[M.main, M.A && M.A.ent, M.B && M.B.ent, M.C && M.C.ent].filter(Boolean).map((e, i) => { const pr = parentRel(e); return `${i ? `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:0 6px;font-size:11px;color:#64748B"><span>${pr ? esc(pr.type === 'COMPOSITE' ? 'מורכב 1:N' : 'פשוט 1:N') : ''}</span><span style="font-size:18px">←</span></div>` : ''}<div style="border:1.5px solid ${e === M.main ? '#6161ff' : '#CBD5E1'};border-radius:10px;padding:8px 12px;background:#fff;min-width:150px;margin:3px"><div style="font-size:11px;color:#64748B">${e.kind === 'point' ? 'שכבה נקודתית (ITM)' : 'טבלה'} · רמה ${lvl(e) + 1}</div><b>${esc(e.alias)}</b><div dir="ltr" style="font-size:11px;color:#64748B;text-align:right">${esc(e.name)} · ${e.fields.length} שדות</div></div>`; }).join('')}</div>`;
    const rels = `<table style="border-collapse:collapse;font-size:12px;margin-bottom:10px"><tr><th style="${th}">קשר</th><th style="${th}">מקור ← יעד</th><th style="${th}">מפתחות</th><th style="${th}">סוג</th><th style="${th}">שם בכיוון קדימה / אחורה</th></tr>${S.relationships.map((r) => `<tr><td style="${td}" dir="ltr">${esc(r.name)}</td><td style="${td}">${esc(r.origin)} ← ${esc(r.destination)}</td><td style="${td}" dir="ltr">${esc(r.originKey)} → ${esc(r.destKey)}</td><td style="${td}">${esc(r.type)}</td><td style="${td}">${esc(r.forward || '')} / ${esc(r.backward || '')}</td></tr>`).join('')}</table>`;
    const dtl = (e) => {
      const pr = parentRel(e), rows = e.fields.map((f) => {
        const d = dom(S, f), src = [f.calc && 'חישוב: ' + f.calc, f.derive && 'נגזר מ-' + f.derive.from, f.fromVisit && 'מהביקור האחרון: ' + f.fromVisit + (f.fromVisitWhen ? ' (כש-' + f.fromVisitWhen.f + ' = ' + f.fromVisitWhen.v + ')' : ''), f.autoValue && 'ברירת מחדל: ' + f.autoValue, f.pickFrom && 'בחירה מ-' + f.pickFrom, f.readonlyOnEdit && 'נעול בעריכה'].filter(Boolean).join(' · ');
        return `<tr><td style="${td}"><b>${esc(f.alias || f.name)}</b><div dir="ltr" style="font-size:11px;color:#64748B;text-align:right">${esc(f.name)}</div></td><td style="${td}" dir="ltr">${esc(f.type)}${f.length ? '(' + esc(f.length) + ')' : ''}</td><td style="${td}">${d ? esc(f.domain) + ' <span style="color:#64748B">(' + d.values.length + ')</span>' : ''}</td><td style="${td}">${tag(f.mode || '', MODE[f.mode] || '#64748B')}</td><td style="${td}">${esc(f.visible || '')}${f.rel ? `<div style="color:#6161ff;font-size:11px">מוצג כש: ${esc(condTxt(f.rel, e))}</div>` : ''}</td><td style="${td}">${f.required ? 'חובה' : ''}${f.reqIf ? `<div style="font-size:11px;color:#B45309">חובה כש: ${esc(condTxt(f.reqIf, e))}</div>` : ''}</td><td style="${td};font-size:11px" dir="auto">${esc(src)}</td><td style="${td};font-size:11px;color:#475569">${esc(f.note || '')}</td></tr>`;
      }).join('');
      return `<details ${e === M.main || e === (M.C && M.C.ent) ? 'open' : ''} style="border:1px solid #E2E8F0;border-radius:12px;margin-bottom:10px;background:#fff"><summary style="cursor:pointer;padding:10px 14px;font-weight:700">${esc(e.alias)} <span dir="ltr" style="font-weight:400;color:#64748B">${esc(e.name)}</span> <span style="font-weight:400;color:#64748B">· ${e.kind === 'point' ? 'שכבה' : 'טבלה'} · ${e.fields.length} שדות${e.attachments ? ' · תמונות מצורפות' : ''}${pr ? ' · אב: ' + esc(pr.origin) : ''}</span></summary><div style="padding:0 14px 12px"><div style="font-size:13px;color:#475569;margin-bottom:8px">${esc(e.description || '')}</div><div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px;min-width:0;width:100%"><tr><th style="${th}">שדה</th><th style="${th}">סוג</th><th style="${th}">דומיין</th><th style="${th}">מילוי</th><th style="${th}">תצוגה</th><th style="${th}">חובה</th><th style="${th}">חישוב / מקור</th><th style="${th}">הערה</th></tr>${rows}</table></div></div></details>`;
    };
    return `<h3 style="margin-top:0">מבנה הנתונים המלא</h3><p style="color:#64748B;font-size:13px;margin:0">שרשרת שלוש הרמות והטבלאות הנלוות, עם כל השדות. הטבלאות נפתחות ונסגרות.</p>${tree}${rels}${ents.map(dtl).join('')}`;
  }

  /* ---------- שלד ---------- */

  /* ---------- משרד: Instant Apps Manager (סיווג שלטים מהשכבה הישנה בהסבה) ---------- */
  /* סוגים ישנים וההערות עליהם לקוחים מהאפיון (סעיף הסבות). ארבעת הראשונים מסומנים בו להמרה אוטומטית. */
  const MG_LEG = [
    ['שלט כניסה ליער', 'פ-1:', ''], ['שלט מבואה', 'פ-2:', ''], ['שלט חיזוק מידע הורייה – עמוד', 'פ-8:', ''], ['שלט בטיחות', 'פ-10:', ''],
    ['שלט הכוונה', '', 'תת דגם בפ-6, לא אוטומטי'], ['שלט מתחלף', '', 'תת דגם בפ-4; הקוד פ-4.1 הכפול טרם הוכרע'],
    ['שלט תוכן / הסבר – מידע', '', 'מול פ-5.2, שיוך לטיוב'], ['סימון שביל (סינגל) אופניים', '', 'מול פ-3.4, תת דגם'], ['שלט הוראות בטיחות ומפה – שלט אתר', '', 'מול פ-5.1, שיוך לטיוב']
  ];
  const MG_PAT = [0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 8, 8, 8, 8, 4, 4, 5, 6, 7, 0, 3, 8];
  function mgFields(S, M) {
    const f = (n) => M.main.fields.find((x) => x.name === n), model = f('SignModel'), ms = f('MigrationStatus'), lt = f('LegacySignType');
    return model && ms && lt && dom(S, model) && dom(S, ms) ? { model, ms, lt } : null;
  }
  function mgCodes(S, F) {
    const c = dom(S, F.ms).values.map((v) => v.code), pick = (re) => c.find((x) => re.test(x)) || '';
    return { auto: pick(/אוטומטית/), pend: pick(/ממתין/), done: pick(/טויב/), exc: pick(/חריג/) };
  }
  function mgInit(S, M, F) {
    const key = (S.meta && S.meta.key) || '';
    if (st.mg && st.mg.key === key) return st.mg;
    const K = mgCodes(S, F), mv = dom(S, F.model).values;
    const rows = MG_PAT.map((li, i) => {
      const L = MG_LEG[li], auto = !!L[1], hit = auto ? mv.find((v) => v.code.indexOf(L[1]) === 0) : null;
      return { id: i, lid: 4100 + i * 7, lt: L[0], hint: L[2], model: hit ? hit.code : '', ms: auto && hit ? K.auto : K.pend, mc: !!hit, x: 12 + (i * 53) % 86, y: 10 + (i * 37) % 80 };
    });
    st.mg = { key, rows, sel: [], fl: '', fs: '', onlySel: false, batch: null, cur: null };
    return st.mg;
  }
  const mgColor = (K, ms) => ms === K.auto ? '#16A34A' : ms === K.done ? '#2563EB' : ms === K.exc ? '#DC2626' : '#D97706';
  function manager(S, M) {
    const F = mgFields(S, M);
    if (!F) return '<p>סביבת המשרד דורשת בשכבה הראשית את השדות SignModel, MigrationStatus ו-LegacySignType עם דומיינים.</p>';
    const g = mgInit(S, M, F), K = mgCodes(S, F), mv = dom(S, F.model).values, sv = dom(S, F.ms).values;
    const vis = g.rows.filter((r) => (!g.fl || r.lt === g.fl) && (!g.fs || r.ms === g.fs) && (!g.onlySel || g.sel.includes(r.id)));
    const cnt = (c) => g.rows.filter((r) => r.ms === c).length;
    const selAll = vis.length && vis.every((r) => g.sel.includes(r.id));
    const opt = (vals, cur, blank) => (blank != null ? `<option value="">${esc(blank)}</option>` : '') + vals.map((v) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const types = MG_LEG.map((l) => l[0]);
    const th = (t) => `<th style="border:1px solid #CBD5E1;padding:4px 6px;background:#F1F5F9;position:static;text-align:right;font-size:12px">${t}</th>`;
    const td = 'border:1px solid #E2E8F0;padding:3px 6px;font-size:12px';
    const body = vis.map((r) => `<tr style="background:${g.sel.includes(r.id) ? '#DBEAFE' : '#fff'}"><td style="${td}"><input type="checkbox" ${g.sel.includes(r.id) ? 'checked' : ''} onchange="SimA.mgsel(${r.id})"></td><td style="${td}">${r.lid}</td><td style="${td}">${esc(r.lt)}</td><td style="${td}"><select style="max-width:210px;font-size:12px" onchange="SimA.mgrow(${r.id},'model',this.value)">${opt(mv.map((v) => v.code), r.model, '— לא סווג —')}</select></td><td style="${td}"><select style="font-size:12px" onchange="SimA.mgrow(${r.id},'ms',this.value)">${opt(sv.map((v) => v.code), r.ms)}</select></td><td style="${td};text-align:center">${r.model ? (r.mc ? '✓' : '<b style="color:#B91C1C">✗</b>') : ''}</td></tr>`).join('');
    const dots = g.rows.map((r) => `<div onclick="SimA.mgpick(${r.id})" title="${esc(r.lt)}" style="position:absolute;left:${r.x}%;top:${r.y}%;width:14px;height:14px;border-radius:50%;background:${mgColor(K, r.ms)};border:${g.sel.includes(r.id) ? '3px solid #0F172A' : '2px solid #fff'};box-shadow:0 1px 3px rgba(0,0,0,.4);cursor:pointer"></div>`).join('');
    const c = g.cur != null ? g.rows.find((r) => r.id === g.cur) : null;
    const pop = c ? `<div style="font-size:12px;line-height:1.7"><b>שלט ${c.lid}</b><br>סוג ישן: ${esc(c.lt)}<br>דגם חדש: ${esc(c.model || 'לא סווג')}<br>סטטוס הסבה: ${esc(c.ms)}${c.hint ? `<br><span style="color:#64748B">מהאפיון: ${esc(c.hint)}</span>` : ''}</div>` : '<div style="color:#64748B;font-size:12px">בחר נקודה במפה או שורה בטבלה</div>';
    const stale = g.rows.filter((r) => r.model && !r.mc).length, mism = g.rows.filter((r) => r.model && r.ms === K.pend).length, noModel = g.rows.filter((r) => !r.model && (r.ms === K.done || r.ms === K.auto)).length;
    const warn = stale || mism || noModel ? `<div style="margin-top:8px;border:1px solid #FCD34D;background:#FFFBEB;border-radius:6px;padding:6px 10px;font-size:12px;line-height:1.7"><b>פערים ש-Manager לא מונע:</b>${mism ? `<br>• ${mism} שלטים עם דגם אבל סטטוס "${esc(K.pend)}"` : ''}${noModel ? `<br>• ${noModel} שלטים בסטטוס מטויב בלי דגם` : ''}${stale ? `<br>• ${stale} שלטים עם דגם בלי ModelCode (✗): עריכה ב-Manager אינה גוזרת אותו` : ''}</div>` : '';
    const bt = g.batch ? `<div style="margin:8px 0;border:2px solid #2563EB;border-radius:8px;padding:10px;background:#EFF6FF;font-size:12px"><b>עריכה מרובה: ${g.sel.length} שלטים</b><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px"><label>דגם<br><select style="max-width:260px" onchange="SimA.mgb('model',this.value)">${opt(mv.map((v) => v.code), g.batch.model, 'ללא שינוי')}</select></label><label>סטטוס הסבה<br><select onchange="SimA.mgb('ms',this.value)">${opt(sv.map((v) => v.code), g.batch.ms, 'ללא שינוי')}</select></label></div><div style="margin-top:8px"><button class="primary" onclick="SimA.mgapply()">החל על ${g.sel.length}</button> <button onclick="SimA.mgcancel()">ביטול</button></div></div>` : '';
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start"><div style="flex:3;min-width:520px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;background:#fff">
      <div style="background:#1E3A8A;color:#fff;padding:8px 12px;font-weight:700;display:flex;justify-content:space-between"><span>טיוב שלטים · Manager</span><span style="font-weight:400;font-size:12px">שכבה: ${esc(M.main.name)} · דוגמה של ${g.rows.length} מתוך כ-8,000</span></div>
      <div style="padding:8px 12px;border-bottom:1px solid #E2E8F0;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;font-size:12px"><label>סוג ישן<br><select onchange="SimA.mgf('fl',this.value)">${opt(types, g.fl, 'הכל')}</select></label><label>סטטוס הסבה<br><select onchange="SimA.mgf('fs',this.value)">${opt(sv.map((v) => v.code), g.fs, 'הכל')}</select></label><span style="margin-inline-start:auto">${vis.length} מתוך ${g.rows.length} · נבחרו ${g.sel.length}</span></div>
      <div style="padding:6px 12px;border-bottom:1px solid #E2E8F0;display:flex;gap:6px;flex-wrap:wrap"><button class="mini" onclick="SimA.mgall()">${selAll ? 'בטל בחירה' : 'בחר הכל (מסונן)'}</button><button class="mini" onclick="SimA.mgshow()">${g.onlySel ? 'הצג הכל' : 'הצג נבחרים'}</button><button class="mini primary" ${g.sel.length ? '' : 'disabled'} onclick="SimA.mgbatch()">עריכה מרובה (${g.sel.length})</button><button class="mini" disabled title="בסימולטור בלבד">ייצוא CSV</button></div>
      ${bt}<div style="max-height:340px;overflow:auto"><table style="border-collapse:collapse;width:100%;min-width:0"><tr>${th('')}${th('מזהה ישן')}${th('סוג ישן')}${th('דגם חדש')}${th('סטטוס הסבה')}${th('ModelCode')}</tr>${body || `<tr><td colspan="6" style="${td};color:#64748B">אין רשומות בסינון</td></tr>`}</table></div></div>
      <div style="flex:1;min-width:240px"><div style="position:relative;height:200px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${dots}</div><div style="margin-top:8px;border:1px solid #E2E8F0;border-radius:8px;padding:8px">${pop}</div>
      <div style="margin-top:8px;font-size:12px;line-height:1.8">${[[K.auto, 'הומר אוטומטית'], [K.pend, 'ממתין'], [K.done, 'מטויב'], [K.exc, 'חריג']].map(([cd, l]) => `<span style="display:inline-block;margin-inline-end:10px"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${mgColor(K, cd)}"></i> ${l} (${cnt(cd)})</span>`).join('')}</div>${warn}
      <button class="mini" style="margin-top:8px" onclick="SimA.mgreset()">אפס נתוני דוגמה</button></div></div>
      <h3>מה אתה בודק כאן</h3><ul style="line-height:1.9"><li>סינון לפי סוג ישן, בחירה במפה או בטבלה, ועריכה מרובה של דגם וסטטוס בבת אחת.</li><li>ארבעת הסוגים המסומנים באפיון להמרה אוטומטית מגיעים מסווגים. השאר ממתינים לטיוב.</li><li>העמודה והאזהרות מראות מה Manager לא עושה: אינו מעדכן סטטוס בעקבות סיווג, ואינו גוזר ModelCode.</li></ul>`;
  }
  function render(S) {
    if (window.SimGen && SimGen.applies(S)) return SimGen.render(S);
    st.S = S; const M = model(S); if (!M.A) return '<p>הסימולטור דורש שכבה עם לפחות טבלה מקושרת אחת.</p>';
    const tab = (k, l) => `<button class="${st.tab === k ? 'primary' : ''}" onclick="SimA.tab('${k}')">${l}</button>`;
    const body = st.tab === 'flow' ? flowTab(S, M) : st.tab === 's123' ? s123(S, M) : st.tab === 'fm' ? fm(S, M) : st.tab === 'struct' ? structure(S, M) : st.tab === 'office' ? manager(S, M) : data(S, M);
    const sets = `<details class="simset"><summary>⚙ הגדרות סימולציה</summary><div class="simsetbody"><label>קשר ביקורים<select onchange="SimA.variant(this.value)"><option value="sign" ${st.variant === 'sign' ? 'selected' : ''}>ביקור → שלט</option><option value="part" ${st.variant === 'part' ? 'selected' : ''}>ביקור → רכיב</option></select></label><label class="inl"><input type="checkbox" ${st.online ? 'checked' : ''} onchange="SimA.online(this.checked)"> מחובר לרשת</label><label class="inl"><input type="checkbox" ${st.auto ? 'checked' : ''} onchange="SimA.auto(this.checked)"> עדכון מצב שלט אוטומטי מהביקור</label><button class="mini" onclick="SimA.seed()">טען מחדש נתוני דוגמה</button></div></details>`;
    return `<div class="simroot"><div class="simtop"><div class="seg lg">${[['flow', 'זרימה Field Maps ↔ Survey123'], ['s123', 'Survey123'], ['fm', 'Field Maps'], ['office', 'משרד: Manager'], ['struct', 'מבנה מלא'], ['data', 'נתונים והשוואה']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" onclick="SimA.tab('${k}')">${l}</button>`).join('')}</div>${sets}<span class="simver">סכמה v${S.meta.version || '?'}</span></div>${body}</div>`;
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
    mgf(k, v) { st.mg[k] = v; rr(); }, mgsel(i) { const a = st.mg.sel, j = a.indexOf(i); if (j < 0) a.push(i); else a.splice(j, 1); st.mg.cur = i; rr(); }, mgpick(i) { SimA.mgsel(i); },
    mgall() { const g = st.mg, vis = g.rows.filter((r) => (!g.fl || r.lt === g.fl) && (!g.fs || r.ms === g.fs)).map((r) => r.id); g.sel = vis.every((i) => g.sel.includes(i)) ? g.sel.filter((i) => !vis.includes(i)) : Array.from(new Set(g.sel.concat(vis))); rr(); },
    mgshow() { st.mg.onlySel = !st.mg.onlySel; rr(); }, mgbatch() { const K = mgCodes(st.S, mgFields(st.S, model(st.S))); st.mg.batch = { model: '', ms: K.done }; rr(); }, mgb(k, v) { st.mg.batch[k] = v; rr(); }, mgcancel() { st.mg.batch = null; rr(); },
    mgapply() { const g = st.mg, b = g.batch; g.rows.filter((r) => g.sel.includes(r.id)).forEach((r) => { if (b.model) { r.model = b.model; r.mc = false; } if (b.ms) r.ms = b.ms; }); g.batch = null; rr(); },
    mgrow(i, k, v) { const r = st.mg.rows.find((x) => x.id === i); r[k] = v; if (k === 'model') r.mc = false; st.mg.cur = i; rr(); }, mgreset() { st.mg = null; rr(); },
    vch(c) { st.vch = c; st.step = 0; st.sel = null; st.editId = null; st.sign = {}; st.parts = []; st.visits = []; rr(); },
    applySc(i) { const S = st.S, M = model(S), sg = st.db.main[st.sel], sc = scenarios(M)[i], parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID); const v = newRow(M.B.ent); derive(M.B.ent, Object.assign(v, sc.visit), sg); Object.assign(v, sc.visit); v.__ps = sc.ps.map((r) => { const o = newRow(M.C.ent); o.RelatedPartGlobalID = parts[r.part].GlobalID; derive(M.C.ent, Object.assign(o, { PartStatusAtVisit: r.PartStatusAtVisit, PartNotes: r.PartNotes || '' }), sg); return Object.assign(o, { PartStatusAtVisit: r.PartStatusAtVisit, PartNotes: r.PartNotes || '' }); }); addVisit(S, M, sg, sg, v); st.cv = st.db.B[st.db.B.length - 1]; st.step = 3; rr(); },
    toS123() { st.tab = 'flow'; st.flow = 'visit'; st.vch = 's123'; st.editId = null; st.modal = null; SimA.step(2); },
    vstart(t, gid) { const M = model(st.S), sg = st.db.main[st.sel], v = newRow(M.B.ent); v.VisitType = t; derive(M.B.ent, v, sg); if (st.tab === 'flow') { st.vform = v; st.cv = null; st.psform = null; st.step = 2; } else { st.modal = { v, part: '' }; } rr(); },
    editSign() { st.emod = Object.assign({}, st.db.main[st.sel]); rr(); }, es(n, v) { st.emod[n] = v; derive(model(st.S).main, st.emod, {}); rr(); }, esave() { Object.assign(st.db.main[st.sel], st.emod); st.emod = null; rr(); }, ecancel() { st.emod = null; rr(); },
    vtype(t) { const M = model(st.S); st.vform = newRow(M.B.ent); st.vform.VisitType = t; derive(M.B.ent, st.vform, st.db.main[st.sel]); st.step = 2; rr(); },
    fv(n, v) { const M = model(st.S); st.vform[n] = v; derive(M.B.ent, st.vform, st.db.main[st.sel]); rr(); },
    vsave() { const M = model(st.S), sg = st.db.main[st.sel]; addVisit(st.S, M, sg, sg, st.vform); st.cv = st.db.B[st.db.B.length - 1]; st.vform = null; st.psform = null; st.step = 3; rr(); },
    psadd(tag) { const M = model(st.S), a = psRows(tag), r = newRow(M.C.ent); derive(M.C.ent, r, tag === 'm' ? st.db.main[st.sel] : st.sign); a.push(r); st.psi[tag] = a.length - 1; rr(); },
    psdel(tag, j) { const a = psRows(tag), i = j == null ? (st.psi[tag] || 0) : j; a.splice(i, 1); st.psi[tag] = Math.max(0, i - 1); rr(); },
    pspg(tag, d) { const a = psRows(tag); st.psi[tag] = Math.max(0, Math.min(a.length - 1, (st.psi[tag] || 0) + d)); rr(); },
    psv(tag, j, n, v) { const M = model(st.S), r = psRows(tag)[j]; r[n] = v; derive(M.C.ent, r, tag === 'm' ? st.db.main[st.sel] : st.sign); rr(); },
    psnew(gid) { const M = model(st.S), sg = st.db.main[st.sel], v = st.cv && st.cv.ParentGlobalID === sg.GlobalID ? st.cv : visitsOf(M, sg).slice(-1)[0], ex = v && psOf(v.GlobalID).find((x) => x.RelatedPartGlobalID === gid); if (ex) st.psform = Object.assign({}, ex, { __edit: ex.GlobalID }); else { st.psform = newRow(M.C.ent); st.psform.RelatedPartGlobalID = gid; derive(M.C.ent, st.psform, sg); } rr(); },
    pf(n, v) { const M = model(st.S); st.psform[n] = v; derive(M.C.ent, st.psform, st.db.main[st.sel]); rr(); },
    pfsave() { const M = model(st.S), sg = st.db.main[st.sel], v = st.cv && st.cv.ParentGlobalID === sg.GlobalID ? st.cv : visitsOf(M, sg).slice(-1)[0], f = st.psform, ed = f.__edit; delete f.__edit; if (ed) Object.assign(st.db.C.find((x) => x.GlobalID === ed), f); else st.db.C.push(Object.assign({}, f, { GlobalID: uid(), ParentGlobalID: v.GlobalID })); st.psform = null; rr(); },
    pfcancel() { st.psform = null; rr(); },
    openV(gid) { st.cv = st.db.B.find((x) => x.GlobalID === gid); st.vview = true; st.psform = null; rr(); },
    closeV() { st.vview = false; st.psform = null; rr(); },
    grp(k) { st.col[k] = !isCol(k); rr(); },
    tab(k) { st.tab = k; rr(); }, variant(v) { st.variant = v; st.modal = null; rr(); }, auto(c) { st.auto = c; rr(); },
    sv(n, v) { st.sign[n] = v; allDerive(); rr(); }, pv(i, n, v) { st.parts[i][n] = v; if (n === 'ComponentType') autoNum(i); allDerive(); rr(); }, vv(i, n, v) { st.visits[i][n] = v; allDerive(); rr(); },
    add(k) { const a = k === 'parts' ? st.parts : st.visits; a.push(newRow(k === 'parts' ? model(st.S).A.ent : model(st.S).B.ent)); if (k === 'parts') st.pi = a.length - 1; else st.vi = a.length - 1; allDerive(); rr(); },
    del(k) { const a = k === 'parts' ? st.parts : st.visits; const i = k === 'parts' ? st.pi : st.vi; a.splice(i, 1); if (k === 'parts') st.pi = Math.max(0, st.pi - 1); else st.vi = Math.max(0, st.vi - 1); allDerive(); rr(); },
    pg(k, d) { if (k === 'parts') st.pi = Math.max(0, Math.min(st.parts.length - 1, st.pi + d)); else st.vi = Math.max(0, Math.min(st.visits.length - 1, st.vi + d)); rr(); },
    send() {
      const S = st.S, M = model(S); ensure(S);
      let s; st.dlg = false; const kmap = {};
      if (st.editId) {
        s = st.db.main.find((x) => x.GlobalID === st.editId);
        Object.keys(st.sign).forEach((k) => { if (k !== 'GlobalID') s[k] = st.sign[k]; });
        const keep = st.parts.map((p) => p.GlobalID).filter(Boolean);
        st.db.A = st.db.A.filter((p) => p.ParentGlobalID !== s.GlobalID || keep.includes(p.GlobalID));
        st.parts.forEach((p) => { if (p.GlobalID) Object.assign(st.db.A.find((x) => x.GlobalID === p.GlobalID), p); else { const g = uid(); if (p.__k) kmap[p.__k] = g; st.db.A.push(Object.assign({}, p, { GlobalID: g, ParentGlobalID: s.GlobalID })); } });
      } else {
        s = Object.assign({}, st.sign, { GlobalID: uid() }); if (st.loc) { s.__loc = st.loc; s.__pending = st.pendingGeo; } st.db.main.push(s);
        st.parts.forEach((p) => { const g = uid(); if (p.__k) kmap[p.__k] = g; st.db.A.push(Object.assign({}, p, { GlobalID: g, ParentGlobalID: s.GlobalID })); });
      }
      if (M.B && st.variant === 'sign') st.visits.forEach((v) => { if (v.VisitType || v.StatusAtVisit) { const c = Object.assign({}, v); c.__ps = (v.__ps || []).map((r) => Object.assign({}, r, { RelatedPartGlobalID: kmap[r.RelatedPartGlobalID] || r.RelatedPartGlobalID })); addVisit(S, M, s, s, c); } });
      st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.loc = null; st.pendingGeo = false; st.editId = null; st.sent += 1; st.sel = st.db.main.indexOf(s);
      if (st.tab === 'flow') st.step = FLOWS[st.flow === 'visit' ? (st.vch === 's123' ? 'edit' : 'visitfm') : st.flow].length - 1; else st.tab = 'fm';
      rr();
    },
    pinAt(e, el) { const r = el.getBoundingClientRect(); st.loc = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }; applyGeo(); rr(); },
    gps() { st.loc = { x: 0.5 + (Math.random() - 0.5) * 0.6, y: 0.5 + (Math.random() - 0.5) * 0.6 }; applyGeo(); rr(); },
    online(c) { st.online = c; applyGeo(); rr(); },
    sync() { const M = model(st.S); st.db.main.forEach((sg) => { if (sg.__pending && sg.__loc) { geoFields(M).forEach((f) => { sg[f.name] = zoneVal(f, zoneOf(sg.__loc)); }); sg.__pending = false; } }); rr(); },
    dlg(v) { if (v && missing().length) { st.showReq = true; rr(); return; } st.dlg = v; rr(); },
    outbox() { st.dlg = false; st.outbox += 1; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 1; rr(); },
    draft() { st.dlg = false; st.drafts += 1; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 1; rr(); },
    flowSet(f) { st.loc = null; st.pendingGeo = false; st.flow = f; st.step = 0; st.editId = null; st.sign = {}; st.parts = []; st.visits = []; st.showReq = false; st.pi = 0; st.vi = 0; rr(); },
    step(n) { st.ibox = null; const ed = st.flow === 'edit' || (st.flow === 'visit' && st.vch === 's123'); if (n === 2 && ed && st.inbox && st.sel != null && st.db.main[st.sel] && st.editId !== st.db.main[st.sel].GlobalID) { SimA.startEdit(); return; } st.step = n; rr(); }, inboxSet(c) { st.inbox = c; rr(); },
    pick(i) { st.sel = i; st.step = 1; rr(); }, sel0(i) { st.sel = i; rr(); },
    startEdit() {
      const sg = st.db.main[st.sel]; if (!sg) return;
      st.col = {}; st.editId = sg.GlobalID; st.sign = Object.assign({}, sg); st.parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID).map((p) => Object.assign({}, p)); st.visits = []; st.pi = 0; st.vi = 0; st.showReq = false; st.step = 2; allDerive(); rr();
    },
    ibox(m) { st.ibox = m; rr(); }, ibPick(i) { st.sel = i; rr(); }, ibBack() { st.ibox = st.ibox === 'form' ? 'list' : null; rr(); },
    ibEdit(i) { st.sel = i; const was = st.step; SimA.startEdit(); st.step = was; st.ibox = 'form'; rr(); },
    startNew() { st.col = {}; st.ibox = null; st.loc = null; st.pendingGeo = false; st.editId = null; st.sign = { SignID: newId() }; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; st.showReq = false; st.step = 1; allDerive(); rr(); },
    seed() { seed(st.S); st.sel = null; rr(); }, sel(i) { st.sel = i; st.modal = null; st.vview = false; st.psform = null; rr(); },
    addv() { st.modal = { v: newRow(model(st.S).B.ent), part: '' }; rr(); }, mv(n, v) { st.modal.v[n] = v; derive(model(st.S).B.ent, st.modal.v, st.db.main[st.sel]); rr(); }, mp(id) { st.modal.part = id; rr(); }, cancel() { st.modal = null; st.emod = null; rr(); },
    savev() {
      const S = st.S, M = model(S), sg = st.db.main[st.sel];
      let parent = sg; if (st.variant === 'part') { parent = st.db.A.find((p) => p.GlobalID === st.modal.part); if (!parent) { alert('בווריאנט ביקור→רכיב חובה לבחור רכיב'); return; } }
      addVisit(S, M, sg, parent, Object.assign({}, st.modal.v)); st.cv = st.db.B[st.db.B.length - 1]; st.modal = null; rr();
    },
  };
  /* עזרים משותפים לסימולטור הכללי (simgen.js) */
  window.SimCore = {
    esc, uid, dom, relOk, hidden, readonly, phone, sample, parentField, newId,
    derive(S, ent, vals, up, isEdit) { const s0 = st.S, e0 = st.editId; st.S = S; st.editId = isEdit ? 'x' : null; try { derive(ent, vals, up); } finally { st.S = s0 || S; st.editId = e0; } },
    geoVal: (f, loc) => zoneVal(f, zoneOf(loc)),
    isGeo: (f) => /@layer/.test(f.calc || '') || (!!GEO[f.name] && f.mode === 'אוטומטי'),
  };
  window.Sim = { render };
})();
