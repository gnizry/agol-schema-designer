/* סנכרון מ-AGOL לכלי: קריאה בלבד של השירות המתארח (שדות, סוגים, אורכים, דומיינים), השוואה לסכמה, ואימוץ נבחרים לסכמה.
   לא כותב ל-AGOL. אחרי האימוץ נפתחת בקשת שינוי עם המשימות הנגזרות (טופס, Field Maps, תיעוד). */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SYS = ['objectid', 'globalid', 'creator', 'creationdate', 'editor', 'editdate', 'shape', 'shape__length', 'shape__area'];
  const T2S = { esriFieldTypeString: 'TEXT', esriFieldTypeSmallInteger: 'SHORT', esriFieldTypeInteger: 'LONG', esriFieldTypeSingle: 'FLOAT', esriFieldTypeDouble: 'DOUBLE', esriFieldTypeDate: 'DATE', esriFieldTypeGUID: 'GUID' };
  const ST = { svc: null, items: [], when: '', err: '', busy: false, done: null };

  /* ---------- השוואה (טהורה: מקבלת תיאור שירות, בלי רשת) ---------- */
  /* svc = { layers: [{name, fields:[{name,type,alias,length,domain:{name,codedValues:[{name,code}]}}]}] } (שכבות וטבלאות) */
  function diff(S, svc) {
    const items = []; let n = 0; const add = (o) => items.push(Object.assign({ id: ++n }, o));
    const byName = {}; svc.layers.forEach((l) => { byName[l.name] = l; });
    S.entities.forEach((e) => {
      const L = byName[e.name];
      if (!L) { add({ k: 'ent-', ent: e.name, text: 'הישות ' + e.name + ' לא נמצאה בשירות' }); return; }
      const on = {}; L.fields.forEach((f) => { on[f.name.toLowerCase()] = f; });
      const sc = {}; e.fields.forEach((f) => { sc[f.name.toLowerCase()] = f; });
      L.fields.forEach((f) => {
        const low = f.name.toLowerCase(); if (SYS.indexOf(low) >= 0) return;
        const s = sc[low];
        if (!s) { add({ k: 'field+', ent: e.name, f, text: 'שדה חדש באונליין: ' + e.name + '.' + f.name + (f.alias && f.alias !== f.name ? ' (' + f.alias + ')' : ''), adopt: true }); return; }
        const t = T2S[f.type] || 'TEXT';
        if (s.type !== t && !(s.type === 'GUID' && t === 'TEXT')) add({ k: 'type', ent: e.name, f, s, text: e.name + '.' + s.name + ': סוג השדה שונה (בסכימה ' + s.type + ', באונליין ' + t + ')', adopt: true });
        else if (t === 'TEXT' && f.length && s.length && +f.length !== +s.length && +f.length > 0) add({ k: 'length', ent: e.name, f, s, text: e.name + '.' + s.name + ': אורך שונה (בסכימה ' + s.length + ', באונליין ' + f.length + ')', adopt: true });
        if (f.alias && s.alias && f.alias !== s.alias) add({ k: 'alias', ent: e.name, f, s, text: e.name + '.' + s.name + ': כינוי שונה (בסכימה "' + s.alias + '", באונליין "' + f.alias + '")', adopt: true });
        const od = f.domain && f.domain.name || '', sd = s.domain || '';
        if (od !== sd && !(od === '' && sd === '')) { if (od && !sd) add({ k: 'dom-set', ent: e.name, f, s, text: e.name + '.' + s.name + ': באונליין יש דומיין "' + od + '" ואין בסכימה', adopt: true }); else if (!od && sd) { if ((S.domains[sd] && (S.domains[sd].values || []).length)) add({ k: 'dom-none', ent: e.name, s, text: e.name + '.' + s.name + ': בסכימה דומיין "' + sd + '" ובאונליין אין (טעון בדיקה)' }); } else add({ k: 'dom-diff', ent: e.name, s, f, text: e.name + '.' + s.name + ': דומיין שונה (בסכימה "' + sd + '", באונליין "' + od + '")' }); }
        else if (od && S.domains[sd] && f.domain.codedValues) {
          const sv = new Set((S.domains[sd].values || []).map((v) => String(v.code))); const ov = new Set(f.domain.codedValues.map((v) => String(v.code)));
          f.domain.codedValues.forEach((v) => { if (!sv.has(String(v.code))) add({ k: 'val+', ent: e.name, dom: sd, v, field: s.name, text: 'ערך חדש באונליין ברשימה ' + sd + ' (' + e.name + '.' + s.name + '): "' + v.code + '"' + (v.name !== v.code ? ' (תווית "' + v.name + '")' : ''), adopt: true }); });
          (S.domains[sd].values || []).forEach((v) => { if (!ov.has(String(v.code))) add({ k: 'val-', ent: e.name, dom: sd, text: 'ערך בסכימה שלא קיים באונליין ברשימה ' + sd + ' (' + e.name + '.' + s.name + '): "' + v.code + '"' }); });
        }
      });
      e.fields.forEach((s) => { const low = s.name.toLowerCase(); if (!on[low] && SYS.indexOf(low) < 0 && s.mode !== 'היסטורי' && !/^מוסתר/.test(s.visible || '')) add({ k: 'field-', ent: e.name, s, text: 'שדה בסכימה שלא קיים באונליין: ' + e.name + '.' + s.name, adopt: false }); });
    });
    svc.layers.forEach((L) => { if (!S.entities.some((e) => e.name === L.name)) add({ k: 'ent+', text: 'שכבה או טבלה באונליין שלא קיימת בסכימה: ' + L.name }); });
    return items;
  }

  /* אימוץ פריט לסכמה. מחזיר מחרוזת תיאור (או '' אם לא אומץ). */
  function adopt(S, it) {
    const e = S.entities.find((x) => x.name === it.ent);
    const ensureDom = (d) => { if (!d || S.domains[d.name]) return; S.domains[d.name] = { name: d.name, desc: d.name, fieldType: 'TEXT', values: (d.codedValues || []).map((v) => ({ code: String(v.code), label: String(v.code), parent: '' })) }; };
    if (it.k === 'field+') {
      const f = it.f; ensureDom(f.domain);
      e.fields.push({ category: (e.fields[e.fields.length - 1] || {}).category || 'כללי', name: f.name, alias: f.alias || f.name, type: T2S[f.type] || 'TEXT', length: (T2S[f.type] || 'TEXT') === 'TEXT' ? String(Math.max(+f.length || 255, 255)) : '', domain: f.domain ? f.domain.name : '', mode: f.domain ? 'רשימה' : 'ידני', visible: 'תמיד', open: true, note: 'נוסף ישירות באונליין ואומץ בסנכרון ' + new Date().toISOString().slice(0, 10) + '. יש לסווג לקבוצה בטופס ולהגדיר תנאי הצגה וחובה.' });
      return 'נוסף ' + e.name + '.' + f.name;
    }
    if (it.k === 'type') { it.s.type = T2S[it.f.type] || it.s.type; return 'סוג ' + e.name + '.' + it.s.name; }
    if (it.k === 'length') { it.s.length = String(it.f.length); return 'אורך ' + e.name + '.' + it.s.name; }
    if (it.k === 'alias') { it.s.alias = it.f.alias; return 'כינוי ' + e.name + '.' + it.s.name; }
    if (it.k === 'dom-set') { ensureDom(it.f.domain); it.s.domain = it.f.domain.name; if (it.s.mode !== 'אוטומטי') it.s.mode = 'רשימה'; return 'דומיין ' + e.name + '.' + it.s.name; }
    if (it.k === 'val+') { S.domains[it.dom].values.push({ code: String(it.v.code), label: String(it.v.code), parent: '' }); return 'ערך "' + it.v.code + '" ב-' + it.dom; }
    return '';
  }

  /* ---------- קריאה מ-AGOL (קריאה בלבד) ---------- */
  async function get(url, token) {
    const r = await fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'f=json' + (token ? '&token=' + encodeURIComponent(token) : ''));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); if (j.error) throw new Error(j.error.message || 'שגיאה');
    return j;
  }
  async function fetchService(serviceUrl, token) {
    const base = serviceUrl.replace(/\/+$/, '').replace(/\/\d+$/, '');
    const root = await get(base, token), ids = (root.layers || []).concat(root.tables || []), layers = [];
    for (const l of ids) { const d = await get(base + '/' + l.id, token); layers.push({ id: l.id, name: d.name, fields: (d.fields || []).map((f) => ({ name: f.name, type: f.type, alias: f.alias, length: f.length, domain: f.domain && f.domain.codedValues ? { name: f.domain.name, codedValues: f.domain.codedValues } : null })) }); }
    return { layers, base };
  }

  /* ---------- דף ---------- */
  const KIND = { 'field+': 'שדה חדש', type: 'סוג שדה', length: 'אורך', alias: 'כינוי', 'dom-set': 'דומיין', 'val+': 'ערך חדש ברשימה', 'field-': 'חסר באונליין', 'dom-none': 'דומיין חסר באונליין', 'dom-diff': 'דומיין שונה', 'val-': 'ערך חסר באונליין', 'ent-': 'ישות חסרה', 'ent+': 'שכבה/טבלה נוספת' };
  function page(S) {
    const dep = (S.deployments || []).filter((d) => d && d.serviceUrl).slice(-1)[0];
    const url = ST.url != null ? ST.url : (dep ? dep.serviceUrl : '');
    const ad = ST.items.filter((x) => x.adopt), oth = ST.items.filter((x) => !x.adopt);
    const inp = 'style="width:100%;box-sizing:border-box;margin:2px 0 6px"';
    const res = ST.svc ? (ST.items.length ? `<div class="card" style="margin-top:10px"><b>נמצאו ${ST.items.length} הבדלים</b> (נבדק ${esc(ST.when)}, ${ST.svc.layers.length} שכבות וטבלאות)
      ${ad.length ? `<p>ניתנים לאימוץ לסכמה (האונליין הוא המקור):</p><div class="tbl-wrap"><table><tbody>${ad.map((x) => `<tr><td style="width:30px"><input type="checkbox" class="sy-ck" value="${x.id}" checked></td><td style="width:140px">${esc(KIND[x.k])}</td><td>${esc(x.text)}</td></tr>`).join('')}</tbody></table></div>
      <p><button class="primary" onclick="A.syncApply()">אמץ את המסומנים לסכמה ופתח בקשת שינוי</button></p>` : ''}
      ${oth.length ? `<p>דורשים החלטה (לא מאומצים אוטומטית):</p><div class="tbl-wrap"><table><tbody>${oth.map((x) => `<tr><td style="width:170px">${esc(KIND[x.k])}</td><td>${esc(x.text)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`
      : '<div class="card" style="margin-top:10px">✅ הסכמה והשירות באונליין תואמים (שדות, סוגים, אורכים ודומיינים).</div>') : '';
    return `<div class="card"><b>סנכרון מהאונליין לכלי.</b> אחרי שהרכיבים באונליין, כל שינוי שנעשה שם (שדה חדש, ערך חדש ברשימה, שינוי כינוי או אורך) מזוהה כאן ואפשר לאמץ אותו לסכמה, כדי שהתיעוד, הטופס וגרסת השותפים יישארו מעודכנים. הכלי רק קורא מהשירות ולא כותב אליו.
      <p style="font-size:13px;color:#475569">מכסה: שדות, דומיינים, אורכים, סוגים. לא נקרא אוטומטית: מבנה טופס Survey123, הגדרות Field Maps וביטויי Arcade (עדכון שלהם נעשה מהכלי אל האונליין, ולכן הם מנוהלים דרך בקשות שינוי).</p>
      <label>כתובת השירות (FeatureServer)</label><input type="text" dir="ltr" ${inp} id="sy-url" value="${esc(url)}" placeholder="https://services.arcgis.com/…/FeatureServer">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0 10px"><div><label>פורטל (ריק = arcgis.com)</label><input type="text" dir="ltr" ${inp} id="sy-p" value="https://www.arcgis.com"></div><div><label>שם משתמש (אם השירות פרטי)</label><input type="text" dir="ltr" ${inp} id="sy-u"></div><div><label>סיסמה</label><input type="password" ${inp} id="sy-w" autocomplete="off"></div></div>
      <button class="primary" ${ST.busy ? 'disabled' : ''} onclick="A.syncRun()">${ST.busy ? 'בודק…' : 'בדוק הבדלים'}</button>
      ${ST.err ? `<div class="iss error" style="margin-top:8px"><b>שגיאה</b><span>${esc(ST.err)}</span></div>` : ''}
      ${S.sync && S.sync.last ? `<p class="hint">סנכרון אחרון: ${esc(S.sync.last)} · ${esc(S.sync.note || '')}</p>` : ''}</div>${res}
      ${ST.done ? `<div class="card" style="margin-top:10px;background:#F0FDF4"><b>אומצו ${ST.done.n} שינויים לסכמה.</b> נפתחה בקשה ${esc(ST.done.cr)} עם משימות להמשך (טופס, Field Maps, תיעוד). לשמירה: "שמור לתיקייה" ו-Commit.</div>` : ''}`;
  }
  async function run(S) {
    ST.err = ''; ST.done = null; ST.busy = true; ST.url = document.getElementById('sy-url').value.trim();
    window.A && A.render && A.render();
    try {
      let token = '';
      const u = document.getElementById('sy-u').value.trim(), w = document.getElementById('sy-w').value;
      if (u && w && window.AgolPub) { const sess = await window.AgolPub.login(document.getElementById('sy-p').value, u, w); token = sess.token; }
      if (!ST.url) throw new Error('יש להזין כתובת שירות.');
      ST.svc = await fetchService(ST.url, token);
      ST.items = diff(S, ST.svc); ST.when = new Date().toLocaleString('he-IL');
    } catch (e) { ST.err = e.message + ' (אם השירות פרטי: יש להזין שם משתמש וסיסמה)'; ST.svc = null; ST.items = []; }
    ST.busy = false;
  }
  window.Sync = { diff, adopt, page, run, fetchService, ST };
})();
