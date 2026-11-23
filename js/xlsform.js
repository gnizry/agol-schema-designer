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
    const row = (r) => { rows.push(r); if (r._after) rows.push(r._after); return r; }; // _after: שורת note נלווית (שומר מקום) מיד אחרי השדה
    const S123 = (S.sim && S.sim.survey123) || {};
    const OPT = S123.options || {};
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
      if (f.calc) r.calculation = f.calc;
      /* כתובת יערנית: pulldata("@layer", "getValueAt") מול שכבת עומדי יער לפי S.sim.survey123.forestLayer; שדה שלא מופה נשאר ריק (בלי שגיאת טופס) */
      if (/<FORESTS_LAYER_URL>/.test(r.calculation)) {
        const src = FL && (FL.url || FL.itemId), fld = FL && FL.fields && FL.fields[f.name];
        if (src && fld) r.calculation = 'pulldata("@layer", "getValueAt", "attributes.' + fld + '", "' + src + '", ${location}, "")';
        else { r.calculation = ''; rep.open.push(where + ': כתובת יערנית אוטומטית טרם מופתה (S.sim.survey123.forestLayer.fields.' + f.name + ' = שם השדה בשכבת עומדי היער). השדה נוצר ריק וקריאה בלבד.'); }
      }
      /* instance("X") על רשימה ריקה (טרם נמסרה) גורם לשגיאת טעינה: נפילה לשם המשתמש המחובר */
      const inst = /instance\("([^"]+)"\)/.exec(r.calculation || '');
      if (inst && f.domain === inst[1] && !d && /username/.test(r.calculation)) { r.calculation = 'once(pulldata("@property", "username"))'; rep.open.push(where + ': הרשימה ' + inst[1] + ' טרם נמסרה, לכן השדה מקבל את שם המשתמש המחובר. כשהרשימה תימסר יש להחזיר בחירה מרשימה.'); }
      if (f.relExpr) r.relevant = f.relExpr;
      if (f.placeholderNote) r._after = { type: 'note', name: f.name + '_ph', label: '<span style="color:#9ca3af;font-size:small">' + f.placeholderNote + '</span>', relevant: f.placeholderWhen || '' };
      if (f.calc) { /* בוצע למעלה */ }
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
      if (f.hint) r.hint = f.hint;
      if (f.editOnly) { r.relevant = r.relevant ? '(' + r.relevant + ') and ' + EDIT_MODE : EDIT_MODE; r.read_only = 'yes'; rep.open.push(where + ': מוצג רק בעריכה (' + EDIT_MODE + ') וקריאה בלבד; מתעדכן על ידי Make מהדיווח האחרון על הרכיב. דורש אימות ש-pulldata("@property","mode") עובד ב-relevant בתוך Repeat.'); }
      if (f.fromVisit) rep.open.push(where + ': מתעדכן על ידי Make (D28) מהביקור האחרון, לא מהטופס.');
      // רשימה מדורגת (ערכי הדומיין כוללים parent): choice_filter לפי שדה האב באותה ישות
      if (d && d.values.some((v) => v.parent)) {
        const parents = new Set(d.values.map((v) => v.parent).filter(Boolean));
        const pf = e.fields.find((x) => x.domain && x.domain !== f.domain && dom[x.domain] && dom[x.domain].values.some((v) => parents.has(v.code)));
        if (pf) r.choice_filter = 'parent=${' + pf.name + '}'; else rep.open.push(where + ': רשימה מדורגת ללא שדה אב באותה ישות; choice_filter לא הוגדר.');
      }
      if (d && d.values.some((v) => v.notIn && v.notIn.length)) {
        const pf2 = f.notInParent || 'ModelFamily';
        if (OPT.excludeMode === 'filter') {
          r.choice_filter = (r.choice_filter ? r.choice_filter + ' and ' : '') + "(${" + pf2 + "}='' or not(contains(excl, ${" + pf2 + "})))";
          rep.open.push(where + ': סינון ערכים לפי משפחת הדגם (עמודת excl, choice_filter). מצב filter: ברשימה בתוך Repeat הסינון מול שדה מחוץ ל-Repeat גרם לרשימה ריקה בבדיקה ב-Connect.');
        } else {
          /* ברירת מחדל: הרשימה מלאה (dropdown רגיל) והחסימה בפועל ב-constraint, כי choice_filter מול שדה שמחוץ ל-Repeat החזיר רשימה ריקה */
          const parts = d.values.filter((v) => v.notIn && v.notIn.length).map((v) => '(. = ' + lit(v.code) + ' and (' + v.notIn.map((x) => '${' + pf2 + '} = ' + lit(x)).join(' or ') + '))');
          r.constraint = (r.constraint ? r.constraint + ' and ' : '') + 'not(' + parts.join(' or ') + ')';
          r.constraint_message = 'ערך זה אינו מתאים למשפחת הדגם שנבחרה';
          rep.open.push(where + ': הגבלת ערכים לפי משפחת הדגם (פ-1 ללא כנף, לפי דרישת הלקוח) מוגדרת כ-constraint ולא כסינון הרשימה. שאר הקטלוג חסר.');
        }
      }
      if (f.autoIncrement) {
        const path = '/data/' + e.name + '/' + f.name;
        r.default = 'if(count(' + path + "[.!=''])=0, 1, max(" + path + "[.!=''])+1)";
        rep.open.push(where + ': ברירת מחדל max+1 (' + r.default + '). הנתיב המלא /data/... מניח ששורש הטופס הוא data. לאמת בטופס אמיתי, כולל התנהגות בעריכה של שלט עם כנפיים קיימות.');
      }
      if (f.uniqueInParent) {
        const path = '/data/' + e.name + '/' + f.name;
        r.constraint = 'count(' + path + '[.=current()])=1';
        r.constraint_message = f.constraintMsg || 'הערך כבר קיים';
        rep.open.push(where + ': בדיקת כפילות (constraint עם current()) בתוך השלט. לאמת בטופס אמיתי.');
      }
      rep.included.push(where);
      return r;
    }

    function entityRows(e, depth, isMain) {
      const cats = isMain && e.groupOrder ? e.groupOrder : null;
      const fields = e.fields;
      const after = e.repeatAfter || {}; // { ילד: קבוצה } - ה-Repeat מוצג מיד אחרי הקבוצה
      const kidRows = (k) => {
        const visitLevel = !!kids(k.name).length || /Visit/i.test(k.name);
        const st = styled('repeat', k.name, k.alias || k.name, SY && SY.repeats && SY.repeats[k.name]);
        const visitsEditOnly = visitLevel && OPT.visitsEditOnly === true; // ברירת מחדל: ה-Repeat של הביקורים תמיד מוצג (S.sim.survey123.options.visitsEditOnly=true מחזיר הצגה בעריכה בלבד)
        row({ type: 'begin_repeat', name: k.name, label: st.label, relevant: visitsEditOnly ? EDIT_MODE : '', 'body::esri:style': st.style || '' });
        if (visitLevel && !visitsEditOnly) rep.open.push(k.name + ': רמת הביקור מוצגת תמיד (גם במיפוי שלט חדש). החלטה פתוחה: אם הביקור הראשון נוצר על ידי Make (D28), יש להגביל לעריכה עם options.visitsEditOnly=true.');
        if (visitsEditOnly) rep.open.push(k.name + ': רמת הביקור מוצגת רק בעריכה (' + EDIT_MODE + '), כי במיפוי שלט חדש הביקור הראשון נוצר על ידי Make (D28). דורש אימות ש-pulldata("@property","mode") מחזיר edit בטופס.');
        entityRows(k, depth + 1, false);
        row({ type: 'end_repeat', name: '', label: '' });
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
            row({ type: 'begin_group', name: 'grp_' + (gi + 1), label: st.label, 'body::esri:style': st.style || '', appearance: SY && SY.groupAppearance === 'compact' ? 'compact' : '' });
            fr.forEach(row);
            row({ type: 'end_group', name: '', label: '' });
          }
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
    row({ type: 'geopoint', name: 'location', label: 'מיקום ' + (main.alias || main.name), required: 'yes' });
    if (SY) row({ type: 'calculate', name: 'ro_tag', label: '', calculation: "if(" + EDIT_MODE + ", ' (לצפייה בלבד)', '')" });
    entityRows(main, 0, true);
    const inForm = new Set([main.name]); (function walk(n) { kids(n).forEach((k) => { inForm.add(k.name); walk(k.name); }); })(main.name);
    S.entities.forEach((e) => { if (!inForm.has(e.name)) rep.lookups.push(e.name + ': לא נכללה בטופס (טבלת עזר).'); });

    // גיליון choices
    const choices = []; let imgs = 0;
    const anyExt = [...used].some((k) => dom[k].values.some((v) => v.ext));
    const anyParent = [...used].some((k) => dom[k].values.some((v) => v.parent));
    [...used].forEach((k) => dom[k].values.forEach((v) => {
      const c = { list_name: k, name: v.code, label: v.label || v.code };
      if (v.img) c['media::image'] = String(v.img).split('/').pop();
      if (v.notIn && v.notIn.length) c.excl = v.notIn.join('|');
      if (anyParent) c.parent = v.parent || '';
      if (anyExt) c.ext = v.ext || '';
      choices.push(c);
      if (v.img) imgs++;
    }));
    if (imgs) rep.open.push('תמונות דגמים: ' + imgs + ' ערכים עם תמונה (עמודת media::image בגיליון choices, שם הקובץ בלבד). יש להעתיק את הקבצים לתיקיית media של פרויקט הטופס. הצגת תמונות ברשימת autocomplete/minimal נתמכת באפליקציית השדה; ב-Survey123 web אינה נתמכת.');
    const anyExcl = choices.some((c) => c.excl), anyImg = choices.some((c) => c['media::image']);
    const cext = (anyParent ? ['parent'] : []).concat(anyExt ? ['ext'] : [], anyImg ? ['media::image'] : [], anyExcl ? ['excl'] : []);
    /* settings בסגנון Advanced Template: instance_name מזהה כל רשומה בתיבת הדואר (Inbox/Outbox/Sent) לפי מזהה השלט; allow_* נשארים בהגדרות הפרסום */
    const idF = S.sim && S.sim.idField;
    const settings = [Object.assign({ form_title: (S.meta && S.meta.title) || 'סקר', form_id: (S.meta && S.meta.key) || 'survey', version: new Date().toISOString().slice(0, 10).replace(/-/g, ''), submission_url: subUrl }, idF && rows.some((r) => r.name === idF) ? { instance_name: '${' + idF + '}' } : {})];
    rows.forEach((r) => { if (r.required && r.type !== 'begin_repeat' && !r.required_message) r.required_message = 'יש למלא שדה זה'; });
    const cols = ['type', 'name', 'label', 'hint', 'required', 'required_message', 'relevant', 'calculation', 'constraint', 'constraint_message', 'appearance', 'read_only', 'default', 'choice_filter', 'bind::esri:fieldType', 'bind::esri:fieldLength', 'bind::esri:parameters', 'body::esri:style', 'repeat_count'];
    const sheets = [
      { name: 'survey', head: cols, rows: rows.map((r) => cols.map((c) => r[c] || '')) },
      { name: 'choices', head: ['list_name', 'name', 'label'].concat(cext), rows: choices.map((c) => ['list_name', 'name', 'label'].concat(cext).map((k) => c[k] || '')) },
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
