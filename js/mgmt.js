/* ניהול הפרויקט: שאלות ללקוח, תוכנית יישום עם הערכות זמן, ובקשות שינוי (אחרי העלייה לאוויר).
   הנתונים נשמרים בסכימה עצמה: S.questions, S.plan, S.changes (כך הכל בגיט, באותו קובץ). */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const F = { q: 'open', c: 'active' }; // מסננים
  const Q_ST = { open: 'פתוח', answered: 'נענה', deferred: 'נדחה' };
  const C_ST = { new: 'חדש', review: 'בבדיקה', waiting: 'ממתין ללקוח', approved: 'אושר', doing: 'בעבודה', done: 'הושלם', rejected: 'נדחה' };
  const C_TY = { req: 'דרישה', enh: 'שיפור', bug: 'תיקון' };
  const P_ST = { todo: 'לא התחיל', doing: 'בעבודה', done: 'הושלם', blocked: 'חסום' };
  const AREAS = ['נתונים', 'Survey123', 'Field Maps', 'Arcade', 'Make', 'הסבה', 'דוחות', 'הרשאות והדרכה', 'כללי'];
  const sel = (map, v, fn) => `<select onchange="${fn}this.value)">${Object.keys(map).map((k) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(map[k])}</option>`).join('')}</select>`;
  const ta = (v, fn, rows) => `<textarea rows="${rows || 2}" style="width:100%;min-width:160px;box-sizing:border-box" onchange="${fn}this.value)">${esc(v)}</textarea>`;
  const inp = (v, fn, w) => `<input type="text" ${w ? `style="width:${w}"` : ''} value="${esc(v)}" onchange="${fn}this.value)">`;
  const num = (v, fn) => `<input type="number" min="0" step="1" style="width:64px" value="${esc(v)}" onchange="${fn}this.value)">`;
  const today = () => new Date().toISOString().slice(0, 10);
  const tabs = (key, opts) => `<div class="tabs">${opts.map((o) => `<button class="${F[key] === o[0] ? 'on' : ''}" onclick="A.mset('${key}','${o[0]}')">${esc(o[1])}</button>`).join('')}</div>`;
  const chip = (t, c) => `<span style="display:inline-block;background:${c || '#EEF2FF'};border-radius:12px;padding:2px 10px;margin:0 0 4px 6px;font-size:13px">${t}</span>`;


  const taskList = (c, i) => { const T = c.tasks || []; if (!T.length) return ''; const d = T.filter((x) => x.done).length; return `<details style="margin-top:4px"><summary style="cursor:pointer;font-size:13px;color:#1E3A8A">משימות ${d}/${T.length}</summary>${T.map((x, j) => `<label style="display:block;font-size:13px;margin:3px 0"><input type="checkbox" ${x.done ? 'checked' : ''} onchange="A.task(${i},${j},this.checked)"> <b>${esc(x.comp)}</b>: ${esc(x.t)}${x.h ? ` <span dir="ltr" style="color:#64748B">(${x.h[0]}–${x.h[1]} ש׳)</span>` : ''}</label>`).join('')}</details>`; };

  /* ---------- שאלות ללקוח ---------- */
  function questions(S) {
    const L = S.questions || (S.questions = []);
    const n = (st) => L.filter((q) => q.status === st).length;
    const rows = L.map((q, i) => ({ q, i })).filter((x) => F.q === 'all' || x.q.status === F.q).map(({ q, i }) => {
      const f = (p) => `A.ls('questions',${i},'${p}',`;
      return `<tr><td style="width:44px"><b>${esc(q.id)}</b></td>
      <td style="width:120px">${inp(q.topic, f('topic'), '100%')}</td>
      <td>${ta(q.q, f('q'), 5)}</td>
      <td>${ta(q.proposal, f('proposal'), 5)}</td>
      <td style="width:100px">${sel(Q_ST, q.status, f('status'))}</td>
      <td>${ta(q.answer, f('answer'), 4)}<div style="font-size:12px;color:#64748B;margin-top:2px">תאריך: ${inp(q.date || '', f('date'), '110px')} · קשר: ${inp(q.ref || '', f('ref'), '70px')}</div></td>
      <td><button class="mini danger" onclick="A.lsDel('questions',${i})">מחק</button></td></tr>`;
    }).join('');
    return `<div class="card" style="margin-bottom:10px"><b>מקום אחד לכל מה שצריך להכריע מול הלקוח.</b> לכל שאלה מצורפת הצעה, כדי שהדיון יהיה אישור או תיקון. כשהלקוח עונה: משנים סטטוס ל"נענה", רושמים את התשובה ותאריך, ופותחים בקשת שינוי אם התשובה משנה את הפתרון.</div>
      ${tabs('q', [['open', 'פתוחות (' + n('open') + ')'], ['answered', 'נענו (' + n('answered') + ')'], ['deferred', 'נדחו (' + n('deferred') + ')'], ['all', 'הכל (' + L.length + ')']])}
      <div style="margin:8px 0"><button onclick="A.lsAdd('questions')">+ שאלה חדשה</button> <button class="mini" onclick="A.mmd('questions')">העתק כ-Markdown (לסדר יום פגישה)</button></div>
      <div class="tbl-wrap"><table style="min-width:1000px"><thead><tr><th>#</th><th>נושא</th><th>שאלה</th><th>הצעה</th><th>סטטוס</th><th>תשובה הלקוח</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7" style="color:#64748B">אין שאלות בסינון הזה.</td></tr>'}</tbody></table></div>`;
  }

  /* ---------- תוכנית יישום ---------- */
  function planTotals(P) {
    const t = { min: 0, max: 0, doneMid: 0, mid: 0 };
    P.phases.forEach((ph) => ph.items.forEach((it) => { const a = +it.min || 0, b = +it.max || 0; t.min += a; t.max += b; t.mid += (a + b) / 2; if (it.status === 'done') t.doneMid += (a + b) / 2; else if (it.status === 'doing') t.doneMid += (a + b) / 4; }));
    return t;
  }
  function plan(S) {
    const P = S.plan || (S.plan = { hoursPerDay: 6, assumptions: '', phases: [] });
    const hpd = +P.hoursPerDay || 6, T = planTotals(P), days = (h) => Math.round(h / hpd * 10) / 10;
    const pct = T.mid ? Math.round(T.doneMid / T.mid * 100) : 0;
    const phs = P.phases.map((ph, p) => {
      const a = ph.items.reduce((s, x) => s + (+x.min || 0), 0), b = ph.items.reduce((s, x) => s + (+x.max || 0), 0);
      const rows = ph.items.map((it, i) => {
        const f = (k) => `A.pi(${p},${i},'${k}',`;
        return `<tr><td>${inp(it.name, f('name') , '100%')}</td>
        <td style="width:120px"><select onchange="${f('area')}this.value)">${AREAS.map((x) => `<option ${x === it.area ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></td>
        <td style="width:70px">${num(it.min, f('min'))}</td><td style="width:70px">${num(it.max, f('max'))}</td>
        <td style="width:100px">${inp(it.owner, f('owner'), '100%')}</td>
        <td style="width:100px">${sel(P_ST, it.status, f('status'))}</td>
        <td>${inp(it.dep, f('dep'), '100%')}</td>
        <td>${ta(it.note, f('note'), 2)}</td>
        <td><button class="mini danger" onclick="A.pDel(${p},${i})">מחק</button></td></tr>`;
      }).join('');
      return `<div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b style="font-size:16px">${p + 1}. ${inp(ph.name, `A.ph(${p},'name',`, '260px')}</b><span>${chip('<span dir="ltr">' + a + '–' + b + '</span> שעות')}${chip('כ-<span dir="ltr">' + days(a) + '–' + days(b) + '</span> ימי עבודה')}</span></div>
      <div class="tbl-wrap"><table style="min-width:900px"><thead><tr><th>משימה</th><th>תחום</th><th>מינ׳ (ש׳)</th><th>מקס׳ (ש׳)</th><th>אחראי</th><th>סטטוס</th><th>תלוי ב</th><th>הערה</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <button class="mini" onclick="A.pAdd(${p})">+ משימה</button> <button class="mini danger" onclick="A.phDel(${p})">מחק שלב</button></div>`;
    }).join('');
    return `<div class="card"><b>סה"כ: <span dir="ltr">${Math.round(T.min)}–${Math.round(T.max)}</span> שעות (כ-<span dir="ltr">${days(T.min)}–${days(T.max)}</span> ימי עבודה)</b> · התקדמות משוקללת: ${pct}%
      <div style="height:8px;background:#E2E8F0;border-radius:4px;margin-top:6px"><div style="height:8px;width:${pct}%;background:#1E3A8A;border-radius:4px"></div></div>
      <div style="margin-top:8px;font-size:13px;color:#475569">שעות ביום עבודה: <input type="number" min="1" max="12" style="width:56px" value="${hpd}" onchange="A.pset('hoursPerDay',this.value)"></div>
      <div style="margin-top:6px"><div style="font-size:12px;color:#64748B">הנחות והסתייגויות</div>${ta(P.assumptions, "A.pset('assumptions',", 3)}</div></div>
      ${phs}
      <div style="margin-top:12px"><button onclick="A.phAdd()">+ שלב חדש</button> <button class="mini" onclick="A.mmd('plan')">העתק כ-Markdown</button></div>
      <p class="hint">ההערכות הן טווחים ראשוניים (מינימום: הכל עובד מהניסיון הראשון; מקסימום: כולל תיקונים אחרי בדיקות שטח). יש לכייל אחרי השלב הראשון. עבודת הלקוח (אישורים, תשובות) לא נכללת.</p>`;
  }

  /* ---------- בקשות שינוי ---------- */
  function changes(S) {
    const L = S.changes || (S.changes = []);
    const activeSt = ['new', 'review', 'waiting', 'approved', 'doing'];
    const cnt = (st) => L.filter((c) => c.status === st).length;
    const shown = L.map((c, i) => ({ c, i })).filter((x) => F.c === 'all' ? true : F.c === 'active' ? activeSt.indexOf(x.c.status) >= 0 : x.c.status === F.c);
    const est = L.filter((c) => ['approved', 'doing'].indexOf(c.status) >= 0).reduce((s, c) => s + (+c.est || 0), 0);
    const rows = shown.map(({ c, i }) => {
      const f = (k) => `A.ls('changes',${i},'${k}',`;
      return `<tr><td style="width:60px"><b>${esc(c.id)}</b><div style="font-size:11px;color:#64748B">${inp(c.date, f('date'), '88px')}</div></td>
      <td style="width:110px">${inp(c.source, f('source'), '100%')}</td>
      <td>${inp(c.title, f('title'), '100%')}${ta(c.desc, f('desc'), 2)}${taskList(c, i)}</td>
      <td style="width:90px">${sel(C_TY, c.type, f('type'))}</td>
      <td style="width:110px">${sel(C_ST, c.status, f('status'))}</td>
      <td>${inp(c.areas, f('areas'), '100%')}<div style="font-size:12px;color:#64748B;margin-top:2px">הערכה (ש׳): ${num(c.est, f('est'))} · קשר: ${inp(c.ref, f('ref'), '70px')} · גרסה: ${inp(c.version, f('version'), '60px')}</div></td>
      <td>${ta(c.note, f('note'), 3)}</td><td><button class="mini danger" onclick="A.lsDel('changes',${i})">מחק</button></td></tr>`;
    }).join('');
    return `<div class="card" style="margin-bottom:10px"><b>יומן בקשות שינוי ושיפורים.</b> כל בקשה מהלקוח (פגישה, מייל, שיחה) נרשמת כאן עם מקור, תחום מושפע, הערכה וסטטוס, כדי שאפשר יהיה לדעת מה אושר, מה בעבודה ובאיזו גרסת סכמה (${esc((S.meta || {}).version || '')}) זה נכנס. עלות שעות באישור או בעבודה: <b>${est}</b>.</div>
      ${window.Impact ? wizard(S) : ''}
      ${tabs('c', [['active', 'פעילות'], ['new', 'חדשות (' + cnt('new') + ')'], ['waiting', 'ממתינות ללקוח (' + cnt('waiting') + ')'], ['done', 'הושלמו (' + cnt('done') + ')'], ['rejected', 'נדחו (' + cnt('rejected') + ')'], ['all', 'הכל (' + L.length + ')']])}
      <div style="margin:8px 0"><button onclick="A.lsAdd('changes')">+ בקשה חדשה</button> <button class="mini" onclick="A.mmd('changes')">העתק כ-Markdown (סיכום ללקוח)</button></div>
      <div class="tbl-wrap"><table style="min-width:1100px"><thead><tr><th>#</th><th>מקור</th><th>בקשה</th><th>סוג</th><th>סטטוס</th><th>תחום, הערכה וקישורים</th><th>הערות / החלטה</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" style="color:#64748B">אין בקשות בסינון הזה.</td></tr>'}</tbody></table></div>`;
  }


  /* ---------- אשף בקשה חדשה עם ניתוח השפעה ---------- */
  function wizard(S) {
    const I = window.Impact, W = I.W, ents = S.entities, e = I.ent(S, W.entity);
    const o = (arr, v, f) => arr.map((x) => `<option value="${esc(x[0])}" ${x[0] === v ? 'selected' : ''}>${esc(x[1])}</option>`).join('');
    const row = (lab, html) => `<label style="display:block;font-size:13px;color:#475569;margin:6px 0 2px">${lab}</label>${html}`;
    const t = (k, ph, w) => `<input type="text" placeholder="${esc(ph || '')}" style="width:${w || '100%'};box-sizing:border-box" value="${esc(W[k])}" onchange="A.wz('${k}',this.value)">`;
    const s_ = (k, arr) => `<select style="width:100%" onchange="A.wz('${k}',this.value)">${o(arr, W[k])}</select>`;
    const cats = e ? Array.from(new Set(e.fields.map((f) => f.category).filter(Boolean))) : [];
    let form = '';
    if (W.type === 'field') {
      form = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px">
        <div>${row('ישות (טבלה / שכבה)', s_('entity', [['', 'בחר…']].concat(ents.map((x) => [x.name, (x.alias || x.name) + ' · ' + x.name]))))}</div>
        <div>${row('שם השדה (אנגלית)', t('name', 'למשל InspectorName'))}</div>
        <div>${row('כינוי (עברית)', t('alias', 'כפי שיופיע בטופס'))}</div>
        <div>${row('סוג', s_('ftype', Object.keys(I.FT).map((k) => [k, I.FT[k]])))}</div>
        <div>${row('אורך (טקסט)', t('length', '255'))}</div>
        <div>${row('רשימת בחירה (דומיין)', s_('domain', [['', 'ללא']].concat(Object.keys(S.domains).map((k) => [k, k]))))}</div>
        <div>${row('קבוצה בטופס', `<input list="wz-cats" style="width:100%;box-sizing:border-box" value="${esc(W.category)}" onchange="A.wz('category',this.value)"><datalist id="wz-cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}</div>
        <div>${row('הערה / הסבר', t('desc', 'מה השדה מתעד'))}</div></div>`;
    } else if (W.type === 'domainValue') {
      form = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0 12px">
        <div>${row('דומיין', s_('domName', [['', 'בחר…']].concat(Object.keys(S.domains).map((k) => [k, k + (S.domains[k].desc ? ' · ' + S.domains[k].desc : '')]))))}</div>
        <div>${row('הערך החדש (קוד = תווית)', t('code'))}</div>
        <div>${row('ערך הורה (ברשימה מדורגת)', t('parent'))}</div></div>`;
    } else form = row(W.type === 'entity' ? 'תיאור הטבלה או השכבה הנדרשת' : 'תיאור הבקשה', t('title', '', '100%')) + row('פרטים', `<textarea rows="3" style="width:100%;box-sizing:border-box" onchange="A.wz('desc',this.value)">${esc(W.desc)}</textarea>`);
    const R = W.result;
    let out = '';
    if (R && !R.ok) out = `<div class="iss error"><b>חסר</b><span>${R.errs.map(esc).join(' · ')}</span></div>`;
    else if (R) {
      const rows2 = R.items.map((x) => `<tr><td><b>${esc(x.comp)}</b></td><td>${esc(x.what)}${x.auto ? ' <span style="color:#166534">(אוטומטי בכלי)</span>' : ''}</td><td style="white-space:nowrap" dir="ltr">${x.h[0]}–${x.h[1]}</td></tr>`).join('');
      out = `<div class="card" style="margin-top:10px"><b>מה כרוך בבקשה</b><p>${esc(R.summary)}</p><b>דרך מענה מוצעת</b><p>${esc(R.approach)}</p>
        ${(R.warn || []).map((w) => `<div class="iss warn"><b>שים לב</b><span>${esc(w)}</span></div>`).join('')}
        ${R.related.length ? `<p>קשור לנושאים פתוחים או החלטות: <b>${R.related.map(esc).join(', ')}</b></p>` : ''}
        <div class="tbl-wrap"><table style="min-width:600px"><thead><tr><th>רכיב</th><th>מה צריך לעדכן</th><th>שעות</th></tr></thead><tbody>${rows2}</tbody></table></div>
        <p><b>הערכה: <span dir="ltr">${R.hours[0]}–${R.hours[1]}</span> שעות</b></p>
        <div>${R.apply ? '<button class="primary" onclick="A.wzCreate(true)">אשר והחל על הסכמה (ופתח בקשה עם משימות)</button> ' : ''}<button onclick="A.wzCreate(false)">פתח בקשה בלבד (בלי להחיל)</button></div>
        ${R.apply ? '<p class="hint">ההחלה משנה את הסכמה בלבד (שדה / ערך) ומעלה את מספר הגרסה. עדכון השירות המתארח, הטופס ושאר הרכיבים נעשה לפי רשימת המשימות שתיפתח בבקשה.</p>' : ''}</div>`;
    }
    return `<details class="card" style="margin-bottom:10px" ${W.result || W.open ? 'open' : ''}><summary style="cursor:pointer;font-weight:700">+ בקשה חדשה עם ניתוח השפעה (אשף)</summary>
      ${row('סוג השינוי', s_('type', Object.keys(I.TYPES).map((k) => [k, I.TYPES[k]])))}
      ${row('מקור הבקשה', t('source', 'למשל: אבי קיי, פגישה 25/11'))}
      ${form}
      <div style="margin-top:10px"><button class="primary" onclick="A.wzGo()">נתח השפעה</button></div>${out}</details>`;
  }

  /* ---------- Markdown ---------- */
  const md = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  function toMd(S, kind) {
    const L = [];
    if (kind === 'questions') {
      L.push('# שאלות פתוחות לדיון עם הלקוח', '', '| # | נושא | שאלה | הצעה |', '| --- | --- | --- | --- |');
      (S.questions || []).filter((q) => q.status === 'open').forEach((q) => L.push('| ' + [q.id, md(q.topic), md(q.q), md(q.proposal)].join(' | ') + ' |'));
    } else if (kind === 'plan') {
      const P = S.plan || { phases: [] }, hpd = +P.hoursPerDay || 6, T = planTotals(P);
      L.push('# תוכנית יישום והערכת זמן', '', 'סה"כ: ' + Math.round(T.min) + '–' + Math.round(T.max) + ' שעות (כ-' + Math.round(T.min / hpd * 10) / 10 + '–' + Math.round(T.max / hpd * 10) / 10 + ' ימי עבודה)', '');
      P.phases.forEach((ph, p) => { L.push('## ' + (p + 1) + '. ' + ph.name, '', '| משימה | תחום | שעות | אחראי | סטטוס | תלוי ב |', '| --- | --- | --- | --- | --- | --- |'); ph.items.forEach((x) => L.push('| ' + [md(x.name), x.area, (x.min || 0) + '–' + (x.max || 0), md(x.owner), P_ST[x.status] || '', md(x.dep)].join(' | ') + ' |')); L.push(''); });
      if (P.assumptions) L.push('הנחות: ' + P.assumptions);
    } else {
      L.push('# יומן בקשות שינוי', '', '| # | תאריך | מקור | בקשה | סוג | סטטוס | הערכה (ש׳) | גרסה |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
      (S.changes || []).forEach((c) => L.push('| ' + [c.id, c.date, md(c.source), md(c.title), C_TY[c.type] || '', C_ST[c.status] || '', c.est || '', c.version || ''].join(' | ') + ' |'));
    }
    return L.join('\n');
  }

  /* ---------- עדכוני נתונים (נקרא מ-A ב-app.js) ---------- */
  const nextId = (L, pre) => pre + '-' + String(L.reduce((m, x) => Math.max(m, parseInt(String(x.id || '').replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(3, '0');
  window.Mgmt = {
    F, questions, plan, changes, wizard, toMd, today, nextId, Q_ST, C_ST, P_ST,
    counts(S) { return { q: (S.questions || []).filter((x) => x.status === 'open').length, c: (S.changes || []).filter((x) => ['new', 'review', 'waiting', 'approved', 'doing'].indexOf(x.status) >= 0).length, h: S.plan ? Math.round(planTotals(S.plan).max) : null }; },
    blank: {
      questions: () => ({ topic: '', q: '', proposal: '', status: 'open', answer: '', date: '', ref: '' }),
      changes: () => ({ date: today(), source: '', title: '', desc: '', type: 'req', status: 'new', areas: '', est: '', ref: '', version: '', note: '' })
    }
  };
})();
