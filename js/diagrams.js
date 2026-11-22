/* תרשימים: ERD, רכיבי הפתרון, תהליכים (זרימת משתמש / זרימת נתונים).
   ה-ERD נגזר אוטומטית מהסכימה. רכיבי הפתרון והתהליכים נקראים מהבלוק האופציונלי S.diagrams בקובץ הסכימה
   (components, flows). ללא הבלוק מוצג ERD + רכיבים בסיסיים בלבד. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const st = { detail: 'std', flow: 0, S: null };
  const ENT_KIND = { point: 'שכבה נקודתית', table: 'טבלה', line: 'שכבה קווית', polygon: 'שכבת פוליגון' };

  const CSS = `
  .dgbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px}
  .dgbar .seg button{border-radius:0;margin:0 -1px 0 0}.dgbar .seg button.on{background:var(--g1);border-color:var(--g5);color:var(--g9);font-weight:700}
  .dgwrap{overflow:auto;background:#fff;border:1px solid var(--s2);border-radius:10px;padding:16px}
  .dgroot{position:relative;display:inline-block;min-width:100%;direction:rtl}
  .dgroot svg.dge{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2}
  .dgroot .dgl{position:absolute;z-index:3;font-size:11px;background:#fff;border:1px solid var(--s2);border-radius:9px;padding:0 6px;color:var(--s7);white-space:nowrap;transform:translate(-50%,-50%)}
  .dgrow{display:flex;justify-content:center;gap:70px;margin-bottom:90px;position:relative;z-index:1}
  .dgrow:last-child{margin-bottom:0}
  .erd{width:310px;background:#fff;border:1.5px solid var(--s7);border-radius:8px;overflow:hidden;font-size:12px}
  .erd .h{background:var(--g9);color:#fff;padding:6px 10px;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
  .erd .h small{opacity:.8}.erd .h b{font-size:13px}
  .erd .r{display:flex;gap:6px;align-items:center;padding:2px 10px;border-top:1px solid var(--s1)}
  .erd .r .fn{direction:ltr;font-family:Consolas,monospace;font-size:11px;min-width:105px;text-align:left}
  .erd .r .fa{flex:1;color:var(--s5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .erd .r.k{background:#fffbeb}.erd .r.more{color:var(--s5);font-style:italic;justify-content:center}
  .bd{font-size:9px;border-radius:3px;padding:0 4px;color:#fff;background:var(--s5)}
  .bd.pk{background:#b45309}.bd.fk{background:#2563eb}.bd.d{background:#7c3aed}.bd.rq{background:var(--r)}.bd.c{background:#0d9488}
  .lay{display:flex;gap:10px;margin-bottom:70px;position:relative;z-index:1}.lay:last-child{margin-bottom:0}
  .lay .lt{flex:none;width:92px;writing-mode:horizontal-tb;background:var(--s1);border:1px solid var(--s2);border-radius:8px;padding:8px;font-weight:700;color:var(--s7);display:flex;align-items:center}
  .lay .ln{flex:1;display:flex;flex-wrap:wrap;gap:50px;justify-content:center;align-items:flex-start;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 8px,#fff 8px,#fff 16px);border-radius:8px;padding:10px}
  .dgn{border:1.5px solid var(--s7);border-radius:8px;background:#fff;padding:8px 10px;min-width:170px;max-width:260px;font-size:12px;position:relative}
  .dgn b{display:block;font-size:13px;margin-bottom:2px}.dgn small{color:var(--s5);display:block}
  .dgn.actor{background:#fef3c7;border-color:#b45309;border-radius:20px}.dgn.app{background:#dbeafe;border-color:#2563eb}
  .dgn.data{background:#d1fae5;border-color:var(--g7)}.dgn.logic{background:#ede9fe;border-color:#7c3aed}
  .dgn.ext{background:var(--s1);border-color:var(--s5)}.dgn.report{background:#cffafe;border-color:#0891b2}
  .agt{border-collapse:collapse;width:100%;min-width:0;margin-top:14px;font-size:12px}.agt th,.agt td{border:1px solid var(--s7);padding:4px 8px;text-align:right;vertical-align:top;position:static;text-transform:none;letter-spacing:0;font-size:12px}.agt th{background:var(--s1);color:inherit}.agt tr.g td{background:#f1f5f9;font-weight:700}
  .tag.exists{background:#16a34a}.tag.pub{background:#2563eb}
  .dgn.planned,.dgn.open,.st.planned,.st.open{border-style:dashed}
  .dgn.live{border-color:#16a34a;box-shadow:0 0 0 3px #bbf7d0}.dgn.gone{border-color:#dc2626;box-shadow:0 0 0 3px #fecaca}.dgn .itb{font-size:11px;margin-top:4px}.dgn .itb a{color:#1d4ed8}
  .dgn .chip{display:inline-block;margin:2px 2px 0 0;background:#fff;border:1px solid var(--g7);border-radius:9px;padding:0 6px;font-size:10px}
  .tag{display:inline-block;font-size:9px;border-radius:3px;padding:0 4px;margin-right:4px;vertical-align:middle;color:#fff}
  .tag.planned{background:#64748b}.tag.open{background:#d97706}
  .swim{display:grid;position:relative;direction:rtl}
  .swim .lane{z-index:0}.swim .lane.a{background:#f8fafc}.swim .lane.b{background:#fff}
  .swim .ll{z-index:1;padding:8px;font-weight:700;color:var(--s7);display:flex;align-items:center;border-left:2px solid var(--s2);background:var(--s1)}
  .swim .cell{z-index:1;display:flex;align-items:center;justify-content:center;padding:22px 20px}
  .st{background:#fff;border:1.5px solid var(--s7);border-radius:8px;padding:6px 9px;font-size:12px;width:156px;text-align:right}
  .st.start,.st.end{border-radius:20px;background:#d1fae5;border-color:var(--g7);font-weight:700}.st.end{background:#e2e8f0;border-color:var(--s7)}
  .st.decision{background:#fef3c7;border-color:#b45309;clip-path:none;border-radius:4px;transform:none}
  .st.decision::before{content:"◆ ";color:#b45309}
  .st.data{background:#d1fae5;border-color:var(--g7)}.st small{display:block;color:var(--s5);margin-top:2px;font-size:10.5px}
  .st .chip{display:inline-block;margin:2px 2px 0 0;background:#fff;border:1px solid var(--g7);border-radius:9px;padding:0 6px;font-size:10px}
  .lg{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--s7);margin-top:8px;align-items:center}
  .lg i{display:inline-block;width:14px;height:10px;border:1.5px solid var(--s7);border-radius:3px;margin-left:4px;vertical-align:middle}
  .dgempty{padding:30px;text-align:center;color:var(--s5)}
  @media print{header,nav,.dgbar{display:none!important}.dgwrap{border:0;overflow:visible}}`;
  if (!document.getElementById('dg-css')) { const s = document.createElement('style'); s.id = 'dg-css'; s.textContent = CSS; document.head.appendChild(s); }

  const D = (S) => S.diagrams || {};
  const tag = (s) => s === 'planned' ? '<span class="tag planned">מתוכנן</span>' : s === 'open' ? '<span class="tag open">פתוח</span>' : '';

  /* ---------- ERD ---------- */
  function levels(S) {
    const rels = S.relationships || [], lv = {};
    const up = (n, d) => (d > 10 ? 0 : (rels.filter((r) => r.destination === n).reduce((m, r) => Math.max(m, up(r.origin, d + 1) + 1), 0)));
    S.entities.forEach((e) => { lv[e.name] = up(e.name, 0); });
    return lv;
  }
  function erdBox(S, e) {
    const rels = S.relationships || [], asDest = rels.filter((r) => r.destination === e.name);
    const row = (fn, fa, bs, k) => `<div class="r${k ? ' k' : ''}"><span class="fn">${esc(fn)}</span><span class="fa">${esc(fa || '')}</span>${bs}</div>`;
    let rows = row('GlobalID', 'מזהה גלובלי', '<span class="bd pk">PK</span>', 1);
    asDest.forEach((r) => { rows += row(r.destKey, 'מפתח זר ← ' + r.origin, '<span class="bd fk">FK</span>', 1); });
    const isShown = (f) => st.detail === 'all' || (st.detail === 'std' && (f.domain || f.required || f.reqIf || f.derive || f.calc || f.autoValue || f.fromVisit));
    const fs = e.fields.filter((f) => f.name !== 'GlobalID' && !asDest.some((r) => r.destKey === f.name));
    const shown = fs.filter(isShown);
    shown.forEach((f) => {
      const b = (f.domain ? `<span class="bd d" title="${esc(f.domain)}">דומיין</span>` : '') + ((f.required || f.reqIf) ? '<span class="bd rq">חובה</span>' : '') + ((f.calc || f.derive || f.autoValue || f.fromVisit) ? '<span class="bd c">מחושב</span>' : '');
      rows += row(f.name, f.alias, b);
    });
    if (fs.length - shown.length > 0) rows += `<div class="r more">+ ${fs.length - shown.length} שדות נוספים</div>`;
    return `<div class="erd" data-id="${esc(e.name)}"><div class="h"><span><b>${esc(e.alias)}</b> <small dir="ltr">${esc(e.name)}</small></span><small>${esc(ENT_KIND[e.kind] || e.kind || '')} · ${e.fields.length}</small></div>${rows}</div>`;
  }
  function erdPage(S) {
    const lv = levels(S), rels = S.relationships || [], max = Math.max(0, ...Object.values(lv));
    const linked = new Set(rels.flatMap((r) => [r.origin, r.destination]));
    const rowsE = [];
    for (let i = 0; i <= max; i++) { const es = S.entities.filter((e) => lv[e.name] === i && (linked.has(e.name) || (i > 0))); if (es.length) rowsE.push(es); }
    const iso = S.entities.filter((e) => !linked.has(e.name));
    if (iso.length) rowsE.push(iso);
    const edges = rels.map((r) => ({ from: r.origin, to: r.destination, label: (r.forward || r.name) + ' · 1:N' + (r.type === 'COMPOSITE' ? ' · מורכב' : ''), cls: r.type === 'COMPOSITE' ? 'solid' : 'solid', m1: '1', m2: 'N' }));
    const seg = (k, t) => `<button class="${st.detail === k ? 'on' : ''}" onclick="DG.detail('${k}')">${t}</button>`;
    return `<div class="dgbar"><span class="seg">${seg('keys', 'מפתחות בלבד')}${seg('std', 'מפתחות + דומיינים/חובה/מחושב')}${seg('all', 'כל השדות')}</span>
      <button onclick="DG.mermaid('erd')">העתק Mermaid</button><button onclick="window.print()">הדפס / PDF</button></div>
      <div class="dgwrap"><div class="dgroot" data-edges='${esc(JSON.stringify(edges)).replace(/'/g, '&#39;')}' data-mode="bez">${rowsE.map((r) => `<div class="dgrow">${r.map((e) => erdBox(S, e)).join('')}</div>`).join('')}<svg class="dge"></svg></div></div>
      <div class="lg"><span><span class="bd pk">PK</span> מפתח ראשי</span><span><span class="bd fk">FK</span> מפתח זר (קשר לפי GlobalID)</span><span><span class="bd d">דומיין</span> רשימת בחירה</span><span><span class="bd c">מחושב</span> ערך אוטומטי / נגזר</span><span><span class="bd rq">חובה</span></span><span>1:N = רשומת אב אחת, רשומות בן רבות. "מורכב" = מחיקת אב מוחקת את הבנים.</span></div>`;
  }

  /* ---------- רכיבי הפתרון ---------- */
  function compData(S) {
    const c = D(S).components;
    if (c) return c;
    return { layers: [{ id: 'data', title: 'שכבת נתונים (AGOL)' }], nodes: [{ id: 'svc', layer: 'data', kind: 'data', title: 'Hosted Feature Layer', items: ['@entities'] }], edges: [] };
  }
  function agolDiagramHtml(S) {
    const its = D(S).agolItems || []; if (!its.length || !its[0].id) return '';
    const dep = (S.deployments || []).some((d) => d && d.serviceUrl);
    const grid = its.every((x) => Array.isArray(x.pos));
    const IX = window.Items, nodeHtml = (n) => { const lv = IX ? IX.nodeCls(S, n) : ''; const stt = (n.deploy && dep) || lv === 'live' ? '' : n.status === 'planned' || n.status === 'open' ? n.status : ''; return `<div class="dgn ${esc(n.kind || 'app')} ${stt} ${lv}" data-id="ag_${esc(n.id)}" title="${esc(n.role || '')}"${grid ? ' style="width:190px"' : ''}><b>${tag(stt)}${esc(n.title)}</b><small>${esc(n.type)}</small>${IX ? IX.badge(S, n) : ''}</div>`; };
    const edges = []; its.forEach((n) => (n.links || []).forEach((l) => { const v = window.Items ? window.Items.edge(S, n.id, l.to) : ''; edges.push({ from: 'ag_' + n.id, to: 'ag_' + l.to, label: (l.label || '') + (v === 'ok' ? ' ✓' : v === 'no' ? ' (לא נמצא באונליין)' : ''), cls: v === 'ok' ? 'solid' : v === 'no' ? 'dash' : l.status === 'planned' || l.status === 'open' ? 'dash' : 'solid' }); }));
    const head = '<h3 style="margin:16px 0 6px">פריטי ArcGIS Online והקשרים ביניהם</h3>' + (window.Items ? window.Items.panel(S) : '');
    if (grid) {
      /* פריסה קבועה (pos: [עמודה, שורה]) שנבחרה כך שאין קווים החוצים תיבות או קווים אחרים; העמודות מהופכות לקריאה מימין לשמאל */
      const CW = 270, CH = 135, cols = Math.max(...its.map((x) => x.pos[0])) + 1, rows = Math.max(...its.map((x) => x.pos[1])) + 1;
      const cells = its.map((n) => `<div style="position:absolute;left:${(cols - 1 - n.pos[0]) * CW}px;top:${n.pos[1] * CH}px;width:${CW}px;height:${CH}px;display:flex;align-items:center;justify-content:center">${nodeHtml(n)}</div>`).join('');
      return `${head}<div class="dgwrap"><div class="dgroot" data-edges='${esc(JSON.stringify(edges)).replace(/'/g, '&#39;')}' data-mode="grid"><div style="position:relative;width:${cols * CW}px;height:${rows * CH}px;margin:0 auto">${cells}</div><svg class="dge"></svg></div></div>
      <div class="lg"><span><i style="background:#fef3c7"></i>משתמשים</span><span><i style="background:#dbeafe"></i>אפליקציות</span><span><i style="background:#d1fae5"></i>נתונים</span><span><i style="background:#ede9fe"></i>לוגיקה ואוטומציה</span><span><i style="background:#cffafe"></i>דוחות</span><span><i style="background:var(--s1)"></i>חיצוני / קיים</span><span><i style="border-style:dashed"></i>מתוכנן או פתוח (קו מקווקו)</span><span><i style="border-color:#16a34a"></i>קיים באונליין</span><span><i style="border-color:#dc2626"></i>מקושר אך לא נמצא</span><span>✓ ליד קשר = אומת מול האונליין</span><span>ריחוף על פריט מציג את תפקידו</span></div>`;
    }
    const groups = []; its.forEach((x) => { if (!groups.includes(x.group)) groups.push(x.group); });
    const lay = groups.map((g) => `<div class="lay"><div class="lt">${esc(g)}</div><div class="ln">${its.filter((n) => n.group === g).map(nodeHtml).join('')}</div></div>`).join('');
    return `${head}<div class="dgwrap"><div class="dgroot" data-edges='${esc(JSON.stringify(edges)).replace(/'/g, '&#39;')}' data-mode="bez">${lay}<svg class="dge"></svg></div></div>`;
  }
  function agolItemsHtml(S) {
    const its = D(S).agolItems || []; if (!its.length) return '';
    const dep = (S.deployments || []).filter((d) => d && d.serviceUrl);
    const lab = { exists: ['exists', 'קיים'], planned: ['planned', 'מתוכנן'], open: ['open', 'פתוח'] };
    let last = '', rows = '';
    its.forEach((x) => {
      if (x.group !== last) { last = x.group; rows += `<tr class="g"><td colspan="5">${esc(x.group)}</td></tr>`; }
      let st2 = lab[x.status] || lab.planned, link = '';
      if (x.deploy && dep.length) { st2 = ['pub', 'פורסם']; link = dep.map((d) => d.itemPage ? `<br><a href="${esc(d.itemPage)}" target="_blank" rel="noopener">${esc(d.title || d.service || 'פריט')}${d.org ? ' · ' + esc(d.org) : ''}</a>` : '').join(''); }
      rows += `<tr><td>${esc(x.type)}</td><td><b>${esc(x.title)}</b>${link}</td><td>${esc(x.role || '')}</td><td><span class="tag ${st2[0]}" style="margin:0">${st2[1]}</span></td><td>${window.Items ? window.Items.cell(S, x) : ''}</td></tr>`;
    });
    return `<h3 style="margin:16px 0 0">פריטי ArcGIS Online התומכים בפתרון</h3><table class="agt"><thead><tr><th>סוג פריט</th><th>פריט</th><th>תפקיד</th><th>סטטוס בתכנון</th><th>הפריט באונליין</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function compPage(S) {
    const c = compData(S), nodes = c.nodes || [];
    const nodeHtml = (n) => {
      const items = (n.items || []).flatMap((i) => i === '@entities' ? S.entities.map((e) => e.alias + ' · ' + e.name) : i === '@domains' ? [Object.keys(S.domains || {}).length + ' דומיינים'] : [i]);
      return `<div class="dgn ${esc(n.kind || 'app')} ${esc(n.status || '')}" data-id="${esc(n.id)}"><b>${tag(n.status)}${esc(n.title)}</b>${n.sub ? `<small>${esc(n.sub)}</small>` : ''}${items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>`;
    };
    const lay = (c.layers || []).map((l) => `<div class="lay"><div class="lt">${esc(l.title)}</div><div class="ln">${nodes.filter((n) => n.layer === l.id).map(nodeHtml).join('')}</div></div>`).join('');
    const edges = (c.edges || []).map((e) => ({ from: e.from, to: e.to, label: e.label, cls: e.status === 'planned' || e.status === 'open' ? 'dash' : 'solid' }));
    return `<div class="dgbar"><button onclick="DG.mermaid('comp')">העתק Mermaid</button><button onclick="window.print()">הדפס / PDF</button></div>
      <div class="dgwrap"><div class="dgroot" data-edges='${esc(JSON.stringify(edges)).replace(/'/g, '&#39;')}' data-mode="bez">${lay}<svg class="dge"></svg></div></div>
      <div class="lg"><span><i style="background:#fef3c7"></i>משתמשים</span><span><i style="background:#dbeafe"></i>אפליקציות</span><span><i style="background:#d1fae5"></i>נתונים</span><span><i style="background:#ede9fe"></i>לוגיקה ואוטומציה</span><span><i style="background:#cffafe"></i>דוחות והתראות</span><span><i style="background:var(--s1)"></i>חיצוני / קיים</span><span><i style="border-style:dashed"></i>מתוכנן או פתוח (קו מקווקו)</span></div>${agolDiagramHtml(S)}${agolItemsHtml(S)}`;
  }

  /* ---------- תהליכים (swimlane) ---------- */
  function flowCols(f) {
    const steps = f.steps, byId = {}, li = {}; f.lanes.forEach((l, i) => { li[l.id] = i; });
    steps.forEach((s) => { byId[s.id] = s; s._next = (s.next || []).map((x) => typeof x === 'string' ? { to: x } : x); });
    const preds = {}; steps.forEach((s) => s._next.forEach((n) => { (preds[n.to] = preds[n.to] || []).push(s.id); }));
    const col = {}, occ = {};
    /* צעד בנתיב סמוך יכול לשבת באותו טור (חץ אנכי); באותו נתיב או בנתיב רחוק עובר לטור הבא */
    const place = (s, stack) => {
      if (col[s.id] != null) return col[s.id];
      if (stack.includes(s.id)) return 0;
      let c = Math.max(0, ...((preds[s.id] || []).filter((p) => !stack.includes(p)).map((p) => { const ps = byId[p], pc = place(ps, stack.concat(s.id)); return pc + (ps.lane === s.lane || Math.abs(li[ps.lane] - li[s.lane]) > 1 ? 1 : 0); })));
      while (occ[s.lane + ':' + c]) c++;
      occ[s.lane + ':' + c] = 1; col[s.id] = c; return c;
    };
    steps.forEach((s) => place(s, []));
    return col;
  }
  function flowsPage(S) {
    const fl = D(S).flows || [];
    if (!fl.length) return '<div class="dgwrap dgempty">אין תהליכים מוגדרים בסכימה זו. מוסיפים בלוק <code>diagrams.flows</code> בקובץ הסכימה (שלב א\' מוגדר בדוגמה בפרויקט signage).</div>';
    if (st.flow >= fl.length) st.flow = 0;
    const f = fl[st.flow], col = flowCols(f), ncol = Math.max(...Object.values(col)) + 1, laneIdx = {};
    f.lanes.forEach((l, i) => { laneIdx[l.id] = i; });
    const tabs = fl.map((x, i) => `<button class="${i === st.flow ? 'on' : ''}" onclick="DG.flow(${i})">${esc(x.title)}</button>`).join('');
    const grid = `grid-template-columns:130px repeat(${ncol},196px);grid-template-rows:repeat(${f.lanes.length},minmax(110px,auto))`;
    let h = '';
    f.lanes.forEach((l, i) => { h += `<div class="lane ${i % 2 ? 'b' : 'a'}" style="grid-row:${i + 1};grid-column:1/-1"></div><div class="ll" style="grid-row:${i + 1};grid-column:1">${esc(l.label)}</div>`; });
    f.steps.forEach((s) => {
      const chips = (s.ent || []).map((e) => `<span class="chip">${esc(e)}</span>`).join('');
      h += `<div class="cell" style="grid-row:${laneIdx[s.lane] + 1};grid-column:${col[s.id] + 2}"><div class="st ${esc(s.type || 'task')} ${esc(s.status || '')}" data-id="${esc(s.id)}">${tag(s.status)}${esc(s.text)}${s.note ? `<small>${esc(s.note)}</small>` : ''}${chips}</div></div>`;
    });
    const edges = []; f.steps.forEach((s) => s._next.forEach((n) => edges.push({ from: s.id, to: n.to, label: n.label || '', cls: n.status === 'planned' || (f.steps.find((t) => t.id === n.to) || {}).status === 'planned' ? 'dash' : 'solid' })));
    return `<div class="dgbar"><span class="seg">${tabs}</span><button onclick="DG.mermaid('flow')">העתק Mermaid</button><button onclick="window.print()">הדפס / PDF</button></div>
      ${f.desc ? `<p class="hint" style="margin:0 0 8px">${esc(f.desc)}</p>` : ''}
      <div class="dgwrap"><div class="dgroot" data-mode="swim" data-edges='${esc(JSON.stringify(edges)).replace(/'/g, '&#39;')}'><div class="swim" style="${grid}">${h}</div><svg class="dge"></svg></div></div>
      <div class="lg"><span><i style="background:#d1fae5;border-radius:9px"></i>התחלה</span><span><i style="background:#fff"></i>פעולה</span><span><i style="background:#fef3c7"></i>החלטה (כן / לא)</span><span><i style="background:#d1fae5"></i>נתונים נכתבים לשכבה</span><span><i style="background:#e2e8f0;border-radius:9px"></i>סיום</span><span><i style="border-style:dashed"></i>מתוכנן או פתוח</span><span>הקריאה מימין לשמאל; כל שורה היא גורם (אדם, אפליקציה או מערכת).</span></div>`;
  }

  /* קווים ישרים בין תיבות בפריסת רשת: מתחילים וממשיכים בגבול התיבה, ולכן לא עוברים דרכה */
  function drawGrid(root, svg, edges, R) {
    let out = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#334155"/></marker></defs>';
    const labels = [];
    edges.forEach((e) => {
      const a = R(e.from), b = R(e.to); if (!a || !b) return;
      const dx = b.cx - a.cx, dy = b.cy - a.cy, ln = Math.hypot(dx, dy) || 1;
      const t = (r) => Math.min(dx ? (r.w / 2 + 3) / Math.abs(dx) : 1e9, dy ? (r.h / 2 + 3) / Math.abs(dy) : 1e9);
      const ta = t(a), tb = t(b), x1 = a.cx + dx * ta, y1 = a.cy + dy * ta, x2 = b.cx - dx * tb, y2 = b.cy - dy * tb;
      out += `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${e.cls === 'dash' ? '#64748b' : '#334155'}" stroke-width="1.6" ${e.cls === 'dash' ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#ar)"/>`;
      if (e.label && Math.hypot(x2 - x1, y2 - y1) > 95) labels.push([(x1 + x2) / 2, (y1 + y2) / 2, e.label]);
    });
    svg.innerHTML = out;
    labels.forEach((l) => { const s = document.createElement('span'); s.className = 'dgl'; s.style.left = l[0] + 'px'; s.style.top = l[1] + 'px'; s.textContent = l[2]; root.appendChild(s); });
  }

  /* ---------- ציור קווי חיבור (לאחר שה-DOM נבנה) ---------- */
  function draw() {
    document.querySelectorAll('.dgroot').forEach((root) => {
      const svg = root.querySelector('svg.dge'); if (!svg) return;
      let edges = []; try { edges = JSON.parse(root.dataset.edges || '[]'); } catch (e) { /* ignore */ }
      root.querySelectorAll('.dgl').forEach((x) => x.remove());
      const W = root.scrollWidth, H = root.scrollHeight, box = root.getBoundingClientRect();
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const R = (id) => { const el = root.querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, w: r.width, h: r.height, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 }; };
      if (root.dataset.mode === 'grid') { drawGrid(root, svg, edges, R); return; }
      const swim = root.dataset.mode === 'swim';
      const items = edges.map((e, i) => ({ e, i, a: R(e.from), b: R(e.to) })).filter((x) => x.a && x.b);
      /* פיזור נקודות יציאה/כניסה לאורך אותו צד של תיבה */
      const port = {}; const stepsR = swim ? [...root.querySelectorAll('.st')].map((el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.id, l: r.left - box.left, r: r.right - box.left, cy: r.top - box.top + r.height / 2 }; }) : [];
      /* קשר בתוך אותו נתיב שדולג מעל צעדים אחרים: עוקף מלמטה */
      items.forEach((x) => { if (swim && Math.abs(x.a.cy - x.b.cy) < 20) { const lo = Math.min(x.a.cx, x.b.cx), hi = Math.max(x.a.cx, x.b.cx); x.skip = stepsR.some((t) => t.id !== x.e.from && t.id !== x.e.to && Math.abs(t.cy - x.a.cy) < 20 && (t.l + t.r) / 2 > lo && (t.l + t.r) / 2 < hi); } });
      const side = (x) => {
        if (x.skip) return ['b', 'b'];
        if (swim) { const dx = x.b.cx - x.a.cx; if (Math.abs(dx) < 30) return [x.b.cy > x.a.cy ? 'b' : 't', x.b.cy > x.a.cy ? 't' : 'b']; return dx < 0 ? ['l', 'r'] : ['r', 'l']; }
        if (x.b.t > x.a.b - 8) return ['b', 't']; if (x.b.b < x.a.t + 8) return ['t', 'b']; return x.b.cx < x.a.cx ? ['l', 'r'] : ['r', 'l'];
      };
      items.forEach((x) => { x.s = side(x); (port[x.e.from + '|' + x.s[0]] = port[x.e.from + '|' + x.s[0]] || []).push({ x, k: 'o' }); (port[x.e.to + '|' + x.s[1]] = port[x.e.to + '|' + x.s[1]] || []).push({ x, k: 'i' }); });
      Object.keys(port).forEach((k) => { const arr = port[k]; const sd = k.split('|')[1], vert = sd === 'l' || sd === 'r'; arr.sort((p, q) => { const o = (z) => { const t = z.k === 'o' ? z.x.b : z.x.a; return vert ? t.cy : t.cx; }; return o(p) - o(q); }); arr.forEach((p, i) => { p['f' + p.k] = (i + 1) / (arr.length + 1); }); });
      const pt = (r, s, f) => s === 'b' ? [r.l + r.w * f, r.b] : s === 't' ? [r.l + r.w * f, r.t] : s === 'l' ? [r.l, r.t + r.h * f] : [r.r, r.t + r.h * f];
      let out = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#334155"/></marker></defs>';
      const labels = [];
      const own = {};
      items.forEach((x) => {
        const po = port[x.e.from + '|' + x.s[0]].find((p) => p.x === x && p.k === 'o'), pi = port[x.e.to + '|' + x.s[1]].find((p) => p.x === x && p.k === 'i');
        const [x1, y1] = pt(x.a, x.s[0], po.fo), [x2, y2] = pt(x.b, x.s[1], pi.fi);
        let d, lx, ly;
        if (x.skip) {
          own.skip = (own.skip || 0) + 1; const yb = Math.max(y1, y2) + 16 + (own.skip - 1) * 9;
          d = `M${x1} ${y1}V${yb}H${x2}V${y2}`; lx = (x1 + x2) / 2; ly = yb;
        } else if (swim && (x.s[0] === 'l' || x.s[0] === 'r')) {
          own[x.e.from] = (own[x.e.from] || 0) + 1;
          const xm = (x1 + x2) / 2 + (own[x.e.from] - 1) * 9;
          d = `M${x1} ${y1}H${xm}V${y2}H${x2}`; if (Math.abs(y2 - y1) > 20) { lx = xm; ly = (y1 + y2) / 2; } else { lx = x1 + (xm - x1) * 0.5; ly = y1 - 9; }
        } else if (x.s[0] === 'l' || x.s[0] === 'r') {
          const xm = (x1 + x2) / 2; d = `M${x1} ${y1}C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`; lx = xm; ly = (y1 + y2) / 2;
        } else if (swim) {
          d = `M${x1} ${y1}V${y2}`.replace(/V.*/, `L${x2} ${y2}`); lx = (x1 + x2) / 2 + 12; ly = (y1 + y2) / 2;
        } else {
          const ym = (y1 + y2) / 2; d = `M${x1} ${y1}C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}`; lx = (x1 + x2) / 2; ly = ym;
        }
        out += `<path d="${d}" fill="none" stroke="${x.e.cls === 'dash' ? '#64748b' : '#334155'}" stroke-width="1.6" ${x.e.cls === 'dash' ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#ar)"/>`;
        if (x.e.m1) out += `<text x="${x1 + 5}" y="${y1 + (x.s[0] === 'b' ? 14 : -5)}" font-size="11" font-weight="700" fill="#b45309">${x.e.m1}</text><text x="${x2 + 5}" y="${y2 + (x.s[1] === 't' ? -6 : 14)}" font-size="11" font-weight="700" fill="#b45309">${x.e.m2}</text>`;
        if (x.e.label) labels.push([lx, ly, x.e.label]);
      });
      svg.innerHTML = out;
      labels.forEach((l) => { const s = document.createElement('span'); s.className = 'dgl'; s.style.left = l[0] + 'px'; s.style.top = l[1] + 'px'; s.textContent = l[2]; root.appendChild(s); });
    });
  }

  /* ---------- יצוא Mermaid (להדבקה במסמכי Markdown; GitHub מציג אותו כתרשים) ---------- */
  const q = (s) => '"' + String(s == null ? '' : s).replace(/"/g, "'") + '"';
  function mermaid(kind) {
    const S = st.S, id = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');
    if (kind === 'erd') {
      let o = 'erDiagram\n';
      (S.relationships || []).forEach((r) => { o += `  ${id(r.origin)} ||--o{ ${id(r.destination)} : ${q(r.forward || r.name)}\n`; });
      S.entities.forEach((e) => { o += `  ${id(e.name)} {\n    string GlobalID PK\n` + (S.relationships || []).filter((r) => r.destination === e.name).map((r) => `    string ${r.destKey} FK\n`).join('') + '  }\n'; });
      return o;
    }
    if (kind === 'comp') {
      const c = compData(S); let o = 'flowchart TB\n';
      (c.layers || []).forEach((l) => { o += `  subgraph ${id(l.id)}[${q(l.title)}]\n` + (c.nodes || []).filter((n) => n.layer === l.id).map((n) => `    ${id(n.id)}[${q(n.title)}]\n`).join('') + '  end\n'; });
      (c.edges || []).forEach((e) => { o += `  ${id(e.from)} ${e.status ? '-.->' : '-->'}${e.label ? '|' + q(e.label) + '|' : ''} ${id(e.to)}\n`; });
      return o;
    }
    const f = (D(S).flows || [])[st.flow]; if (!f) return '';
    let o = 'flowchart RL\n';
    f.lanes.forEach((l) => { o += `  subgraph ${id(l.id)}[${q(l.label)}]\n    direction RL\n` + f.steps.filter((s) => s.lane === l.id).map((s) => `    ${id(s.id)}${s.type === 'decision' ? '{' + q(s.text) + '}' : s.type === 'start' || s.type === 'end' ? '([' + q(s.text) + '])' : '[' + q(s.text) + ']'}\n`).join('') + '  end\n'; });
    f.steps.forEach((s) => (s.next || []).forEach((n) => { const t = typeof n === 'string' ? { to: n } : n; o += `  ${id(s.id)} -->${t.label ? '|' + q(t.label) + '|' : ''} ${id(t.to)}\n`; }));
    return o;
  }

  window.Diagrams = {
    page(S, kind) { st.S = S; return kind === 'erd' ? erdPage(S) : kind === 'comp' ? compPage(S) : flowsPage(S); },
    after() { draw(); },
    count(S) { return { flows: (D(S).flows || []).length, nodes: ((D(S).components || {}).nodes || []).length }; }
  };
  window.DG = {
    detail(k) { st.detail = k; window.A.refresh(); },
    flow(i) { st.flow = i; window.A.refresh(); },
    mermaid(kind) { const t = '```mermaid\n' + mermaid(kind) + '```\n'; const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); const el = document.getElementById('toast'); if (el) { el.textContent = 'קוד Mermaid הועתק. מדביקים בקובץ Markdown בריפו'; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 2500); } }
  };
  window.addEventListener('resize', () => { if (document.querySelector('.dgroot')) draw(); });
})();
