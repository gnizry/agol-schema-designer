/* מחולל XLSForm ל-Survey123 מתוך הסכימה: טופס אחד לכל הרמות (שלט > רכיבים / ביקורים > מצבי רכיבים).
   מייצר קובץ xlsx (גיליונות survey, choices, settings), דוח ממצאים וסקריפט פרסום. אינו מתחבר ל-AGOL ואינו מפרסם. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const EDIT_MODE = 'pulldata("@property", \'mode\') = \'edit\'';
  const SKIP_NAMES = ['GlobalID', 'ParentGlobalID'];
  const lit = (v) => (String(v).indexOf("'") >= 0 ? '"' + v + '"' : "'" + v + "'");

  /* תנאי מובנה של הסכימה ({f,op,v} / {all:[..]} / {any:[..]}) לביטוי XPath. שדה עם ^ הוא שדה של רמת האב (נגיש מתוך חזרה) */
  function cond(c) {
    if (!c) return '';
    if (c.all) return c.all.map((x) => '(' + cond(x) + ')').join(' and ');
    if (c.any) return c.any.map((x) => '(' + cond(x) + ')').join(' or ');
    const f = '${' + String(c.f).replace(/^\^/, '') + '}';
    if (c.op === '=') return f + '=' + lit(c.v);
    if (c.op === '!=') return f + '!=' + lit(c.v);
    if (c.op === 'in') return '(' + c.v.map((v) => f + '=' + lit(v)).join(' or ') + ')';
    return '';
  }

  const TYPES = { TEXT: ['text', 'esriFieldTypeString'], SHORT: ['integer', 'esriFieldTypeSmallInteger'], LONG: ['integer', 'esriFieldTypeInteger'], DATE: ['date', 'esriFieldTypeDate'], DOUBLE: ['decimal', 'esriFieldTypeDouble'], GUID: ['text', 'esriFieldTypeGUID'] };

  function build(S, o) {
    o = o || {};
    const rep = { included: [], skipped: [], placeholders: [], open: [], lookups: [] };
    const dom = S.domains || {};
    const ent = (n) => S.entities.find((e) => e.name === n);
    const main = S.entities.find((e) => e.kind === 'point') || S.entities[0];
    const kids = (n) => (S.relationships || []).filter((r) => r.origin === n).map((r) => ent(r.destination)).filter(Boolean);
    const used = new Set();
    const rows = [];
    const row = (r) => { rows.push(r); return r; };

    const dep = (S.deployments || []).filter((d) => d && d.itemId).slice(-1)[0];
    const subUrl = o.submissionUrl || (dep ? 'https://www.arcgis.com/sharing/rest/content/items/' + dep.itemId : '<ITEM_ID_OF_FEATURE_SERVICE>');
    if (!dep && !o.submissionUrl) rep.open.push('submission_url בגיליון settings ריק: יש להחליף את <ITEM_ID_OF_FEATURE_SERVICE> במזהה הפריט של השירות אחרי פרסום השכבה (נרשם אוטומטית אם פורסם מהכלי).');

    function fieldRow(e, f, depth) {
      const where = e.name + '.' + f.name;
      if (SKIP_NAMES.indexOf(f.name) >= 0) return null;
      if (f.mode === 'מערכת' || f.mode === 'היסטורי' || /^מוסתר/.test(f.visible || '')) { rep.skipped.push(where + ' (' + (f.mode || f.visible) + ')'); return null; }
      const t = TYPES[f.type] || TYPES.TEXT;
      const d = f.domain && dom[f.domain] && dom[f.domain].values && dom[f.domain].values.length ? dom[f.domain] : null;
      if (f.domain && !d) rep.lookups.push(where + ': הרשימה ' + f.domain + ' ריקה בסכימה (מקור חיצוני). השדה נוצר כטקסט.');
      const r = { type: d ? 'select_one ' + f.domain : t[0], name: f.name, label: f.alias || f.name, hint: '', required: '', relevant: '', calculation: '', constraint: '', appearance: '', read_only: '', default: '', choice_filter: '', 'bind::esri:fieldType': t[1], 'bind::esri:fieldLength': f.type === 'TEXT' ? (f.length || '255') : '', 'bind::esri:parameters': '', repeat_count: '' };
      if (d) { used.add(f.domain); if (d.values.length > 6) r.appearance = 'minimal'; }
      if (f.type === 'GUID') { r.type = 'text'; rep.open.push(where + ': שדה GUID שמולא מקישור לרכיב (' + (f.pickFrom || '') + '). נוצר כטקסט; בחירת הרכיב בטופס טעונה בדיקה (B2/C2).'); }
      if (f.calc) r.calculation = f.calc;
      else if (f.autoValue === 'today') r.calculation = f.autoOnCreate ? 'once(today())' : 'today()';
      else if (f.autoValue === 'username') r.calculation = 'pulldata("@property", "username")';
      if (/<[^>]+>/.test(r.calculation)) rep.placeholders.push(where + ': ' + (r.calculation.match(/<[^>]+>/g) || []).join(', '));
      if (/instance\("/.test(r.calculation)) rep.open.push(where + ': משתמש בקובץ רשימה חיצוני (instance) שחייב להיות בתיקיית media של הטופס.');
      if (f.required === true) r.required = 'yes';
      if (f.reqIf) r.required = cond(f.reqIf);
      const rl = f.rel ? cond(f.rel) : '';
      if (rl) r.relevant = rl;
      if (f.visible === 'קריאה בלבד' || /^תמיד \(קריאה בלבד\)/.test(f.visible || '')) r.read_only = 'yes';
      if (f.readonlyExpr || /בעריכה: קריאה בלבד/.test(f.visible || '')) rep.open.push(where + ': נדרש קריאה בלבד בעריכה בלבד (' + (f.readonlyExpr || 'mode = edit') + '). לא הוגדר בטופס עד אימות שעמודת read_only תומכת בביטוי.');
      if (f.fromVisit) rep.open.push(where + ': מתעדכן על ידי Make (D28) מהביקור האחרון, לא מהטופס.');
      // רשימה מדורגת (ערכי הדומיין כוללים parent): choice_filter לפי שדה האב באותה ישות
      if (d && d.values.some((v) => v.parent)) {
        const parents = new Set(d.values.map((v) => v.parent).filter(Boolean));
        const pf = e.fields.find((x) => x.domain && x.domain !== f.domain && dom[x.domain] && dom[x.domain].values.some((v) => parents.has(v.code)));
        if (pf) r.choice_filter = 'parent=${' + pf.name + '}'; else rep.open.push(where + ': רשימה מדורגת ללא שדה אב באותה ישות; choice_filter לא הוגדר.');
      }
      rep.included.push(where);
      return r;
    }

    function entityRows(e, depth, isMain) {
      const cats = isMain && e.groupOrder ? e.groupOrder : null;
      const fields = e.fields;
      if (cats) {
        cats.forEach((c, gi) => {
          const fr = fields.filter((f) => f.category === c).map((f) => fieldRow(e, f, depth)).filter(Boolean);
          if (!fr.length) return;
          row({ type: 'begin_group', name: 'grp_' + (gi + 1), label: c });
          fr.forEach(row);
          row({ type: 'end_group', name: '', label: '' });
        });
        fields.filter((f) => cats.indexOf(f.category) < 0).map((f) => fieldRow(e, f, depth)).filter(Boolean).forEach(row);
      } else fields.map((f) => fieldRow(e, f, depth)).filter(Boolean).forEach(row);
      kids(e.name).forEach((k) => {
        const visitLevel = !!kids(k.name).length || /Visit/i.test(k.name);
        row({ type: 'begin_repeat', name: k.name, label: k.alias || k.name, relevant: visitLevel ? EDIT_MODE : '' });
        if (visitLevel) rep.open.push(k.name + ': רמת הביקור מוצגת רק בעריכה (' + EDIT_MODE + '), כי במיפוי שלט חדש הביקור הראשון נוצר על ידי Make (D28). דורש אימות ש-pulldata("@property","mode") מחזיר edit בטופס.');
        entityRows(k, depth + 1, false);
        row({ type: 'end_repeat', name: '', label: '' });
      });
    }

    row({ type: 'geopoint', name: 'location', label: 'מיקום ' + (main.alias || main.name), required: 'yes' });
    entityRows(main, 0, true);
    const inForm = new Set([main.name]); (function walk(n) { kids(n).forEach((k) => { inForm.add(k.name); walk(k.name); }); })(main.name);
    S.entities.forEach((e) => { if (!inForm.has(e.name)) rep.lookups.push(e.name + ': לא נכללה בטופס (טבלת עזר).'); });

    // גיליון choices
    const choices = []; let imgs = 0;
    const anyExt = [...used].some((k) => dom[k].values.some((v) => v.ext));
    const anyParent = [...used].some((k) => dom[k].values.some((v) => v.parent));
    [...used].forEach((k) => dom[k].values.forEach((v) => {
      const c = { list_name: k, name: v.code, label: v.label || v.code };
      if (anyParent) c.parent = v.parent || '';
      if (anyExt) c.ext = v.ext || '';
      choices.push(c);
      if (v.img) imgs++;
    }));
    if (imgs) rep.open.push('תמונות דגמים (' + imgs + ' ערכים עם img בסכימה) לא נכללו: יש להוסיף עמודת media::image ולהעלות את הקבצים לתיקיית media של הטופס.');
    const settings = [{ form_title: (S.meta && S.meta.title) || 'סקר', form_id: (S.meta && S.meta.key) || 'survey', version: new Date().toISOString().slice(0, 10).replace(/-/g, ''), submission_url: subUrl }];
    const cols = ['type', 'name', 'label', 'hint', 'required', 'relevant', 'calculation', 'constraint', 'appearance', 'read_only', 'default', 'choice_filter', 'bind::esri:fieldType', 'bind::esri:fieldLength', 'bind::esri:parameters', 'repeat_count'];
    const sheets = [
      { name: 'survey', head: cols, rows: rows.map((r) => cols.map((c) => r[c] || '')) },
      { name: 'choices', head: ['list_name', 'name', 'label'].concat(anyParent ? ['parent'] : [], anyExt ? ['ext'] : []), rows: choices.map((c) => ['list_name', 'name', 'label'].concat(anyParent ? ['parent'] : [], anyExt ? ['ext'] : []).map((k) => c[k] || '')) },
      { name: 'settings', head: Object.keys(settings[0]), rows: [Object.values(settings[0])] }
    ];
    rep.open.push('הגדרות עריכה (allowUpdates / inbox) והתנהגות חזרות מקוננות בעריכה (C2) לא הוגדרו ודורשות בדיקה בטופס אמיתי.');
    return { sheets, report: rep, submissionUrl: subUrl };
  }

  /* ---------- כתיבת xlsx ללא ספריות: zip בלי דחיסה ---------- */
  const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = (s) => new TextEncoder().encode(s);
  function zip(files) {
    const parts = [], cen = []; let off = 0;
    const u16 = (n) => [n & 255, (n >> 8) & 255], u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
    files.forEach((f) => {
      const nb = enc(f.name), d = typeof f.data === 'string' ? enc(f.data) : f.data, crc = crc32(d);
      const lh = new Uint8Array([0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(nb.length), 0, 0]);
      parts.push(lh, nb, d);
      cen.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0, ...u32(crc), ...u32(d.length), ...u32(d.length), ...u16(nb.length), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(off)]), nb);
      off += lh.length + nb.length + d.length;
    });
    const cl = cen.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cl), ...u32(off), 0, 0]);
    const all = parts.concat(cen, [end]); const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0;
    all.forEach((b) => { out.set(b, p); p += b.length; }); return out;
  }
  const xe = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const colName = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function sheetXml(sh) {
    const all = [sh.head].concat(sh.rows);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      all.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => (v === '' || v == null ? '' : '<c r="' + colName(ci) + (ri + 1) + '" t="inlineStr"><is><t xml:space="preserve">' + xe(v) + '</t></is></c>')).join('') + '</row>').join('') + '</sheetData></worksheet>';
  }
  function toXlsx(sheets) {
    const files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map((s, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((s, i) => '<sheet name="' + s.name + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((s, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('') + '</Relationships>' }
    ].concat(sheets.map((s, i) => ({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s) })));
    return zip(files);
  }

  function reportMd(S, b) {
    const r = b.report, k = (S.meta && S.meta.key) || 'survey';
    const L = (a) => (a.length ? a.map((x) => '- ' + x).join('\n') : '- אין');
    return '# דוח מחולל XLSForm: ' + ((S.meta && S.meta.title) || k) + ' (סכמה v' + ((S.meta && S.meta.version) || '?') + ')\n\nנוצר אוטומטית. הטופס נשלח לשירות קיים דרך submission_url: ' + b.submissionUrl + '\n\n## פתוח / לבדיקה\n' + L([...new Set(r.open)]) + '\n\n## placeholders שלא מולאו\n' + L(r.placeholders) + '\n\n## רשימות חיצוניות וישויות שלא נכללו\n' + L(r.lookups) + '\n\n## שדות שלא נכללו בטופס\n' + L(r.skipped) + '\n\n## שדות שנכללו (' + r.included.length + ')\n' + r.included.join(', ') + '\n';
  }
  function pyScript(S, b) {
    const k = (S.meta && S.meta.key) || 'survey';
    return '# פרסום טופס Survey123 מ-XLSForm שנוצר על ידי מעצב פתרונות AGOL. טיוטה, לא נבדק. להרצה ב-ArcGIS Notebooks.\n# שימו לב: create() יוצר גם שירות חדש; כדי לפרסם על שירות קיים השתמשו בפריט סקר שנוצר ב-Survey123 Connect (SURVEY_ITEM_ID) או פרסמו מ-Connect.\nfrom arcgis.gis import GIS\nfrom arcgis.apps.survey123 import SurveyManager\n\nXLSFORM = r"' + k + '.xlsx"\nSURVEY_ITEM_ID = ""  # מזהה פריט הסקר (Form) אם כבר קיים\n\ngis = GIS("home")\nsm = SurveyManager(gis)\nif SURVEY_ITEM_ID:\n    survey = sm.get(SURVEY_ITEM_ID)\n    result = survey.publish(xlsform=XLSFORM, schema_changes=False)\nelse:\n    survey = sm.create(title="' + String((S.meta && S.meta.title) || k).replace(/"/g, "'") + '")\n    result = survey.publish(xlsform=XLSFORM)\nprint(result)\n';
  }

  function download(name, data, mime) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  window.XlsForm = { build, toXlsx, reportMd, pyScript, cond };

  const btn = $('b-xlsform');
  if (btn) btn.onclick = () => {
    const S = window.__designer.S, key = ((S.meta && S.meta.key) || 'survey').replace(/[^A-Za-z0-9_\-]/g, '_');
    const b = build(S);
    download(key + '.xlsx', toXlsx(b.sheets), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    setTimeout(() => download(key + '-xlsform-report.md', '﻿' + reportMd(S, b), 'text/markdown;charset=utf-8'), 400);
    setTimeout(() => download('publish_survey123_' + key + '.py', '﻿' + pyScript(S, b), 'text/x-python;charset=utf-8'), 800);
    const p = $('menu-pop'); if (p) p.hidden = true;
  };
})();
