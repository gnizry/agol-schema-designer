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
     deepLinks: true, user: 'שם משתמש לדוגמה'
   } */
(function () {
  'use strict';
  const C = () => window.SimCore;
  const esc = (s) => C().esc(s);
  const uid = () => C().uid();
  const g = { key: null, tab: 'fm', db: null, sel: null, form: null, draw: null, log: [], link: '', online: true };

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

  /* ---------- גיאומטריה מדומה (מפה 360×260) ---------- */
  const W = 360, H = 260, DUNAM_PER_PX = 0.08;
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

  /* ---------- טפסים ---------- */
  const isReq = (f, vals, up) => f.required === true || (f.reqIf ? C().relOk({ rel: f.reqIf }, vals, up) : false);
  function control(S, K, ent, f, vals, up) {
    const d = C().dom(S, f), v = vals[f.name] == null ? '' : vals[f.name], ro = C().readonly(f);
    const rule = K.auto[f.name];
    const tag = ro ? ` <small style="color:#64748B">(${rule === 'script' ? 'סקריפט לילי' : 'אוטומטי'})</small>` : (isReq(f, vals, up) ? ' <small style="color:#B91C1C">*</small>' : '');
    const label = `<label style="display:block;font-weight:600;margin:10px 0 3px">${esc(f.alias || f.name)}${tag}</label>`;
    const base = 'width:100%;padding:8px;border:1px solid #CBD5E1;border-radius:6px;font:inherit;box-sizing:border-box';
    const on = (x) => `onchange="SimG.fv('${f.name}',${x})"`;
    let inp;
    if (ro) inp = `<div style="${base};background:#F1F5F9;color:#64748B">${v !== '' ? esc(show(v)) : rule === 'script' ? '— ימולא בלילה —' : '— יחושב —'}</div>`;
    else if (d && d.values.length <= 3 && d.values.every((x) => x.label.length < 14)) inp = `<div style="display:flex;gap:6px;flex-wrap:wrap">${d.values.map((o) => `<button type="button" onclick="SimG.fv('${f.name}','${esc(o.label).replace(/'/g, "\\'")}')" style="flex:1;padding:8px;border-radius:8px;border:1px solid ${o.label === v ? '#1E3A8A' : '#CBD5E1'};background:${o.label === v ? '#1E3A8A' : '#fff'};color:${o.label === v ? '#fff' : '#0F172A'}">${esc(o.label)}</button>`).join('')}</div>`;
    else if (d) inp = `<select style="${base}" ${on('this.value')}><option value="">בחר…</option>${d.values.map((o) => `<option ${o.label === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'DATE') inp = `<input type="${/שעה|שעת/.test(f.alias || '') ? 'datetime-local' : 'date'}" style="${base}" value="${esc(v)}" ${on('this.value')}>`;
    else if (['SHORT', 'LONG', 'FLOAT', 'DOUBLE'].includes(f.type)) inp = `<input type="number" style="${base}" value="${esc(v)}" ${on('this.value')}>`;
    else if (Number(f.length) >= 500) inp = `<textarea rows="2" style="${base}" ${on('this.value')}>${esc(v)}</textarea>`;
    else inp = `<input type="text" style="${base}" value="${esc(v)}" ${on('this.value')}>`;
    return label + inp;
  }
  function formHtml(S, K, ent, vals, up) {
    const groups = {};
    ent.fields.forEach((f) => { if (!C().hidden(f) && C().relOk(f, vals, up) !== false) (groups[f.category || 'כללי'] = groups[f.category || 'כללי'] || []).push(f); });
    return Object.keys(groups).map((gr) => `<details ${groups[gr].some((f) => !C().readonly(f)) ? 'open' : ''} style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:4px 12px 12px;margin:10px 0"><summary style="font-weight:700;color:#1E3A8A;margin-top:8px;cursor:pointer">${esc(gr)}</summary>${groups[gr].map((f) => control(S, K, ent, f, vals, up)).join('')}</details>`).join('');
  }
  function missing(K, ent, vals, up) {
    return ent.fields.filter((f) => !C().hidden(f) && !C().readonly(f) && C().relOk(f, vals, up) !== false && isReq(f, vals, up) && (vals[f.name] == null || vals[f.name] === '')).map((f) => f.alias || f.name);
  }

  /* ---------- נתוני דוגמה ---------- */
  function seed(S, K) {
    g.db = { main: [], kids: [] }; g.sel = null; g.form = null; g.log = [];
    const spots = [[90, 80, 38], [250, 160, 46], [140, 70, 22], [230, 70, 28]];
    spots.forEach(([x, y, r], i) => {
      const m = C().sample(S, K.main, i); m.GlobalID = uid(); m.__shape = [blob(x, y, r, i + 1)];
      K.main.fields.filter((f) => C().readonly(f)).forEach((f) => { m[f.name] = ''; });
      if (K.statusField) m[K.statusField] = i === 2 && K.continueValue ? K.continueValue : K.newValue;
      g.db.main.push(m);
    });
    if (K.continueValue) { const c = g.db.main[2]; c.__shape = [blob(122, 108, 22, 3)]; }
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
    const base = 'https://fieldmaps.arcgis.app/?referenceContext=' + kind + '&itemID=<MAP_ITEM_ID>';
    if (kind === 'addRelatedFeature') {
      const pre = {}; Object.entries(K.auto).forEach(([n, r]) => { if (r.startsWith('parent:') && rec[r.slice(7)] !== '' && rec[r.slice(7)] != null) pre[n] = rec[r.slice(7)]; });
      return base + '&featureSourceURL=<' + K.main.name + '_URL>&featureID=' + rec.GlobalID + '&relationshipID=0&featureAttributes=' + encodeURIComponent(JSON.stringify(pre));
    }
    if (kind === 'updateChild') return base.replace('updateChild', 'updateFeature') + '&featureSourceURL=<' + K.kid.name + '_URL>&featureID=' + rec.GlobalID;
    return base + '&featureSourceURL=<' + K.main.name + '_URL>&featureID=' + rec.GlobalID;
  }

  /* ---------- תצוגה: מפה ופופאפ ---------- */
  function mapSvg(K) {
    const shapes = g.db.main.map((m, i) => (m.__shape || []).map((p) => `<polygon points="${p.map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' ')}" fill="${color(K, m)}" fill-opacity="${g.sel === i ? 0.75 : 0.5}" stroke="${g.sel === i ? '#0F172A' : color(K, m)}" stroke-width="${g.sel === i ? 3 : 1.5}" onclick="event.stopPropagation();SimG.sel(${i})" style="cursor:pointer"/>`).join('')).join('');
    const labels = g.db.main.map((m) => { if (!m.__shape) return ''; const c = centroid(m.__shape); return `<text x="${c[0]}" y="${c[1] + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#0F172A" pointer-events="none">${esc(m[K.idField] || '?')}</text>`; }).join('');
    const hint = g.draw ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="12" fill="#991B1B" font-weight="700">הקש במפה כדי לשרטט ${esc(g.draw)}</text>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:linear-gradient(135deg,#ECFCCB,#D9F99D);border-radius:8px;display:block;cursor:${g.draw ? 'crosshair' : 'default'}" onclick="SimG.mapClick(event,this)">${shapes}${labels}${hint}</svg>`;
  }
  const chip = (t, bg, fg) => `<span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${bg};color:${fg};font-size:12px;font-weight:600">${esc(t)}</span>`;
  function popup(S, K, rec) {
    const sim = K.sim, kids = kidsOf(K, rec);
    const chips = [rec[K.statusField] ? chip(rec[K.statusField], color(K, rec), '#fff') : ''].concat((sim.chips || []).map((n) => rec[n] ? chip(rec[n], '#F1F5F9', '#0F172A') : '')).join(' ');
    const kpis = (sim.kpis || []).map((k) => `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:#FFF7ED;border:1px solid #FED7AA"><div style="font-size:11px;color:#64748B">${esc(k.label)}</div><div style="font-size:17px;font-weight:700;color:#C2410C"><span dir="ltr">${esc(rec[k.f] === '' || rec[k.f] == null ? '-' : show(rec[k.f]))}</span> <small style="font-weight:400">${esc(k.unit || '')}</small></div></div>`).join('')
      + (K.kid ? `<div style="flex:1 1 80px;padding:6px 8px;border-radius:10px;background:${kids.length ? '#EFF6FF' : '#FEF3C7'};border:1px solid ${kids.length ? '#BFDBFE' : '#FDE68A'}"><div style="font-size:11px;color:#64748B">${esc(K.kid.alias)}</div><div style="font-size:17px;font-weight:700">${kids.length}</div></div>` : '');
    const warn = K.kid && !kids.length && rec[K.statusField] !== K.continueValue ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#FEF3C7;color:#92400E;font-size:12px">עדיין אין ${esc(K.kid.alias)}</div>` : '';
    const btn = (l, on, fill) => `<button onclick="${on}" style="flex:1;cursor:pointer;padding:9px;border-radius:10px;font-weight:700;border:1px solid ${fill ? '#C2410C' : '#1E3A8A'};background:${fill ? '#C2410C' : '#fff'};color:${fill ? '#fff' : '#1E3A8A'}">${l}</button>`;
    const acts = `<div style="display:flex;gap:6px;margin-top:8px">${K.kid ? btn('+ ' + esc(K.kid.alias), 'SimG.addKid()', true) : ''}${btn('עריכת ' + esc(K.main.alias), 'SimG.editMain()', false)}</div>`;
    const cards = kids.slice().reverse().map((k) => `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:6px 10px;margin-top:6px"><div style="display:flex;justify-content:space-between;gap:6px"><b style="font-size:13px">${esc(sim.childTitle && k[sim.childTitle] ? ((K.F(K.kid, sim.childTitle) || {}).alias || '') + ' ' + show(k[sim.childTitle]) : K.kid.alias)}</b><a href="javascript:void(0)" onclick="SimG.editKid('${k.GlobalID}')" style="font-size:12px;color:#1E3A8A">עריכה</a></div><div style="font-size:12px;color:#475569;margin-top:2px">${(sim.childCard || []).map((n) => k[n] ? esc((K.F(K.kid, n) || {}).alias || n) + ': ' + esc(show(k[n])) : '').filter(Boolean).join(' · ')}</div></div>`).join('');
    return `<div style="padding:6px 2px"><div style="font-size:19px;font-weight:800;color:#C2410C">${esc(K.title)} <span dir="ltr">${esc(rec[K.idField] || 'ללא מזהה')}</span></div><div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${chips}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${kpis}</div>${warn}${acts}${cards}</div>`;
  }
  function formView(S, K) {
    const f = g.form, ent = f.kind === 'kid' ? K.kid : K.main, up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : {};
    const miss = g.showReq ? missing(K, ent, f.vals, up) : [];
    return `<div style="padding:4px"><b>${f.isNew ? 'הוספת' : 'עריכת'} ${esc(ent.alias)}</b>${f.kind === 'kid' && up ? `<div style="font-size:12px;color:#64748B">קשור ל${esc(K.title)} ${esc(up[K.idField] || '')}</div>` : ''}${formHtml(S, K, ent, f.vals, up)}${miss.length ? `<div style="padding:6px 10px;border-radius:8px;background:#FEF2F2;color:#991B1B;font-size:12px">חסר: ${esc(miss.join(', '))}</div>` : ''}<div style="display:flex;gap:8px;margin-top:10px"><button class="primary" style="flex:1;padding:10px" onclick="SimG.save()">שמור</button><button style="flex:1" onclick="SimG.cancel()">ביטול</button></div></div>`;
  }
  function fmTab(S, K) {
    const rec = g.sel != null ? g.db.main[g.sel] : null;
    const sd = K.statusField && C().dom(S, K.F(K.main, K.statusField));
    const tpl = sd ? sd.values.map((v) => `<button class="mini" onclick="SimG.draw('${esc(v.label)}')" style="border-color:${K.colors[v.label] || '#64748B'}">+ ${esc(v.label)}</button>`).join(' ') : `<button class="mini" onclick="SimG.draw('')">+ ${esc(K.main.alias)}</button>`;
    const body = g.form ? formView(S, K) : rec ? popup(S, K, rec) : `<div style="color:#64748B;padding:10px">הקש על ${esc(K.main.alias)} במפה, או בחר תבנית לשרטוט</div>`;
    const sc = (K.sim.scenarios || []).map((x, i) => `<div style="border:1px solid #E2E8F0;border-radius:10px;padding:8px 10px;margin-bottom:6px;background:#fff"><b>${esc(x.title)}</b><div style="font-size:13px;color:#475569;margin:2px 0 6px">${esc(x.desc || '')}</div><button class="mini" onclick="SimG.sc(${i})">הרץ</button></div>`).join('');
    const tbl = (o) => `<tr><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(o[0])}</td><td style="padding:3px 6px;border:1px solid #E2E8F0">${esc(o[1])}</td></tr>`;
    const lbl = { now: 'תאריך ושעה ביצירה', user: 'המשתמש המחובר', area: 'שטח גאודטי', id: 'מזהה (חדש: הגבוה + 1, המשך: של השטח הסמוך)' };
    const scr = Object.keys(K.auto).filter((n) => K.auto[n] === 'script');
    const autoList = Object.entries(K.auto).filter(([, r]) => r !== 'script').map(([n, r]) => [n, lbl[r] || r.replace('parent:', 'מהאב: ').replace('weekday:', 'יום בשבוע לפי ')]).concat(scr.length ? [[scr.length + ' שדות', 'סקריפט לילי: ' + scr.join(', ')]] : []);
    return `<div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">${C().phone('Field Maps · ' + esc(S.meta.title || ''), `<div style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0 6px">${tpl}</div>${mapSvg(K)}<div style="margin-top:8px;border-top:3px solid #1E3A8A">${body}</div>`)}
      <div style="flex:1;min-width:260px">
        <div class="simnote"><b>מה בודקים כאן:</b> שרטוט ${esc(K.main.alias)} לפי תבנית, טופס עריכה עם שדות מותנים ומחושבים, פופאפ עם ${K.kid ? esc(K.kid.alias) + ' קשורים ו' : ''}קישורי עומק, ואיחוד לילי.</div>
        <label class="inl"><input type="checkbox" ${g.online ? 'checked' : ''} onchange="SimG.online(this.checked)"> מחובר לרשת (בלי רשת: מזהה חדש לא מחושב, הסקריפט הלילי משלים)</label>
        <div style="margin:10px 0"><button class="primary" onclick="SimG.nightly()">▶ הרץ ${esc((K.sim.script || {}).title || 'סקריפט לילי')}</button> <button class="mini" onclick="SimG.seed()">אפס נתוני דוגמה</button></div>
        ${(K.sim.script || {}).desc ? `<p style="font-size:13px;color:#475569">${esc(K.sim.script.desc)}</p>` : ''}
        ${g.log.length ? `<h4>יומן הסקריפט</h4><ul style="font-size:13px;line-height:1.7">${g.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
        ${g.link ? `<h4>קישור העומק של הכפתור האחרון</h4><pre dir="ltr" style="white-space:pre-wrap;word-break:break-all;background:#0F172A;color:#E2E8F0;padding:8px;border-radius:6px;font-size:11px">${esc(g.link)}</pre>` : ''}
        ${sc ? `<h4>תרחישים</h4>${sc}` : ''}
        ${autoList.length ? `<details><summary style="cursor:pointer;font-weight:700;margin-top:12px">שדות מחושבים (${Object.keys(K.auto).length})</summary><table style="border-collapse:collapse;font-size:12px">${autoList.map(tbl).join('')}</table></details>` : ''}
      </div></div>`;
  }
  function dataTab(S, K) {
    const cols = (ent, extra) => [...extra, ...ent.fields.filter((f) => !C().hidden(f)).slice(0, 9).map((f) => f.name)];
    const t = (rows, cs, map) => rows.length ? `<div style="overflow:auto"><table style="border-collapse:collapse;font-size:12px"><tr>${cs.map((c) => `<th style="border:1px solid #CBD5E1;padding:3px 6px;background:#F1F5F9">${esc(c)}</th>`).join('')}</tr>${rows.map((r) => `<tr>${cs.map((c) => `<td style="border:1px solid #E2E8F0;padding:3px 6px">${esc(map(r, c))}</td>`).join('')}</tr>`).join('')}</table></div>` : '<small style="color:#64748B">אין רשומות</small>';
    const m = (r, c) => c === 'GlobalID' || c === K.fk ? String(r[c] || '').slice(0, 8) : c === 'חלקים' ? (r.__shape || []).length : r[c];
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
  const rr = () => { if (window.A && A.refresh) A.refresh(); };
  const S0 = () => window.__simS;
  const K0 = () => cfg(S0());
  window.SimG = {
    tab(k) { g.tab = k; rr(); },
    seed() { seed(S0(), K0()); rr(); },
    online(v) { g.online = v; rr(); },
    sel(i) { if (g.draw) return; g.sel = i; g.form = null; rr(); },
    draw(status) { g.draw = status || K0().main.alias; g.drawStatus = status; g.form = null; g.sel = null; rr(); },
    mapClick(ev, svg) {
      if (!g.draw) { g.sel = null; g.form = null; rr(); return; }
      const r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height;
      const S = S0(), K = K0(), v = { GlobalID: uid(), __shape: [blob(x, y, 20 + Math.random() * 18, Math.random() * 10)] };
      if (K.statusField && g.drawStatus) v[K.statusField] = g.drawStatus;
      applyAuto(S, K, K.main, v, null, true);
      g.form = { kind: 'main', isNew: true, vals: v }; g.draw = null; g.showReq = false; rr();
    },
    fv(n, val) { const S = S0(), K = K0(), f = g.form; f.vals[n] = val; const up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : null; applyAuto(S, K, f.kind === 'kid' ? K.kid : K.main, f.vals, up, false); rr(); },
    editMain() { const K = K0(), rec = g.db.main[g.sel]; g.link = link(K, 'updateFeature', rec); g.form = { kind: 'main', isNew: false, vals: Object.assign({}, rec), ref: rec }; g.showReq = false; rr(); },
    addKid() { const S = S0(), K = K0(), rec = g.db.main[g.sel], v = { GlobalID: uid(), [K.fk]: rec.GlobalID }; applyAuto(S, K, K.kid, v, rec, true); g.link = link(K, 'addRelatedFeature', rec); g.form = { kind: 'kid', isNew: true, vals: v }; g.showReq = false; rr(); },
    editKid(gid) { const K = K0(), k = g.db.kids.find((x) => x.GlobalID === gid); g.link = link(K, 'updateChild', k); g.form = { kind: 'kid', isNew: false, vals: Object.assign({}, k), ref: k }; g.showReq = false; rr(); },
    save() {
      const S = S0(), K = K0(), f = g.form, ent = f.kind === 'kid' ? K.kid : K.main, up = f.kind === 'kid' ? g.db.main.find((m) => m.GlobalID === f.vals[K.fk]) : null;
      if (missing(K, ent, f.vals, up).length) { g.showReq = true; rr(); return; }
      applyAuto(S, K, ent, f.vals, up, false);
      if (f.isNew) { if (f.kind === 'kid') g.db.kids.push(f.vals); else { g.db.main.push(f.vals); g.sel = g.db.main.length - 1; } }
      else Object.assign(f.ref, f.vals);
      if (f.kind === 'main' && !f.isNew) g.db.kids.filter((k) => k[K.fk] === f.vals.GlobalID).forEach((k) => applyAuto(S, K, K.kid, k, f.ref, false));
      g.form = null; rr();
    },
    cancel() { g.form = null; rr(); },
    nightly() { nightly(S0(), K0()); g.sel = null; g.form = null; rr(); },
    sc(i) {
      const S = S0(), K = K0(), x = K.sim.scenarios[i];
      const anchor = x.near ? g.db.main.find((m) => m[K.statusField] === K.newValue) : null;
      let c = anchor ? centroid(anchor.__shape) : [60 + Math.random() * 240, 50 + Math.random() * 160];
      if (anchor) c = [c[0] + 34, c[1] + 22];
      const v = Object.assign({ GlobalID: uid(), __shape: [blob(c[0], c[1], 20, i + 5)] }, x.main || {});
      applyAuto(S, K, K.main, v, null, true); g.db.main.push(v); g.sel = g.db.main.length - 1;
      if (x.child && K.kid) { const k = Object.assign({ GlobalID: uid(), [K.fk]: v.GlobalID }, x.child); applyAuto(S, K, K.kid, k, v, true); g.db.kids.push(k); }
      g.form = null; rr();
    },
  };
  window.SimGen = { render(S) { window.__simS = S; return render(S); }, applies };
})();
