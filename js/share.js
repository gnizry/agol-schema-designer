/* ייצוא סימולטור לשותפים: קובץ HTML יחיד (כל הקוד, הסכמה והתמונות מוטמעים), ללא שרת וללא התחברות.
   באותו קובץ (מצב __SIM_ONLY) מופעל גם כפתור "הערות" שאוסף משוב ומוריד אותו כקובץ טקסט להחזרה למפתח. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function toast(msg) { const t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 4000); }
  function download(name, text, mime, bom) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([(bom ? '﻿' : '') + text], { type: (mime || 'text/plain') + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  const slug = (s) => String(s || '').replace(/[^A-Za-z0-9_\-֐-׿]+/g, '_').slice(0, 40);

  /* ---------- מצב קובץ משותף: משוב ---------- */
  function initSimOnly() {
    document.body.classList.add('simonly');
    const S = window.__designer && window.__designer.S, meta = (S && S.meta) || {};
    const h1 = document.querySelector('header h1'); if (h1) h1.textContent = 'סימולטור חוויית משתמש';
    document.title = 'סימולטור · ' + (meta.title || '');
    const lay = document.querySelector('.layout');
    if (lay) lay.insertAdjacentHTML('beforebegin', '<div style="background:#EFF6FF;border-bottom:1px solid #BFDBFE;color:#1E3A8A;padding:8px 20px;font-size:13px;line-height:1.6">סימולטור לשיתוף דעות: אפשר ללחוץ, למלא ולשלוח בחופשיות. שום דבר לא נשמר ולא נשלח לשום מקום; רענון הדף מאפס הכול. הערות נרשמות בכפתור "הערות" ומורדות כקובץ להחזרה. סכמה v' + esc(meta.version || '?') + (window.__BUILT ? ' · נוצר ' + esc(window.__BUILT) : '') + '</div>');
    const notes = [];
    const box = document.createElement('div'); box.id = 'fbk';
    document.body.appendChild(box);
    let open = false, who0 = '';
    const ctx = () => {
      const tab = document.querySelector('.simtop .seg.lg button.on'), stp = document.querySelector('.stp.on span');
      return [tab ? tab.textContent.trim() : '', stp ? stp.textContent.trim() : ''].filter(Boolean).join(' › ');
    };
    const draw = () => {
      box.innerHTML = (open ? `<div class="pn" dir="rtl"><div style="font-weight:700;margin-bottom:6px">הערה על מה שאתה רואה עכשיו</div><div style="font-size:12px;color:#64748B;margin-bottom:6px">מיקום: ${esc(ctx() || 'כללי')}</div><textarea id="fbk-t" placeholder="מה לא ברור, מה מסורבל, מה חסר?"></textarea><div style="display:flex;gap:6px;margin-top:6px"><button id="fbk-add" class="primary" style="flex:1">הוסף הערה</button></div><div style="margin-top:8px;font-size:12px;color:#475569">${notes.length ? 'נרשמו ' + notes.length + ' הערות' : 'עוד לא נרשמו הערות'}</div><input id="fbk-n" type="text" placeholder="השם שלך (לא חובה)" value="${esc(who0)}" style="width:100%;box-sizing:border-box;margin-top:6px"><button id="fbk-dl" style="width:100%;margin-top:6px" ${notes.length ? '' : 'disabled'}>הורד קובץ משוב</button></div>` : '') + `<button class="fab" id="fbk-b">💬 הערות${notes.length ? ' (' + notes.length + ')' : ''}</button>`;
      $('fbk-b').onclick = () => { open = !open; draw(); };
      if (!open) return;
      $('fbk-n').oninput = (e) => { who0 = e.target.value; };
      $('fbk-add').onclick = () => { const t = $('fbk-t').value.trim(); if (!t) return; notes.push({ ctx: ctx() || 'כללי', text: t }); draw(); };
      $('fbk-dl').onclick = () => {
        const who = who0;
        const txt = 'משוב על הסימולטור: ' + (meta.title || '') + ' (סכמה v' + (meta.version || '?') + ')\r\nשם: ' + who + '\r\n\r\n' + notes.map((n, i) => (i + 1) + '. [' + n.ctx + ']\r\n' + n.text).join('\r\n\r\n') + '\r\n';
        download('feedback-' + slug(meta.key) + (who ? '-' + slug(who) : '') + '.txt', txt, 'text/plain', true);
      };
    };
    draw();
  }
  if (window.__SIM_ONLY) { initSimOnly(); return; }

  /* ---------- ייצוא ---------- */
  async function toDataUrl(src) {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = src; });
    const k = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }
  const jsonEmbed = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  async function build() {
    const D = window.__designer, S = D && D.S;
    if (!S) throw new Error('אין סכמה פעילה');
    const files = ['js/generators.js', 'js/sim.js', 'js/diagrams.js', 'js/app.js', 'js/share.js'];
    let src;
    try {
      src = await Promise.all(files.map((f) => fetch(f, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(f); return r.text(); })));
    } catch (e) {
      throw new Error('הייצוא דורש פתיחה מכתובת האתר (GitHub Pages), לא מקובץ מקומי. ' + (e.message || ''));
    }
    const media = {}; let miss = 0;
    const rels = new Set();
    Object.values(S.domains || {}).forEach((d) => (d.values || []).forEach((v) => { if (v.img) rels.add(v.img); }));
    for (const rel of rels) {
      try { const u = window.Media && Media.resolver ? await Media.resolver(rel) : null; if (!u) { miss++; continue; } media[rel] = await toDataUrl(u); } catch (e) { miss++; }
    }
    const now = new Date(), built = now.toLocaleDateString('he-IL') + ' ' + now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const css = [...document.querySelectorAll('head style')].map((s) => s.textContent).join('\n');
    const links = [...document.querySelectorAll('head link[rel=stylesheet],head link[rel=preconnect]')].map((l) => l.outerHTML).join('\n');
    const header = document.querySelector('header').outerHTML.replace(/<small id="subtitle">[\s\S]*?<\/small>/, '<small id="subtitle"></small>');
    const code = src.map((t) => '<script>\n' + t.replace(/<\/script/gi, '<\\/script') + '\n</script>').join('\n');
    const html = '<!DOCTYPE html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>סימולטור · ' + esc(S.meta.title || S.meta.key) + '</title>\n' + links + '\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + header + '\n<div class="layout"><nav id="nav"></nav><main id="main"></main></div>\n<div id="toast"></div>\n<script>\nwindow.__SIM_ONLY = true; window.__BUILT = ' + jsonEmbed(built) + '; window.__MEDIA = ' + jsonEmbed(media) + ';\nwindow.SCHEMAS = window.SCHEMAS || {}; window.SCHEMAS[' + jsonEmbed(S.meta.key) + '] = ' + jsonEmbed(S) + ';\n</script>\n' + code + '\n</body>\n</html>\n';
    return { html, name: 'simulator-' + slug(S.meta.key) + '-v' + (S.meta.version || 1) + '.html', images: Object.keys(media).length, missing: miss, kb: Math.round(html.length / 1024) };
  }
  window.Share = { build };
  const b = $('b-share');
  if (b) b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await build();
      download(r.name, r.html, 'text/html');
      toast('הקובץ הורד (' + r.kb + ' KB, ' + r.images + ' תמונות' + (r.missing ? ', ' + r.missing + ' תמונות לא נטענו: פתח את תיקיית הפרויקט לפני הייצוא' : '') + ')');
    } catch (e) { toast('שגיאת ייצוא: ' + e.message); } finally { b.disabled = false; }
  };
})();
