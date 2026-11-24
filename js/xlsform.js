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
    /* instance('X')/root/item[name=${q}]/ext לא נטען בתצוגה של Connect (SyntaxError), לכן מורחב לשרשרת if() מערכי הדומיין (ext) */
    const extChain = (e) => (e || '').replace(/instance\((?:"|')([^"']+)(?:"|')\)\/root\/item\[name=\$\{(\w+)\}\]\/ext/g, (m, ln, q) => {
      const vals = dom[ln] && dom[ln].values ? dom[ln].values.filter((v) => v.ext) : [];
      if (!vals.length) return m;
      return vals.reduceRight((acc, v) => 'if(${' + q + '}=' + lit(v.code) + ',' + lit(v.ext) + ',' + acc + ')', "''");
    });
    const ent = (n) => S.entities.find((e) => e.name === n);
    const main = S.entities.find((e) => e.kind === 'point') || S.entities[0];
    const kids = (n) => (S.relationships || []).filter((r) => r.origin === n).map((r) => ent(r.destination)).filter(Boolean);
    const used = new Set();
    const rows = [];
    const keyed = {};
    const row = (r) => { if (r._before) rows.push(r._before); (r._pre || []).forEach((x) => rows.push(x)); rows.push(r); if (r._after) rows.push(r._after); (r._afterMany || []).forEach((x) => rows.push(x)); return r; }; // _after: שורת note נלווית (שומר מקום) מיד אחרי השדה
    const S123 = (S.sim && S.sim.survey123) || {};
    const OPT = S123.options || {};

    /* ---------- כותרות קבוצות עם תקציר (OPT.groupSummaries / OPT.repeatSummaries) ---------- */
    const SUMSPAN = (nm) => ' <span style="font-weight:normal;font-size:small;color:#6b7280">${' + nm + '}</span>';
    function sumExpr(e, items) {
      const parts = items.map((it) => {
        const f = e.fields.find((x) => x.name === it.f); if (!f) return '';
        const hasList = f.domain && dom[f.domain] && dom[f.domain].values && dom[f.domain].values.length;
        let v = '${' + f.name + '}';
        if (hasList) v = 'jr:choice-name(${' + f.name + "}, '${" + f.name + "}')";
        if (f.type === 'DATE') v = "format-date(${" + f.name + "}, '%d/%m/%Y')";
        if (it.before) v = 'substring-before(' + v + ", '" + it.before + "')";
        if (it.max) v = 'if(string-length(' + v + ') > ' + it.max + ', concat(substr(' + v + ', 0, ' + it.max + "), '…'), " + v + ')';
        return "if(${" + f.name + "} != '', concat(' · ', " + v + "), '')";
      }).filter(Boolean);
      return parts.length ? 'concat(' + parts.join(', ') + ')' : "''";
    }
    /* ---------- image-map לרכיבי השלט (OPT.imageMaps) ---------- */
    const IM = Array.isArray(OPT.imageMaps) ? OPT.imageMaps.filter((m) => m && m.model && m.svg) : [];
    const imKey = (m) => String(m.model).replace(/[^A-Za-z0-9]/g, '_');
    const imParts = (m) => {
      const out = (m.parts || []).map((x) => ({ id: x.id, label: x.label, type: x.type, side: x.side }));
      if (m.wings) m.wings.levels.forEach((L) => m.wings.dirs.forEach((D) => out.push({ id: 'W_' + L.id + '_' + D.id, label: 'כנף ' + L.label + ' – ' + D.label, type: 'כנף', level: L.label, dir: D.label })));
      if (m.wings && m.wings.pics) m.wings.levels.forEach((L) => m.wings.dirs.forEach((D) => { for (let n = 1; n <= m.wings.pics; n++) out.push({ id: 'WP_' + L.id + '_' + D.id + '_' + n, label: 'פיקטוגרמה ' + n + ' בכנף ' + L.label + ' – ' + D.label, type: 'פיקטוגרמה', level: L.label, dir: D.label, wp: true }); }));
      return out;
    };
    const imModelIs = (m) => '${ModelCode}=' + lit(m.model);
    function imInRowExpr(field) {
      /* ביטוי לשדה בתוך השורה לפי מזהה הרכיב (part_id): סוג / רמה / כיוון */
      const all = []; IM.forEach((m) => imParts(m).forEach((x) => { if (!all.some((y) => y.id === x.id)) all.push(x); }));
      if (field === 'ComponentType') {
        const groups = {}; all.forEach((x) => { const seg = x.id.split('_')[0]; (groups[seg] = groups[seg] || { type: x.type, ids: [] }).ids.push(x.id); });
        let expr = "''"; const segs = Object.keys(groups).reverse();
        segs.forEach((seg) => { const g = groups[seg], test = g.ids.some((i) => i.indexOf('_') > 0) ? "starts-with(${part_id}, '" + seg + "_')" : g.ids.map((i) => '${part_id}=' + lit(i)).join(' or '); expr = 'if(' + test + ', ' + lit(g.type) + ', ' + expr + ')'; });
        return "if(${part_id} = '', '', " + expr + ')';
      }
      if (field === 'Side') {
        const bySide = {}; all.filter((x) => x.side).forEach((x) => (bySide[x.side] = bySide[x.side] || []).push(x.id));
        const sides = Object.keys(bySide); if (!sides.length) return '';
        return sides.reduceRight((acc, sd) => 'if(' + bySide[sd].map((i) => '${part_id}=' + lit(i)).join(' or ') + ', ' + lit(sd) + ', ' + acc + ')', "''");
      }
      if (field === 'ComponentNotes') {
        const accs = all.filter((x) => /^ACC_/.test(x.id)); if (!accs.length) return '';
        return accs.reduceRight((acc, x) => 'if(${part_id}=' + lit(x.id) + ', ' + lit(x.label) + ', ' + acc + ')', "''");
      }
      const wings = all.filter((x) => x.level && !x.wp), wps = all.filter((x) => x.wp); if (!wings.length && !wps.length) return '';
      const key = field === 'Level' ? 'level' : 'dir';
      /* כנף: W_<רמה>_<כיוון>; פיקטוגרמה על כנף: WP_<רמה>_<כיוון>_<מספר> (substr מבוסס 0) */
      const chain = (list, test) => { const uniq = []; list.forEach((x) => { const p = x.id.split('_'), id = field === 'Level' ? p[1] : p[2]; if (!uniq.some((u) => u[0] === id)) uniq.push([id, x[key]]); }); return uniq.reduceRight((acc, u) => 'if(' + test(u[0]) + ', ' + lit(u[1]) + ', ' + acc + ')', "''"); };
      const wTest = (id) => field === 'Level' ? 'substr(${part_id}, 2, 3) = ' + lit(id) : 'substr(${part_id}, 4) = ' + lit(id);
      const pTest = (id) => field === 'Level' ? 'substr(${part_id}, 3, 4) = ' + lit(id) : 'starts-with(substr(${part_id}, 5), ' + lit(id + '_') + ')';
      let out = "''";
      if (wps.length) out = "if(starts-with(${part_id}, 'WP_'), " + chain(wps, pTest) + ', ' + out + ')';
      if (wings.length) out = "if(starts-with(${part_id}, 'W_'), " + chain(wings, wTest) + ', ' + out + ')';
      return out;
    }

    const FL = S123.forestLayer || null; // { itemId | url, fields: { שם שדה בסכימה: שם שדה בשכבת עומדי היער } }
    const shade = (c, a) => { const n = parseInt(String(c).slice(1), 16), m = (x) => Math.round(x * (1 - a)).toString(16).padStart(2, '0'); return '#' + m(n >> 16) + m((n >> 8) & 255) + m(n & 255); };
    /* עיצוב: צבע ואייקון לכל קבוצה/חזרה (S.sim.survey123.style): תווית HTML (span style) + body::esri:style (backgroundColor, borderColor). נתמך באפליקציית השדה; באפליקציית הווב עשוי להיות מוגבל */
    const SY = (S.sim && S.sim.survey123 && S.sim.survey123.style) || null;
    const tint = (c, a) => { const n = parseInt(String(c).slice(1), 16), m = (x) => Math.round(x + (255 - x) * a).toString(16).padStart(2, '0'); return '#' + m(n >> 16) + m((n >> 8) & 255) + m(n & 255); };
    const NB = ' ';
    let secN = 0;
    const styled = (kind, name, label, sy, dyn) => {
      if (!SY || !sy) return { label: label };
      const no = ++secN, tag = kind === 'repeat' ? NB + '(+ הוספה)' : '';
      if (S123.style && S123.style.labelStyle === 'badge') return { label: '<span style="font-weight:bold;color:#ffffff;background-color:' + sy.c + '">' + NB + no + ' · ' + (sy.i ? sy.i + NB : '') + label + (dyn ? '${ro_tag}' : '') + tag + NB + '</span>', style: 'backgroundColor=' + tint(sy.c, kind === 'repeat' ? 0.88 : 0.93) + ' borderColor=' + sy.c };
      /* ברירת מחדל: כותרת נקייה בטקסט צבעוני כהה (בלי רקע מלא ובלי מספור), והצבע נשאר ברקע הבהיר ובמסגרת של הקבוצה */
      return { label: '<span style="font-weight:bold;color:' + shade(sy.c, 0.35) + '">' + (sy.i ? sy.i + NB : '') + label + (dyn ? '${ro_tag}' : '') + (kind === 'repeat' ? '<span style="font-weight:normal;font-size:small;color:#6b7280">' + tag + '</span>' : '') + '</span>', style: 'backgroundColor=' + tint(sy.c, kind === 'repeat' ? 0.9 : 0.94) + ' borderColor=' + sy.c };
    };

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
      /* רשימות: autocomplete לפי הסכימה; אחרת dropdown (minimal) לכל רשימה של 3 ערכים ומעלה. רשימה של 2 ערכים נשארת כפתורי בחירה */
      if (d) { used.add(f.domain); if (f.appearance === 'autocomplete') { r.appearance = 'autocomplete'; } else if (d.values.length >= 3) r.appearance = 'minimal'; }
      /* טקסט ארוך: multiline לשדה טקסט חופשי שאורכו 500 תווים ומעלה (או f.multiline) */
      if (!d && f.type === 'TEXT' && (f.multiline || Number(f.length || 255) >= 500)) r.appearance = 'multiline';
      if (f.type === 'GUID') { r.type = 'text'; rep.open.push(where + ': שדה GUID שמולא מקישור לרכיב (' + (f.pickFrom || '') + '). נוצר כטקסט; בחירת הרכיב בטופס טעונה בדיקה (B2/C2).'); }
      if (f.formOnly) { r['bind::esri:fieldType'] = 'null'; r['bind::esri:fieldLength'] = ''; rep.open.push(where + ': שדה עזר בטופס בלבד (ESRI field type = null), לא נשמר בשכבה.'); }
      if (f.calc) r.calculation = f.calc;
      /* כתובת יערנית: pulldata("@layer", "getValueAt") מול שכבת עומדי יער לפי S.sim.survey123.forestLayer; שדה שלא מופה נשאר ריק (בלי שגיאת טופס) */
      if (/<ROADS_LAYER_URL>/.test(r.calculation)) {
        const RL = S123.roadLayer || null, rsrc = RL && RL.url, rfld = RL && RL.fields && RL.fields[f.name], dist = (RL && RL.distanceM) || 30;
        if (rsrc && rfld) r.calculation = 'pulldata("@layer", "getValueAt", "attributes.' + rfld + '", "' + rsrc + (rsrc.indexOf('?') >= 0 ? '&' : '?') + 'distance=' + dist + '&units=esriSRUnit_Meter", ${location}, "")';
        else { r.calculation = ''; rep.open.push(where + ': שיוך לדרך טרם הוגדר (S.sim.survey123.roadLayer.url ו-roadLayer.fields.' + f.name + '). השדה נוצר ריק וקריאה בלבד.'); }
        const vm = RL && RL.valueMaps && RL.valueMaps[f.name];
        if (r.calculation && vm && vm.length) { /* שדה הדומיין בשכבה מחזיר קוד: חישוב עזר מסתיר את הקוד והשדה מחזיר את התיאור */
          const cn = f.name + '_code';
          r._before = { type: 'calculate', name: cn, label: '', calculation: r.calculation, 'bind::esri:fieldType': 'null' };
          r.calculation = vm.reduceRight((acc, v) => 'if(${' + cn + '}=' + lit(v.c) + ',' + lit(v.l) + ',' + acc + ')', '${' + cn + '}');
          rep.open.push(where + ': השכבה מחזירה קוד דומיין; הטופס ממיר לתיאור לפי roadLayer.valueMaps (' + vm.length + ' ערכים). ערך שאינו ברשימה יוצג כקוד.');
        }
        if (r.calculation) rep.open.push(where + ': שיוך לדרך ברדיוס ' + dist + ' מ\' מהשלט (roadLayer.distanceM). אם יש כמה דרכים ברדיוס, getValueAt עלול לא להחזיר את הקרובה ביותר: לבדוק בשטח.');
      }
      if (/<FORESTS_LAYER_URL>/.test(r.calculation)) {
        const src = FL && (FL.url || FL.itemId), fld = FL && FL.fields && FL.fields[f.name];
        if (src && fld) r.calculation = 'pulldata("@layer", "getValueAt", "attributes.' + fld + '", "' + src + '", ${location}, "")';
        else { r.calculation = ''; rep.open.push(where + ': כתובת יערנית אוטומטית טרם מופתה (S.sim.survey123.forestLayer.fields.' + f.name + ' = שם השדה בשכבת עומדי היער). השדה נוצר ריק וקריאה בלבד.'); }
      }
      /* instance("X") על רשימה ריקה (טרם נמסרה) גורם לשגיאת טעינה: נפילה לשם המשתמש המחובר */
      const inst = /instance\("([^"]+)"\)/.exec(r.calculation || '');
      if (inst && f.domain === inst[1] && !d && /username/.test(r.calculation)) { r.calculation = "once(pulldata(\"@property\", 'userFullName'))"; rep.open.push(where + ': הרשימה ' + inst[1] + ' טרם נמסרה, לכן השדה מקבל את שם המשתמש המחובר. כשהרשימה תימסר יש להחזיר בחירה מרשימה.'); }
      r.calculation = extChain(r.calculation);
      if (f.relExpr) r.relevant = extChain(f.relExpr);
      if (f.placeholderNote) r._after = { type: 'note', name: f.name + '_ph', label: '<span style="color:#9ca3af;font-size:small">' + f.placeholderNote + '</span>', relevant: extChain(f.placeholderWhen || '') };
      if (f.calc) { /* בוצע למעלה */ }
      else if (f.autoValue === 'today') r.calculation = f.autoOnCreate ? 'once(today())' : 'today()';
      else if (f.autoValue === 'username') r.calculation = "pulldata(\"@property\", 'userFullName')";
      if (/<[^>]+>/.test(r.calculation)) rep.placeholders.push(where + ': ' + (r.calculation.match(/<[^>]+>/g) || []).join(', '));
      if (/instance\("/.test(r.calculation)) rep.open.push(where + ': משתמש בקובץ רשימה חיצוני (instance) שחייב להיות בתיקיית media של הטופס.');
      if (f.required === true) r.required = 'yes';
      if (f.reqIf) r.required = cond(f.reqIf);
      const rl = f.rel ? cond(f.rel) : '';
      if (rl) r.relevant = rl;
      if (f.visible === 'קריאה בלבד' || /^תמיד \(קריאה בלבד\)/.test(f.visible || '')) r.read_only = 'yes';
      if (f.readonlyExpr || /בעריכה: קריאה בלבד/.test(f.visible || '')) rep.open.push(where + ': נדרש קריאה בלבד בעריכה בלבד (' + (f.readonlyExpr || 'mode = edit') + '). לא הוגדר בטופס עד אימות שעמודת read_only תומכת בביטוי.');
      if (f.hint) r.hint = f.hint;
      if (f.editOnly) { r.relevant = r.relevant ? '(' + r.relevant + ') and ' + EDIT_MODE : EDIT_MODE; r.read_only = 'yes'; rep.open.push(where + ': מוצג רק בעריכה (' + EDIT_MODE + ') וקריאה בלבד; מתעדכן על ידי Make מהדיווח האחרון על הרכיב. דורש אימות ש-pulldata("@property","mode") עובד ב-relevant בתוך Repeat.'); }
      if (f.fromVisit) rep.open.push(where + ': מתעדכן על ידי Make (D28) מהביקור האחרון, לא מהטופס.');
      // רשימה מדורגת (ערכי הדומיין כוללים parent): choice_filter לפי שדה האב באותה ישות
      if (d && d.values.some((v) => v.parent)) {
        const parents = new Set(d.values.map((v) => v.parent).filter(Boolean));
        const pf = e.fields.find((x) => x.domain && x.domain !== f.domain && dom[x.domain] && dom[x.domain].values.some((v) => parents.has(v.code)));
        if (pf) {
          r.choice_filter = 'parent=${' + pf.name + '}';
          /* משפחה עם תת דגם יחיד: ברירת מחדל אוטומטית (מתעדכן בכל שינוי משפחה; במשפחה עם כמה תתי דגמים הבחירה מתאפסת) */
          if (!r.calculation && OPT.autoSingleChild !== false) {
            const byP = {}; d.values.forEach((v) => { if (v.parent) (byP[v.parent] = byP[v.parent] || []).push(v.code); });
            const singles = Object.keys(byP).filter((p) => byP[p].length === 1);
            if (singles.length) {
              r.calculation = singles.map((p) => 'if(${' + pf.name + '} = ' + lit(p) + ', ' + lit(byP[p][0]) + ', ').join('') + "''" + singles.map(() => ')').join('');
              rep.open.push(where + ': בחירה אוטומטית כשבמשפחה תת דגם יחיד (calculation על שאלת בחירה; ' + singles.length + ' משפחות). לבדוק ב-Field Maps שהמשתמש עדיין יכול לבחור במשפחה עם כמה תתי דגמים.');
            }
          }
        } else rep.open.push(where + ': רשימה מדורגת ללא שדה אב באותה ישות; choice_filter לא הוגדר.');
      }
      if (d && d.values.some((v) => v.notIn && v.notIn.length)) {
        const pf2 = f.notInParent || 'ModelFamily';
        if (OPT.excludeMode === 'filter') {
          /* סינון רשימה: עמודת incl בגיליון choices (מפתחות משפחות מותרות, מופרדים בפסיק, עם פסיק בהתחלה ובסוף) ו-regex ב-choice_filter. בדיקה ב-Connect: not(regex(excl...)) ו-or מחזירים רשימה ריקה, ו-regex(incl, ...) עובד גם בתוך Repeat. */
          const keyExpr = "pulldata('@javascript', 'repeats.js', 'famKey', ${" + pf2 + '})';
          let pref = keyExpr;
          if (depth > 0 && !r._before) { const cn = f.name + '_fam'; r._before = { type: 'calculate', name: cn, label: '', calculation: keyExpr, 'bind::esri:fieldType': 'null' }; pref = '${' + cn + '}'; }
          else if (depth > 0) pref = '${' + f.name + '_fam}';
          r.choice_filter = (r.choice_filter ? r.choice_filter + ' and ' : '') + "regex(incl, concat('.*,', " + pref + ", ',.*'))";
          rep.open.push(where + ': סינון הרשימה לפי משפחת הדגם (עמודת incl, regex ב-choice_filter). נדרש שהמשפחה תיבחר קודם (שדה חובה). מפתח המשפחה הוא הטקסט עד הנקודתיים.');
        } else {
          /* ברירת מחדל: הרשימה מלאה (dropdown רגיל) והחסימה בפועל ב-constraint, כי choice_filter מול שדה שמחוץ ל-Repeat החזיר רשימה ריקה */
          const parts = d.values.filter((v) => v.notIn && v.notIn.length).map((v) => '(. = ' + lit(v.code) + ' and (' + v.notIn.map((x) => '${' + pf2 + '} = ' + lit(x)).join(' or ') + '))');
          r.constraint = (r.constraint ? r.constraint + ' and ' : '') + 'not(' + parts.join(' or ') + ')';
          r.constraint_message = 'ערך זה אינו מתאים למשפחת הדגם שנבחרה';
          rep.open.push(where + ': הגבלת ערכים לפי משפחת הדגם (פ-1 ללא כנף, לפי דרישת הלקוח) מוגדרת כ-constraint ולא כסינון הרשימה. שאר הקטלוג חסר.');
        }
      }
      if (f.autoIncrement) {
        /* מספור רציף רק בין שורות מהסוג autoIncrementWhen: מפתח W/x לכל שורה, מחרוזת המפתחות מחוץ לחזרה, והמספר = מספר ה-W עד השורה הנוכחית */
        const w = f.autoIncrementWhen;
        if (w && w.f) {
          keyed[e.name] = w;
          r.calculation = "once(pulldata('@javascript', 'repeats.js', 'countUpTo', ${" + e.name + "_keys}, position(..) - 1, 'W') + 1)";
          rep.open.push(where + ': מספור לפי סדר הרישום של ' + w.v + ' בלבד (' + r.calculation + '). לאמת בטופס אמיתי; הלקוח מתבקש לתקף (Q-027).');
        } else { r.calculation = 'once(position(..))'; }
      }
      if (f.uniqueInParent) {
        /* predicate עם current() גורם לכשל המרה (IndexOutOfBounds) ב-ODK Validate, לכן אין בדיקת כפילות בטופס */
        rep.open.push(where + ': בדיקת כפילות מספר בתוך השלט לא מוגדרת בטופס (current() בפרדיקט נכשל בהמרה). לבדוק בהמשך בשכבה/Notebook.');
      }

      if (IM.length && e.name === (OPT.imageMapParent || 'SignParts') && (f.name === 'ComponentType' || f.name === 'Level' || f.name === 'Direction' || f.name === 'Side' || f.name === 'ComponentNotes') && !r.calculation) {
        const ex = imInRowExpr(f.name);
        if (ex) {
          r.calculation = ex;
          if (f.name === 'ComponentType') {
            const chain = IM.map((m) => 'if(' + imModelIs(m) + ', selected-at(${Parts_' + imKey(m) + '}, position(..) - 1), ').join('') + "''" + IM.map(() => ')').join('');
            r._pre = (r._pre || []).concat([{ type: 'calculate', name: 'part_id', label: '', calculation: "if(position(..) <= int(${PartsMapCount}), " + chain + ", '')", 'bind::esri:fieldType': 'null' }]);
          }
        }
      }
      const RSL = (OPT.repeatSummaries || {})[e.name];
      if (RSL && RSL.label && e.fields[e.fields.length - 1] === f) {
        /* תווית שורה לתקציר הכותרת: סוג + רמה + כיוון (שדה עזר, לא נשמר) */
        const lab = RSL.label.map((n, i) => i === 0 ? '${' + n + '}' : 'if(${' + n + "} != '', concat(' ', ${" + n + "}), '')");
        r._afterMany = (r._afterMany || []).concat([{ type: 'calculate', name: 'RowLabel', label: '', calculation: lab.length > 1 ? 'concat(' + lab.join(', ') + ')' : lab[0], 'bind::esri:fieldType': 'null' }]);
      }
      if (OPT.bigImage && OPT.bigImage.field === f.name && d) {
        const fam = OPT.bigImage.parentField, famD = fam && dom[(e.fields.find((x) => x.name === fam) || {}).domain];
        const notes = [], img = (v) => String(v.img).split('/').pop(), cap = (t) => '<span style="font-size:small;color:#4f6b4c">נבחר: <b>' + t + '</b>. ודא שזה הסיווג הנכון לשלט שבשטח</span>';
        if (famD) famD.values.filter((v) => v.img).forEach((v, i) => { const kidsN = d.values.filter((c) => c.parent === v.code).length; if (kidsN > 1) notes.push({ type: 'note', name: f.name + '_fimg_' + (i + 1), label: cap(v.label || v.code), relevant: '${' + fam + '}=' + lit(v.code) + " and ${" + f.name + "}=''", 'media::image': img(v), 'bind::esri:fieldType': 'null' }); });
        d.values.filter((v) => v.img).forEach((v, i) => notes.push({ type: 'note', name: f.name + '_img_' + (i + 1), label: cap(v.label || v.code), relevant: '${' + f.name + '}=' + lit(v.code), 'media::image': img(v), 'bind::esri:fieldType': 'null' }));
        r._afterMany = (r._afterMany || []).concat(notes);
      }
      rep.included.push(where);
      return r;
    }

    function entityRows(e, depth, isMain) {
      const cats = isMain && e.groupOrder ? e.groupOrder : null;
      const fields = (OPT.omitFields || []).length ? e.fields.filter((f) => OPT.omitFields.indexOf(f.name) < 0) : e.fields;
      const after = e.repeatAfter || {}; // { ילד: קבוצה } - ה-Repeat מוצג מיד אחרי הקבוצה
      const kidRows = (k) => {
        const visitLevel = !!kids(k.name).length || /Visit/i.test(k.name);
        const st = styled('repeat', k.name, k.alias || k.name, SY && SY.repeats && SY.repeats[k.name]);
        const visitsEditOnly = visitLevel && OPT.visitsEditOnly === true; // ברירת מחדל: ה-Repeat של הביקורים תמיד מוצג (S.sim.survey123.options.visitsEditOnly=true מחזיר הצגה בעריכה בלבד)
        const ST = (OPT.summaryTables || {})[k.name];
        const collapsed = (OPT.collapsedRepeats || []).indexOf(k.name) >= 0;
        /* עם טבלת סיכום: group עוטף את ה-Repeat והטבלה, כך שהכל מתקפל יחד */
        /* מספר החזרות בסוגריים בכותרת: calculate count לפני הכותרת, ומוסף לתווית */
        const cntName = k.name + '_cnt', withCnt = (lb) => /<\/span>\s*$/.test(lb) ? lb.replace(/<\/span>\s*$/, ' (${' + cntName + '})</span>') : lb + ' (${' + cntName + '})';
        const minimal = (OPT.minimalRepeats || []).indexOf(k.name) >= 0; // חזרה שנפתחת ריקה (appearance minimal): שדות החובה בה לא חוסמים Submit עד שהמשתמש לוחץ +
        row({ type: 'calculate', name: cntName, label: '', calculation: 'count(${' + k.name + '})', 'bind::esri:fieldType': 'null' });
        const RS = (OPT.repeatSummaries || {})[k.name]; let rsSuffix = '';
        if (RS && RS.join) { const sn = k.name + '_sum', jf = 'join(\', \', ${' + (RS.label ? 'RowLabel' : RS.join) + '})', mx = RS.max || 36; row({ type: 'calculate', name: sn, label: '', calculation: 'if(count(${' + k.name + "}) > 0, concat(' · ', if(string-length(" + jf + ') > ' + mx + ', concat(substr(' + jf + ', 0, ' + mx + "), '…'), " + jf + ")), '')", 'bind::esri:fieldType': 'null' }); rsSuffix = sn; }
        const withSum = (lb) => rsSuffix ? lb.replace(/<\/span>\s*$/, SUMSPAN(rsSuffix) + '</span>') : lb;
        const hasIM = IM.length && k.name === (OPT.imageMapParent || 'SignParts');
        if (ST) row({ type: 'begin_group', name: 'g_' + k.name, label: withSum(withCnt(st.label.replace(/<span style="font-weight:normal[^"]*">[^<]*<\/span>/, ''))), appearance: collapsed ? 'compact' : '', relevant: visitsEditOnly ? EDIT_MODE : '', 'body::esri:style': st.style || '' });
        if (hasIM) {
          IM.forEach((m) => row({ type: 'select_multiple Parts_' + imKey(m), name: 'Parts_' + imKey(m), label: 'סמן בציור את רכיבי השלט', hint: 'לחיצה על רכיב בציור מסמנת אותו. לכל רכיב שסומן נוצרת שורה.', appearance: 'image-map', relevant: imModelIs(m), 'media::image': m.svg, 'bind::esri:fieldType': 'null' }));
          row({ type: 'calculate', name: 'PartsMapCount', label: '', calculation: IM.map((m) => 'if(' + imModelIs(m) + ', count-selected(${Parts_' + imKey(m) + '}), ').join('') + '0' + IM.map(() => ')').join(''), 'bind::esri:fieldType': 'null' });
          row({ type: 'calculate', name: 'PartsTotal', label: '', calculation: "int(${PartsMapCount})", 'bind::esri:fieldType': 'null' });
          row({ type: 'note', name: 'PartsNote', label: 'רכיבים שסומנו: ${PartsMapCount}.', relevant: '${PartsTotal} > 0', 'bind::esri:fieldType': 'null' });
          rep.open.push(k.name + ': ' + IM.length + ' דגמים עם ציור לבחירת רכיבים (appearance=image-map, קבצי SVG בתיקיית media של הסקר: ' + IM.map((m) => m.svg).join(', ') + '). מספר השורות קבוע (repeat_count = PartsTotal = מספר הרכיבים שסומנו בציור); אין שדה "כמות רכיבים נוספים" (הוסר 24/11 לבקשת אבי קיי). שורות לפי סדר הלחיצה. image-map אינו נתמך באפליקציית הווב. הציורים לפי ספר השילוט, טיוטה עד קטלוג הרכיבים של הלקוח.');
        }
        row({ type: 'begin_repeat', name: k.name, repeat_count: hasIM ? '${PartsTotal}' : '', label: ST ? '<span style="font-weight:normal;font-size:small;color:#6b7280">רשימה (+ הוספה)</span>' : withSum(withCnt(st.label)), appearance: [!ST && collapsed ? 'compact' : '', minimal ? 'minimal' : ''].filter(Boolean).join(' '), relevant: !ST && visitsEditOnly ? EDIT_MODE : '', 'body::esri:style': st.style || '' });
        if (visitLevel && !visitsEditOnly) rep.open.push(k.name + ': רמת הביקור מוצגת תמיד (גם במיפוי שלט חדש). החלטה פתוחה: אם הביקור הראשון נוצר על ידי Make (D28), יש להגביל לעריכה עם options.visitsEditOnly=true.');
        if (visitsEditOnly) rep.open.push(k.name + ': רמת הביקור מוצגת רק בעריכה (' + EDIT_MODE + '), כי במיפוי שלט חדש הביקור הראשון נוצר על ידי Make (D28). דורש אימות ש-pulldata("@property","mode") מחזיר edit בטופס.');
        entityRows(k, depth + 1, false);
        if (keyed[k.name]) row({ type: 'calculate', name: k.name + '_key', label: 'מפתח שורה', calculation: "if(${" + keyed[k.name].f + "} = " + lit(keyed[k.name].v) + ", 'W', 'x')", 'bind::esri:fieldType': 'null' });
        if (ST) {
          const ZB = "'<td', if(position(..) mod 2 = 0, ' bgcolor=\"#eef5f2\"', ''), ";
          const cell = (c) => ZB + "' style=\"text-align:right;\">&nbsp;&nbsp;', " + (c.date ? "if(${" + c.f + "} != '', format-date(${" + c.f + "}, '%d/%m/%Y'), '-')" : "if(${" + c.f + "} != '', ${" + c.f + "}, '-')") + ", '&nbsp;&nbsp;</td>'";
          const cols = ST.cols.slice().reverse();
          row({ type: 'calculate', name: k.name + '_row', label: 'שורת סיכום', calculation: "concat('<tr>', " + cols.map(cell).join(', ') + ", " + ZB + "' style=\"text-align:center;\">&nbsp;', position(..), '&nbsp;</td>', '</tr>')", 'bind::esri:fieldType': 'null' });
        }
        row({ type: 'end_repeat', name: '', label: '' });
        if (keyed[k.name]) row({ type: 'calculate', name: k.name + '_keys', label: 'מפתחות שורות', calculation: "join('', ${" + k.name + "_key})", 'bind::esri:fieldType': 'null' });
        if (ST) {
          const th = (t, al) => "'<th bgcolor=\"#bcdccf\" style=\"color:#1F5A52; text-align:" + (al || 'right') + ";\">&nbsp;&nbsp;" + t + "&nbsp;&nbsp;</th>'";
          const heads = ST.cols.slice().reverse().map((c) => th(c.l)).concat([th('#', 'center')]).join(', ');
          row({ type: 'calculate', name: k.name + '_table', label: 'טבלת סיכום', calculation: "if(count(${" + k.name + "}) > 0, concat('<div style=\"width:100%; text-align:center; direction:rtl;\">', '<h3 style=\"text-align:center; color:#1F5A52;\">" + ST.title + "</h3>', '<table border=\"1\" bordercolor=\"#7fa99b\" cellspacing=\"0\" cellpadding=\"0\" width=\"100%\">', '<tr>', " + heads + ", '</tr>', join('', ${" + k.name + "_row}), '</table></div>'), '')", 'bind::esri:fieldType': 'null' });
          row({ type: 'note', name: k.name + '_table_note', label: '${' + k.name + '_table}', relevant: "count(${" + k.name + "}) > 0" });
        }
        (OPT.duplicateWarnings || []).filter((d) => d.repeat === k.name).forEach((d) => {
          row({ type: 'note', name: k.name + '_dup_' + d.field, label: '<font color="red">' + d.msg + '</font>', relevant: "not(pulldata('@javascript', 'repeats.js', 'distinctCheck', ${" + d.field + "}))" });
          rep.open.push(k.name + '.' + d.field + ': התראת כפילות דרך pulldata("@javascript","repeats.js","distinctCheck") (הקובץ repeats.js בתיקיית scripts של הסקר). Q-025: התראה או constraint.');
        });
        if (ST) row({ type: 'end_group', name: '', label: '' });
      };
      const placed = new Set();
      if (cats) {
        cats.forEach((c, gi) => {
          const fr = fields.filter((f) => f.category === c).map((f) => fieldRow(e, f, depth)).filter(Boolean);
          if (fr.length) {
            const vo = fr.every((r) => r.read_only === 'yes');
            const nm = new Set(fr.map((r) => r.name)), sf = fields.filter((f) => f.category === c && nm.has(f.name));
            const dyn = !vo && sf.length > 0 && sf.every((f) => f.mode === 'אוטומטי' || /קריאה בלבד/.test(f.visible || '') && !/במיפוי: למילוי/.test(f.visible || '') || f.readonlyOnEdit || /בעריכה: קריאה בלבד/.test(f.visible || ''));
            const st = styled('group', c, c + (SY && vo ? ' (לצפייה בלבד)' : ''), SY && SY.groups && SY.groups[c], SY && dyn);
            const GSI = (OPT.groupSummaries || {})[c]; let glabel = st.label;
            if (GSI && GSI.length) { const sn = 'grp_' + (gi + 1) + '_sum'; row({ type: 'calculate', name: sn, label: '', calculation: sumExpr(e, GSI), 'bind::esri:fieldType': 'null' }); glabel += SUMSPAN(sn); }
            const GREL = (OPT.groupRelevant || {})[c]; row({ type: 'begin_group', name: 'grp_' + (gi + 1), label: glabel, 'body::esri:style': st.style || '', appearance: SY && SY.groupAppearance === 'compact' ? 'compact' : '', relevant: GREL ? GREL.replace('{EDIT}', EDIT_MODE) : '' });
            if (GREL) rep.open.push('קבוצה "' + c + '": מוצגת לפי תנאי (' + GREL.replace('{EDIT}', EDIT_MODE) + ').');
            fr.forEach(row);
            row({ type: 'end_group', name: '', label: '' });
          }
          if (e.photos && e.photos.after === c && e.attachments) { const ph = styled('group', 'תמונות', e.photos.label || 'תמונות', SY && SY.groups && SY.groups['תמונות']); row({ type: 'begin_group', name: 'grp_photos', label: ph.label, 'body::esri:style': ph.style || '', appearance: SY && SY.groupAppearance === 'compact' ? 'compact' : '' }); row({ type: 'image', name: 'SignPhotos', label: e.photos.label || 'תמונות', hint: e.photos.hint || '', appearance: 'multiline' }); row({ type: 'end_group', name: '', label: '' }); rep.open.push(e.name + ': שאלת תמונות (image, appearance=multiline) נשמרת כקבצים מצורפים בשכבה; דורש אימות בשליחה ובעריכה ש-Attachments נוצרים ומוצגים.'); }
          kids(e.name).filter((k) => after[k.name] === c).forEach((k) => { kidRows(k); placed.add(k.name); });
        });
        fields.filter((f) => cats.indexOf(f.category) < 0).map((f) => fieldRow(e, f, depth)).filter(Boolean).forEach(row);
      } else fields.map((f) => fieldRow(e, f, depth)).filter(Boolean).forEach(row);
      kids(e.name).filter((k) => !placed.has(k.name)).forEach(kidRows);
    }

    if (SY && SY.map === true) { // מפת הצבעים (צ'יפים) כבויה כברירת מחדל: נראתה צפופה ולא מובנת
      const seq = []; const after = main.repeatAfter || {};
      (main.groupOrder || []).forEach((c) => { seq.push([c, SY.groups && SY.groups[c]]); kids(main.name).filter((k) => after[k.name] === c).forEach((k) => seq.push([k.name, SY.repeats && SY.repeats[k.name]])); });
      kids(main.name).filter((k) => !Object.keys(after).includes(k.name)).forEach((k) => seq.push([k.name, SY.repeats && SY.repeats[k.name]]));
      const chips = seq.filter((x) => x[1]).map((x, i) => '<span style="color:#ffffff;background-color:' + x[1].c + '">' + NB + (i + 1) + ' ' + (x[1].i ? x[1].i + ' ' : '') + (x[1].t || x[0]) + NB + '</span>').join(' ');
      row({ type: 'note', name: 'form_map', label: '<span style="font-weight:bold">צבעי הטופס</span><br/>' + chips + '<br/><span style="font-size:small;color:#555555">גוון קר: קבוצה חד-פעמית. גוון חם: רשימה שחוזרת (+ להוספה)</span>' });
    }
    row({ type: 'geopoint', name: 'location', label: OPT.locationLabel || ('מיקום ' + (main.alias || main.name)), required: 'yes' });
    if (SY) row({ type: 'calculate', name: 'ro_tag', label: '', 'bind::esri:fieldType': 'null', calculation: "if(" + EDIT_MODE + ", ' (לצפייה בלבד)', '')" });
    entityRows(main, 0, true);
    const inForm = new Set([main.name]); (function walk(n) { kids(n).forEach((k) => { inForm.add(k.name); walk(k.name); }); })(main.name);
    S.entities.forEach((e) => { if (!inForm.has(e.name)) rep.lookups.push(e.name + ': לא נכללה בטופס (טבלת עזר).'); });

    // גיליון choices
    const choices = []; let imgs = 0;
    IM.forEach((m) => imParts(m).forEach((x) => choices.push({ list_name: 'Parts_' + imKey(m), name: x.id, label: x.label })));
    const anyExt = [...used].some((k) => dom[k].values.some((v) => v.ext));
    const anyParent = [...used].some((k) => dom[k].values.some((v) => v.parent));
    [...used].forEach((k) => dom[k].values.forEach((v) => {
      const c = { list_name: k, name: v.code, label: v.label || v.code };
      if (v.img) c['media::image'] = String(v.img).split('/').pop();
      if (v.notIn && v.notIn.length) c.excl = v.notIn.join(',');
      if (OPT.excludeMode === 'filter' && dom[k].values.some((q) => q.notIn && q.notIn.length)) {
        const fk = (x) => String(x).split(':')[0].trim(); const fams = ((dom.ModelFamily || {}).values || []).map((q) => q.code);
        c.incl = ',' + fams.filter((x) => !(v.notIn || []).includes(x)).map(fk).join(',') + ',';
      }
      if (anyParent) c.parent = v.parent || '';
      if (anyExt) c.ext = v.ext || '';
      choices.push(c);
      if (v.img) imgs++;
    }));
    if (imgs) rep.open.push('תמונות דגמים: ' + imgs + ' ערכים עם תמונה (עמודת media::image בגיליון choices, שם הקובץ בלבד). יש להעתיק את הקבצים לתיקיית media של פרויקט הטופס. הצגת תמונות ברשימת autocomplete/minimal נתמכת באפליקציית השדה; ב-Survey123 web אינה נתמכת.');
    const anyExcl = choices.some((c) => c.excl) && OPT.excludeMode !== 'filter', anyIncl = choices.some((c) => c.incl), anyImg = choices.some((c) => c['media::image']);
    const cext = (anyParent ? ['parent'] : []).concat(anyExt ? ['ext'] : [], anyImg ? ['media::image'] : [], anyExcl ? ['excl'] : [], anyIncl ? ['incl'] : []);
    /* settings בסגנון Advanced Template: instance_name מזהה כל רשומה בתיבת הדואר (Inbox/Outbox/Sent) לפי מזהה השלט; allow_* נשארים בהגדרות הפרסום */
    const idF = S.sim && S.sim.idField;
    const settings = [Object.assign({ form_title: (S.meta && S.meta.title) || 'סקר', form_id: (S.meta && S.meta.key) || 'survey', version: new Date().toISOString().slice(0, 10).replace(/-/g, ''), submission_url: subUrl }, idF && rows.some((r) => r.name === idF) ? { instance_name: (function () { const has = (n) => rows.some((r) => r.name === n); const opt = (n) => has(n) ? "if(${" + n + "} != '', concat(' | ', ${" + n + "}), '')" : null; const parts = ["if(${" + idF + "} != '', ${" + idF + "}, 'שלט חדש')"].concat((OPT.instanceFields || []).map(opt).filter(Boolean), ["concat(' | ', format-date(now(), '%d/%m/%Y %H:%M'))"]); return 'concat(' + parts.join(', ') + ')'; })() } : {}, OPT.defaultLanguage ? { default_language: OPT.defaultLanguage } : {})];
    rows.forEach((r) => { if (r.required && r.type !== 'begin_repeat' && !r.required_message) r.required_message = 'יש למלא שדה זה'; });
    { /* כרטיס HTML לכתובת היערנית: השדות נשארים (נשמרים בשירות) אך מוסתרים, ומוצגים בכרטיס אחד */
      const AC = OPT.addressCard;
      if (AC && AC.fields && AC.fields.length) {
        const idx = rows.findIndex((r) => r.name === AC.fields[0]);
        if (idx >= 0) {
          const items = AC.fields.map((f) => { const r = rows.find((q) => q.name === f); if (r) r.appearance = 'hidden'; return '<td dir="rtl" width="50%" style="width:50%; padding:8px 10px; vertical-align:top; text-align:right; border-bottom:1px solid #e3ebe7;"><small style="color:#6b8f82;">' + (r ? String(r.label).replace(/<[^>]*>/g, '') : f) + '</small><br><b style="color:#1F5A52;">${' + f + '}</b></td>'; });
          const trs = []; for (let i = 0; i < items.length; i += 2) trs.push('<tr>' + items[i] + (items[i + 1] || '<td></td>') + '</tr>');
          rows.splice(idx, 0, { type: 'note', name: 'AddressCard', label: '<div dir="rtl" style="width:100%; direction:rtl; text-align:right; background-color:#ffffff; border:1px solid #cfdcd6; border-radius:10px;"><table dir="rtl" width="100%" style="width:100%; direction:rtl; border-collapse:collapse;">' + trs.join('') + '</table></div>', 'bind::esri:fieldType': 'null' });
        }
      }
    }
    const BN = S.sim && S.sim.survey123 && S.sim.survey123.banner, TH = S.sim && S.sim.survey123 && S.sim.survey123.theme;
    if (BN && BN.image) { rows.unshift({ type: 'note', name: 'Banner', label: '', 'media::image': BN.image, 'bind::esri:fieldType': 'null' }); rep.open.push('באנר: הקובץ ' + BN.image + ' חייב להיות בתיקיית media של הסקר ב-Connect (Media > Open media folder).'); }
    { /* מקרא צבעי הטופס: צ'יפים בצבעי הקבוצות הראשיות, מיד אחרי הבאנר */
      const chips = []; let dpt = 0;
      rows.forEach((r) => {
        if (r.type === 'begin_group' || r.type === 'begin_repeat') {
          if (dpt === 0 || (dpt === 1 && false)) {
            const st = String(r['body::esri:style'] || ''), bg = (/backgroundColor=(#\w+)/.exec(st) || [])[1], bd = (/borderColor=(#\w+)/.exec(st) || [])[1], tc = (/color:(#\w+)/.exec(r.label || '') || [])[1];
            const txt = String(r.label || '').replace(/\$\{ro_tag\}/g, '').replace(/<[^>]*>/g, '').replace(/\s*\(\+ הוספה\)|^רשימה.*$/, '').trim();
            if (bg && bd && txt) chips.push('<td style="background-color:' + bg + '; border:2px solid ' + bd + '; color:' + (tc || '#333') + '; text-align:center; padding:5px 4px; font-size:13px; font-weight:600;">' + txt + '</td>');
          }
          dpt++;
        } else if (r.type === 'end_group' || r.type === 'end_repeat') dpt--;
      });
      const li = rows.findIndex((r) => r.name === 'location');
      if (chips.length && li >= 0 && OPT.legend !== false) {
        const per = 4, trs = [];
        for (let i = 0; i < chips.length; i += per) { const part = chips.slice(i, i + per); while (part.length < per) part.push('<td></td>'); trs.push('<tr>' + part.join('') + '</tr>'); }
        rows.splice(li, 0, { type: 'note', name: 'ColorLegend', label: '<div style="direction:rtl; font-family:Segoe UI, Arial, sans-serif;"><div style="font-size:13px; color:#6b7280; margin-bottom:3px;">מקרא צבעי הטופס</div><table style="width:100%; border-collapse:separate; border-spacing:4px; direction:rtl;">' + trs.join('') + '</table></div>', 'bind::esri:fieldType': 'null' });
      }
    }
    if (TH) rep.open.push('צבעי כותרת וכותרת תחתונה נקבעים בלוח Style ב-Connect (נשמרים ב-.info של הסקר, לא ב-xlsx): כותרת ' + ((TH.header && TH.header.backgroundColor) || '') + ' עם טקסט ' + ((TH.header && TH.header.textColor) || '') + ', כותרת תחתונה ' + ((TH.footer && TH.footer.backgroundColor) || '') + ' עם טקסט ' + ((TH.footer && TH.footer.textColor) || '') + '.');
    rep.open.push("שם מלא של הממפה והמבקר: pulldata(\"@property\", 'userFullName'). בתצוגה המקדימה של Connect עלול להופיע Unknown; לבדוק באפליקציית השטח.");
    const LNG = ''; /* עמודות טקסט עם שם וקוד שפה, כמו default_language (תיעוד Esri: אותה צורה בכל הגיליון) */
    const cols = ['type', 'name', 'label', 'hint', 'required', 'required_message', 'relevant', 'calculation', 'constraint', 'constraint_message', 'appearance', 'read_only', 'default', 'choice_filter', 'bind::esri:fieldType', 'bind::esri:fieldLength', 'bind::esri:parameters', 'body::esri:style', 'repeat_count', 'media::image'];
    const sheets = [
      { name: 'survey', head: cols.map((c) => LNG && /^(label|hint|required_message|constraint_message)$/.test(c) ? c + '::' + LNG : c), rows: rows.map((r) => cols.map((c) => r[c] || '')) },
      { name: 'choices', head: ['list_name', 'name', LNG ? 'label::' + LNG : 'label'].concat(cext), rows: choices.map((c) => ['list_name', 'name', 'label'].concat(cext).map((k) => c[k] || '')) },
      { name: 'settings', head: Object.keys(settings[0]), rows: [Object.values(settings[0])] }
    ];
    if (SY && SY.groupAppearance === 'compact') rep.open.push('קבוצות עם appearance=compact נפתחות מקופלות. לבדוק שהודעת שדה חובה חסר בתוך קבוצה מקופלת מוצגת למשתמש בשליחה (בשני הערוצים).');
    if (SY) rep.open.push('עיצוב קבוצות וחזרות (צבע, אייקון, מספור): תוויות HTML ו-body::esri:style. מתועד כנתמך באפליקציית השדה; ב-Survey123 web דווח שסגנון עלול להתעלם, לבדוק בשני הערוצים.');
    rep.open.push('Survey123: לכבות את התיקייה "נשלח" (Sent) כשמפעילים Inbox, לפי המלצת Esri, כדי שלא יהיה בלבול עם רשומות קיימות שלא מתרעננות שם. זו הגדרה בסקר ולא ב-XLSForm; לאמת היכן היא מוגדרת.');
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
  /* Survey123 מצפה לגרשיים בודדים ב-instance('X'); גרשיים כפולים גרמו לשגיאת SyntaxError בתצוגה */
  const normQ = (v) => (typeof v === 'string' ? v.replace(/instance\("([^"]+)"\)/g, "instance('$1')") : v);
  function sheetXml(sh) {
    const all = [sh.head].concat(sh.rows);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      all.map((r, ri) => '<row r="' + (ri + 1) + '">' + r.map((v, ci) => (v === '' || v == null ? '' : '<c r="' + colName(ci) + (ri + 1) + '" t="inlineStr"><is><t xml:space="preserve">' + xe(normQ(v)) + '</t></is></c>')).join('') + '</row>').join('') + '</sheetData></worksheet>';
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
