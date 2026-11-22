/* פריטי ArcGIS Online כדיאגרמה דינמית: קישור כל פריט בתכנון לפריט האמיתי, בדיקת קיום, קישור לדף הפריט, ואימות הקשרים בין הפריטים מול האונליין.
   קריאה בלבד מ-AGOL. הנתונים נשמרים בסכמה: S.itemLinks[<מזהה פריט בדיאגרמה>] = { itemId, portal, title, type, owner, modified, url, state, checked }
   ו-S.itemEdges["מ>אל"] = { ok, at }. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const IT = { sess: null, busy: false, msg: '', err: '', cands: {}, q: '' };
  const S0 = () => window.__designer && window.__designer.S;
  const save = () => { const D = window.__designer; if (D && D.save) D.save(); };
  const redraw = () => { const D = window.__designer; if (D && D.render) D.render(); };
  const viewOnly = () => !!window.__VIEW_ONLY;
  const nodes = (S) => ((S.diagrams || {}).agolItems || []);
  const today = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

  /* סוג פריט ב-AGOL שמתאים לסוג שבתכנון; null = אין פריט (Webhook, קבוצות, משתמשים) */
  function want(n) {
    const t = String(n.type || '');
    if (/Webhook|Groups|משתמשים/.test(t)) return null;
    if (/Feature Layer/.test(t)) return 'Feature Service';
    if (/Survey123/.test(t)) return 'Form';
    if (/Web Map/.test(t)) return 'Web Map';
    if (/Dashboard/.test(t)) return 'Dashboard';
    if (/Instant App|Manager/.test(t)) return 'Web Mapping Application';
    if (/Notebook/.test(t)) return 'Notebook';
    return '';
  }
  const refType = (type) => /Web Map|Dashboard|Web Mapping Application|Form|Feature Service/.test(type || '');
  const parseRef = (s) => { const m = String(s || '').match(/[0-9a-f]{32}/i); return m ? m[0].toLowerCase() : ''; };
  const normPortal = (u) => String(u || '').trim().replace(/\/+$/, '').replace(/\/(sharing|home).*$/, '') || 'https://www.arcgis.com';
  const baseUrl = (u) => String(u || '').toLowerCase().replace(/\/+$/, '').replace(/\/\d+$/, '');
  const pageUrl = (l) => l.portal.replace(/\/+$/, '') + '/home/item.html?id=' + l.itemId;

  /* קישור נגזר מפרסום (S.deployments) לפריט ה-Hosted Layer */
  function link(S, n) {
    const l = (S.itemLinks || {})[n.id];
    if (l) return l;
    const dep = (S.deployments || []).filter((d) => d && d.itemId && d.itemPage).slice(-1)[0];
    if (n.deploy && dep) return { itemId: dep.itemId, portal: dep.itemPage.replace(/\/home\/item\.html.*$/, ''), title: dep.title, type: 'Feature Service', url: dep.serviceUrl, state: 'exists', checked: dep.publishedAt ? dep.publishedAt.slice(0, 16).replace('T', ' ') : '', derived: true };
    return null;
  }

  async function jget(url, token) {
    const r = await fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'f=json' + (token ? '&token=' + encodeURIComponent(token) : ''));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); if (j.error) { const e = new Error(j.error.message || 'שגיאה'); e.code = j.error.code; throw e; }
    return j;
  }

  /* ---------- קריאת פריט, וחילוץ ההפניות שלו לפריטים אחרים ---------- */
  async function readItem(portal, id, token) {
    const it = await jget(portal + '/sharing/rest/content/items/' + id, token);
    return { itemId: id, portal, title: it.title, type: it.type, owner: it.owner, modified: it.modified ? new Date(it.modified).toISOString().slice(0, 10) : '', url: it.url || '', state: 'exists', checked: today() };
  }
  async function refsOf(l, token) {
    const ids = {}, urls = {};
    const scan = (txt) => { (String(txt).match(/[0-9a-f]{32}/gi) || []).forEach((x) => { ids[x.toLowerCase()] = 1; }); (String(txt).match(/https?:\/\/[^"'\\\s]+?\/FeatureServer/gi) || []).forEach((x) => { urls[baseUrl(x)] = 1; }); };
    if (/Web Map|Dashboard|Web Mapping Application/.test(l.type)) { try { scan(JSON.stringify(await jget(l.portal + '/sharing/rest/content/items/' + l.itemId + '/data', token))); } catch (e) { /* ללא גישה */ } }
    for (const rel of ['Survey2Service', 'Map2Service', 'Service2Service', 'WMA2Code']) for (const dir of ['forward', 'reverse']) {
      try { const r = await jget(l.portal + '/sharing/rest/content/items/' + l.itemId + '/relatedItems?relationshipType=' + rel + '&direction=' + dir, token); (r.relatedItems || []).forEach((x) => { ids[String(x.id).toLowerCase()] = 1; }); } catch (e) { /* */ }
    }
    return { ids, urls };
  }
  const refersTo = (refs, l) => !!(refs.ids[l.itemId] || (l.url && refs.urls[baseUrl(l.url)]));

  /* ---------- פעולות ---------- */
  async function refreshAll(S) {
    const token = IT.sess ? IT.sess.token : '', out = IT.log = [];
    S.itemLinks = S.itemLinks || {}; S.itemEdges = S.itemEdges || {};
    const refs = {};
    for (const n of nodes(S)) {
      const l = S.itemLinks[n.id]; if (!l) continue;
      try { Object.assign(l, await readItem(l.portal, l.itemId, token)); }
      catch (e) { l.state = IT.sess ? 'missing' : 'unknown'; l.checked = today(); out.push(n.title + ': ' + e.message); continue; }
      if (refType(l.type)) refs[n.id] = await refsOf(l, token);
    }
    /* קשרים: רק כששני הפריטים מקושרים וקיימים, ולפחות אחד מהם מסוג שמצביע על אחר */
    S.itemEdges = {};
    nodes(S).forEach((n) => (n.links || []).forEach((e) => {
      const a = S.itemLinks[n.id], b = S.itemLinks[e.to];
      if (!a || !b || a.state !== 'exists' || b.state !== 'exists' || !(refs[n.id] || refs[e.to])) return;
      const ok = (refs[n.id] && refersTo(refs[n.id], b)) || (refs[e.to] && refersTo(refs[e.to], a));
      S.itemEdges[n.id + '>' + e.to] = { ok: !!ok, at: today() };
    }));
    S.itemSync = { last: today(), user: IT.sess ? IT.sess.user : '' };
  }
  function score(n, it) {
    const w = (s) => String(s || '').toLowerCase().split(/[^a-z0-9֐-׿]+/).filter((x) => x.length > 2);
    const a = w(n.title + ' ' + n.id), b = w(it.title + ' ' + (it.tags || []).join(' '));
    return a.filter((x) => b.some((y) => y.indexOf(x) >= 0 || x.indexOf(y) >= 0)).length;
  }
  async function scanOrg(S) {
    if (!IT.sess) throw new Error('הסריקה דורשת התחברות לארגון. בלי התחברות אפשר להדביק קישור לפריט ציבורי בכל שורה.');
    const q = IT.q.trim() || ('owner:"' + IT.sess.user + '"');
    const res = await jget(IT.sess.portal + '/sharing/rest/search?q=' + encodeURIComponent(q) + '&num=100&sortField=modified&sortOrder=desc', IT.sess.token);
    IT.cands = {}; let n = 0; const taken = Object.keys(S.itemLinks || {}).map((k) => S.itemLinks[k].itemId);
    nodes(S).forEach((x) => {
      const t = want(x); if (!t || link(S, x)) return;
      const c = (res.results || []).filter((it) => it.type === t && taken.indexOf(it.id) < 0).map((it) => ({ it, s: score(x, it) })).filter((y) => y.s > 0).sort((p, q2) => q2.s - p.s).slice(0, 5);
      if (c.length) { IT.cands[x.id] = c.map((y) => ({ id: y.it.id, title: y.it.title, type: y.it.type })); n++; }
    });
    return { total: (res.results || []).length, matched: n };
  }

  async function guard(fn) { IT.err = ''; IT.msg = ''; IT.busy = true; redraw(); try { await fn(); } catch (e) { IT.err = e.message || String(e); } IT.busy = false; redraw(); }

  const api = {
    IT,
    state(S, n) { const l = link(S, n); return l ? { l, cls: l.state === 'exists' ? 'live' : l.state === 'missing' ? 'gone' : 'ref' } : null; },
    /* תג וקישור בתוך צומת בדיאגרמה */
    badge(S, n) {
      const l = link(S, n); if (!l) return '';
      const st = l.state === 'exists' ? '<span style="color:#15803d">● קיים באונליין</span>' : l.state === 'missing' ? '<span style="color:#b91c1c">✖ לא נמצא באונליין</span>' : '<span style="color:#475569">● מקושר (לא נבדק)</span>';
      return `<div class="itb">${st} · <a href="${esc(pageUrl(l))}" target="_blank" rel="noopener">פתח פריט ↗</a></div>`;
    },
    nodeCls(S, n) { const s = api.state(S, n); return s ? s.cls : ''; },
    /* תיאור קשר: מאומת / לא נמצא באונליין / לא נבדק */
    edge(S, from, to) { const e = (S.itemEdges || {})[from + '>' + to]; return e ? (e.ok ? 'ok' : 'no') : ''; },
    counts(S) { const a = nodes(S).filter((n) => want(n)); return { total: a.length, live: a.filter((n) => { const l = link(S, n); return l && l.state === 'exists'; }).length }; },

    panel(S) {
      if (!nodes(S).length) return '';
      const c = api.counts(S), vo = viewOnly(), inp = 'style="width:100%;box-sizing:border-box;margin:2px 0 6px"', ed = S.itemEdges || {}, ek = Object.keys(ed);
      const sum = `<b>${c.live} מתוך ${c.total}</b> פריטי ה-AGOL המתוכננים קיימים באונליין` + (ek.length ? ` · קשרים שנבדקו: ${ek.filter((k) => ed[k].ok).length} תקינים, ${ek.filter((k) => !ed[k].ok).length} לא נמצאו` : '') + (S.itemSync ? ` · נבדק ${esc(S.itemSync.last)}` : '');
      if (vo) return `<div class="card" style="margin:6px 0">${sum}</div>`;
      const form = IT.sess ? `<p style="font-size:13px;color:#166534">מחובר כ-<b dir="ltr">${esc(IT.sess.user)}</b> · <a href="#" onclick="Items.logout();return false">התנתק</a></p>
        <label>חיפוש פריטים (ברירת מחדל: כל הפריטים של המשתמש; אפשר לכתוב שאילתת חיפוש של AGOL, למשל tags:signage)</label><input type="text" dir="ltr" ${inp} id="it-q" value="${esc(IT.q)}" onchange="Items.IT.q=this.value">`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0 10px"><div><label>פורטל</label><input type="text" dir="ltr" ${inp} id="it-p" value="${esc(localStorage.getItem('agol-pub-portal') || 'https://www.arcgis.com')}"></div><div><label>שם משתמש</label><input type="text" dir="ltr" ${inp} id="it-u"></div><div><label>סיסמה</label><input type="password" ${inp} id="it-w" autocomplete="off"></div></div>`;
      return `<div class="card" style="margin:6px 0"><div>${sum}</div>
        <p style="font-size:12.5px;color:#475569;margin:6px 0">הכלי רק קורא מהארגון. ההתחברות (אם צריך) לא נשמרת. בלי התחברות אפשר לקשר ידנית פריטים ציבוריים. הקשרים מאומתים לפי ההפניות שבתוך הפריטים (מפה → שכבה, דשבורד → מפה, טופס → שכבה). קשרים בין קבוצות, משתמשים ו-Webhooks אינם נבדקים.</p>
        ${form}<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="primary" ${IT.busy ? 'disabled' : ''} onclick="Items.${IT.sess ? 'scan' : 'login'}()">${IT.busy ? 'עובד…' : IT.sess ? 'סרוק את הארגון והצע קישורים' : 'התחבר'}</button><button ${IT.busy ? 'disabled' : ''} onclick="Items.refresh()">רענן סטטוס וקשרים</button></div>
        ${IT.err ? `<div class="iss error" style="margin-top:8px"><b>שגיאה</b><span>${esc(IT.err)}</span></div>` : ''}${IT.msg ? `<p class="hint">${esc(IT.msg)}</p>` : ''}${IT.log && IT.log.length ? `<p class="hint">${IT.log.map(esc).join('<br>')}</p>` : ''}</div>`;
    },
    /* תא "אונליין" בטבלת הפריטים */
    cell(S, n) {
      const t = want(n); if (t === null) return '<span style="color:#94a3b8">אין פריט נפרד</span>';
      const l = link(S, n), vo = viewOnly(), st = { exists: ['pub', 'קיים'], missing: ['open', 'לא נמצא'], unknown: ['planned', 'לא נבדק'] };
      if (l) {
        const s = st[l.state] || st.unknown;
        return `<a href="${esc(pageUrl(l))}" target="_blank" rel="noopener"><b>${esc(l.title || l.itemId)}</b> ↗</a> <span class="tag ${s[0]}" style="margin:0">${s[1]}</span><br><small style="color:#64748b">${esc(l.type || '')}${l.owner ? ' · ' + esc(l.owner) : ''}${l.modified ? ' · עודכן ' + esc(l.modified) : ''}${l.checked ? ' · נבדק ' + esc(l.checked) : ''}</small>${vo || l.derived ? '' : ` <a href="#" onclick="Items.unlink('${esc(n.id)}');return false" title="נתק">✕</a>`}`;
      }
      if (vo) return '<span style="color:#94a3b8">טרם נוצר</span>';
      const c = IT.cands[n.id] || [];
      return `${c.length ? `<select onchange="if(this.value)Items.linkId('${esc(n.id)}',this.value)"><option value="">הצעות מהסריקה…</option>${c.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join('')}</select><br>` : ''}<input type="text" dir="ltr" placeholder="הדבק קישור או מזהה פריט" style="width:150px" id="it-l-${esc(n.id)}"> <button class="mini" onclick="Items.linkId('${esc(n.id)}')">קשר</button>`;
    },

    login() {
      const u = document.getElementById('it-u').value.trim(), w = document.getElementById('it-w').value, p = document.getElementById('it-p').value;
      return guard(async () => {
      if (!u || !w) throw new Error('יש להזין שם משתמש וסיסמה.');
      IT.sess = await window.AgolPub.login(p, u, w); try { localStorage.setItem('agol-pub-portal', IT.sess.portal); } catch (e) { /* */ }
      IT.msg = 'מחובר. אפשר לסרוק את הארגון.';
    }); },
    logout() { IT.sess = null; IT.cands = {}; redraw(); },
    scan() { return guard(async () => { const S = S0(); const r = await scanOrg(S); IT.msg = 'נסרקו ' + r.total + ' פריטים; נמצאו הצעות ל-' + r.matched + ' פריטים. בחר הצעה בטבלה למטה כדי לקשר.'; }); },
    refresh() { return guard(async () => { const S = S0(); await refreshAll(S); save(); IT.msg = 'הסטטוס והקשרים עודכנו.'; }); },
    linkId(nid, id) {
      const S = S0(), el = document.getElementById('it-l-' + nid), ref = parseRef(id || (el && el.value));
      return guard(async () => { if (!ref) throw new Error('לא זוהה מזהה פריט (32 תווים הקסדצימליים) בקישור.');
      const portal = IT.sess ? IT.sess.portal : normPortal(localStorage.getItem('agol-pub-portal') || 'https://www.arcgis.com');
      let l; try { l = await readItem(portal, ref, IT.sess ? IT.sess.token : ''); } catch (e) { l = { itemId: ref, portal, title: '', type: '', state: 'unknown', checked: today() }; IT.msg = 'הפריט נשמר אך לא נקרא (' + e.message + '). ייתכן שהוא פרטי: התחבר ורענן.'; }
      S.itemLinks = S.itemLinks || {}; S.itemLinks[nid] = l; delete IT.cands[nid]; save();
    }); },
    unlink(nid) { const S = S0(); if (S.itemLinks) delete S.itemLinks[nid]; S.itemEdges = {}; save(); redraw(); }
  };
  window.Items = api;
})();
