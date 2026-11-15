/* מעצב סכמת AGOL — ממשק. הסכמה (S) נשמרת כטיוטה ב-localStorage; מקור האמת הוא projects/<key>.schema.js ב-Git. הכלי גנרי: כל פרויקט הוא קובץ סכמה נפרד. */
(function () {
  'use strict';
  const PREFIX = 'agol-schema-designer:draft:';
  const LIST_KEY = 'agol-schema-designer:extra-projects';
  const TYPES = ['TEXT', 'SHORT', 'LONG', 'FLOAT', 'DOUBLE', 'DATE', 'GUID'];
  const MODES = ['ידני', 'אוטומטי', 'רשימה', 'מערכת', 'היסטורי'];
  /* אחסון טיוטות: localStorage כשזמין, אחרת זיכרון בלבד (למשל פתיחה מסוימת מהדיסק) */
  const MEM = {};
  const LS = {
    get(k) { if (k in MEM) return MEM[k]; try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { MEM[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* זיכרון בלבד */ } },
    del(k) { delete MEM[k]; try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  const FOLDER = {};   // id -> {dir, org, key}  (פרויקטים שנקראו מתיקייה במחשב)
  let DIR = null;      // handle לתיקיית השורש שנבחרה
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const $ = (id) => document.getElementById(id);

  window.SCHEMAS = window.SCHEMAS || {};
  const repoKeys = () => Object.keys(window.SCHEMAS);
  function extraKeys() { try { return JSON.parse(LS.get(LIST_KEY) || '[]'); } catch (e) { return []; } }
  const allKeys = () => repoKeys().concat(extraKeys().filter((k) => !window.SCHEMAS[k]));
  let cur = LS.get('agol-schema-designer:current');
  if (!cur || allKeys().indexOf(cur) < 0) cur = allKeys()[0] || 'new';
  let S = load(cur);
  let V = { page: 'entity', idx: 0, script: 'arcpy' };
  const blank = (key, title) => ({
    meta: { key, project: key, title, version: 1, spatialRef: 2039, spatialRefName: 'Israel TM Grid (ITM)', source: '', rules: { minTextLength: 255, domainCodeEqualsLabel: true } },
    domains: { YesNo: { name: 'YesNo', desc: 'כן / לא', fieldType: 'TEXT', values: [{ code: 'כן', label: 'כן', parent: '' }, { code: 'לא', label: 'לא', parent: '' }] } },
    entities: [{ name: 'Features', alias: 'שכבה ראשית', kind: 'point', attachments: true, editorTracking: true, description: '', fields: [
      { category: 'כללי', name: 'FeatureID', alias: 'מזהה', type: 'TEXT', length: '50', domain: '', mode: 'אוטומטי', visible: 'תמיד', open: false, note: '' }] }],
    relationships: [], decisions: []
  });

  function load(key) {
    const base = window.SCHEMAS[key];
    try {
      const d = JSON.parse(LS.get(PREFIX + key) || 'null');
      if (d && d.schema && d.base === (base ? base.meta.version : 0)) return d.schema;
    } catch (e) { /* ignore */ }
    return base ? clone(base) : blank(key, key);
  }
  function save() {
    const base = window.SCHEMAS[cur];
    try { LS.set(PREFIX + cur, JSON.stringify({ base: base ? base.meta.version : 0, schema: S })); LS.set('agol-schema-designer:current', cur); } catch (e) { /* ignore */ }
  }
  function fillProjects() {
    const list = allKeys(); if (list.indexOf(cur) < 0) list.push(cur);
    $('proj').innerHTML = list.map((k) => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${FOLDER[k] ? '📁 ' : ''}${esc(k)}${window.SCHEMAS[k] ? '' : ' (טיוטה)'}</option>`).join('');
  }
  function switchTo(key) { save(); cur = key; S = load(key); V = { page: 'entity', idx: 0, script: 'arcpy' }; LS.set('agol-schema-designer:current', cur); fillProjects(); render(); }
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2400);
  }
  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function copy(text) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); toast('הועתק ללוח');
  }
  const commit = () => { save(); render(); };
  const keyName = () => (S.meta && S.meta.key) || String(cur).split('/').pop();
  const schemaFileText = (key) => '// מקור האמת של סכמת הנתונים — פרויקט ' + key + '. נוצר על ידי agol-schema-designer; commit ב-Git שומר היסטוריית שינויים.\n' +
    'window.SCHEMAS = window.SCHEMAS || {};\nwindow.SCHEMAS[' + JSON.stringify(key) + '] = ' + JSON.stringify(S, null, 2) + ';\n';

  /* ---------- ניווט ---------- */
  function renderNav() {
    const issues = Gen.validate(S);
    const errs = issues.filter((i) => i.level === 'error').length;
    const warns = issues.filter((i) => i.level === 'warn').length;
    const open = S.decisions.filter((d) => d.status === 'open').length;
    const it = (page, idx, label, count, cls) =>
      `<a class="${V.page === page && V.idx === idx ? 'on' : ''}" onclick="A.go('${page}',${idx})"><span>${label}</span>${count == null ? '' : `<span class="cnt ${cls || ''}">${count}</span>`}</a>`;
    $('nav').innerHTML =
      '<h4>ישויות</h4>' + S.entities.map((e, i) => it('entity', i, esc(e.alias) + ' · ' + esc(e.name), e.fields.length)).join('') +
      '<h4>מבנה</h4>' + it('domains', 0, 'דומיינים', Object.keys(S.domains).length) + it('rels', 0, 'קשרים', S.relationships.length) +
      '<h4>ניהול</h4>' + it('decisions', 0, 'החלטות פתוחות', open) +
      it('validate', 0, 'בדיקות', errs + warns, errs ? 'err' : '') +
      '<h4>תרשימים</h4>' + it('dg-erd', 0, 'ERD · ישויות וקשרים', S.relationships.length) + it('dg-comp', 0, 'רכיבי הפתרון', window.Diagrams ? Diagrams.count(S).nodes || null : null) + it('dg-flow', 0, 'תהליכים וזרימות', window.Diagrams ? Diagrams.count(S).flows || null : null) +
      '<h4>סימולציה</h4>' + it('sim', 0, 'סימולטור Survey123 / Field Maps') +
      '<h4>תוצרים</h4>' + it('output', 0, 'סקריפט / מילון נתונים');
    $('subtitle').textContent = S.meta.title + ' · ' + S.meta.source;
  }

  /* ---------- ישויות ---------- */
  function entityPage(ei) {
    const e = S.entities[ei];
    const doms = Object.keys(S.domains);
    const rows = e.fields.map((f, fi) => `
      <tr class="${f.open ? 'open' : ''}">
        <td><div class="mv"><span>${fi + 1}</span><button class="mini" onclick="A.mv(${ei},${fi},-1)">▲</button><button class="mini" onclick="A.mv(${ei},${fi},1)">▼</button></div></td>
        <td><input type="text" value="${esc(f.category)}" onchange="A.f(${ei},${fi},'category',this.value)"></td>
        <td class="name"><input type="text" dir="ltr" value="${esc(f.name)}" onchange="A.f(${ei},${fi},'name',this.value.trim())"></td>
        <td><input type="text" value="${esc(f.alias)}" onchange="A.f(${ei},${fi},'alias',this.value)"></td>
        <td><select onchange="A.f(${ei},${fi},'type',this.value)">${TYPES.map((t) => `<option ${t === f.type ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td><input type="number" style="width:70px" value="${esc(f.length)}" ${f.type === 'TEXT' ? '' : 'disabled'} onchange="A.f(${ei},${fi},'length',this.value)"></td>
        <td><select onchange="A.f(${ei},${fi},'domain',this.value)"><option value="">—</option>${doms.map((d) => `<option ${d === f.domain ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></td>
        <td><select onchange="A.f(${ei},${fi},'mode',this.value)">${MODES.map((m) => `<option ${m === f.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></td>
        <td><input type="text" value="${esc(f.visible)}" onchange="A.f(${ei},${fi},'visible',this.value)"></td>
        <td style="text-align:center"><input type="checkbox" ${f.open ? 'checked' : ''} onchange="A.f(${ei},${fi},'open',this.checked)"></td>
        <td><input type="text" style="min-width:260px" value="${esc(f.note)}" onchange="A.f(${ei},${fi},'note',this.value)"></td>
        <td style="white-space:nowrap"><button class="mini" onclick="A.dup(${ei},${fi})">שכפל</button> <button class="mini danger" onclick="A.del(${ei},${fi})">מחק</button></td>
      </tr>`).join('');
    return `
      <div class="card">
        <div class="row">
          <div style="width:200px"><label>שם (Name)</label><input type="text" dir="ltr" value="${esc(e.name)}" onchange="A.e(${ei},'name',this.value.trim())"></div>
          <div style="width:220px"><label>כינוי (Alias)</label><input type="text" value="${esc(e.alias)}" onchange="A.e(${ei},'alias',this.value)"></div>
          <div style="width:150px"><label>סוג</label><select onchange="A.e(${ei},'kind',this.value)"><option value="point" ${e.kind === 'point' ? 'selected' : ''}>שכבת נקודות</option><option value="table" ${e.kind === 'table' ? 'selected' : ''}>טבלה</option></select></div>
          <label style="display:flex;gap:5px;align-items:center;margin:0 0 6px"><input type="checkbox" ${e.attachments ? 'checked' : ''} onchange="A.e(${ei},'attachments',this.checked)"> Attachments</label>
          <label style="display:flex;gap:5px;align-items:center;margin:0 0 6px"><input type="checkbox" ${e.editorTracking ? 'checked' : ''} onchange="A.e(${ei},'editorTracking',this.checked)"> Editor Tracking</label>
        </div>
        <div style="margin-top:8px"><label>תיאור</label><input type="text" value="${esc(e.description)}" onchange="A.e(${ei},'description',this.value)"></div>
        <p class="hint">GlobalID ו-OBJECTID נוצרים אוטומטית; שדות Creator / CreationDate / Editor / EditDate נוצרים על ידי Editor Tracking — אין להגדיר אותם כאן. שורה צהובה = פריט פתוח להחלטה.</p>
      </div>
      <div style="margin-bottom:8px"><button onclick="A.add(${ei})">+ שדה חדש</button></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>נושא</th><th>Name</th><th>כינוי</th><th>סוג</th><th>אורך</th><th>דומיין</th><th>קלט</th><th>תצוגה בטופס</th><th>פתוח</th><th>הערה</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`;
  }

  /* ---------- דומיינים ---------- */
  function domainsPage() {
    const cards = Object.keys(S.domains).map((k) => {
      const d = S.domains[k];
      const text = d.values.map((v) => v.ext ? `${v.code} | ${v.label} | ${v.parent || ''} | ${v.ext}` : v.parent ? `${v.code} | ${v.label} | ${v.parent}` : (v.code === v.label ? v.code : `${v.code} | ${v.label}`)).join('\n');
      const users = [];
      S.entities.forEach((e) => e.fields.forEach((f) => { if (f.domain === k) users.push(e.name + '.' + f.name); }));
      return `<div class="card">
        <div class="row"><div style="flex:1"><label>${esc(d.name)}</label><input type="text" value="${esc(d.desc)}" onchange="A.d('${k}','desc',this.value)"></div>
          <div style="width:90px"><label>סוג קוד</label><select onchange="A.d('${k}','fieldType',this.value)"><option ${d.fieldType === 'TEXT' ? 'selected' : ''}>TEXT</option><option ${d.fieldType === 'SHORT' ? 'selected' : ''}>SHORT</option><option ${d.fieldType === 'LONG' ? 'selected' : ''}>LONG</option></select></div>
          <button class="danger mini" onclick="A.dd('${k}')">מחק</button></div>
        <label style="margin-top:8px">ערכים (${d.values.length}) — שורה לערך: <b>קוד | תווית | הורה | מפתח חיצוני</b> (כל מה שאחרי הקוד אופציונלי; מפתח חיצוני = קוד טכני לממשקים, בדרך כלל מועתק לשדה מחושב)</label>
        <textarea class="mono" rows="${Math.min(14, d.values.length + 1)}" onchange="A.dv('${k}',this.value)">${esc(text)}</textarea>
        <p class="hint">בשימוש: ${users.length ? esc(users.join(', ')) : 'לא בשימוש'}</p></div>`;
    }).join('');
    return `<div style="margin-bottom:8px"><button onclick="A.addDomain()">+ דומיין חדש</button></div><div class="grid">${cards}</div>`;
  }

  /* ---------- קשרים ---------- */
  function relsPage() {
    const names = S.entities.map((e) => e.name);
    const sel = (i, p, v) => `<select onchange="A.r(${i},'${p}',this.value)">${names.map((n) => `<option ${n === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    const rows = S.relationships.map((r, i) => `<tr>
      <td><input type="text" dir="ltr" value="${esc(r.name)}" onchange="A.r(${i},'name',this.value.trim())"></td>
      <td>${sel(i, 'origin', r.origin)}</td><td>${sel(i, 'destination', r.destination)}</td>
      <td><input type="text" dir="ltr" value="${esc(r.originKey)}" onchange="A.r(${i},'originKey',this.value.trim())"></td>
      <td><input type="text" dir="ltr" value="${esc(r.destKey)}" onchange="A.r(${i},'destKey',this.value.trim())"></td>
      <td><select onchange="A.r(${i},'type',this.value)"><option ${r.type === 'COMPOSITE' ? 'selected' : ''}>COMPOSITE</option><option ${r.type === 'SIMPLE' ? 'selected' : ''}>SIMPLE</option></select></td>
      <td><input type="text" value="${esc(r.forward)}" onchange="A.r(${i},'forward',this.value)"></td>
      <td><input type="text" value="${esc(r.backward)}" onchange="A.r(${i},'backward',this.value)"></td>
      <td><button class="mini danger" onclick="A.rd(${i})">מחק</button></td></tr>`).join('');
    return `<div style="margin-bottom:8px"><button onclick="A.addRel()">+ קשר חדש</button></div>
      <div class="tbl-wrap"><table style="min-width:900px"><thead><tr><th>שם</th><th>מקור (1)</th><th>יעד (N)</th><th>מפתח מקור</th><th>מפתח זר</th><th>סוג</th><th>תווית קדימה</th><th>תווית אחורה</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">COMPOSITE = מחיקת שלט מוחקת את רכיביו. SIMPLE = רשומות היסטוריה נשמרות (מומלץ ליומן הדיווחים). מפתח זר מול GlobalID חייב להיות מסוג GUID.</p>`;
  }

  /* ---------- החלטות ---------- */
  function decisionsPage() {
    const rows = S.decisions.map((d, i) => `<tr>
      <td style="width:60px"><b>${esc(d.id)}</b></td>
      <td><input type="text" value="${esc(d.title)}" onchange="A.x(${i},'title',this.value)"></td>
      <td style="width:110px"><select onchange="A.x(${i},'status',this.value)"><option value="open" ${d.status === 'open' ? 'selected' : ''}>פתוח</option><option value="closed" ${d.status === 'closed' ? 'selected' : ''}>סגור</option></select></td>
      <td><input type="text" value="${esc(d.note)}" onchange="A.x(${i},'note',this.value)"></td></tr>`).join('');
    const flagged = [];
    S.entities.forEach((e) => e.fields.forEach((f) => { if (f.open) flagged.push(`<li><code dir="ltr">${esc(e.name)}.${esc(f.name)}</code> — ${esc(f.alias)}: ${esc(f.note)}</li>`); }));
    return `<div class="tbl-wrap"><table style="min-width:800px"><thead><tr><th>#</th><th>נושא</th><th>סטטוס</th><th>הערה</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="card" style="margin-top:12px"><b>שדות המסומנים כפתוחים (${flagged.length})</b><ul>${flagged.join('')}</ul></div>`;
  }

  /* ---------- בדיקות ---------- */
  function validatePage() {
    const issues = Gen.validate(S).filter((i) => i.level !== 'info');
    if (!issues.length) return '<div class="card">✅ אין שגיאות או אזהרות.</div>';
    return issues.map((i) => `<div class="iss ${i.level}"><b>${esc(i.where)}</b><span>${esc(i.msg)}</span></div>`).join('');
  }

  /* ---------- תוצרים ---------- */
  function outputPage() {
    const kinds = { arcpy: ['סקריפט ArcPy', 'create_' + keyName() + '_schema.py', () => Gen.arcpy(S)], md: ['מילון נתונים (MD)', 'data_dictionary_' + keyName() + '.md', () => Gen.dictMd(S)], csv: ['מילון נתונים (CSV)', 'data_dictionary_' + keyName() + '.csv', () => Gen.dictCsv(S)] };
    const k = kinds[V.script];
    const errs = Gen.validate(S).filter((i) => i.level === 'error').length;
    return `<div class="tabs">${Object.keys(kinds).map((x) => `<button class="${x === V.script ? 'on' : ''}" onclick="A.script('${x}')">${kinds[x][0]}</button>`).join('')}</div>
      ${errs ? `<div class="iss error"><b>${errs} שגיאות</b><span>יש לתקן בלשונית "בדיקות" לפני הרצה.</span></div>` : ''}
      <div class="codehead"><span dir="ltr">${esc(k[1])}</span><span><button class="mini" onclick="A.copy()">העתק</button> <button class="mini primary" onclick="A.dl()">הורד</button></span></div>
      <pre class="code">${esc(k[2]())}</pre>
      <p class="hint">בריפו, הקבצים נוצרים גם משורת פקודה: <code dir="ltr">node tools/generate.js</code> → תיקיית generated/.</p>`;
  }

  const TITLES = { 'dg-erd': 'ERD: ישויות וקשרים', 'dg-comp': 'רכיבי הפתרון והקשרים ביניהם', 'dg-flow': 'תהליכים: זרימת משתמש וזרימת נתונים', entity: null, domains: 'דומיינים (Coded Value Domains)', rels: 'קשרים בין ישויות', decisions: 'החלטות פתוחות מול הלקוח', validate: 'בדיקות תקינות', output: 'תוצרים', sim: 'סימולטור חוויית משתמש' };
  function render() {
    renderNav();
    const t = V.page === 'entity' ? esc(S.entities[V.idx].alias) + ' — ' + esc(S.entities[V.idx].name) : TITLES[V.page];
    const body = { entity: () => entityPage(V.idx), domains: domainsPage, rels: relsPage, decisions: decisionsPage, validate: validatePage, output: outputPage, sim: () => (window.Sim ? Sim.render(S) : ''), 'dg-erd': () => Diagrams.page(S, 'erd'), 'dg-comp': () => Diagrams.page(S, 'comp'), 'dg-flow': () => Diagrams.page(S, 'flow') }[V.page]();
    $('main').innerHTML = `<h2 style="margin:0 0 10px">${t}</h2>` + body;
    if (window.Diagrams && /^dg-/.test(V.page)) requestAnimationFrame(() => Diagrams.after());
  }

  /* ---------- פעולות ---------- */
  const pascal = (s) => String(s).replace(/[^a-zA-Z0-9_]/g, '');
  window.A = {
    go(p, i) { V.page = p; V.idx = i; render(); window.scrollTo(0, 0); },
    refresh() { const y = window.scrollY; render(); window.scrollTo(0, y); },
    script(x) { V.script = x; render(); },
    copy() { copy(this.cur()); },
    dl() { const k = keyName(); const m = { arcpy: ['create_' + k + '_schema.py', ''], md: ['data_dictionary_' + k + '.md', ''], csv: ['data_dictionary_' + k + '.csv', '\ufeff'] }[V.script]; download(m[0], m[1] + this.cur()); },
    cur() { return V.script === 'arcpy' ? Gen.arcpy(S) : V.script === 'md' ? Gen.dictMd(S) : Gen.dictCsv(S); },
    f(ei, fi, p, v) {
      const f = S.entities[ei].fields[fi];
      f[p] = v;
      if (p === 'type') { if (v === 'TEXT' && !f.length) f.length = '255'; if (v !== 'TEXT') f.length = ''; }
      commit();
    },
    e(ei, p, v) {
      const e = S.entities[ei];
      if (p === 'name') { const old = e.name; S.relationships.forEach((r) => { if (r.origin === old) r.origin = v; if (r.destination === old) r.destination = v; }); }
      e[p] = v; commit();
    },
    add(ei) { S.entities[ei].fields.push({ category: 'כללי', name: 'NewField' + (S.entities[ei].fields.length + 1), alias: 'שדה חדש', type: 'TEXT', length: '255', domain: '', mode: 'ידני', visible: 'תמיד', open: false, note: '' }); commit(); },
    dup(ei, fi) { const c = clone(S.entities[ei].fields[fi]); c.name += 'Copy'; c.alias += ' (העתק)'; S.entities[ei].fields.splice(fi + 1, 0, c); commit(); },
    del(ei, fi) { if (confirm('למחוק את השדה ' + S.entities[ei].fields[fi].name + '?')) { S.entities[ei].fields.splice(fi, 1); commit(); } },
    mv(ei, fi, d) { const a = S.entities[ei].fields, j = fi + d; if (j < 0 || j >= a.length) return; [a[fi], a[j]] = [a[j], a[fi]]; commit(); },
    d(k, p, v) { S.domains[k][p] = v; commit(); },
    dv(k, text) {
      S.domains[k].values = text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const p = l.split('|').map((x) => x.trim());
        return { code: p[0], label: p[1] || p[0], parent: p[2] || '', ext: p[3] || '' };
      });
      commit();
    },
    dd(k) {
      const used = S.entities.some((e) => e.fields.some((f) => f.domain === k));
      if (used && !confirm('הדומיין בשימוש בשדות. למחוק בכל זאת (הקישור לשדות יישאר שבור עד תיקון)?')) return;
      if (!used && !confirm('למחוק את ' + k + '?')) return;
      delete S.domains[k]; commit();
    },
    addDomain() {
      const n = pascal(prompt('שם דומיין באנגלית (PascalCase):') || '');
      if (!n) return; if (S.domains[n]) { toast('דומיין כזה כבר קיים'); return; }
      S.domains[n] = { name: n, desc: n, fieldType: 'TEXT', values: [{ code: 'ערך 1', label: 'ערך 1', parent: '' }] }; commit();
    },
    r(i, p, v) { S.relationships[i][p] = v; commit(); },
    rd(i) { S.relationships.splice(i, 1); commit(); },
    addRel() { const n = S.entities.map((e) => e.name); S.relationships.push({ name: 'NewRel', origin: n[0], destination: n[1] || n[0], originKey: 'GlobalID', destKey: 'ParentGlobalID', type: 'SIMPLE', forward: '', backward: '' }); commit(); },
    x(i, p, v) { S.decisions[i][p] = v; commit(); }
  };

  /* ---------- כפתורי כותרת ---------- */
  $('b-export').onclick = () => {
    S.meta.version = (S.meta.version || 1);
    S.meta.key = keyName();
    download(S.meta.key + '.schema.js', schemaFileText(S.meta.key), 'text/javascript');
    toast('הקובץ הורד. בעבודה עם תיקיית פרויקטים עדיף "שמור לתיקייה".');
  };
  $('b-import').onclick = () => $('file-in').click();
  $('file-in').onchange = (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const t = String(r.result); const m = t.search(/\]\s*=\s*\{/); const obj = JSON.parse(t.slice(t.indexOf('{', m < 0 ? 0 : m), t.lastIndexOf('}') + 1));
        if (!obj.entities || !obj.domains) throw new Error('מבנה לא תקין');
        S = obj; V = { page: 'entity', idx: 0, script: 'arcpy' }; commit(); toast('הסכמה יובאה');
      } catch (e) { toast('שגיאת ייבוא: ' + e.message); }
    };
    r.readAsText(file); ev.target.value = '';
  };
  $('b-reset').onclick = () => {
    if (!confirm('לזרוק את הטיוטה ולחזור לגרסה שבקובץ הסכמה בריפו?')) return;
    LS.del(PREFIX + cur);
    if (window.SCHEMAS[cur]) { S = clone(window.SCHEMAS[cur]); } else { S = blank(cur, cur); }
    V = { page: 'entity', idx: 0, script: 'arcpy' }; render(); toast('אופס');
  };

  $('proj').onchange = (ev) => switchTo(ev.target.value);
  $('b-new').onclick = () => {
    const key = (prompt('מפתח הפרויקט (אותיות קטנות באנגלית / ספרות / קו תחתון, למשל: thinning):') || '').trim().toLowerCase();
    if (!key) return;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) { toast('מפתח לא תקין'); return; }
    if (allKeys().indexOf(key) >= 0) { toast('פרויקט כזה כבר קיים'); return; }
    const title = prompt('כותרת הפרויקט בעברית:', key) || key;
    const fromCur = confirm('להתחיל מעותק של הפרויקט הנוכחי (' + cur + ')?\nאישור = עותק, ביטול = סכמה ריקה');
    const ns = fromCur ? clone(S) : blank(key, title);
    ns.meta.key = key; ns.meta.title = title; ns.meta.version = 1;
    save(); LS.set(LIST_KEY, JSON.stringify(extraKeys().concat([key])));
    LS.set(PREFIX + key, JSON.stringify({ base: 0, schema: ns }));
    switchTo(key); toast('פרויקט ' + key + ' נוצר (טיוטה). ייצוא ושמירה בריפו כשמוכן.');
  };
  /* ---------- תיקיית פרויקטים (File System Access API: Chrome / Edge) ---------- */
  const FSA = typeof window.showDirectoryPicker === 'function';
  function idb(mode, fn) {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('agol-schema-designer', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onerror = () => res(null);
        r.onsuccess = () => { const tx = r.result.transaction('kv', mode); const q = fn(tx.objectStore('kv')); tx.oncomplete = () => res(q && q.result); tx.onerror = () => res(null); };
      } catch (e) { res(null); }
    });
  }
  const parseSchemaText = (t) => {
    const m = t.search(/\]\s*=\s*\{/);
    return JSON.parse(t.slice(t.indexOf('{', m < 0 ? 0 : m), t.lastIndexOf('}') + 1));
  };
  async function readText(dir, name) { return (await (await dir.getFileHandle(name)).getFile()).text(); }
  async function writeText(dir, name, text) {
    const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
    await w.write(text); await w.close();
  }
  async function scanDir(root) {
    const found = [];
    async function walk(dir, org, depth) {
      for await (const [name, h] of dir.entries()) {
        if (h.kind === 'file' && /\.schema\.js$/.test(name)) found.push({ dir, org, name });
        else if (h.kind === 'directory' && depth < 1 && name !== 'generated' && name[0] !== '.' && name !== 'node_modules') await walk(h, name, depth + 1);
      }
    }
    await walk(root, '', 0);
    return found;
  }
  async function openFolder(handle) {
    DIR = handle;
    Object.keys(FOLDER).forEach((id) => { delete window.SCHEMAS[id]; delete FOLDER[id]; });
    const found = await scanDir(handle);
    let bad = 0;
    for (const f of found) {
      try {
        const obj = parseSchemaText(await readText(f.dir, f.name));
        const key = f.name.replace(/\.schema\.js$/, '');
        const id = f.org ? f.org + '/' + key : key;
        obj.meta = obj.meta || {}; obj.meta.key = key; obj.meta.org = f.org;
        window.SCHEMAS[id] = obj; FOLDER[id] = { dir: f.dir, org: f.org, key };
      } catch (e) { bad++; }
    }
    await idb('readwrite', (s) => s.put(handle, 'dir'));
    const ids = Object.keys(FOLDER);
    if (ids.length) { cur = ids.indexOf(cur) >= 0 ? cur : ids[0]; S = load(cur); V = { page: 'entity', idx: 0, script: 'arcpy' }; }
    $('b-save').hidden = false; $('b-resume').hidden = true;
    fillProjects(); render();
    toast('נטענו ' + ids.length + ' פרויקטים מ-' + handle.name + (bad ? ' (' + bad + ' קבצים לא נקראו)' : ''));
  }
  async function saveFolder() {
    if (!DIR) { toast('קודם פותחים תיקיית פרויקטים'); return; }
    const errs = Gen.validate(S).filter((i) => i.level === 'error').length;
    if (errs && !confirm('יש ' + errs + ' שגיאות בלשונית "בדיקות". לשמור בכל זאת?')) return;
    const key = keyName();
    let info = FOLDER[cur];
    if (!info) {
      const org = (prompt('שם תיקיית הארגון (אותיות לטיניות קטנות, למשל: kkl):', S.meta.org || '') || '').trim().toLowerCase();
      if (!/^[a-z][a-z0-9_-]*$/.test(org)) { toast('שם ארגון לא תקין'); return; }
      info = { dir: await DIR.getDirectoryHandle(org, { create: true }), org, key };
    }
    S.meta.key = key; S.meta.org = info.org; S.meta.version = (S.meta.version || 1) + 1;
    await writeText(info.dir, key + '.schema.js', schemaFileText(key));
    const gen = await (await info.dir.getDirectoryHandle('generated', { create: true })).getDirectoryHandle(key, { create: true });
    await writeText(gen, 'create_' + key + '_schema.py', Gen.arcpy(S));
    await writeText(gen, 'data_dictionary.md', Gen.dictMd(S));
    await writeText(gen, 'data_dictionary.csv', '﻿' + Gen.dictCsv(S));
    const id = info.org ? info.org + '/' + key : key;
    if (id !== cur) { LS.del(PREFIX + cur); LS.set(LIST_KEY, JSON.stringify(extraKeys().filter((k) => k !== cur))); cur = id; }
    window.SCHEMAS[id] = clone(S); FOLDER[id] = info; LS.del(PREFIX + id); LS.set('agol-schema-designer:current', cur);
    fillProjects(); render();
    toast('נשמר: ' + info.org + '/' + key + '.schema.js + תוצרים ב-generated/. עכשיו Commit ו-Push ב-GitHub Desktop.');
  }
  if (FSA) {
    $('b-folder').hidden = false;
    $('b-folder').onclick = async () => { try { await openFolder(await window.showDirectoryPicker({ mode: 'readwrite' })); } catch (e) { if (e.name !== 'AbortError') toast('שגיאה: ' + e.message); } };
    $('b-save').onclick = () => saveFolder().catch((e) => toast('שגיאת שמירה: ' + e.message));
    idb('readonly', (s) => s.get('dir')).then((h) => {
      if (!h) return;
      const b = $('b-resume'); b.hidden = false; b.textContent = '↻ המשך: ' + h.name;
      b.onclick = async () => { try { if ((await h.requestPermission({ mode: 'readwrite' })) === 'granted') await openFolder(h); else toast('לא ניתנה הרשאה'); } catch (e) { toast('שגיאה: ' + e.message); } };
    });
  }
  window.__designer = { openFolder, saveFolder, FOLDER, get cur() { return cur; }, get S() { return S; } }; // לבדיקות

  fillProjects();
  render();
})();
