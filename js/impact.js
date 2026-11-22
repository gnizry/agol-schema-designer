/* ניתוח השפעה של בקשת שינוי, והחלה על הסכמה.
   הניתוח נשען על הסכמה עצמה: שדות, דומיינים, קשרים, אוטומציות, שאלות והחלטות פתוחות.
   החלה אוטומטית נתמכת לשדה חדש ולערך חדש בדומיין; שאר השינויים מקבלים רשימת משימות. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const W = { type: 'field', entity: '', name: '', alias: '', ftype: 'TEXT', length: '255', domain: '', category: '', mode: 'ידני', source: '', title: '', domName: '', code: '', parent: '', desc: '', result: null };
  const TYPES = { field: 'שדה חדש / שאלה חדשה בטופס', domainValue: 'ערך חדש בדומיין (רשימת בחירה)', entity: 'טבלה או שכבה חדשה', other: 'שינוי אחר (תיאור חופשי)' };
  const FT = { TEXT: 'טקסט', SHORT: 'מספר שלם קצר', LONG: 'מספר שלם', FLOAT: 'מספר עשרוני', DOUBLE: 'מספר עשרוני (כפול)', DATE: 'תאריך', GUID: 'GUID' };
  const ent = (S, n) => S.entities.find((e) => e.name === n);
  const isLayer = (e) => ['point', 'line', 'polygon'].indexOf(e && e.kind) >= 0;
  const mainOf = (S) => S.entities.find((e) => e.kind === 'point') || S.entities[0];
  const blob = (o) => { try { return JSON.stringify(o || ''); } catch (e) { return ''; } };
  const usedBy = (S, dom) => { const r = []; S.entities.forEach((e) => e.fields.forEach((f) => { if (f.domain === dom) r.push(e.name + '.' + f.name); })); return r; };
  /* שאלות והחלטות שקשורות במונחים */
  function related(S, terms) {
    const t = terms.filter(Boolean).map((x) => String(x).toLowerCase()), out = [];
    (S.questions || []).forEach((q) => { if (q.status !== 'answered' && t.some((x) => (q.q + ' ' + q.proposal).toLowerCase().indexOf(x) >= 0)) out.push(q.id + ' (שאלה פתוחה)'); });
    (S.decisions || []).forEach((d) => { if (t.some((x) => ((d.title || '') + ' ' + (d.note || '')).toLowerCase().indexOf(x) >= 0)) out.push((d.id || '') + (d.status === 'open' ? ' (החלטה פתוחה)' : ' (החלטה)')); });
    return out.slice(0, 8);
  }
  const autoMentions = (S, terms) => (S.automations || []).filter((a) => terms.filter(Boolean).some((x) => blob(a).indexOf(x) >= 0)).map((a) => a.title);
  const inRich = (S, names) => names.filter(Boolean).some((n) => blob(S.sim && S.sim.rich).indexOf('"' + n + '"') >= 0);

  /* מחזיר { ok, errs[], summary, approach, items:[{comp, what, h:[min,max], auto?}], related, hours:[min,max], apply:bool } */
  function analyze(S, r, opt) {
    opt = opt || {}; const items = [], errs = [], warn = [];
    const add = (comp, what, min, max, auto) => items.push({ comp, what, h: [min, max], auto: !!auto });
    let summary = '', approach = '', terms = [], apply = false;
    if (r.type === 'field') {
      const e = ent(S, r.entity);
      if (!e) errs.push('יש לבחור ישות.');
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(r.name || '')) errs.push('שם השדה חייב להיות באנגלית (אותיות וספרות, מתחיל באות).');
      if (e && e.fields.some((f) => f.name.toLowerCase() === String(r.name).toLowerCase())) errs.push('שדה בשם הזה כבר קיים בישות.');
      if (!r.alias) errs.push('יש להזין כינוי בעברית.');
      if (errs.length) return { ok: false, errs };
      const main = e === mainOf(S), layer = isLayer(e), par = S.relationships.find((x) => x.destination === e.name), dom = r.domain && S.domains[r.domain];
      terms = [r.name, r.alias, r.domain];
      summary = 'שדה "' + r.alias + '" (' + r.name + ', ' + (FT[r.ftype] || r.ftype) + (r.ftype === 'TEXT' ? ', ' + r.length + ' תווים' : '') + ') ב-' + (e.alias || e.name) + (par ? ' (טבלה מקושרת לשלט, מוצגת כחזרה בטופס)' : layer ? ' (שכבה ראשית)' : '') + '.';
      approach = 'מוסיפים את השדה לסכמה בקבוצה "' + (r.category || 'כללי') + '"; הכלי מעדכן את הסימולטור, ה-XLSForm, מילון הנתונים ומסמך האפיון. באונליין מוסיפים את השדה לשירות המתארח (בלי מחיקה או יצירה מחדש של השכבה), ואחר כך מפרסמים מחדש את הטופס מעל אותה שכבה.';
      if (!opt.fromOnline) add('שירות AGOL (שכבה/טבלה)', 'הוספת השדה ' + r.name + ' לישות ' + e.name + ' בשירות המתארח (Item ← Data ← Fields ← Add, או addToDefinition), כולל הדומיין אם יש', 0.5, 1);
      if (r.domain && !dom) add('דומיין', 'יצירת הדומיין ' + r.domain + ' בסכימה ובשירות וקביעת ערכיו', 1, 2);
      add('Survey123', 'ייצור XLSForm מחדש מהכלי, בדיקה ופרסום מחדש מעל אותה שכבה. רשומות קיימות יציגו את השדה ריק', 1, 2);
      add('Field Maps', 'הוספת השדה לטופס העריכה של ' + (layer ? 'השכבה' : 'הטבלה') + ' (בקבוצה המתאימה), והעתקת הגדרות מפה אם נדרש אופליין מחדש', 0.5, 1.5);
      if (main || inRich(S, [e.name]) || par) add('פופאפ (Arcade)', 'להחליט אם השדה מוצג בפופאפ; אם כן, לעדכן את ביטוי ה-Arcade (RTL, inline styles, בדיקה ב-Field Maps)', 0.5, 2);
      const au = autoMentions(S, [e.name, r.name]);
      if (au.length) add('Make', 'לבדוק אם התרחישים (' + au.join(', ') + ') צריכים לקרוא או להעתיק את השדה החדש', 1, 3);
      if (main) add('הסבה', 'אם השדה מגיע מהשכבה הישנה: להוסיף מיפוי למחברת ההסבה ולרשימת ערכי ההמרה', 1, 3);
      add('דוחות ודשבורדים', 'לבדוק אם השדה נדרש בדוחות (שבועי/יומי), ברשימות ובסינונים', 0.5, 2);
      add('בדיקות', 'בדיקה בטופס ובשדה: יצירה, עריכה של רשומה קיימת, ואופליין', 1, 2);
      add('תיעוד', 'מסמך אפיון, מילון נתונים והעתק השותפים (מתעדכנים מהכלי)', 0.25, 0.5, true);
      apply = !!e;
    } else if (r.type === 'domainValue') {
      const d = S.domains[r.domName];
      if (!d) errs.push('יש לבחור דומיין.');
      if (!r.code) errs.push('יש להזין ערך.');
      if (d && (d.values || []).some((v) => v.code === r.code || v.label === r.code)) errs.push('הערך כבר קיים ברשימה.');
      if (errs.length) return { ok: false, errs };
      const uses = usedBy(S, r.domName), hasParent = (d.values || []).some((v) => v.parent);
      terms = [r.domName].concat(uses.map((u) => u.split('.')[1]));
      summary = 'ערך חדש "' + r.code + '" ברשימה ' + r.domName + (d.desc ? ' (' + d.desc + ')' : '') + ', שבשימוש ב-' + uses.length + ' שדות: ' + uses.join(', ') + '.';
      approach = 'מוסיפים את הערך לדומיין בסכימה (קוד ותווית זהים, לפי כללי העיצוב). באונליין מעדכנים את הדומיין בכל שדה שמשתמש בו. הטופס, מילון הנתונים והאפיון מתעדכנים מהכלי.' + (hasParent ? ' הרשימה היררכית: יש לציין לאיזה ערך הורה הערך שייך.' : '');
      if (hasParent && !r.parent) warn.push('הרשימה מדורגת (parent). בלי ערך הורה הערך יופיע לכל בחירה.');
      if (!opt.fromOnline) add('שירות AGOL', 'הוספת הערך לדומיין בכל ' + uses.length + ' השדות בשירות (Fields ← Domain), או updateDefinition', 0.25 * Math.max(1, uses.length), 0.5 * Math.max(1, uses.length));
      add('Survey123', 'עדכון גיליון choices (ייצור מהכלי) ופרסום מחדש. אם יש תמונה לערך: הוספה לתיקיית media', 0.5, 1);
      add('Field Maps', 'הערך נטען מהדומיין של השכבה; במפות עם אזורים אופליין יש להוריד מחדש. לוודא שערך חדש לא נשבר בסימבולוגיה', 0.25, 1);
      if (inRich(S, uses.map((u) => u.split('.')[1]))) add('פופאפ (Arcade) וסימבולוגיה', 'השדה מוצג בפופאפ העשיר: לבדוק צבעי מצב, תגיות וכללי תצוגה שמזכירים ערכים מהרשימה', 0.5, 1.5);
      const au = autoMentions(S, terms);
      if (au.length) add('Make', 'לבדוק סינונים או מיפוי ערכים בתרחישים (' + au.join(', ') + ')', 0.5, 1.5);
      add('הסבה', 'אם הערך קיים בנתונים ההיסטוריים: לעדכן את טבלת ההמרה במחברת', 0.5, 1.5);
      add('תיעוד', 'מסמך אפיון ומילון נתונים (מהכלי)', 0.25, 0.5, true);
      apply = true;
    } else if (r.type === 'entity') {
      if (!r.title) return { ok: false, errs: ['יש לתאר את הטבלה או השכבה הנדרשת.'] };
      terms = [r.title];
      summary = 'ישות חדשה: ' + r.title + '. שינוי מבני: טבלה מקושרת, קשר חדש ופריטים נלווים.';
      approach = 'לא מוחל אוטומטית. מומלץ לפתוח כבקשה מתוכננת: להגדיר את הישות והקשר בסכימה (עם GlobalID/ParentGlobalID), להוסיף את הטבלה לשירות, ולבדוק אם היא חזרה בטופס או פעולה נפרדת. לשקול אם אפשר להסתפק בשדות חדשים בישות קיימת (עיקרון: מינימום טבלאות מקושרות).';
      add('סכימה', 'הגדרת הישות, השדות, הקשר והדומיינים', 1, 3);
      add('שירות AGOL', 'הוספת טבלה וקשר לשירות (addToDefinition), הרשאות, אחסון קבצים', 1, 3);
      add('Survey123', 'חזרה חדשה בטופס, עריכה בינה לבין הביקור, בדיקות הקינון', 3, 6);
      add('Field Maps', 'טופס, רשומות קשורות בפופאפ וקישורי עומק', 3, 6);
      add('Make', 'תרחישים חדשים או הרחבה של קיימים', 2, 6);
      add('הסבה', 'אם יש נתוני מקור: מיפוי למחברת', 2, 6);
      add('בדיקות ותיעוד', 'בדיקות שטח ועדכון האפיון', 2, 4);
    } else {
      if (!r.title) return { ok: false, errs: ['יש לתאר את הבקשה.'] };
      terms = String(r.title + ' ' + (r.desc || '')).split(/\s+/).filter((x) => x.length > 3);
      summary = r.title;
      approach = 'לא ניתן לנתח אוטומטית. רשימת הבדיקה הכללית מוצעת למטה; יש להשלים אותה לפי מהות הבקשה.';
      add('סכימה', 'האם הבקשה משנה שדות, דומיינים, קשרים או כללי תצוגה/חובה?', 0.5, 2);
      add('Survey123', 'האם הטופס משתנה (שאלות, סדר, חובה, תנאי הצגה)?', 0.5, 3);
      add('Field Maps ופופאפ', 'האם הטופס, המפה, הפופאפ או הקישורים משתנים?', 0.5, 3);
      add('Make', 'האם תרחיש אוטומציה מושפע?', 0.5, 3);
      add('הסבה', 'האם ההסבה מושפעת?', 0, 2);
      add('דוחות ודשבורדים', 'האם דוח, דשבורד או סימבולוגיה מושפעים?', 0, 2);
      add('בדיקות ותיעוד', 'בדיקה ועדכון תיעוד', 0.5, 1.5);
    }
    const hours = items.reduce((a, x) => [a[0] + x.h[0], a[1] + x.h[1]], [0, 0]);
    return { ok: true, errs: [], warn, summary, approach, items, related: related(S, terms), hours, apply };
  }

  /* מחיל על הסכמה (שדה / ערך). מחזיר טקסט תיאור. */
  function apply(S, r) {
    if (r.type === 'field') {
      const e = ent(S, r.entity);
      const f = { category: r.category || (e.fields[0] && e.fields[e.fields.length - 1].category) || 'כללי', name: r.name, alias: r.alias, type: r.ftype, length: r.ftype === 'TEXT' ? String(r.length || '255') : '', domain: r.domain || '', mode: r.mode || 'ידני', visible: 'תמיד', open: false, note: r.desc || ('נוסף בבקשת שינוי ' + (r.crId || '')) };
      if (r.domain && !S.domains[r.domain]) S.domains[r.domain] = { name: r.domain, desc: r.alias, fieldType: 'TEXT', values: [] };
      e.fields.push(f); return 'נוסף השדה ' + e.name + '.' + r.name;
    }
    if (r.type === 'domainValue') {
      const d = S.domains[r.domName]; d.values.push({ code: r.code, label: r.code, parent: r.parent || '' }); return 'נוסף הערך "' + r.code + '" ל-' + r.domName;
    }
    return '';
  }

  function bump(S) { S.meta.version = (+S.meta.version || 1) + 1; return S.meta.version; }
  window.Impact = { W, TYPES, FT, analyze, apply, bump, usedBy, ent, esc };
})();
