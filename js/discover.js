/* ייבוא פתרון קיים מ-AGOL (הנדסה לאחור): מתחילים מפריט שורש, תיקייה או שאילתת חיפוש, עוקבים אחרי ההפניות בין הפריטים
   (דשבורד → מפה → שכבה, טופס → שכבה, תצוגה → שכבת מקור) ובונים מהם פרויקט: פריטים וקשרים לדיאגרמה, קישור לכל פריט אמיתי,
   ושכבות, טבלאות, שדות, דומיינים וקשרים מהשירותים המתארחים. קריאה בלבד מ-AGOL. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DS = { mode: 'new', sess: null, busy: false, err: '', log: [], res: null, portal: '', roots: '', q: '', folder: '', folders: null, depth: 3, max: 80, key: '', org: '', title: '' };
  const today = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const T2S = { esriFieldTypeString: 'TEXT', esriFieldTypeSmallInteger: 'SHORT', esriFieldTypeInteger: 'LONG', esriFieldTypeBigInteger: 'LONG', esriFieldTypeSingle: 'FLOAT', esriFieldTypeDouble: 'DOUBLE', esriFieldTypeDate: 'DATE', esriFieldTypeDateOnly: 'DATE', esriFieldTypeGUID: 'GUID' };
  const SKIP_T = ['esriFieldTypeOID', 'esriFieldTypeGlobalID', 'esriFieldTypeGeometry', 'esriFieldTypeBlob', 'esriFieldTypeRaster', 'esriFieldTypeXML'];
  const GEOM = { esriGeometryPoint: 'point', esriGeometryMultipoint: 'point', esriGeometryPolyline: 'line', esriGeometryPolygon: 'polygon' };
  const ID_RE = /(?<![0-9a-f])[0-9a-f]{32}(?![0-9a-f])/gi;
  const D0 = () => window.__designer;
  const redraw = () => { const D = D0(); if (D && D.render) D.render(); };
  const lsPortal = () => { try { return localStorage.getItem('agol-pub-portal') || ''; } catch (e) { return ''; } };
  const portalOf = () => (DS.sess ? DS.sess.portal : String(DS.portal || lsPortal()).trim().replace(/\/+$/, '').replace(/\/(sharing|home).*$/, '') || 'https://www.arcgis.com');
  const tok = () => (DS.sess ? DS.sess.token : '');

  async function jget(url, token) {
    const r = await fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'f=json' + (token ? '&token=' + encodeURIComponent(token) : ''));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); if (j && j.error) { const e = new Error(j.error.message || 'שגיאה'); e.code = j.error.code; throw e; }
    return j;
  }

  /* ---------- סיווג פריט: קבוצה בדיאגרמה, סוג צומת ותיאור סוג ---------- */
  function cls(it) {
    const t = it.type || '', kw = it.typeKeywords || [];
    if (t === 'Feature Service') {
      const view = kw.indexOf('View Service') >= 0, hosted = kw.indexOf('Hosted Service') >= 0;
      return { group: 'נתונים', kind: hosted ? 'data' : 'ext', type: view ? 'Hosted Feature Layer View' : hosted ? 'Hosted Feature Layer' : 'Feature Layer (שירות)', svc: hosted && !view, view };
    }
    if (t === 'Form') return { group: 'אפליקציות שטח', kind: 'app', type: 'Survey123 Form' };
    if (t === 'Web Map') return { group: 'מפות', kind: 'app', type: 'Web Map' };
    if (t === 'Dashboard') return { group: 'דוחות', kind: 'report', type: 'Dashboard' };
    if (t === 'Web Mapping Application') return { group: 'אפליקציות', kind: 'app', type: 'Web Mapping Application' + (kw.indexOf('instantApp') >= 0 ? ' (Instant App)' : '') };
    if (t === 'Web Experience') return { group: 'אפליקציות', kind: 'app', type: 'Experience Builder' };
    if (t === 'StoryMap') return { group: 'אפליקציות', kind: 'app', type: 'StoryMap' };
    if (t === 'Notebook') return { group: 'לוגיקה ואוטומציה', kind: 'logic', type: 'Notebook' };
    if (/Map Service|Image Service|Vector Tile|Scene Service|WMS|WFS/.test(t)) return { group: 'נתונים', kind: 'ext', type: t };
    return { group: 'אחר', kind: 'ext', type: t };
  }
  const HAS_DATA = /^(Web Map|Dashboard|Web Mapping Application|Web Experience|StoryMap)$/;
  /* קשרים מובנים בין פריטים: origin --rel--> dest. הכיוון בדיאגרמה: מקור הנתונים ← הצרכן */
  const RELS = [['Survey2Service', 'dest'], ['Survey2Data', 'dest'], ['Map2Service', 'dest'], ['Service2Service', 'origin']];

  function label(a, b) {
    const ta = a.type || '', tb = b.type || '';
    if (tb === 'Form') return 'הטופס כותב לשכבה';
    if (tb === 'Feature Service' && ta === 'Feature Service') return 'מקור לתצוגה';
    if (tb === 'Web Map') return 'שכבה במפה';
    if (tb === 'Dashboard') return ta === 'Web Map' ? 'מפה בדשבורד' : 'נתונים לדשבורד';
    if (ta === 'Web Map') return 'מפה באפליקציה';
    return 'מקור ל-' + tb;
  }

  /* ---------- סריקה ---------- */
  async function svcItemId(url, cache, log) {
    const base = String(url).replace(/\/+$/, '').replace(/\/\d+$/, '');
    if (base in cache) return cache[base];
    cache[base] = '';
    try { const j = await jget(base, tok()); cache[base] = String(j.serviceItemId || '').toLowerCase(); }
    catch (e) { log('שירות לא נקרא: ' + base + ' (' + e.message + ')'); }
    return cache[base];
  }
  async function refsOf(portal, it, cache, log) {
    const out = []; // {other, srcIsOther}
    if (HAS_DATA.test(it.type)) {
      let txt = '';
      try { txt = JSON.stringify(await jget(portal + '/sharing/rest/content/items/' + it.id + '/data', tok())); } catch (e) { log(it.title + ': תוכן הפריט לא נקרא (' + e.message + ')'); }
      const ids = {}; (txt.match(ID_RE) || []).forEach((x) => { ids[x.toLowerCase()] = 1; });
      const urls = {}; (txt.match(/https?:\/\/[^"'\\\s]+?\/FeatureServer/gi) || []).forEach((x) => { urls[x] = 1; });
      for (const u of Object.keys(urls)) { const sid = await svcItemId(u, cache, log); if (sid) ids[sid] = 1; }
      delete ids[it.id];
      Object.keys(ids).forEach((x) => out.push({ other: x, src: true }));
    }
    /* forward: הפריט הנוכחי הוא ה-origin והקשור הוא ה-dest. כל השאילתות במקביל */
    const q = []; RELS.forEach(([rel, srcEnd]) => ['forward', 'reverse'].forEach((dir) => q.push(
      jget(portal + '/sharing/rest/content/items/' + it.id + '/relatedItems?relationshipType=' + rel + '&direction=' + dir, tok())
        .then((r) => (r.relatedItems || []).forEach((x) => out.push({ other: String(x.id).toLowerCase(), src: (dir === 'forward' ? 'dest' : 'origin') === srcEnd })), () => {}))));
    await Promise.all(q);
    return out;
  }

  async function seeds(portal, log) {
    const ids = {};
    for (const part of DS.roots.split(/[\s,;]+/).filter(Boolean)) {
      if (/FeatureServer/i.test(part)) { const sid = await svcItemId(part, DS._cache, log); if (sid) ids[sid] = 1; else log('לא זוהה פריט לשירות ' + part); continue; }
      const m = part.match(ID_RE); if (m) ids[m[0].toLowerCase()] = 1; else log('לא זוהה מזהה פריט: ' + part);
    }
    if (DS.q.trim()) {
      const r = await jget(portal + '/sharing/rest/search?q=' + encodeURIComponent(DS.q.trim()) + '&num=100', tok());
      (r.results || []).forEach((x) => { ids[x.id] = 1; }); log('חיפוש: ' + (r.results || []).length + ' פריטים');
    }
    if (DS.folder && DS.sess) {
      const r = await jget(portal + '/sharing/rest/content/users/' + encodeURIComponent(DS.sess.user) + '/' + encodeURIComponent(DS.folder) + '?num=100', tok());
      (r.items || []).forEach((x) => { ids[x.id] = 1; }); log('תיקייה: ' + (r.items || []).length + ' פריטים');
    }
    return Object.keys(ids);
  }

  async function crawl(portal, roots, log) {
    const items = {}, order = [], edges = {}, seen = {}, queue = roots.map((id) => ({ id, d: 0 }));
    while (queue.length && order.length < DS.max) {
      const { id, d } = queue.shift(); if (seen[id]) continue; seen[id] = 1;
      let it; try { it = await jget(portal + '/sharing/rest/content/items/' + id, tok()); } catch (e) { if (d === 0) log('פריט ' + id + ' לא נקרא: ' + e.message + (e.code === 403 || e.code === 498 || e.code === 499 ? ' (נדרשת התחברות)' : '')); continue; }
      if (!it || !it.id) continue;
      it.id = String(it.id).toLowerCase(); items[it.id] = it; order.push(it.id);
      if (d >= DS.depth) continue;
      for (const r of await refsOf(portal, it, DS._cache, log)) {
        const k = r.src ? r.other + '>' + it.id : it.id + '>' + r.other; edges[k] = 1;
        if (!seen[r.other]) queue.push({ id: r.other, d: d + 1 });
      }
    }
    if (queue.some((x) => !seen[x.id])) log('הסריקה נעצרה במגבלת ' + DS.max + ' פריטים. אפשר להגדיל את המגבלה או לצמצם את נקודת ההתחלה.');
    return { items, order, edges: Object.keys(edges).map((k) => k.split('>')).filter((p) => items[p[0]] && items[p[1]] && p[0] !== p[1]) };
  }

  /* ---------- שכבות וטבלאות מהשירות → ישויות ---------- */
  async function readService(it, log) {
    const base = String(it.url || '').replace(/\/+$/, '').replace(/\/\d+$/, '');
    if (!base) return [];
    let root; try { root = await jget(base, tok()); } catch (e) { log(it.title + ': השירות לא נקרא (' + e.message + ')'); return []; }
    const out = [];
    for (const l of (root.layers || []).concat(root.tables || [])) {
      try { out.push(await jget(base + '/' + l.id, tok())); } catch (e) { log(it.title + '/' + l.id + ': לא נקרא (' + e.message + ')'); }
    }
    return out;
  }
  function toSchema(ns, nodeId, it, defs) {
    const ed = (d) => d.editFieldsInfo || {};
    const byId = {}; const names = {};
    defs.forEach((d) => {
      let name = d.name; let n = 2; while (ns.entities.some((e) => e.name === name)) name = d.name + '_' + n++;
      names[d.id] = name;
      const sys = [d.objectIdField, d.globalIdField, ed(d).creationDateField, ed(d).creatorField, ed(d).editDateField, ed(d).editorField].filter(Boolean).map((x) => x.toLowerCase());
      const fields = (d.fields || []).filter((f) => SKIP_T.indexOf(f.type) < 0 && sys.indexOf(f.name.toLowerCase()) < 0 && !/^shape__(length|area)$|^shape_(length|area)$/i.test(f.name)).map((f) => {
        const t = T2S[f.type] || 'TEXT'; let dom = '', note = '';
        if (f.domain && f.domain.codedValues) {
          const vals = f.domain.codedValues.map((v) => ({ code: String(v.code), label: String(v.name), parent: '' }));
          let dn = f.domain.name || (name + '_' + f.name), k = 2;
          const same = (x) => x && JSON.stringify(x.values) === JSON.stringify(vals);
          while (ns.domains[dn] && !same(ns.domains[dn])) dn = (f.domain.name || name + '_' + f.name) + '_' + k++;
          if (!ns.domains[dn]) ns.domains[dn] = { name: dn, desc: f.domain.name || dn, fieldType: t, values: vals };
          dom = dn;
        } else if (f.domain && f.domain.type === 'range') note = 'דומיין טווח באונליין: ' + (f.domain.range || []).join('–') + '. ';
        if (f.nullable === false) note += 'באונליין השדה לא מאפשר ערך ריק. ';
        if (f.editable === false) note += 'באונליין השדה לא ניתן לעריכה. ';
        return { category: 'כללי', name: f.name, alias: f.alias || f.name, type: t, length: t === 'TEXT' ? String(f.length || '') : '', domain: dom, mode: t === 'GUID' ? 'מערכת' : dom ? 'רשימה' : 'ידני', visible: 'תמיד', open: false, note: note.trim() };
      });
      const e = { name, alias: d.name, kind: d.type === 'Table' ? 'table' : GEOM[d.geometryType] || 'point', attachments: !!d.hasAttachments, editorTracking: !!(ed(d).creationDateField || ed(d).editDateField), description: 'יובא מהשירות "' + it.title + '" (שכבה ' + d.id + ') ב-' + today().slice(0, 10) + '.', src: { node: nodeId, layer: d.id }, fields };
      ns.entities.push(e); byId[d.id] = d;
    });
    /* קשרים: מהצד של ה-origin, המפתח של היעד נלקח מהגדרת הקשר בשכבת היעד */
    defs.forEach((d) => (d.relationships || []).forEach((r) => {
      if (r.role !== 'esriRelRoleOrigin' || !byId[r.relatedTableId]) return;
      const back = (byId[r.relatedTableId].relationships || []).find((x) => x.id === r.id) || {};
      ns.relationships.push({ name: names[d.id] + '_' + names[r.relatedTableId], origin: names[d.id], destination: names[r.relatedTableId], originKey: r.keyField || 'GlobalID', destKey: back.keyField || 'ParentGlobalID', type: r.composite ? 'COMPOSITE' : 'SIMPLE', forward: r.name || '', backward: back.name || '' });
    }));
  }

  /* ---------- בניית הפרויקט ---------- */
  async function build(portal, C, log, ns, taken, withEnts) {
    const P = { Form: 'form', 'Web Map': 'map', Dashboard: 'dash', 'Web Mapping Application': 'app', 'Web Experience': 'exb', StoryMap: 'story', Notebook: 'nb' };
    const nid = {}, cnt = {}, used = {};
    ((ns.diagrams || {}).agolItems || []).forEach((n) => { used[n.id] = 1; });
    const nodes = [];
    for (const id of C.order) {
      const it = C.items[id]; if (taken[id]) { nid[id] = taken[id]; continue; }
      const c = cls(it), p = c.svc || c.view ? (c.view ? 'view' : 'svc') : (P[it.type] || 'item');
      let k; do { cnt[p] = (cnt[p] || 0) + 1; k = p + cnt[p]; } while (used[k]); used[k] = 1; nid[id] = k;
      nodes.push({ id: k, group: c.group, kind: c.kind, type: c.type, title: it.title, role: String(it.snippet || '').slice(0, 300), status: 'exists', links: [], _c: c, _it: it });
    }
    C.edges.forEach(([a, b]) => { const n = nodes.find((x) => x.id === nid[a]); if (n && !n.links.some((l) => l.to === nid[b])) n.links.push({ to: nid[b], label: label(C.items[a], C.items[b]), status: 'exists' }); });
    ns.itemLinks = ns.itemLinks || {}; ns.itemEdges = ns.itemEdges || {};
    for (const n of nodes) {
      const it = n._it;
      ns.itemLinks[n.id] = { itemId: it.id, portal, title: it.title, type: it.type, owner: it.owner, modified: it.modified ? new Date(it.modified).toISOString().slice(0, 10) : '', url: it.url || '', state: 'exists', checked: today() };
      n.links.forEach((l) => { ns.itemEdges[n.id + '>' + l.to] = { ok: true, at: today() }; });
      /* השכבות והשדות נקראים מהשירות המקורי; מתצוגה רק כשהשירות המקורי שלה לא נבחר */
      const srcPicked = n._c.view && C.edges.some(([a, b]) => b === it.id && C.items[a].type === 'Feature Service' && cls(C.items[a]).svc);
      if (withEnts && (n._c.svc || (n._c.view && !srcPicked))) toSchema(ns, n.id, it, await readService(it, log));
      delete n._c; delete n._it;
    }
    /* קשרים מפריט קיים בפרויקט לפריט חדש */
    C.edges.forEach(([a, b]) => { if (taken[a] && !taken[b]) log('קשר מהפריט הקיים ' + taken[a] + ' ל-' + nid[b] + ' לא נוסף לדיאגרמה (יש להוסיף ידנית)'); });
    ns.diagrams = ns.diagrams || {}; ns.diagrams.agolItems = ((ns.diagrams.agolItems) || []).concat(nodes);
    ns.itemSync = { last: today(), user: DS.sess ? DS.sess.user : '' };
    return nodes;
  }

  /* שלב 1: סריקה. התוצאה נשמרת ב-DS.scan ומוצגת כרשימת בחירה; שום דבר לא נכתב לפרויקט */
  async function scan() {
    const log = (m) => DS.log.push(m);
    DS.err = ''; DS.log = []; DS.res = null; DS.scan = null; DS.busy = true; DS._cache = {}; redraw();
    try {
      const portal = portalOf();
      const roots = await seeds(portal, log);
      if (!roots.length) throw new Error('לא הוגדרה נקודת התחלה: קישור או מזהה פריט, שאילתת חיפוש או תיקייה.');
      const C = await crawl(portal, roots, log);
      if (!C.order.length) throw new Error('לא נקרא אף פריט. אם הפריטים פרטיים: יש להתחבר.');
      /* ברירת מחדל: סריקה קטנה נבחרת כולה; סריקה גדולה מתחילה מנקודות ההתחלה בלבד */
      const sel = {}; C.order.forEach((id) => { if (C.order.length <= 25 || roots.indexOf(id) >= 0) sel[id] = 1; });
      DS.scan = { portal, roots, C, sel, filter: '' };
    } catch (e) { DS.err = e.message || String(e); }
    DS.busy = false; redraw();
  }
  /* הפריטים שמחוברים ישירות לפריט (מקורות וצרכנים) */
  const neighbors = (C, id) => C.edges.filter((p) => p[0] === id || p[1] === id).map((p) => (p[0] === id ? p[1] : p[0]));

  /* שלב 2: יצירת פרויקט או הוספה לפרויקט הנוכחי, רק מהפריטים שנבחרו */
  async function run(mode) {
    const D = D0(), log = (m) => DS.log.push(m), sc = DS.scan;
    if (!sc) return;
    DS.err = ''; DS.res = null; DS.busy = true; redraw();
    try {
      const portal = sc.portal, all = sc.C, keep = (id) => !!sc.sel[id];
      const C = { items: {}, order: all.order.filter(keep), edges: all.edges.filter((p) => keep(p[0]) && keep(p[1])) };
      C.order.forEach((id) => { C.items[id] = all.items[id]; });
      if (!C.order.length) throw new Error('לא נבחר אף פריט.');
      const roots = sc.roots.filter(keep);
      const at = today(), imp = { portal, at, user: DS.sess ? DS.sess.user : '', roots: DS.roots.trim(), q: DS.q.trim(), folder: DS.folder, depth: DS.depth };
      if (mode === 'merge') {
        const S = D.S, taken = {}; Object.keys(S.itemLinks || {}).forEach((k) => { taken[S.itemLinks[k].itemId] = k; });
        const nodes = await build(portal, C, log, S, taken, false);
        S.meta.imports = (S.meta.imports || []).concat([imp]);
        D.save(); DS.res = { mode, items: C.order.length, added: nodes.length, edges: C.edges.length, skipped: C.order.length - nodes.length };
      } else {
        const key = DS.key.trim().toLowerCase(), org = DS.org.trim().toLowerCase();
        if (!/^[a-z][a-z0-9_-]*$/.test(key)) throw new Error('מפתח פרויקט לא תקין (אותיות לטיניות קטנות, ספרות, קו תחתון או מקף).');
        if (org && !/^[a-z][a-z0-9_-]*$/.test(org)) throw new Error('שם ארגון לא תקין.');
        const first = C.items[roots[0] || C.order[0]];
        const ns = { meta: { key, project: key, org, title: DS.title.trim() || first.title, version: 1, spatialRef: 2039, spatialRefName: 'Israel TM Grid (ITM)', source: 'ייבוא מ-AGOL ' + at.slice(0, 10), rules: { minTextLength: 255, domainCodeEqualsLabel: true }, imports: [imp] }, domains: {}, entities: [], relationships: [], decisions: [], questions: [], changes: [] };
        await build(portal, C, log, ns, {}, true);
        const sr = Object.values(C.items).filter((x) => x.type === 'Feature Service').map((x) => x.spatialReference).filter(Boolean)[0];
        if (sr && /^\d+$/.test(String(sr)) && +sr !== 2039) { ns.meta.spatialRef = +sr; ns.meta.spatialRefName = ''; }
        D.addProject(org ? org + '/' + key : key, ns);
        DS.res = { mode, items: C.order.length, added: C.order.length, edges: C.edges.length, ents: ns.entities.length, doms: Object.keys(ns.domains).length, id: org ? org + '/' + key : key };
      }
    } catch (e) { DS.err = e.message || String(e); }
    DS.busy = false; redraw();
  }

  /* ---------- שלב הבחירה ---------- */
  const nSel = () => (DS.scan ? DS.scan.C.order.filter((id) => DS.scan.sel[id]).length : 0);
  function shown() {
    const sc = DS.scan, f = sc.filter.trim().toLowerCase();
    return sc.C.order.filter((id) => { const it = sc.C.items[id]; return !f || (it.title + ' ' + it.type + ' ' + cls(it).type + ' ' + (it.owner || '')).toLowerCase().indexOf(f) >= 0; });
  }
  function pick(S) {
    const sc = DS.scan; if (!sc) return '';
    const C = sc.C, b = DS.busy ? 'disabled' : '', ids = shown(), groups = [];
    ids.forEach((id) => { const g = cls(C.items[id]).group; if (groups.indexOf(g) < 0) groups.push(g); });
    const rows = groups.map((g) => `<tr class="g"><td colspan="5">${esc(g)}</td></tr>` + ids.filter((id) => cls(C.items[id]).group === g).map((id) => {
      const it = C.items[id], nb = neighbors(C, id);
      return `<tr><td style="width:28px"><input type="checkbox" ${sc.sel[id] ? 'checked' : ''} onchange="Discover.tick('${id}',this.checked)"></td>
        <td>${sc.roots.indexOf(id) >= 0 ? '★ ' : ''}<b>${esc(it.title)}</b><br><small style="color:#64748b">${esc(cls(it).type)}${it.owner ? ' · ' + esc(it.owner) : ''}</small></td>
        <td style="width:90px;font-size:12px;color:#475569">${nb.length} קשרים</td>
        <td style="width:110px">${nb.length ? `<button class="mini" onclick="Discover.near('${id}')" title="מסמן את הפריט ואת הפריטים שמחוברים אליו ישירות: השירות שהשכבה מגיעה ממנו, התצוגה, הטופס והמפה">+ עם הקשורים</button>` : ''}</td>
        <td style="width:70px"><a href="${esc(sc.portal + '/home/item.html?id=' + id)}" target="_blank" rel="noopener">פריט ↗</a></td></tr>`;
    }).join('')).join('');
    return `<div class="card" style="margin-top:10px"><b>2. בחירת הרכיבים</b> · נמצאו ${C.order.length} פריטים ו-${C.edges.length} קשרים · נבחרו <b id="ds-cnt">${nSel()}</b>
      <p style="font-size:13px;color:#475569;margin:6px 0">★ = נקודת התחלה. ${C.order.length > 25 ? 'הסריקה גדולה, ולכן מסומנות מראש רק נקודות ההתחלה. ' : ''}כדי להתמקד בשכבה אחת: מחפשים אותה בסינון, מסמנים אותה ולוחצים "+ עם הקשורים" כדי לצרף את התצוגה, הטופס והמפה שלה. שכבות ושדות נקראים רק מהשירותים שנבחרו.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><input type="text" placeholder="סינון לפי שם או סוג" style="width:220px" value="${esc(sc.filter)}" onchange="Discover.filter(this.value)"><button class="mini" onclick="Discover.all(true)">סמן את המוצגים</button><button class="mini" onclick="Discover.all(false)">נקה את המוצגים</button></div>
      <div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="agt"><tbody>${rows || '<tr><td style="color:#64748b">אין פריטים בסינון הזה.</td></tr>'}</tbody></table></div>
      <div style="margin-top:8px">${DS.mode === 'merge'
        ? `<button class="primary" ${b} onclick="Discover.run('merge')" title="מוסיף לדיאגרמה רק פריטים שעוד לא מקושרים. לא משנה ישויות">${DS.busy ? 'עובד…' : '3. הוסף את הנבחרים לפרויקט ' + esc((S.meta && S.meta.title) || '')}</button>`
        : `<button class="primary" ${b} onclick="Discover.run('new')">${DS.busy ? 'עובד…' : '3. צור פרויקט חדש מהנבחרים'}</button>`}</div></div>`;
  }
  const keepY = (fn) => { const y = window.scrollY; fn(); redraw(); window.scrollTo(0, y); };

  /* ---------- דף ---------- */
  function page(S) {
    const inp = 'style="width:100%;box-sizing:border-box;margin:2px 0 6px"', b = DS.busy ? 'disabled' : '';
    const login = DS.sess ? `<p style="font-size:13px;color:#166534">מחובר כ-<b dir="ltr">${esc(DS.sess.user)}</b>${DS.sess.org ? ' · ' + esc(DS.sess.org) : ''} · <a href="#" onclick="Discover.logout();return false">התנתק</a></p>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0 10px"><div><label>פורטל</label><input type="text" dir="ltr" ${inp} id="ds-p" value="${esc(DS.portal || lsPortal() || 'https://www.arcgis.com')}" onchange="Discover.DS.portal=this.value"></div><div><label>שם משתמש</label><input type="text" dir="ltr" ${inp} id="ds-u"></div><div><label>סיסמה</label><input type="password" ${inp} id="ds-w" autocomplete="off"></div></div>
        <button ${b} onclick="Discover.login()">התחבר</button> <span class="hint">בלי התחברות נסרקים רק פריטים ציבוריים.</span>`;
    const fold = DS.sess && DS.folders ? `<label>תיקייה בתוכן שלי</label><select ${inp} onchange="Discover.DS.folder=this.value"><option value="">—</option>${DS.folders.map((f) => `<option value="${esc(f.id)}" ${f.id === DS.folder ? 'selected' : ''}>${esc(f.title)}</option>`).join('')}</select>` : '';
    const r = DS.res, imps = (S.meta && S.meta.imports) || [];
    const res = r ? `<div class="card" style="margin-top:10px;background:#F0FDF4">${r.mode === 'merge'
      ? `<b>נוספו ${r.added} פריטים לפרויקט הנוכחי</b> (נמצאו ${r.items}, ${r.skipped} כבר היו מקושרים, ${r.edges} קשרים). הדיאגרמה בלשונית <a href="#" onclick="A.go('dg-comp',0);return false">רכיבי הפתרון</a>.`
      : `<b>נוצר הפרויקט ${esc(r.id)}</b>: ${r.items} פריטים, ${r.edges} קשרים, ${r.ents} שכבות וטבלאות, ${r.doms} דומיינים. כרגע זו טיוטה בדפדפן: "שמור לתיקייה" ואז Commit ב-GitHub Desktop. הדיאגרמה בלשונית <a href="#" onclick="A.go('dg-comp',0);return false">רכיבי הפתרון</a>.`}</div>` : '';
    return `<div class="card"><b>תיעוד פתרון שכבר קיים באונליין.</b> הכלי מתחיל מנקודת התחלה, עוקב אחרי ההפניות בין הפריטים (דשבורד → מפה → שכבה, טופס → שכבה, תצוגה → שכבת מקור, אפליקציה → מפה) ובונה מהם פרויקט: דיאגרמת פריטים וקשרים עם קישור לכל פריט, ושכבות, טבלאות, שדות, דומיינים וקשרים מהשירותים המתארחים. אחר כך מתעדים שינויים ותקלות לפי רכיב בלשונית "בקשות שינוי". קריאה בלבד: הכלי לא כותב לארגון.
      <p style="font-size:13px;color:#475569">נקודת ההתחלה הטובה ביותר: האפליקציה או הדשבורד שהמשתמשים פותחים, או תיקייה שמרכזת את הפתרון. ממנה נמצאים המפות, השכבות והטפסים. מה שלא מופנה מאף פריט (למשל Notebook, Webhook או סקריפט חיצוני) לא יימצא, ויש להוסיף אותו ידנית או בחיפוש.</p></div>
      <div class="card" style="margin-top:10px">${login}</div>
      <div class="card" style="margin-top:10px"><b>נקודת התחלה</b> (אפשר לשלב)
      <label>קישורים או מזהי פריטים (אפשר כמה, בשורות נפרדות; גם כתובת FeatureServer)</label><textarea dir="ltr" rows="3" ${inp} onchange="Discover.DS.roots=this.value">${esc(DS.roots)}</textarea>
      <label>שאילתת חיפוש AGOL (למשל tags:signage או group:&lt;מזהה&gt;)</label><input type="text" dir="ltr" ${inp} value="${esc(DS.q)}" onchange="Discover.DS.q=this.value">
      ${fold}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 10px"><div><label>עומק מעקב (צעדים)</label><input type="number" min="0" max="6" ${inp} value="${DS.depth}" onchange="Discover.DS.depth=+this.value||0"></div><div><label>מגבלת פריטים</label><input type="number" min="1" max="300" ${inp} value="${DS.max}" onchange="Discover.DS.max=+this.value||80"></div></div></div>
      <div class="card" style="margin-top:10px">${DS.mode === 'merge'
        ? `<b>יעד: הוספת פריטים לפרויקט הפתוח, ${esc((S.meta && S.meta.title) || '')}</b> <a href="#" onclick="Discover.DS.mode='new';A.refresh();return false" style="font-size:13px">(במקום זה: פרויקט חדש)</a>`
        : `<b>יעד: פרויקט חדש</b>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0 10px"><div><label>מפתח פרויקט חדש (לטינית, למשל fire_scars)</label><input type="text" dir="ltr" ${inp} value="${esc(DS.key)}" onchange="Discover.DS.key=this.value"></div><div><label>תיקיית ארגון (למשל kkl)</label><input type="text" dir="ltr" ${inp} value="${esc(DS.org || (S.meta && S.meta.org) || '')}" onchange="Discover.DS.org=this.value"></div><div><label>כותרת (ריק = שם פריט השורש)</label><input type="text" ${inp} value="${esc(DS.title)}" onchange="Discover.DS.title=this.value"></div></div>`}
      <button class="primary" ${b} onclick="Discover.scan()">${DS.busy && !DS.scan ? 'סורק…' : '1. סרוק'}</button> <span class="hint">אחרי הסריקה בוחרים אילו פריטים להכניס לפרויקט.</span>
      ${DS.err ? `<div class="iss error" style="margin-top:8px"><b>שגיאה</b><span>${esc(DS.err)}</span></div>` : ''}
      ${DS.log.length ? `<details style="margin-top:8px"><summary class="hint" style="cursor:pointer">יומן סריקה (${DS.log.length})</summary><p class="hint">${DS.log.map(esc).join('<br>')}</p></details>` : ''}</div>${pick(S)}${res}
      ${imps.length ? `<p class="hint">ייבואים קודמים לפרויקט הזה: ${imps.map((x) => esc(x.at + ' · ' + (x.roots || x.q || x.folder || '') )).join(' | ')}</p>` : ''}`;
  }

  window.Discover = {
    DS, cls, label, page, run, scan,
    tick(id, on) { if (on) DS.scan.sel[id] = 1; else delete DS.scan.sel[id]; const c = document.getElementById('ds-cnt'); if (c) c.textContent = nSel(); },
    near(id) { keepY(() => { DS.scan.sel[id] = 1; neighbors(DS.scan.C, id).forEach((x) => { DS.scan.sel[x] = 1; }); }); },
    filter(v) { keepY(() => { DS.scan.filter = v; }); },
    all(on) { keepY(() => shown().forEach((id) => { if (on) DS.scan.sel[id] = 1; else delete DS.scan.sel[id]; })); },
    login() {
      const u = document.getElementById('ds-u').value.trim(), w = document.getElementById('ds-w').value, p = document.getElementById('ds-p').value;
      DS.err = ''; DS.busy = true; redraw();
      (async () => {
        try {
          if (!u || !w) throw new Error('יש להזין שם משתמש וסיסמה.');
          DS.sess = await window.AgolPub.login(p, u, w); try { localStorage.setItem('agol-pub-portal', DS.sess.portal); } catch (e) { /* */ }
          try { const r = await jget(DS.sess.portal + '/sharing/rest/content/users/' + encodeURIComponent(DS.sess.user) + '?num=1', DS.sess.token); DS.folders = r.folders || []; } catch (e) { DS.folders = []; }
        } catch (e) { DS.err = e.message + ' (בארגון עם כניסה ארגונית/SAML כניסה בשם משתמש וסיסמה לא תעבוד)'; }
        DS.busy = false; redraw();
      })();
    },
    logout() { DS.sess = null; DS.folders = null; DS.folder = ''; redraw(); }
  };
})();
