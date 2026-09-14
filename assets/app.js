/* The Stray Alliance — shared app logic. Static data, everything computed client-side. */

(function () {
  "use strict";

  const DATA = window.CLAN_DATA || { clans: {} };
  const MANUAL = window.MANUAL || { tickets: {}, weeks: {} };

  const META = {
    apaw: { id: "apaw", name: "aPAWcalypse MEOW", short: "aPAW", mono: "aPAW" },
    soc: { id: "soc", name: "StraytOuttaCompton", short: "SOC", mono: "SOC" },
  };
  const CLAN_IDS = ["apaw", "soc"];
  const TOP_N = 30;

  /* ---------- helpers ---------- */

  const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-US"));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function fmtDate(iso, long) {
    const [y, m, d] = iso.split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return long ? `${monthsLong[m - 1]} ${d}, ${y}` : `${months[m - 1]} ${d}`;
  }

  function playerLink(cid, name) {
    return `<a class="plink" href="players.html#${cid}:${encodeURIComponent(name)}" title="View player history">${esc(name)}</a>`;
  }

  function placeChip(p) {
    if (!p) return '<span class="place px">—</span>';
    const cls = { "1st": "p1", "2nd": "p2", "3rd": "p3", "4th": "p4" }[p] || "px";
    return `<span class="place ${cls}">${esc(p)}</span>`;
  }

  /* ---------- stats ---------- */

  function clanWeeks(cid) { return (DATA.clans[cid] && DATA.clans[cid].weeks) || []; }
  function latestWeek(cid) { const w = clanWeeks(cid); return w[w.length - 1] || null; }
  function manualWeek(cid, date) { return (MANUAL.weeks[cid] || {})[date] || null; }

  // ticket columns come from the Excel Results sheet (via data.js)
  function clanTickets(cid) {
    const t = DATA.clans[cid] && DATA.clans[cid].tickets;
    return t != null ? t : MANUAL.tickets[cid];
  }

  // P1 leaderboard for a week: sorted desc, rank + counting flag
  function p1Board(week) {
    const rows = week.players
      .filter((p) => p.p1 != null)
      .slice()
      .sort((a, b) => b.p1 - a.p1)
      .map((p, i) => ({ name: p.name, score: p.p1, rank: i + 1, counting: i < TOP_N }));
    return rows;
  }

  function dayBoard(week, d) {
    if (!week.dayTracked[d]) return null;
    return week.players
      .filter((p) => p.days[d] != null)
      .slice()
      .sort((a, b) => b.days[d] - a.days[d])
      .map((p, i) => ({ name: p.name, score: p.days[d], rank: i + 1, counting: i < TOP_N }));
  }

  function weekSummary(week) {
    const board = p1Board(week);
    const top = board.slice(0, TOP_N);
    const bossSent = top.reduce((s, r) => s + r.score, 0);
    const cutoff = board.length >= TOP_N ? board[TOP_N - 1].score : (board.length ? board[board.length - 1].score : null);
    const dayTotals = [0, 1, 2].map((d) => {
      const b = dayBoard(week, d);
      return b ? b.slice(0, TOP_N).reduce((s, r) => s + r.score, 0) : null;
    });
    return { bossSent, cutoff, members: week.players.length, dayTotals };
  }

  // Per-player aggregate stats across all weeks of a clan
  function playerStats(cid) {
    const weeks = clanWeeks(cid);
    const map = new Map();
    weeks.forEach((week, wi) => {
      const board = p1Board(week);
      const rankOf = new Map(board.map((r) => [r.name, r]));
      const dayBoards = [0, 1, 2].map((d) => dayBoard(week, d));
      const dayRank = dayBoards.map((b) => (b ? new Map(b.map((r) => [r.name, r])) : null));

      week.players.forEach((p) => {
        let s = map.get(p.name);
        if (!s) {
          s = { name: p.name, weeks: 0, p1s: [], p1Ranks: [], top30P1: 0, battle: [], top30Battle: 0, battleDaysTracked: 0, battleDaysHit: 0, recent: [], lastWeekIdx: -1, current: null };
          map.set(p.name, s);
        }
        s.weeks++;
        s.lastWeekIdx = wi;
        if (p.p1 != null) {
          s.p1s.push(p.p1);
          const r = rankOf.get(p.name);
          if (r) { s.p1Ranks.push(r.rank); if (r.counting) s.top30P1++; }
        }
        let hitAll = true, anyTracked = false;
        [0, 1, 2].forEach((d) => {
          if (!week.dayTracked[d]) return;
          anyTracked = true;
          s.battleDaysTracked++;
          const v = p.days[d];
          if (v != null && v > 0) { s.battleDaysHit++; s.battle.push(v); } else { hitAll = false; }
          const dr = dayRank[d] && dayRank[d].get(p.name);
          if (dr && dr.counting) s.top30Battle++;
        });
        s.recent.push(anyTracked ? (hitAll ? 1 : 0) : null); // 1 full, 0 missed something, null untracked week
      });
    });

    const latest = weeks.length - 1;
    const latestBoard = latest >= 0 ? p1Board(weeks[latest]) : [];
    const curRank = new Map(latestBoard.map((r) => [r.name, r]));

    return [...map.values()].map((s) => {
      const cur = curRank.get(s.name);
      const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
      return {
        name: s.name,
        onRoster: s.lastWeekIdx === latest,
        weeks: s.weeks,
        curP1: cur ? cur.score : null,
        curRank: cur ? cur.rank : null,
        avgP1: avg(s.p1s),
        bestP1: s.p1s.length ? Math.max(...s.p1s) : null,
        top30P1: s.top30P1,
        avgBattle: avg(s.battle),
        bestBattle: s.battle.length ? Math.max(...s.battle) : null,
        top30Battle: s.top30Battle,
        partPct: s.battleDaysTracked ? Math.round((100 * s.battleDaysHit) / s.battleDaysTracked) : null,
        recent: s.recent.slice(-8),
      };
    });
  }

  function playerHistory(cid, name) {
    const rows = [];
    clanWeeks(cid).forEach((week) => {
      const p = week.players.find((x) => x.name === name);
      if (!p) return;
      const board = p1Board(week);
      const r = board.find((x) => x.name === name);
      rows.push({ date: week.date, p1: p.p1, rank: r ? r.rank : null, counting: r ? r.counting : false, days: p.days, dayTracked: week.dayTracked });
    });
    return rows;
  }

  /* ---------- SVG line chart ---------- */

  function chartLine(el, series, opts) {
    opts = opts || {};
    const W = 720, H = opts.height || 260, padL = 46, padR = 12, padT = 12, padB = 26;
    const all = series.flatMap((s) => s.points.map((p) => p.y)).filter((v) => v != null);
    if (!all.length) { el.innerHTML = '<p class="note">No data yet.</p>'; return; }
    let lo = Math.min(...all), hi = Math.max(...all);
    if (lo === hi) { lo -= 1; hi += 1; }
    const span = hi - lo; lo = Math.max(0, lo - span * 0.08); hi = hi + span * 0.08;

    const n = Math.max(...series.map((s) => s.points.length));
    const x = (i) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
    const y = (v) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));

    const fmtTick = (v) => (hi >= 10000 ? Math.round(v / 1000) + "k" : Math.round(v).toLocaleString());
    let g = "";
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = lo + ((hi - lo) * t) / ticks, yy = y(v);
      g += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--line)" stroke-width="1"/>`;
      g += `<text x="${padL - 7}" y="${yy + 3.5}" text-anchor="end" font-size="10.5" fill="var(--text-faint)">${fmtTick(v)}</text>`;
    }
    // x labels: at most ~8
    const labels = series[0].points;
    const step = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((p, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--text-faint)">${esc(p.label)}</text>`;
    });

    series.forEach((s) => {
      let d = "", pen = false;
      s.points.forEach((p, i) => {
        if (p.y == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(p.y).toFixed(1) + " ";
        pen = true;
      });
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      s.points.forEach((p, i) => {
        if (p.y == null) return;
        g += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="2.8" fill="${s.color}"><title>${esc(p.label)}: ${fmt(p.y)}</title></circle>`;
      });
    });

    const legend = series.length > 1
      ? `<div class="legend">${series.map((s) => `<span class="key"><span class="swatch" style="background:${s.color}"></span>${esc(s.label)}</span>`).join("")}</div>`
      : "";
    el.innerHTML = `${legend}<div class="chart-box"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }

  /* ---------- shared chrome ---------- */

  const PAW = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <ellipse cx="7.2" cy="8.2" rx="2.1" ry="2.7" fill="currentColor" transform="rotate(-18 7.2 8.2)"/>
    <ellipse cx="16.8" cy="8.2" rx="2.1" ry="2.7" fill="currentColor" transform="rotate(18 16.8 8.2)"/>
    <ellipse cx="3.6" cy="13.2" rx="1.8" ry="2.3" fill="currentColor" transform="rotate(-38 3.6 13.2)"/>
    <ellipse cx="20.4" cy="13.2" rx="1.8" ry="2.3" fill="currentColor" transform="rotate(38 20.4 13.2)"/>
    <path d="M12 11.2c2.6 0 5.2 2 5.2 4.6 0 2.1-1.6 3.4-3.3 3.4-.8 0-1.3-.3-1.9-.3s-1.1.3-1.9.3c-1.7 0-3.3-1.3-3.3-3.4 0-2.6 2.6-4.6 5.2-4.6z" fill="currentColor"/>
  </svg>`;

  function renderChrome(page) {
    const nav = [
      ["index.html", "Home", "home"],
      ["apaw.html", META.apaw.name, "apaw"],
      ["soc.html", META.soc.name, "soc"],
      ["history.html", "LME History", "history"],
      ["players.html", "Players", "players"],
    ];
    const links = nav.map(([href, label, id]) => {
      let cls = id === page ? "on" : "";
      if (id === page && id === "apaw") cls = "on on-apaw";
      if (id === page && id === "soc") cls = "on on-soc";
      return `<a class="${cls}" href="${href}">${esc(label)}</a>`;
    }).join("");

    document.body.insertAdjacentHTML("afterbegin", `
      <header class="site"><div class="wrap site-bar">
        <a class="brand" href="index.html" style="color:inherit;text-decoration:none">
          <span style="color:var(--apaw)">${PAW}</span>
          <span><div class="t1">THE STRAY ALLIANCE</div><div class="t2">Two clans of the Stray Collective</div></span>
        </a>
        <nav class="main">${links}</nav>
        <button class="theme-btn" id="themeBtn" title="Toggle dark mode">◐</button>
      </div></header>`);

    document.body.insertAdjacentHTML("beforeend", `
      <footer class="site"><div class="wrap">
        The Stray Alliance — aPAWcalypse MEOW &amp; StraytOuttaCompton · part of the Stray Collective · Survivor.io LME tracker
        ${DATA.generated ? " · data updated " + esc(DATA.generated) : ""}
      </div></footer>`);

    const btn = document.getElementById("themeBtn");
    // Dark by default; the head snippet on each page applies this before first
    // paint — this is just a fallback and keeps the toggle in sync.
    const urlTheme = new URLSearchParams(location.search).get("theme");
    document.documentElement.dataset.theme = urlTheme || localStorage.getItem("sa-theme") || "dark";
    btn.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = cur;
      localStorage.setItem("sa-theme", cur);
    });
  }

  /* ---------- reusable blocks ---------- */

  function clanCard(cid, week) {
    const m = META[cid];
    const s = weekSummary(week);
    const tickets = week.ticketsLeft != null ? week.ticketsLeft : clanTickets(cid);
    return `
      <div class="card accent-${cid}">
        <h2><span class="badge ${cid}">${m.mono}</span>
          <span>${esc(m.name)}</span>
          <a class="right pill ${cid}" href="${cid}.html">Details →</a></h2>
        <div class="stats">
          <div class="stat"><div class="v">${s.members}</div><div class="l">Members</div></div>
          <div class="stat"><div class="v">${fmt(s.bossSent)}</div><div class="l">P1 Boss Sent</div></div>
          <div class="stat"><div class="v">${fmt(s.cutoff)}</div><div class="l">Top-30 Cutoff</div></div>
        </div>
        <div class="stats">
          <div class="stat"><div class="v">${placeChip(week.placement)}</div><div class="l">Placement</div></div>
          <div class="stat"><div class="v">${week.ticketsUsed != null ? week.ticketsUsed : "—"}</div><div class="l">Tickets Used</div></div>
          <div class="stat"><div class="v">${tickets != null ? tickets : "—"}</div><div class="l">Tickets Left</div></div>
        </div>
      </div>`;
  }

  function leaderboardTable(board, opts) {
    opts = opts || {};
    const limit = opts.limit || board.length;
    let html = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th class="rank">#</th><th>Player</th><th class="num">${opts.scoreLabel || "Score"}</th>${opts.showStatus ? "<th>Status</th>" : ""}
    </tr></thead><tbody>`;
    let cutShown = false;
    board.slice(0, limit).forEach((r) => {
      if (!r.counting && !cutShown && opts.showCut) {
        html += `<tr><td colspan="4" class="cut-label">Top-30 cutoff — scores below don’t count toward the clan total</td></tr>`;
        cutShown = true;
      }
      html += `<tr class="${r.counting ? "" : "dim"}">
        <td class="rank">${r.rank}</td><td>${opts.clan ? playerLink(opts.clan, r.name) : esc(r.name)}</td><td class="num">${fmt(r.score)}</td>
        ${opts.showStatus ? `<td>${r.counting ? '<span class="pill good">Counting</span>' : '<span class="pill faint">Not counting</span>'}</td>` : ""}
      </tr>`;
    });
    return html + "</tbody></table></div>";
  }

  function dotsHtml(recent) {
    return `<span class="dots">${recent.map((r) => `<span class="dot ${r === 1 ? "" : r === 0 ? "miss" : "na"}"></span>`).join("")}</span>`;
  }

  /* ---------- pages ---------- */

  function initHome() {
    renderChrome("home");
    const root = document.getElementById("app");
    const aw = latestWeek("apaw"), sw = latestWeek("soc");
    if (!aw || !sw) { root.innerHTML = "<p>No data. Run tools/convert.py.</p>"; return; }
    const date = aw.date;

    // battle phase block per clan (derived totals + manual matchup info)
    function battleRows(cid, week) {
      const s = weekSummary(week);
      const mw = manualWeek(cid, week.date) || {};
      const opp = mw.opponents || [];
      const days = mw.days || [];
      return [0, 1, 2].map((d) => {
        const dm = days[d] || {};
        const res = [];
        if (dm.cleared === true) res.push('<span class="pill good">Cleared them</span>');
        if (dm.cleared === false) res.push('<span class="pill bad">Didn’t clear</span>');
        if (dm.held === true) res.push('<span class="pill good">Held</span>');
        if (dm.held === false) res.push('<span class="pill bad">They cleared us</span>');
        const tracked = week.dayTracked[d];
        return `<tr>
          <td>Day ${d + 1}</td>
          <td>${opp[d] ? esc(opp[d]) : '<span class="note">—</span>'}</td>
          <td class="num">${tracked ? fmt(s.dayTotals[d]) : '<span class="pill faint">not tracked</span>'}</td>
          <td>${res.join(" ") || '<span class="note">—</span>'}</td>
        </tr>`;
      }).join("");
    }

    const trendPts = (cid) => clanWeeks(cid).slice(-10).map((w) => ({ label: fmtDate(w.date), y: weekSummary(w).bossSent }));

    // recent LMEs (last 6 weeks, both clans)
    const dates = [...new Set([...clanWeeks("apaw"), ...clanWeeks("soc")].map((w) => w.date))].sort().slice(-6).reverse();
    const recentRows = dates.flatMap((d) =>
      CLAN_IDS.map((cid) => {
        const w = clanWeeks(cid).find((x) => x.date === d);
        if (!w) return "";
        const s = weekSummary(w);
        return `<tr>
          <td>${fmtDate(d)}</td>
          <td><span class="badge sm ${cid}">${META[cid].mono}</span></td>
          <td>${placeChip(w.placement)}</td>
          <td class="num">${w.ticketsUsed != null ? w.ticketsUsed : "—"}</td>
          <td class="num">${fmt(s.bossSent)}</td>
        </tr>`;
      })
    ).join("");

    root.innerHTML = `
      <h1 class="page-title">LME — Week of ${fmtDate(date, true)}</h1>
      <p class="page-sub">Lunar Mine Expedition · current week overview</p>

      <div class="grid cols-2">${clanCard("apaw", aw)}${clanCard("soc", sw)}</div>
      <div class="spacer"></div>

      <div class="grid cols-2">
        <div class="card">
          <h2>Battle Phase — ${esc(META.apaw.short)}</h2>
          <p class="sub">Top-30 medal totals per day. Opponents &amp; results appear once recorded.</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Opponent</th><th class="num">Our Medals</th><th>Result</th></tr></thead>
          <tbody>${battleRows("apaw", aw)}</tbody></table></div>
        </div>
        <div class="card">
          <h2>Battle Phase — ${esc(META.soc.short)}</h2>
          <p class="sub">Top-30 medal totals per day. Opponents &amp; results appear once recorded.</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Opponent</th><th class="num">Our Medals</th><th>Result</th></tr></thead>
          <tbody>${battleRows("soc", sw)}</tbody></table></div>
        </div>
      </div>
      <div class="spacer"></div>

      <div class="grid cols-2">
        <div class="card">
          <h2>Clan Progress</h2>
          <p class="sub">P1 boss sent — last 10 LMEs</p>
          <div id="homeChart"></div>
        </div>
        <div class="card">
          <h2>Recent LMEs</h2>
          <p class="sub">Last six weeks, both clans · <a href="history.html">full history →</a></p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Week</th><th>Clan</th><th>Place</th><th class="num">Tickets Used</th><th class="num">P1 Boss</th></tr></thead>
          <tbody>${recentRows}</tbody></table></div>
        </div>
      </div>
      <div class="spacer"></div>

      <div class="grid cols-2">
        <div class="card accent-apaw">
          <h2>P1 Top 10 — ${esc(META.apaw.short)}</h2>
          <p class="sub">Top-30 scores determine the boss we send · <a href="apaw.html">full leaderboard →</a></p>
          ${leaderboardTable(p1Board(aw), { limit: 10, scoreLabel: "P1 Score", clan: "apaw" })}
        </div>
        <div class="card accent-soc">
          <h2>P1 Top 10 — ${esc(META.soc.short)}</h2>
          <p class="sub">Top-30 scores determine the boss we send · <a href="soc.html">full leaderboard →</a></p>
          ${leaderboardTable(p1Board(sw), { limit: 10, scoreLabel: "P1 Score", clan: "soc" })}
        </div>
      </div>`;

    chartLine(document.getElementById("homeChart"), [
      { label: META.apaw.short, color: "var(--apaw)", points: trendPts("apaw") },
      { label: META.soc.short, color: "var(--soc)", points: trendPts("soc") },
    ]);
  }

  function initClan(cid) {
    renderChrome(cid);
    const m = META[cid];
    const root = document.getElementById("app");
    const weeks = clanWeeks(cid);
    if (!weeks.length) { root.innerHTML = "<p>No data.</p>"; return; }

    let sel = weeks.length - 1;

    function render() {
      const week = weeks[sel];
      const s = weekSummary(week);
      const board = p1Board(week);
      const ticketsLeft = week.ticketsLeft != null ? week.ticketsLeft : (sel === weeks.length - 1 ? clanTickets(cid) : null);

      // combined weekly table: P1 + battle days
      const dayB = [0, 1, 2].map((d) => dayBoard(week, d));
      const dayRank = dayB.map((b) => (b ? new Map(b.map((r) => [r.name, r])) : null));
      let cutShown = false;
      let rows = "";
      board.forEach((r) => {
        if (!r.counting && !cutShown) {
          rows += `<tr><td colspan="7" class="cut-label">P1 Top-30 cutoff — P1 scores below don’t count toward the boss (battle days can still count)</td></tr>`;
          cutShown = true;
        }
        const chips = [];
        if (r.counting) chips.push('<span class="pill good">P1</span>');
        const dayCells = [0, 1, 2].map((d) => {
          if (!week.dayTracked[d]) return '<td class="num"><span class="note">·</span></td>';
          const p = week.players.find((x) => x.name === r.name);
          const v = p ? p.days[d] : null;
          if (v == null) return '<td class="num"><span class="note">—</span></td>';
          const dr = dayRank[d] && dayRank[d].get(r.name);
          const counts = dr && dr.counting && v > 0;
          if (counts) chips.push(`<span class="pill good">D${d + 1}</span>`);
          return `<td class="num"${counts ? "" : ' style="color:var(--text-faint)"'}>${fmt(v)}</td>`;
        }).join("");
        rows += `<tr>
          <td class="rank">${r.rank}</td><td>${playerLink(cid, r.name)}</td>
          <td class="num"${r.counting ? "" : ' style="color:var(--text-faint)"'}><b>${fmt(r.score)}</b></td>${dayCells}
          <td><span class="chiprow">${chips.join("") || '<span class="pill faint">—</span>'}</span></td></tr>`;
      });

      const dayHead = [0, 1, 2].map((d) =>
        `<th class="num">Day ${d + 1}${week.dayTracked[d] ? "" : " ·"}</th>`).join("");
      const untrackedNote = week.dayTracked.every(Boolean) ? "" :
        `<p class="note">· Days ${week.dayTracked.map((t, i) => (t ? null : i + 1)).filter(Boolean).join(", ")} weren’t recorded this week (blowout — full participation not required).</p>`;

      const totalsRow = `<tr><td></td><td><b>Top-30 total</b></td><td class="num"><b>${fmt(s.bossSent)}</b></td>
        ${[0, 1, 2].map((d) => `<td class="num"><b>${week.dayTracked[d] ? fmt(s.dayTotals[d]) : "·"}</b></td>`).join("")}<td></td></tr>`;

      const options = weeks.map((w, i) =>
        `<option value="${i}" ${i === sel ? "selected" : ""}>${fmtDate(w.date, true)}</option>`).reverse().join("");

      root.innerHTML = `
        <h1 class="page-title" style="display:flex;align-items:center;gap:12px">
          <span class="badge ${cid}">${m.mono}</span>${esc(m.name)}</h1>
        <p class="page-sub">Weekly Lunar Mine Expedition results</p>

        <div class="card accent-${cid}">
          <h2>Week of ${fmtDate(week.date, true)}
            <span class="right"><select class="week-pick" id="weekPick">${options}</select></span></h2>
          <div class="stats">
            <div class="stat"><div class="v">${s.members}</div><div class="l">Members</div></div>
            <div class="stat"><div class="v">${fmt(s.bossSent)}</div><div class="l">P1 Boss Sent</div></div>
            <div class="stat"><div class="v">${fmt(s.cutoff)}</div><div class="l">Top-30 Cutoff</div></div>
            <div class="stat"><div class="v">${placeChip(week.placement)}</div><div class="l">Placement</div></div>
            <div class="stat"><div class="v">${week.ticketsUsed != null ? week.ticketsUsed : "—"}</div><div class="l">Tickets Used</div></div>
            <div class="stat"><div class="v">${ticketsLeft != null ? ticketsLeft : "—"}</div><div class="l">Tickets Left</div></div>
          </div>
        </div>
        <div class="spacer"></div>

        <div class="card">
          <h2>Weekly Leaderboard</h2>
          <p class="sub">Ranked by P1 (Expedition). Each column has its own Top 30 — dark values count toward that column’s clan total, faint values don’t. “Counts in” shows exactly which totals include each player.</p>
          ${untrackedNote}
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th class="rank">#</th><th>Player</th><th class="num">P1</th>${dayHead}<th>Counts In</th></tr></thead>
            <tbody>${rows}${totalsRow}</tbody></table></div>
        </div>
        <div class="spacer"></div>

        <div class="grid cols-2">
          <div class="card"><h2>P1 Boss Sent — all weeks</h2><div id="c1"></div></div>
          <div class="card"><h2>Top-30 Cutoff — all weeks</h2><div id="c2"></div></div>
        </div>
        <div class="spacer"></div>

        <div class="card">
          <h2>Placement History</h2>
          <p class="sub">${["1st", "2nd", "3rd", "4th"].map((p) =>
            `${weeks.filter((w) => w.placement === p).length}× ${p}`).join(" · ")} ·
            ${weeks.length} weeks tracked</p>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Week</th><th>Place</th><th class="num">P1 Boss Sent</th><th class="num">Cutoff</th><th class="num">Members</th></tr></thead>
          <tbody>${weeks.slice().reverse().map((w) => {
            const ws = weekSummary(w);
            return `<tr><td>${fmtDate(w.date, true)}</td><td>${placeChip(w.placement)}</td>
              <td class="num">${fmt(ws.bossSent)}</td><td class="num">${fmt(ws.cutoff)}</td><td class="num">${ws.members}</td></tr>`;
          }).join("")}</tbody></table></div>
        </div>`;

      const color = cid === "apaw" ? "var(--apaw)" : "var(--soc)";
      chartLine(document.getElementById("c1"), [{ label: m.short, color, points: weeks.map((w) => ({ label: fmtDate(w.date), y: weekSummary(w).bossSent })) }]);
      chartLine(document.getElementById("c2"), [{ label: m.short, color, points: weeks.map((w) => ({ label: fmtDate(w.date), y: weekSummary(w).cutoff })) }]);

      document.getElementById("weekPick").addEventListener("change", (e) => { sel = +e.target.value; render(); window.scrollTo(0, 0); });
    }
    render();
  }

  function initHistory() {
    renderChrome("history");
    const root = document.getElementById("app");
    const dates = [...new Set([...clanWeeks("apaw"), ...clanWeeks("soc")].map((w) => w.date))].sort().reverse();
    let filter = "all"; // all | apaw | soc

    function tableRows() {
      const ids = filter === "all" ? CLAN_IDS : [filter];
      return dates.flatMap((d) =>
        ids.map((cid) => {
          const w = clanWeeks(cid).find((x) => x.date === d);
          if (!w) return "";
          const s = weekSummary(w);
          return `<tr>
            <td>${fmtDate(d, true)}</td>
            <td><span class="badge sm ${cid}">${META[cid].mono}</span></td>
            <td>${placeChip(w.placement)}</td>
            <td class="num">${w.ticketsUsed != null ? w.ticketsUsed : "—"}</td>
            <td class="num">${fmt(s.bossSent)}</td>
            <td class="num">${fmt(s.cutoff)}</td>
            <td class="num">${s.members}</td>
          </tr>`;
        })
      ).join("");
    }

    function chartSeries() {
      const ids = filter === "all" ? CLAN_IDS : [filter];
      return ids.map((cid) => ({
        label: META[cid].short,
        color: cid === "apaw" ? "var(--apaw)" : "var(--soc)",
        points: clanWeeks(cid).map((w) => ({ label: fmtDate(w.date), y: weekSummary(w).bossSent })),
      }));
    }

    function refresh() {
      document.getElementById("histRows").innerHTML = tableRows();
      chartLine(document.getElementById("histChart"), chartSeries(), { height: 300 });
      [["fAll", "all"], ["fApaw", "apaw"], ["fSoc", "soc"]].forEach(([id, val]) => {
        const b = document.getElementById(id);
        b.className = filter === val ? "on " + (val === "all" ? "" : val) : "";
      });
    }

    const placeCount = (cid, p) => clanWeeks(cid).filter((w) => w.placement === p).length;
    const placeStats = (cid) => {
      const colors = { "1st": "var(--good)", "2nd": "var(--soc)", "3rd": "#b07c1f", "4th": "var(--bad)" };
      return `
        <div class="stat"><div class="v">${clanWeeks(cid).length}</div><div class="l">Weeks</div></div>
        ${["1st", "2nd", "3rd", "4th"].map((p) =>
          `<div class="stat"><div class="v" style="color:${colors[p]}">${placeCount(cid, p)}</div><div class="l">${p}</div></div>`
        ).join("")}`;
    };

    root.innerHTML = `
      <h1 class="page-title">LME History</h1>
      <p class="page-sub">Every tracked Lunar Mine Expedition. Tickets used appears for weeks recorded going forward.</p>

      <div class="tabs">
        <button id="fAll">All Clans</button>
        <button id="fApaw">${esc(META.apaw.name)}</button>
        <button id="fSoc">${esc(META.soc.name)}</button>
      </div>

      <div class="grid cols-2">
        <div class="card accent-apaw"><h2><span class="badge sm apaw">${META.apaw.mono}</span> ${META.apaw.name}</h2>
          <div class="stats">${placeStats("apaw")}</div></div>
        <div class="card accent-soc"><h2><span class="badge sm soc">${META.soc.mono}</span> ${META.soc.name}</h2>
          <div class="stats">${placeStats("soc")}</div></div>
      </div>
      <div class="spacer"></div>

      <div class="card"><h2>P1 Strength Over Time</h2><p class="sub">Top-30 P1 total (boss sent), full history</p><div id="histChart"></div></div>
      <div class="spacer"></div>

      <div class="card">
        <h2>All Results</h2>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Week</th><th>Clan</th><th>Place</th><th class="num">Tickets Used</th><th class="num">P1 Boss</th><th class="num">Cutoff</th><th class="num">Members</th></tr></thead>
          <tbody id="histRows"></tbody></table></div>
      </div>`;

    [["fAll", "all"], ["fApaw", "apaw"], ["fSoc", "soc"]].forEach(([id, val]) => {
      document.getElementById(id).addEventListener("click", () => { filter = val; refresh(); });
    });
    refresh();
  }

  function initPlayers() {
    renderChrome("players");
    const root = document.getElementById("app");
    // hash: "#apaw" / "#soc" for a clan tab, "#apaw:Name" to open a player directly
    const hashParts = decodeURIComponent(location.hash.slice(1)).split(":");
    let cid = hashParts[0] === "soc" ? "soc" : "apaw";
    let deepPlayer = hashParts[1] || null;
    let showFormer = false;

    function render() {
      const stats = playerStats(cid)
        .filter((p) => showFormer || p.onRoster)
        .sort((a, b) => (b.curP1 || 0) - (a.curP1 || 0) || (b.avgP1 || 0) - (a.avgP1 || 0));

      const rows = stats.map((p) => `
        <tr class="click" data-name="${esc(p.name)}">
          <td class="rank">${p.curRank || "—"}</td>
          <td>${esc(p.name)}${p.onRoster ? "" : ' <span class="pill faint">former</span>'}</td>
          <td class="num">${fmt(p.curP1)}</td>
          <td class="num">${fmt(p.avgP1)}</td>
          <td class="num">${fmt(p.bestP1)}</td>
          <td class="num">${p.top30P1}/${p.weeks}</td>
          <td class="num">${fmt(p.avgBattle)}</td>
          <td class="num">${p.partPct != null ? p.partPct + "%" : "—"}</td>
          <td>${dotsHtml(p.recent)}</td>
        </tr>`).join("");

      root.innerHTML = `
        <h1 class="page-title">Players</h1>
        <p class="page-sub">Individual P1 strength, battle averages and participation. Click a player for weekly history.</p>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="tabs">
            <button id="tabA" class="${cid === "apaw" ? "on apaw" : ""}">${META.apaw.name}</button>
            <button id="tabS" class="${cid === "soc" ? "on soc" : ""}">${META.soc.name}</button>
          </div>
          <label class="note" style="cursor:pointer"><input type="checkbox" id="former" ${showFormer ? "checked" : ""}> include former members</label>
        </div>
        <div class="card">
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th class="rank">#</th><th>Player</th><th class="num">P1 Now</th><th class="num">P1 Avg</th><th class="num">P1 Best</th>
              <th class="num">Top-30 P1</th><th class="num">Battle Avg</th><th class="num">Part.</th><th>Last 8 Weeks</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
          <p class="note" style="margin-bottom:0"><span class="dot" style="display:inline-block;vertical-align:middle"></span> hit all tracked battle days ·
            <span class="dot miss" style="display:inline-block;vertical-align:middle"></span> missed a tracked day ·
            <span class="dot na" style="display:inline-block;vertical-align:middle"></span> battle not tracked (blowout week)</p>
        </div>
        <div class="spacer"></div>
        <div id="detail"></div>`;

      document.getElementById("tabA").onclick = () => { cid = "apaw"; history.replaceState(null, "", "#apaw"); render(); };
      document.getElementById("tabS").onclick = () => { cid = "soc"; history.replaceState(null, "", "#soc"); render(); };
      document.getElementById("former").onchange = (e) => { showFormer = e.target.checked; render(); };
      root.querySelectorAll("tr.click").forEach((tr) => tr.addEventListener("click", () => showDetail(tr.dataset.name)));
    }

    function showDetail(name) {
      history.replaceState(null, "", `#${cid}:${encodeURIComponent(name)}`);
      const hist = playerHistory(cid, name);
      const el = document.getElementById("detail");
      const rows = hist.slice().reverse().map((h) => `
        <tr><td>${fmtDate(h.date, true)}</td>
          <td class="num">${fmt(h.p1)}</td>
          <td class="num">${h.rank ? "#" + h.rank : "—"}</td>
          <td>${h.rank ? (h.counting ? '<span class="pill good">Counting</span>' : '<span class="pill faint">Not counting</span>') : "—"}</td>
          ${[0, 1, 2].map((d) => `<td class="num">${h.dayTracked[d] ? fmt(h.days[d]) : '<span class="note">·</span>'}</td>`).join("")}
        </tr>`).join("");
      el.innerHTML = `
        <div class="card accent-${cid}">
          <h2>${esc(name)} <span class="right note">${hist.length} weeks tracked</span></h2>
          <div id="pChart"></div>
          <div class="spacer"></div>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Week</th><th class="num">P1</th><th class="num">P1 Rank</th><th>Status</th><th class="num">Day 1</th><th class="num">Day 2</th><th class="num">Day 3</th></tr></thead>
            <tbody>${rows}</tbody></table></div>
        </div>`;
      chartLine(document.getElementById("pChart"),
        [{ label: "P1", color: cid === "apaw" ? "var(--apaw)" : "var(--soc)", points: hist.map((h) => ({ label: fmtDate(h.date), y: h.p1 })) }],
        { height: 200 });
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    render();
    if (deepPlayer && playerHistory(cid, deepPlayer).length) { showDetail(deepPlayer); deepPlayer = null; }
  }

  window.SA = { initHome, initClan, initHistory, initPlayers };
})();
