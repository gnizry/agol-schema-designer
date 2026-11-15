/* סימולטור חוויית משתמש: Survey123 + Field Maps + נתונים — נבנה על הסכמה הפעילה.
   תנאי תצוגה מובנים נקראים משדה f.rel = {f:'שדה' | '^שדה-באב', op:'=' | 'in' | '!=', v: ערך | [ערכים]} */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })).toUpperCase();
  const st = { tab: 'flow', flow: 'edit', step: 0, inbox: true, drafts: 0, outbox: 0, dlg: false, sent: 0, editId: null, tab0: 's123', variant: 'sign', auto: true, sign: {}, parts: [], visits: [], pi: 0, vi: 0, db: null, sel: null, modal: null, S: null };

  /* ---------- מבנה הסכמה ---------- */
  function model(S) {
    const main = S.entities.find((e) => e.kind === 'point') || S.entities[0];
    const kids = S.relationships.filter((r) => r.origin === main.name).map((r) => ({ rel: r, ent: S.entities.find((e) => e.name === r.destination) })).filter((k) => k.ent);
    return { main, A: kids[0], B: kids[1] };
  }
  const hidden = (f) => /^מוסתר/.test(f.visible || '') || f.mode === 'מערכת' || f.mode === 'היסטורי' || f.type === 'GUID';
  const readonly = (f) => f.mode === 'אוטומטי' || /קריאה בלבד/.test(f.visible || '');
  function dom(S, f) { return f.domain && S.domains[f.domain] ? S.domains[f.domain] : null; }
  function parentField(S, ent, f) {
    const d = dom(S, f); if (!d || !d.values.some((v) => v.parent)) return null;
    const ps = new Set(d.values.map((v) => v.parent));
    return ent.fields.find((g) => g !== f && dom(S, g) && dom(S, g).values.some((v) => ps.has(v.label))) || null;
  }
  function relOk(f, vals, up) {
    const r = f.rel; if (!r) return true;
    const v = r.f[0] === '^' ? (up || {})[r.f.slice(1)] : vals[r.f];
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
    if (ro) inp = `<div style="${base};background:#F1F5F9;color:#64748B">${v ? esc(v) : '— יחושב אוטומטית —'}</div>`;
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
      if (d) { const pf = parentField(S, ent, f); const vals = d.values.filter((x) => !pf || x.parent === o[pf.name]); const pool = vals.length ? vals : d.values; o[f.name] = pool[i % pool.length].label; }
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
  const ensure = (S) => { if (!st.db) st.db = { main: [], A: [], B: [] }; };

  /* ---------- שמירה (סימולציה של מה שקורה בשרת) ---------- */
  function applyAuto(S, M, signRec, visit) {
    if (!st.auto) return;
    if (visit.StatusAtVisit) signRec.SignStatus = visit.StatusAtVisit;
    if (visit.SafetyHazardAtVisit) signRec.SafetyHazard = visit.SafetyHazardAtVisit;
  }
  function addVisit(S, M, signRec, parentRec, v) {
    v.GlobalID = uid(); v.ParentGlobalID = parentRec.GlobalID; st.db.B.push(v); applyAuto(S, M, signRec, v);
  }

  /* ---------- Survey123 ---------- */

  /* ---------- מסכי אפליקציית Survey123 לנייד (קירוב לפי תיעוד Esri) ---------- */
  const GREEN = '#2E7D32';
  function sPhone(inner, o) {
    o = o || {};
    return `<div style="position:relative;width:390px;max-width:100%;border:8px solid #0F172A;border-radius:30px;background:#fff;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18);font-family:Roboto,'Segoe UI',Tahoma,sans-serif">
<div dir="ltr" style="background:${GREEN};color:#fff;font-size:11px;display:flex;justify-content:space-between;padding:4px 14px"><span>9:41</span><span>▂▄▆ 100%</span></div>
<div dir="rtl" style="background:${GREEN};color:#fff;display:flex;align-items:center;gap:10px;padding:10px 12px"><span style="font-size:18px">${o.back ? '→' : '☰'}</span><b style="flex:1">${o.title || ''}</b>${o.right || ''}</div>
<div dir="rtl" style="max-height:540px;overflow:auto;text-align:right;color:#212121">${inner}</div>${o.bottom || ''}${o.overlay || ''}</div>`;
  }
  const badge = (n, c) => n ? `<span style="background:${c};color:#fff;border-radius:50%;min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px">${n}</span>` : '';
  function s123Home(S, M) {
    const row = (icon, t, right, onc) => `<div ${onc ? `onclick="${onc}"` : ''} style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid #EEEEEE;cursor:${onc ? 'pointer' : 'default'}"><span style="width:28px;text-align:center;font-size:18px;color:${GREEN}">${icon}</span><span style="flex:1;font-size:16px">${t}</span>${right || ''}<span style="color:#9E9E9E">‹</span></div>`;
    const inbox = st.inbox ? row('⬇', 'Inbox', badge(st.db ? st.db.main.length : 0, '#757575'), "SimA.step(2)") : '';
    const inner = `<div style="padding:18px 16px 8px;text-align:center"><div style="font-size:19px;font-weight:600">${esc(S.meta.title || 'סקר שילוט')}</div></div>
<div style="padding:8px 16px 16px"><button onclick="SimA.startNew()" style="width:100%;border:0;border-radius:6px;background:${GREEN};color:#fff;font-size:18px;padding:16px;cursor:pointer">איסוף</button></div>
${inbox}${row('✎', 'טיוטות', badge(st.drafts, '#F57C00'))}${row('⇧', 'תיבה יוצאת', badge(st.outbox, '#2E7D32'))}${row('✓', 'נשלחו', '')}`;
    return sPhone(inner, { title: 'Survey123', right: '<span>⋮</span>' });
  }
  function s123Inbox(S, M) {
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    if (!st.inbox) return sPhone(`<div style="padding:24px 16px;color:#757575;text-align:center">התיקייה Inbox אינה זמינה בסקר זה.<br><small>הפעלה: הגדרות הסקר › Inbox (מופעל).</small></div>`, { title: 'Inbox', back: true });
    const card = sg ? `<div onclick="SimA.startEdit()" style="margin:10px 12px;border:1px solid #E0E0E0;border-radius:8px;padding:12px;cursor:pointer;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12)"><div style="font-weight:600">${esc(sg.SignID || 'שלט')}</div><div style="color:#757575;font-size:13px">${esc(sg.SignModel || '')}</div><div style="margin-top:4px">${chipHtml(sg.SignStatus)}</div></div>` : '<div style="padding:16px;color:#757575">אין רשומות</div>';
    const inner = `<div style="padding:8px 12px;color:#757575;font-size:12px">מסונן לפי q:globalId · רשומה אחת</div>${card}<div style="padding:4px 16px;color:#757575;font-size:12px">בקישור עם update=true הרשימה מתרעננת לפני הפתיחה. רשומה יחידה נפתחת אוטומטית.</div>`;
    return sPhone(inner, { title: 'Inbox', back: true, right: '<span title="רענון">⟳</span>' });
  }
  function mControl(S, ent, f, vals, up, onch) {
    const d = dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = readonly(f);
    const lab = `<div style="font-size:15px;margin:14px 0 2px">${esc(f.alias || f.name)}</div>`;
    const line = 'width:100%;border:0;border-bottom:1px solid #9E9E9E;border-radius:0;padding:6px 0;font:inherit;background:transparent;box-sizing:border-box;outline:none';
    let inp;
    if (ro) inp = `<div style="color:#757575;border-bottom:1px dotted #BDBDBD;padding:6px 0">${v ? esc(v) : '—'}</div>`;
    else if (d) {
      const pf = parentField(S, ent, f); const pv = pf ? vals[pf.name] : null;
      const opts = d.values.filter((x) => !pf || !x.parent || x.parent === pv);
      if (pf && !pv) inp = `<div style="color:#9E9E9E;border-bottom:1px solid #BDBDBD;padding:6px 0">יש לבחור קודם: ${esc(pf.alias)}</div>`;
      else if (opts.length <= 5) inp = opts.map((o) => `<div data-v="${esc(o.label)}" onclick="${onch}('${f.name}',this.dataset.v)" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer"><span style="width:18px;height:18px;border-radius:50%;border:2px solid ${o.label === v ? GREEN : '#757575'};display:inline-flex;align-items:center;justify-content:center">${o.label === v ? `<span style="width:9px;height:9px;border-radius:50%;background:${GREEN}"></span>` : ''}</span>${esc(o.label)}</div>`).join('');
      else inp = `<select style="${line}" onchange="${onch}('${f.name}',this.value)"><option value="">בחר…</option>${opts.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    } else if (f.type === 'DATE') inp = `<input type="date" style="${line}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" inputmode="numeric" style="${line}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="2" style="${line}" onchange="${onch}('${f.name}',this.value)">${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${line}" value="${esc(v)}" onchange="${onch}('${f.name}',this.value)">`;
    return lab + inp;
  }
  function mFields(S, ent, vals, up, onch) {
    const groups = {}; ent.fields.forEach((f) => { if (isShown(f, vals, up)) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((g) => `<div style="background:#EEEEEE;padding:8px 16px;font-weight:600;font-size:14px;color:#424242">${esc(g)}</div><div style="padding:0 16px 8px">${groups[g].map((f) => mControl(S, ent, f, vals, up, onch)).join('')}</div>`).join('');
  }
  function s123Phone(S, M, title) {
    const loc = st.editId ? '' : `<div style="padding:12px 16px;border-bottom:1px solid #EEEEEE"><div style="font-size:15px">מיקום השלט</div><div style="margin-top:6px;background:#E8F5E9;border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center"><span style="color:#1B5E20">⌖ נקלט GPS · דיוק ±4 מ׳</span><span style="color:${GREEN}">מפה</span></div></div>`;
    const hdr = (t) => `<div style="background:#EEEEEE;padding:8px 16px;font-weight:600;font-size:14px;color:#424242;margin-top:6px">${t}</div>`;
    /* חזרה (repeat) כמו ב-Survey123: תת-טופס של הרשומה הנוכחית + סרגל דפדוף "1 מתוך N" עם + ומחיקה */
    const repeat = (title, arr, idx, kind, ent, up, onchFn) => {
      const n = arr.length, i = Math.min(idx, Math.max(0, n - 1));
      const btn = (t, on, dis, c) => `<span onclick="${dis ? '' : on}" style="width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:18px;color:${dis ? '#BDBDBD' : c || '#424242'};cursor:${dis ? 'default' : 'pointer'}">${t}</span>`;
      const bar = `<div dir="ltr" style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:1px solid #E0E0E0;background:#FAFAFA">${btn('🗑', `SimA.del('${kind}')`, !n, '#C62828')}<span style="display:inline-flex;align-items:center;gap:6px">${btn('‹', `SimA.pg('${kind}',-1)`, i <= 0)}<span style="font-size:14px;min-width:70px;text-align:center">${n ? (i + 1) + ' מתוך ' + n : '0 מתוך 0'}</span>${btn('›', `SimA.pg('${kind}',1)`, i >= n - 1)}</span><span onclick="SimA.add('${kind}')" title="הוסף" style="width:36px;height:36px;border-radius:50%;background:${GREEN};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer">+</span></div>`;
      const body = n ? `<div style="padding:0 16px 8px">${mFields(S, ent, arr[i], up, `${onchFn}.bind(null,${i})`)}</div>` : `<div style="padding:14px 16px;color:#757575">אין רשומות. לחץ + להוספה.</div>`;
      return hdr(title) + `<div style="margin:0 8px 8px;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;background:#fff">${body}${bar}</div>`;
    };
    const rep = repeat(esc(M.A.ent.alias), st.parts, st.pi, 'parts', M.A.ent, st.sign, 'SimA.pv');
    const nOld = st.editId && M.B ? st.db.B.filter((v) => v.ParentGlobalID === st.editId).length : 0;
    const vis = M.B && st.variant === 'sign' ? (st.editId ? `<div style="padding:6px 16px;color:#757575;font-size:12px">קיימים ${nOld} ביקורים קודמים (לא מוצגים לעריכה; כאן מוסיפים ביקורים חדשים)</div>` : '') + repeat(esc(M.B.ent.alias), st.visits, st.vi, 'visits', M.B.ent, st.sign, 'SimA.vv') : '';
    const bottom = `<div dir="ltr" style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-top:1px solid #E0E0E0;background:#fff"><span style="color:#757575;font-size:12px">${st.editId ? 'עריכה' : 'שלט חדש'}</span><span onclick="SimA.dlg(true)" title="שליחה" style="width:48px;height:48px;border-radius:50%;background:${GREEN};color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,.3)">✓</span></div>`;
    const dlg = st.dlg ? `<div dir="rtl" style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end"><div style="background:#fff;width:100%;border-radius:14px 14px 0 0;padding:6px 0"><div onclick="SimA.send()" style="padding:14px 18px;cursor:pointer">שלח עכשיו</div><div onclick="SimA.outbox()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בתיבה יוצאת</div><div onclick="SimA.draft()" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE">שמור בטיוטות</div><div onclick="SimA.dlg(false)" style="padding:14px 18px;cursor:pointer;border-top:1px solid #EEEEEE;color:#757575">המשך מילוי</div></div></div>` : '';
    return sPhone(loc + mFields(S, M.main, st.sign, {}, 'SimA.sv') + rep + vis, { title: esc(title), back: true, bottom, overlay: dlg });
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
  };
  function dots(onc) {
    return st.db.main.map((s, i) => { const x = 40 + (i * 83) % 280, y = 40 + (i * 61) % 180; return `<div onclick="${onc}(${i})" style="position:absolute;left:${x}px;top:${y}px;width:22px;height:22px;border-radius:50%;background:${statusColor(s.SignStatus)};border:3px solid ${st.sel === i ? '#0F172A' : '#fff'};box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`; }).join('');
  }
  const mapBox = (inner) => `<div style="position:relative;height:260px;background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:8px;overflow:hidden">${inner}</div>`;
  function flowTab(S, M) {
    ensure(S);
    const steps = FLOWS[st.flow], cur = Math.min(st.step, steps.length - 1);
    const sg = st.sel != null ? st.db.main[st.sel] : null;
    const gid = sg ? sg.GlobalID : '<GlobalID>';
    const urlE = `arcgis-survey123://?itemID=${ITEM}&action=edit&q:globalId=${gid}&folder=inbox&update=true&callback=https://fieldmaps.arcgis.app`;
    const urlN = `arcgis-survey123://?itemID=${ITEM}&action=collect&callback=https://fieldmaps.arcgis.app`;
    const chips = steps.map((l, i) => `<span style="padding:5px 10px;border-radius:14px;font-size:12px;border:1px solid ${i === cur ? '#1E3A8A' : '#CBD5E1'};background:${i === cur ? '#1E3A8A' : i < cur ? '#DBEAFE' : '#fff'};color:${i === cur ? '#fff' : '#0F172A'}">${i + 1}. ${esc(l)}</span>`).join('<span style="color:#94A3B8">›</span>');
    let screen = '', note = '';
    if (st.flow === 'edit') {
      if (cur === 0) { screen = phone('Field Maps · מפה', mapBox(dots('SimA.pick')) + `<div style="padding:8px;color:#64748B">${sg ? 'נבחר: ' + esc(sg.SignID || '') : 'הקש על שלט במפה'}</div>`); note = 'הקשה 1: בחירת השלט במפה.'; }
      else if (cur === 1 && sg) { screen = phone('Field Maps · פופאפ', `<div style="font-weight:700;color:#1E3A8A;font-size:16px">${esc(sg.SignID || '')}</div><div>${chipHtml(sg.SignStatus)}</div><div style="margin:8px 0;color:#64748B">${esc(sg.SignModel || '')}</div><a style="display:block;background:#1E3A8A;color:#fff;text-align:center;border-radius:8px;padding:10px;cursor:pointer" onclick="SimA.step(2)">ערוך ב-Survey123 ›</a>`); note = 'הקשה 2: קישור בפופאפ (ביטוי Arcade). הקישור פותח את Survey123 ישירות על הרשומה.'; }
      else if (cur === 2) {
        screen = s123Inbox(S, M);
        note = st.inbox ? 'ללא הקשות נוספות: רשומה אחת מסוננת נפתחת בעצמה.' : 'כשInbox כבוי הקישור לא מצליח לפתוח את הרשומה לעריכה.';
      }
      else if (cur === 3) { screen = s123Phone(S, M, 'Survey123 · עריכת שלט'); note = 'הרשומה והרכיבים הקיימים נטענו. הוספת ביקור חדש מעדכנת את מצב השלט אחרי שמירה.'; }
      else { screen = resultPhone(M); note = 'חזרה אוטומטית ל-Field Maps (callback). הצבע בנקודה משקף את המצב המעודכן.'; }
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
    const side = `<div style="flex:1;min-width:280px"><div style="margin-bottom:10px"><b>${note}</b></div>${back}
      ${st.flow === 'edit' ? `<h4>קישור (עריכה)</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(urlE)}</pre>` : `<h4>הדרכה למשתמש בשטח</h4><ol style="line-height:1.8"><li>פתח את אפליקציית Survey123 (לא Field Maps).</li><li>בחר את הסקר "${esc(S.meta.title || 'סקר שילוט')}".</li><li>לחץ "איסוף", אשר מיקום GPS ומלא את הטופס.</li><li>שלח. לצפייה בשלט במפה עבור ל-Field Maps.</li></ol><p style="color:#64748B;font-size:12px">קיצור דרך אפשרי: קישור פתיחה (<code dir="ltr">${esc(urlN)}</code>) כקיצור על מסך הבית, כ-QR או בהודעת הדרכה. לא כפתור במפה.</p>`}
      ${st.flow === 'edit' ? `<details><summary>ביטוי Arcade לקישור בפופאפ / Task</summary><pre dir="ltr" style="background:#F1F5F9;padding:8px;font-size:11px;overflow:auto">${esc(arcade)}</pre></details>` : ''}
      <h4>הגדרות נדרשות</h4><ul style="line-height:1.8"><li><label><input type="checkbox" ${st.inbox ? 'checked' : ''} onchange="SimA.inboxSet(this.checked)"> Inbox מופעל בטופס</label></li>${chk(st.flow === 'new' || true, 'הטופס פורסם מעל השכבה/הטבלאות (Repeat לרכיבים, לביקורים)')}${chk(true, 'המשתמש מחובר לאותו Portal ב-Field Maps וב-Survey123')}${chk(true, 'update=true מרענן את ה-Inbox לפני הפתיחה')}</ul>
      <p style="color:#64748B;font-size:12px">הערה: פרמטרי הקישור לפי דוגמאות קהילת Esri; לאמת מול התיעוד הרשמי ובגרסת האפליקציה בשטח.</p></div>`;
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center"><button class="${st.flow === 'edit' ? 'primary' : ''}" onclick="SimA.flowSet('edit')">עריכת שלט קיים</button><button class="${st.flow === 'new' ? 'primary' : ''}" onclick="SimA.flowSet('new')">הוספת שלט חדש</button><button onclick="SimA.seed()">טען נתוני דוגמה</button></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">${chips}</div><div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${screen}${side}</div>`;
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
      <details open><summary style="font-weight:700;cursor:pointer">${esc(M.A.ent.alias)} (${parts.length})</summary>${parts.map((p) => `<div style="padding:3px 0;border-bottom:1px solid #E2E8F0">${esc(p.ComponentType || '')} ${esc(p.PartStatus || '')}</div>`).join('') || '<small>אין</small>'}</details>
      ${M.B ? `<details open><summary style="font-weight:700;cursor:pointer">${esc(M.B.ent.alias)} (${vs.length})</summary>${vs.map((v) => `<div style="padding:3px 0;border-bottom:1px solid #E2E8F0">${esc(v.VisitDate || '')} · ${esc(v.VisitType || '')} · ${esc(v.StatusAtVisit || '')}</div>`).join('') || '<small>אין</small>'}</details><button class="primary" style="margin-top:8px;width:100%" onclick="SimA.addv()">+ הוסף ${esc(M.B.ent.alias)}</button>` : ''}</div>`;
    }
    const modal = st.modal ? `<div style="position:absolute;inset:0;background:#fff;overflow:auto;padding:8px"><b>${esc(M.B.ent.alias)} חדש</b>${st.variant === 'part' ? `<label style="display:block;font-weight:600;margin:10px 0 3px">ברכיב / תשתית</label><select style="width:100%;padding:8px" onchange="SimA.mp(this.value)"><option value="">בחר…</option>${st.db.A.filter((p) => p.ParentGlobalID === st.db.main[st.sel].GlobalID).map((p) => `<option value="${p.GlobalID}" ${st.modal.part === p.GlobalID ? 'selected' : ''}>${esc((p.ComponentType || '') + ' ' + (p.PartStatus || ''))}</option>`).join('')}</select>` : ''}${formFields(S, M.B.ent, st.modal.v, st.db.main[st.sel], 'SimA.mv')}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimA.savev()">שמור</button><button style="flex:1" onclick="SimA.cancel()">ביטול</button></div></div>` : '';
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
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">${tab('flow', 'זרימה Field Maps ↔ Survey123')}${tab('s123', 'Survey123')}${tab('fm', 'Field Maps')}${tab('data', 'נתונים והשוואה')}<span style="margin-inline-start:16px">קשר ביקורים: <select onchange="SimA.variant(this.value)"><option value="sign" ${st.variant === 'sign' ? 'selected' : ''}>ביקור → שלט</option><option value="part" ${st.variant === 'part' ? 'selected' : ''}>ביקור → רכיב</option></select></span><label style="margin-inline-start:12px"><input type="checkbox" ${st.auto ? 'checked' : ''} onchange="SimA.auto(this.checked)"> עדכון מצב שלט אוטומטי מהביקור</label></div>${body}`;
  }
  const rr = () => { if (window.A && A.refresh) A.refresh(); };
  window.SimA = {
    tab(k) { st.tab = k; rr(); }, variant(v) { st.variant = v; st.modal = null; rr(); }, auto(c) { st.auto = c; rr(); },
    sv(n, v) { st.sign[n] = v; rr(); }, pv(i, n, v) { st.parts[i][n] = v; rr(); }, vv(i, n, v) { st.visits[i][n] = v; rr(); },
    add(k) { const a = k === 'parts' ? st.parts : st.visits; a.push({}); if (k === 'parts') st.pi = a.length - 1; else st.vi = a.length - 1; rr(); },
    del(k) { const a = k === 'parts' ? st.parts : st.visits; const i = k === 'parts' ? st.pi : st.vi; a.splice(i, 1); if (k === 'parts') st.pi = Math.max(0, st.pi - 1); else st.vi = Math.max(0, st.vi - 1); rr(); },
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
        s = Object.assign({}, st.sign, { GlobalID: uid() }); st.db.main.push(s);
        st.parts.forEach((p) => st.db.A.push(Object.assign({}, p, { GlobalID: uid(), ParentGlobalID: s.GlobalID })));
      }
      if (M.B && st.variant === 'sign') st.visits.forEach((v) => { if (Object.keys(v).length) addVisit(S, M, s, s, Object.assign({}, v)); });
      st.sign = {}; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; st.editId = null; st.sent += 1; st.sel = st.db.main.indexOf(s);
      if (st.tab === 'flow') st.step = FLOWS[st.flow].length - 1; else st.tab = 'fm';
      rr();
    },
    dlg(v) { st.dlg = v; rr(); },
    outbox() { st.dlg = false; st.outbox += 1; st.sign = {}; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 2; rr(); },
    draft() { st.dlg = false; st.drafts += 1; st.sign = {}; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; st.editId = null; st.step = st.flow === 'new' ? 0 : 2; rr(); },
    flowSet(f) { st.flow = f; st.step = 0; st.editId = null; st.sign = {}; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; rr(); },
    step(n) { st.step = n; rr(); }, inboxSet(c) { st.inbox = c; rr(); },
    pick(i) { st.sel = i; st.step = 1; rr(); }, sel0(i) { st.sel = i; rr(); },
    startEdit() {
      const sg = st.db.main[st.sel]; if (!sg) return;
      st.editId = sg.GlobalID; st.sign = Object.assign({}, sg); st.parts = st.db.A.filter((p) => p.ParentGlobalID === sg.GlobalID).map((p) => Object.assign({}, p)); st.visits = []; st.pi = 0; st.vi = 0; st.step = 3; rr();
    },
    startNew() { st.editId = null; st.sign = {}; st.parts = []; st.visits = []; st.pi = 0; st.vi = 0; st.step = 1; rr(); },
    seed() { seed(st.S); st.sel = null; rr(); }, sel(i) { st.sel = i; st.modal = null; rr(); },
    addv() { st.modal = { v: {}, part: '' }; rr(); }, mv(n, v) { st.modal.v[n] = v; rr(); }, mp(id) { st.modal.part = id; rr(); }, cancel() { st.modal = null; rr(); },
    savev() {
      const S = st.S, M = model(S), sg = st.db.main[st.sel];
      let parent = sg; if (st.variant === 'part') { parent = st.db.A.find((p) => p.GlobalID === st.modal.part); if (!parent) { alert('בווריאנט ביקור→רכיב חובה לבחור רכיב'); return; } }
      addVisit(S, M, sg, parent, Object.assign({}, st.modal.v)); st.modal = null; rr();
    },
  };
  window.Sim = { render };
})();
