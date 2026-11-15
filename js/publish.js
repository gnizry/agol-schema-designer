/* פרסום סכמה ל-ArcGIS Online: התחברות בחלון (שם משתמש וסיסמה, בלי Client ID), תצוגה מקדימה ויצירת Hosted Feature Layer.
   יוצר פריט חדש בלבד: לא מוחק, לא מדרס ולא משנה פריטים קיימים. הסיסמה והטוקן נשמרים בזיכרון הדף בלבד. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const SR = { wkid: 2039, latestWkid: 2039 }, EXT = { xmin: 100000, ymin: 370000, xmax: 300000, ymax: 800000, spatialReference: SR };
  const FT = { TEXT: 'esriFieldTypeString', SHORT: 'esriFieldTypeSmallInteger', LONG: 'esriFieldTypeInteger', FLOAT: 'esriFieldTypeSingle', DOUBLE: 'esriFieldTypeDouble', DATE: 'esriFieldTypeDate', GUID: 'esriFieldTypeGUID' };
  const SYSTEM = ['OBJECTID', 'GLOBALID', 'CREATOR', 'CREATIONDATE', 'EDITOR', 'EDITDATE'];

  /* ---------- בניית ההגדרה (טהור, ללא רשת) ---------- */
  function domainOf(S, f) {
    const d = f.domain && S.domains && S.domains[f.domain]; if (!d) return null;
    const num = d.fieldType && d.fieldType !== 'TEXT';
    return { type: 'codedValue', name: d.name || f.domain, codedValues: (d.values || []).map((v) => ({ name: String(v.label == null ? v.code : v.label), code: num ? Number(v.code) : String(v.code) })) };
  }
  function fieldDef(S, f) {
    const t = FT[f.type] || FT.TEXT, o = { name: f.name, type: t, alias: f.alias || f.name, sqlType: 'sqlTypeOther', nullable: true, editable: true, domain: domainOf(S, f), defaultValue: null };
    if (t === FT.TEXT) o.length = Math.max(Number(f.length) || 255, S.meta && S.meta.rules && S.meta.rules.minTextLength || 0, 255);
    else if (t === FT.DATE) o.length = 8; else if (t === FT.GUID) o.length = 38;
    return o;
  }
  function buildDefinition(S, opt) {
    opt = opt || {};
    const name = opt.name || String(S.meta.key).replace(/[^A-Za-z0-9_]/g, '_'), title = opt.title || S.meta.title || name;
    const ents = S.entities, layersE = ents.filter((e) => e.kind === 'point' || e.kind === 'line' || e.kind === 'polygon'), tablesE = ents.filter((e) => !(e.kind === 'point' || e.kind === 'line' || e.kind === 'polygon'));
    const ordered = layersE.concat(tablesE), id = {}; ordered.forEach((e, i) => { id[e.name] = i; });
    const rels = (S.relationships || []).filter((r) => id[r.origin] != null && id[r.destination] != null);
    const warn = [];
    const build = (e) => {
      const isLayer = layersE.includes(e);
      const fields = [
        { name: 'OBJECTID', type: 'esriFieldTypeOID', alias: 'OBJECTID', sqlType: 'sqlTypeOther', nullable: false, editable: false, domain: null, defaultValue: null },
        { name: 'GlobalID', type: 'esriFieldTypeGlobalID', alias: 'GlobalID', sqlType: 'sqlTypeOther', length: 38, nullable: false, editable: false, domain: null, defaultValue: null }
      ];
      const seen = new Set(['OBJECTID', 'GLOBALID']);
      e.fields.forEach((f) => {
        if (SYSTEM.includes(String(f.name).toUpperCase())) return;
        if (seen.has(f.name.toUpperCase())) { warn.push(e.name + ': שדה כפול ' + f.name); return; }
        seen.add(f.name.toUpperCase()); fields.push(fieldDef(S, f));
      });
      const L = { id: id[e.name], name: e.name, type: isLayer ? 'Feature Layer' : 'Table', description: e.description || '', defaultVisibility: true, hasAttachments: !!e.attachments, objectIdField: 'OBJECTID', globalIdField: 'GlobalID', displayField: (e.fields.find((f) => f.type === 'TEXT') || {}).name || 'OBJECTID', capabilities: 'Query,Create,Update,Delete,Editing,Sync', fields, types: [], templates: [], relationships: [], supportsApplyEditsWithGlobalIds: true, htmlPopupType: 'esriServerHTMLPopupTypeNone' };
      if (e.editorTracking) {
        [['Creator', 'esriFieldTypeString', 'Creator', 128], ['CreationDate', 'esriFieldTypeDate', 'CreationDate', 8], ['Editor', 'esriFieldTypeString', 'Editor', 128], ['EditDate', 'esriFieldTypeDate', 'EditDate', 8]].forEach(([n, t, a, len]) => fields.push({ name: n, type: t, alias: a, sqlType: 'sqlTypeOther', length: len, nullable: true, editable: false, domain: null, defaultValue: null }));
        L.editFieldsInfo = { creationDateField: 'CreationDate', creatorField: 'Creator', editDateField: 'EditDate', editorField: 'Editor' };
      }
      if (isLayer) Object.assign(L, { geometryType: e.kind === 'point' ? 'esriGeometryPoint' : e.kind === 'line' ? 'esriGeometryPolyline' : 'esriGeometryPolygon', hasZ: false, hasM: false, allowGeometryUpdates: true, extent: EXT,
        drawingInfo: { renderer: { type: 'simple', symbol: { type: 'esriSMS', style: 'esriSMSCircle', color: [30, 58, 138, 255], size: 8, outline: { color: [255, 255, 255, 255], width: 1 } } } } });
      return L;
    };
    const built = {}; ordered.forEach((e) => { built[e.name] = build(e); });
    rels.forEach((r, i) => {
      built[r.origin].relationships.push({ id: i, name: r.forward || r.name, relatedTableId: id[r.destination], cardinality: 'esriRelCardinalityOneToMany', role: 'esriRelRoleOrigin', keyField: r.originKey || 'GlobalID', composite: r.type === 'COMPOSITE', relationshipTableId: -1 });
      built[r.destination].relationships.push({ id: i, name: r.backward || r.name, relatedTableId: id[r.origin], cardinality: 'esriRelCardinalityOneToMany', role: 'esriRelRoleDestination', keyField: r.destKey || 'ParentGlobalID', composite: r.type === 'COMPOSITE', relationshipTableId: -1 });
      if (!built[r.destination].fields.some((f) => f.name === (r.destKey || 'ParentGlobalID'))) warn.push(r.destination + ': חסר שדה מפתח זר ' + (r.destKey || 'ParentGlobalID'));
    });
    const createParams = { name, serviceDescription: title, hasStaticData: false, maxRecordCount: 2000, supportedQueryFormats: 'JSON', capabilities: 'Query,Create,Update,Delete,Editing,Sync', allowGeometryUpdates: true, spatialReference: SR, initialExtent: EXT, editorTrackingInfo: { enableEditorTracking: true, enableOwnershipAccessControl: false, allowOthersToUpdate: true, allowOthersToDelete: true, allowOthersToQuery: true } };
    return { name, title, createParams, addToDefinition: { layers: layersE.map((e) => built[e.name]), tables: tablesE.map((e) => built[e.name]) }, warn,
      summary: ordered.map((e) => ({ id: id[e.name], name: e.name, kind: layersE.includes(e) ? 'שכבה' : 'טבלה', fields: built[e.name].fields.length })) };
  }

  /* ---------- AGOL ---------- */
  async function call(url, params) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(Object.assign({ f: 'json' }, params)) });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' מ-' + url.replace(/\?.*/, ''));
    const j = await r.json();
    if (j.error) throw new Error((j.error.message || 'שגיאה') + (j.error.details && j.error.details.length ? ': ' + j.error.details.join('; ') : '') + (j.error.code ? ' (' + j.error.code + ')' : ''));
    return j;
  }
  const norm = (u) => String(u || '').trim().replace(/\/+$/, '').replace(/\/(sharing|home).*$/, '') || 'https://www.arcgis.com';
  async function login(portal, username, password) {
    portal = norm(portal);
    const ref = /^https?:/.test(location.origin) ? { client: 'referer', referer: location.origin } : { client: 'requestip' };
    const t = await call(portal + '/sharing/rest/generateToken', Object.assign({ username, password, expiration: 60 }, ref));
    const me = await call(portal + '/sharing/rest/community/self', { token: t.token });
    const org = await call(portal + '/sharing/rest/portals/self', { token: t.token });
    return { portal, token: t.token, user: me.username || username, org: org.name || '', orgUrl: org.urlKey ? org.urlKey + '.' + (org.customBaseUrl || 'maps.arcgis.com') : '' };
  }
  async function publish(sess, def, log) {
    const av = await call(sess.portal + '/sharing/rest/portals/self/isServiceNameAvailable', { token: sess.token, name: def.name, type: 'Feature Service' });
    if (av.available === false) throw new Error('השם "' + def.name + '" תפוס בארגון. בחר שם אחר.');
    log('השם פנוי');
    const c = await call(sess.portal + '/sharing/rest/content/users/' + encodeURIComponent(sess.user) + '/createService', { token: sess.token, outputType: 'featureService', createParameters: JSON.stringify(def.createParams) });
    if (!c.success && !c.serviceurl) throw new Error('יצירת השירות נכשלה');
    log('נוצר שירות ריק (פריט ' + c.itemId + ')');
    const admin = c.serviceurl.replace('/rest/services/', '/rest/admin/services/');
    try {
      const r = await call(admin + '/addToDefinition', { token: sess.token, addToDefinition: JSON.stringify(def.addToDefinition) });
      if (r.success === false) throw new Error('addToDefinition החזיר כישלון');
    } catch (e) { e.itemId = c.itemId; e.partial = true; throw e; }
    log('נוספו ' + def.addToDefinition.layers.length + ' שכבות ו-' + def.addToDefinition.tables.length + ' טבלאות');
    return { itemId: c.itemId, url: c.serviceurl, itemPage: sess.portal + '/home/item.html?id=' + c.itemId };
  }

  /* ---------- חלון ---------- */
  function open() {
    const D = window.__designer; if (!D || !D.S) return;
    const S = D.S; let sess = null;
    const ov = document.createElement('div'); ov.id = 'agol-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML = '<div dir="rtl" style="background:#fff;border-radius:16px;max-width:720px;width:100%;max-height:90vh;overflow:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.4)"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">פרסום ל-ArcGIS Online</h3><button id="ag-x">✕</button></div><div id="ag-body"></div></div>';
    document.body.appendChild(ov);
    const body = ov.querySelector('#ag-body'), close = () => { sess = null; ov.remove(); };
    ov.querySelector('#ag-x').onclick = close;
    const inp = 'style="width:100%;box-sizing:border-box;margin:2px 0 8px;padding:8px;border:1px solid #CBD5E1;border-radius:8px"';
    const loginView = () => {
      body.innerHTML = '<p style="color:#475569;font-size:13px;line-height:1.6">התחברות עם שם משתמש וסיסמה של הארגון שבו ייווצר השירות. הפרטים לא נשמרים ולא נשלחים לשום מקום חוץ מ-ArcGIS. לא נתמכים חשבונות עם MFA או SSO.</p><label>כתובת הארגון</label><input id="ag-p" ' + inp + ' value="' + esc(localStorage.getItem('agol-pub-portal') || 'https://www.arcgis.com') + '" dir="ltr"><label>שם משתמש</label><input id="ag-u" ' + inp + ' dir="ltr"><label>סיסמה</label><input id="ag-w" type="password" ' + inp + ' dir="ltr"><div id="ag-st" style="color:#B91C1C;min-height:20px;font-size:13px"></div><button id="ag-go" class="primary">התחבר</button>';
      const go = async () => {
        const st = $('ag-st'); st.style.color = '#475569'; st.textContent = 'מתחבר…';
        try { sess = await login($('ag-p').value, $('ag-u').value.trim(), $('ag-w').value); try { localStorage.setItem('agol-pub-portal', sess.portal); } catch (e) { /* */ } $('ag-w').value = ''; prepView(); }
        catch (e) { st.style.color = '#B91C1C'; st.textContent = 'ההתחברות נכשלה: ' + e.message; }
      };
      $('ag-go').onclick = go; $('ag-w').onkeydown = (e) => { if (e.key === 'Enter') go(); };
    };
    const prepView = () => {
      const def0 = buildDefinition(S, {});
      body.innerHTML = '<p style="color:#166534;font-size:13px">מחובר כ-<b dir="ltr">' + esc(sess.user) + '</b>' + (sess.org ? ' בארגון <b>' + esc(sess.org) + '</b>' : '') + '</p><label>שם השירות (אנגלית, ספרות וקו תחתון)</label><input id="ag-n" ' + inp + ' dir="ltr" value="' + esc(def0.name) + '"><label>כותרת הפריט</label><input id="ag-t" ' + inp + ' value="' + esc(def0.title) + '"><div id="ag-sum"></div><div id="ag-log" style="font-size:13px;line-height:1.7;margin:8px 0"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="ag-pv">תצוגה מקדימה (JSON)</button><button id="ag-mk" class="primary">צור שירות בארגון</button></div><div id="ag-out"></div>';
      const cur = () => buildDefinition(S, { name: $('ag-n').value.trim(), title: $('ag-t').value.trim() });
      const sum = () => { const d = cur(); $('ag-sum').innerHTML = '<table style="width:100%;font-size:12px;border-collapse:collapse;margin:6px 0">' + d.summary.map((r) => '<tr><td style="border:1px solid #E2E8F0;padding:3px 6px">' + r.id + '</td><td style="border:1px solid #E2E8F0;padding:3px 6px" dir="ltr">' + esc(r.name) + '</td><td style="border:1px solid #E2E8F0;padding:3px 6px">' + r.kind + '</td><td style="border:1px solid #E2E8F0;padding:3px 6px">' + r.fields + ' שדות</td></tr>').join('') + '</table>' + (d.warn.length ? '<div style="color:#B45309;font-size:12px">' + d.warn.map(esc).join('<br>') + '</div>' : ''); };
      sum(); $('ag-n').oninput = sum;
      $('ag-pv').onclick = () => { const d = cur(); $('ag-out').innerHTML = '<textarea readonly dir="ltr" style="width:100%;height:240px;margin-top:8px;font:11px monospace">' + esc(JSON.stringify({ createService: d.createParams, addToDefinition: d.addToDefinition }, null, 2)) + '</textarea>'; };
      $('ag-mk').onclick = async () => {
        const d = cur(); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(d.name)) { $('ag-log').innerHTML = '<span style="color:#B91C1C">שם השירות חייב להתחיל באות ולהכיל אנגלית, ספרות וקו תחתון בלבד.</span>'; return; }
        if (!confirm('ייווצר פריט חדש "' + d.name + '" בארגון ' + (sess.org || sess.portal) + '. להמשיך?')) return;
        $('ag-mk').disabled = true; const lg = $('ag-log'); lg.innerHTML = '';
        const log = (t) => { lg.insertAdjacentHTML('beforeend', '✓ ' + esc(t) + '<br>'); };
        try { const r = await publish(sess, d, log); lg.insertAdjacentHTML('beforeend', '<b style="color:#166534">הסתיים בהצלחה.</b><br><a target="_blank" rel="noopener" href="' + esc(r.itemPage) + '">פתח את הפריט ב-AGOL</a> · <span dir="ltr">' + esc(r.url) + '</span>'); }
        catch (e) { lg.insertAdjacentHTML('beforeend', '<span style="color:#B91C1C">נכשל: ' + esc(e.message) + '</span>' + (e.partial ? '<br>נוצר שירות ריק (פריט ' + esc(e.itemId) + ') שלא הושלם. אפשר למחוק אותו ב-AGOL ולנסות שוב.' : '')); $('ag-mk').disabled = false; }
      };
    };
    loginView();
  }
  window.AgolPub = { buildDefinition, login, publish, open };
  const b = $('b-agol'); if (b) b.onclick = () => { const p = $('menu-pop'); if (p) p.hidden = true; open(); };
})();
