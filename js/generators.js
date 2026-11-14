/* מחוללים: ולידציה, סקריפט ArcPy, מילון נתונים (MD / CSV).
   פועל בדפדפן (window.Gen) וב-Node (require) — כך אפשר לייצר קבצים גם משורת פקודה. */
(function (root) {
  'use strict';

  const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
  const RESERVED = ['OBJECTID', 'GLOBALID', 'SHAPE'];
  const TRACKING = ['CREATOR', 'CREATIONDATE', 'EDITOR', 'EDITDATE'];
  const NUMERIC = ['SHORT', 'LONG'];

  const py = (s) => JSON.stringify(s == null ? '' : String(s));
  const isNum = (t) => NUMERIC.indexOf(t) >= 0;

  function domainCode(dom, code) {
    return isNum(dom.fieldType) ? Number(code) : String(code);
  }

  /* ---------- ולידציה ---------- */
  function validate(S) {
    const issues = []; // {level:'error'|'warn', where, msg}
    const add = (level, where, msg) => issues.push({ level, where, msg });
    const entNames = {};

    S.entities.forEach((e) => {
      if (!NAME_RE.test(e.name || '')) add('error', e.name, 'שם ישות לא תקין (אותיות לטיניות/ספרות/קו תחתון, מתחיל באות)');
      if (entNames[e.name]) add('error', e.name, 'שם ישות כפול');
      entNames[e.name] = e;
      const seen = {};
      e.fields.forEach((f) => {
        const where = e.name + '.' + f.name;
        if (!NAME_RE.test(f.name || '')) add('error', where, 'שם שדה לא תקין');
        const up = (f.name || '').toUpperCase();
        if (seen[up]) add('error', where, 'שם שדה כפול');
        seen[up] = true;
        if (RESERVED.indexOf(up) >= 0) add('error', where, 'שם שמור של המערכת');
        if (e.editorTracking && TRACKING.indexOf(up) >= 0) add('error', where, 'שם מתנגש עם שדות Editor Tracking (נוצרים אוטומטית)');
        if (f.type === 'TEXT' && !(Number(f.length) > 0)) add('error', where, 'שדה טקסט ללא אורך');
        if (f.domain) {
          const d = S.domains[f.domain];
          if (!d) add('error', where, 'דומיין "' + f.domain + '" לא קיים');
          else if (d.fieldType !== f.type) add('error', where, 'סוג הדומיין (' + d.fieldType + ') שונה מסוג השדה (' + f.type + ')');
        }
        if (f.type === 'TEXT' && f.domain && S.domains[f.domain]) {
          const mx = Math.max.apply(null, S.domains[f.domain].values.map((v) => String(v.code).length).concat([0]));
          if (mx > Number(f.length)) add('warn', where, 'ערך בדומיין ארוך מאורך השדה (' + mx + ' > ' + f.length + ')');
        }
      });
    });

    Object.keys(S.domains).forEach((k) => {
      const d = S.domains[k];
      if (!NAME_RE.test(d.name || '')) add('error', 'דומיין ' + k, 'שם דומיין לא תקין');
      const codes = {};
      d.values.forEach((v) => {
        if (codes[v.code]) add('error', 'דומיין ' + k, 'קוד כפול: ' + v.code);
        codes[v.code] = true;
        if (isNum(d.fieldType) && !/^-?\d+$/.test(String(v.code))) add('error', 'דומיין ' + k, 'קוד לא מספרי בדומיין ' + d.fieldType + ': ' + v.code);
        if (!v.label) add('warn', 'דומיין ' + k, 'ערך ללא תווית: ' + v.code);
      });
      const used = S.entities.some((e) => e.fields.some((f) => f.domain === k));
      if (!used) add('warn', 'דומיין ' + k, 'דומיין שאינו בשימוש');
    });

    S.relationships.forEach((r) => {
      const o = entNames[r.origin], d = entNames[r.destination];
      if (!o) add('error', r.name, 'ישות מקור לא קיימת: ' + r.origin);
      if (!d) add('error', r.name, 'ישות יעד לא קיימת: ' + r.destination);
      if (d) {
        const fk = d.fields.find((f) => f.name === r.destKey);
        if (!fk) add('error', r.name, 'שדה מפתח זר חסר ביעד: ' + r.destKey);
        else if (fk.type !== 'GUID') add('error', r.name, 'מפתח זר מול GlobalID חייב להיות GUID');
      }
      if (o && o.kind === 'table' && false) add('warn', r.name, '');
    });

    S.decisions.forEach((x) => { if (x.status === 'open') add('info', x.id, 'החלטה פתוחה: ' + x.title); });
    return issues;
  }

  /* ---------- ArcPy ---------- */
  function arcpy(S) {
    const L = [];
    const p = (s) => L.push(s);
    p('# -*- coding: utf-8 -*-');
    p('"""');
    p('נוצר אוטומטית מהכלי "מעצב סכמת AGOL" — ' + S.meta.title);
    p('מקור: projects/' + (S.meta.key || 'project') + '.schema.js   (אל תערכו ידנית; ערכו בכלי וייצאו מחדש)');
    p('');
    p('הרצה: ArcGIS Pro > Analysis > Python — הדביקו והקישו Enter.');
    p('לאחר מכן: Share As Web Layer (Hosted Feature Layer + טבלאות), הפעלת Sync (Offline),');
    p('ובהגדרות השירות ב-AGOL: Editor Tracking, Delete Protection, Attachments.');
    p('הערה: Contingent Values (משפחה → תת-דגם) אינם נוצרים כאן; הסינון ייעשה ב-Survey123 (choice_filter).');
    p('"""');
    p('');
    p('import arcpy');
    p('');
    p('arcpy.env.overwriteOutput = True');
    p('REBUILD = True            # True: מוחק ובונה מחדש ישויות וקשרים קיימים באותו שם (לא נוגע בדומיינים)');
    p('SPATIAL_REF = ' + Number(S.meta.spatialRef) + '      # ' + (S.meta.spatialRefName || ''));
    p('');
    p('try:');
    p('    aprx = arcpy.mp.ArcGISProject("CURRENT")');
    p('    gdb = aprx.defaultGeodatabase');
    p('except Exception:');
    p('    aprx = None');
    p('    gdb = arcpy.env.scratchGDB');
    p('print("[+] Geodatabase:", gdb)');
    p('');
    p('# ---------------------------------------------------------------- דומיינים');
    p('DOMAINS = {');
    Object.keys(S.domains).forEach((k) => {
      const d = S.domains[k];
      p('    ' + py(d.name) + ': {"desc": ' + py(d.desc) + ', "type": ' + py(d.fieldType) + ', "values": [');
      d.values.forEach((v) => {
        const c = isNum(d.fieldType) ? String(domainCode(d, v.code)) : py(v.code);
        p('        (' + c + ', ' + py(v.label) + '),');
      });
      p('    ]},');
    });
    p('}');
    p('');
    p('# ---------------------------------------------------------------- ישויות');
    p('ENTITIES = [');
    S.entities.forEach((e) => {
      p('    {"name": ' + py(e.name) + ', "alias": ' + py(e.alias) + ', "kind": ' + py(e.kind === 'point' ? 'POINT' : 'TABLE') +
        ', "attachments": ' + (e.attachments ? 'True' : 'False') + ', "editor_tracking": ' + (e.editorTracking ? 'True' : 'False') + ', "fields": [');
      e.fields.forEach((f) => {
        const len = f.type === 'TEXT' ? String(Number(f.length)) : 'None';
        p('        {"name": ' + py(f.name) + ', "alias": ' + py(f.alias) + ', "type": ' + py(f.type) + ', "length": ' + len + ', "domain": ' + (f.domain ? py(f.domain) : 'None') + '},');
      });
      p('    ]},');
    });
    p(']');
    p('');
    p('# ---------------------------------------------------------------- קשרים');
    p('RELATIONSHIPS = [');
    S.relationships.forEach((r) => {
      p('    {"name": ' + py(r.name) + ', "origin": ' + py(r.origin) + ', "dest": ' + py(r.destination) + ', "pk": ' + py(r.originKey) +
        ', "fk": ' + py(r.destKey) + ', "type": ' + py(r.type) + ', "fwd": ' + py(r.forward) + ', "bwd": ' + py(r.backward) + '},');
    });
    p(']');
    p('');
    p(`
print("=" * 60)
print("[1/4] דומיינים")
print("=" * 60)
existing = [d.name for d in arcpy.da.ListDomains(gdb)]
for dname, d in DOMAINS.items():
    if dname not in existing:
        arcpy.management.CreateDomain(gdb, dname, d["desc"], d["type"], "CODED")
        print("  + domain:", dname)
    for code, label in d["values"]:
        try:
            arcpy.management.AddCodedValueToDomain(gdb, dname, code, label)
        except Exception:
            pass  # הערך כבר קיים

print("=" * 60)
print("[2/4] ישויות ושדות")
print("=" * 60)
sr = arcpy.SpatialReference(SPATIAL_REF)

if REBUILD:
    for r in RELATIONSHIPS:
        rc = gdb + "/" + r["name"]
        if arcpy.Exists(rc):
            arcpy.management.Delete(rc)

for ent in ENTITIES:
    path = gdb + "/" + ent["name"]
    if arcpy.Exists(path):
        if REBUILD:
            arcpy.management.Delete(path)
        else:
            print("  = קיים, מדלג:", ent["name"])
            continue
    if ent["kind"] == "POINT":
        arcpy.management.CreateFeatureclass(gdb, ent["name"], "POINT", spatial_reference=sr, has_m="DISABLED", has_z="DISABLED")
    else:
        arcpy.management.CreateTable(gdb, ent["name"])
    try:
        arcpy.AlterAliasName(path, ent["alias"])
    except Exception as e:
        print("  [i] alias לישות לא הוגדר:", e)
    for f in ent["fields"]:
        arcpy.management.AddField(
            in_table=path, field_name=f["name"], field_type=f["type"],
            field_length=f["length"], field_alias=f["alias"], field_domain=f["domain"] or ""
        )
    arcpy.management.AddGlobalIDs(path)
    if ent["attachments"]:
        arcpy.management.EnableAttachments(path)
    if ent["editor_tracking"]:
        arcpy.management.EnableEditorTracking(
            in_dataset=path, creator_field="Creator", creation_date_field="CreationDate",
            last_editor_field="Editor", last_edit_date_field="EditDate",
            add_fields="ADD_FIELDS", record_dates_in="UTC"
        )
    print("  + %s (%d שדות)" % (ent["name"], len(ent["fields"])))

print("=" * 60)
print("[3/4] קשרים (Relationship Classes)")
print("=" * 60)
for r in RELATIONSHIPS:
    arcpy.management.CreateRelationshipClass(
        origin_table=gdb + "/" + r["origin"], destination_table=gdb + "/" + r["dest"],
        out_relationship_class=gdb + "/" + r["name"], relationship_type=r["type"],
        forward_label=r["fwd"], backward_label=r["bwd"], message_direction="NONE",
        cardinality="ONE_TO_MANY", attributed="NONE",
        origin_primary_key=r["pk"], origin_foreign_key=r["fk"]
    )
    print("  + %s: %s 1:N %s" % (r["name"], r["origin"], r["dest"]))

print("=" * 60)
print("[4/4] הוספה למפה")
print("=" * 60)
try:
    m = aprx.activeMap
    for ent in ENTITIES:
        m.addDataFromPath(gdb + "/" + ent["name"])
    print("  נוספו למפה הפעילה")
except Exception as e:
    print("  [i] לא נוספו למפה:", e)

print("\\n>>> הסתיים. המשך: Share As Web Layer.")
`);
    return L.join('\n');
  }

  /* ---------- מילון נתונים ---------- */
  const md = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

  function dictMd(S) {
    const L = [];
    L.push('# מילון נתונים — ' + S.meta.title);
    L.push('');
    L.push('מקור: ' + (S.meta.source || '') + '  ');
    L.push('מערכת קואורדינטות: ' + S.meta.spatialRef + ' (' + (S.meta.spatialRefName || '') + ')');
    L.push('');
    L.push('> נוצר אוטומטית מ-`projects/' + (S.meta.key || 'project') + '.schema.js`. אין לערוך ידנית.');
    L.push('');
    S.entities.forEach((e) => {
      L.push('## ' + e.name + ' — ' + e.alias + ' (' + (e.kind === 'point' ? 'שכבת נקודות' : 'טבלה') + ')');
      L.push('');
      if (e.description) { L.push(e.description); L.push(''); }
      L.push('Attachments: ' + (e.attachments ? 'כן' : 'לא') + ' · Editor Tracking: ' + (e.editorTracking ? 'כן (Creator, CreationDate, Editor, EditDate)' : 'לא'));
      L.push('');
      L.push('| # | נושא | שדה | כינוי | סוג | אורך | דומיין | קלט | תצוגה בטופס | פתוח | הערה |');
      L.push('|---|---|---|---|---|---|---|---|---|---|---|');
      e.fields.forEach((f, i) => {
        L.push('| ' + (i + 1) + ' | ' + md(f.category) + ' | `' + f.name + '` | ' + md(f.alias) + ' | ' + f.type + ' | ' + (f.length || '') +
          ' | ' + (f.domain ? '`' + f.domain + '`' : '') + ' | ' + md(f.mode) + ' | ' + md(f.visible) + ' | ' + (f.open ? '⚠️' : '') + ' | ' + md(f.note) + ' |');
      });
      L.push('');
    });
    L.push('## קשרים');
    L.push('');
    L.push('| שם | מקור | יעד | מפתח מקור | מפתח זר | סוג |');
    L.push('|---|---|---|---|---|---|');
    S.relationships.forEach((r) => {
      L.push('| ' + r.name + ' | ' + r.origin + ' | ' + r.destination + ' | ' + r.originKey + ' | ' + r.destKey + ' | 1:N ' + r.type + ' |');
    });
    L.push('');
    L.push('## דומיינים');
    L.push('');
    Object.keys(S.domains).forEach((k) => {
      const d = S.domains[k];
      L.push('### ' + d.name + ' — ' + d.desc + ' (' + d.fieldType + ', ' + d.values.length + ' ערכים)');
      L.push('');
      L.push('| קוד | תווית | הורה |');
      L.push('|---|---|---|');
      d.values.forEach((v) => L.push('| ' + md(v.code) + ' | ' + md(v.label) + ' | ' + md(v.parent) + ' |'));
      L.push('');
    });
    L.push('## החלטות פתוחות');
    L.push('');
    L.push('| מזהה | נושא | סטטוס | הערה |');
    L.push('|---|---|---|---|');
    S.decisions.forEach((x) => L.push('| ' + x.id + ' | ' + md(x.title) + ' | ' + (x.status === 'open' ? 'פתוח' : 'סגור') + ' | ' + md(x.note) + ' |'));
    L.push('');
    return L.join('\n');
  }

  function dictCsv(S) {
    const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const rows = [['ישות', 'סדר', 'נושא', 'שדה', 'כינוי', 'סוג', 'אורך', 'דומיין', 'קלט', 'תצוגה בטופס', 'פתוח', 'הערה']];
    S.entities.forEach((e) => e.fields.forEach((f, i) => rows.push([e.name, i + 1, f.category, f.name, f.alias, f.type, f.length, f.domain, f.mode, f.visible, f.open ? 'כן' : '', f.note])));
    return rows.map((r) => r.map(q).join(',')).join('\r\n');
  }

  const api = { validate, arcpy, dictMd, dictCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gen = api;
})(typeof window !== 'undefined' ? window : globalThis);
