// שימוש: node tools/generate.js [key]   → כותב generated/<key>/ מתוך projects/<key>.schema.js
// בלי ארגומנט: מייצר את כל הפרויקטים שב-projects/manifest.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
require(path.join(root, 'projects', 'manifest.js'));
global.window.PROJECT_FILES.forEach((f) => require(path.join(root, f)));
const Gen = require(path.join(root, 'js', 'generators.js'));
const only = process.argv[2];
let failed = 0;
Object.keys(global.window.SCHEMAS).filter((k) => !only || k === only).forEach((key) => {
  const S = global.window.SCHEMAS[key];
  const issues = Gen.validate(S);
  issues.filter((i) => i.level !== 'info').forEach((i) => console.log(`[${key}] [${i.level}] ${i.where}: ${i.msg}`));
  if (issues.some((i) => i.level === 'error')) { console.error(`[${key}] יש שגיאות — לא נוצרו קבצים`); failed++; return; }
  const out = path.join(root, 'generated', key);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `create_${key}_schema.py`), Gen.arcpy(S), 'utf8');
  fs.writeFileSync(path.join(out, 'data_dictionary.md'), Gen.dictMd(S), 'utf8');
  fs.writeFileSync(path.join(out, 'data_dictionary.csv'), '﻿' + Gen.dictCsv(S), 'utf8');
  console.log(`[${key}] נוצרו קבצים ב-generated/${key}/`);
});
process.exit(failed ? 1 : 0);
