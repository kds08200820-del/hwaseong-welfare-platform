/* =============================================================
   지역 대시보드 — 화성 4개 구 → 29개 읍면동 계층 선택
   데이터: HW_REGIONS (hwaseong-regions.js)
   ============================================================= */
(function () {
  const H = HW_REGIONS;
  let guKey = "city";     // city | manse | hyohaeng | byeongjeom | dongtan
  let dongKey = null;     // 읍면동 key | null(구/전체)
  const charts = {};

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  function palette() {
    return {
      s1: css("--series-1"), s2: css("--series-2"), s3: css("--series-3"), s4: css("--series-4"),
      ink: css("--text-primary"), sec: css("--text-secondary"), muted: css("--text-muted"),
      grid: css("--grid"), surf: css("--surface-1"),
    };
  }

  /* 현재 선택 지역 / 비교(화성 평균) */
  function current() {
    if (dongKey) return H.region(dongKey);
    if (guKey === "city") return H.cityRegion();
    return H.guRegion(guKey);
  }
  function cityRef() { return H.cityRegion(); }
  function isCity() { return guKey === "city" && !dongKey; }

  /* 하위 지역(막대 비교용): 전체→4구, 구/동→해당 구의 읍면동 */
  function subRegions() {
    if (guKey === "city") return H.gu.map(g => ({ key: g.key, ...pick(H.guRegion(g.key)), gu: true }));
    const g = H.gu.find(x => x.key === guKey);
    return g.dong.map(k => ({ key: k, ...pick(H.region(k)) }));
  }
  function pick(r) { return { name: r.name, pop: r.population, eld: r.elderlyRate }; }

  /* ---------- Chart.js 공통 ---------- */
  function mk(id, type, data, options) {
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id); if (!el) return;
    charts[id] = new Chart(el, { type, data, options });
  }
  function baseOpts(p, extra = {}) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false, position: "bottom", labels: { color: p.sec, usePointStyle: true, pointStyleWidth: 12, boxHeight: 8, padding: 14 } },
        tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8 },
      },
    }, extra);
  }
  function xAxis(p, opt = {}) { return Object.assign({ grid: { display: false }, border: { display: false }, ticks: { color: p.muted, font: { size: 11 } } }, opt); }
  function yAxis(p, opt = {}) { return Object.assign({ grid: { color: p.grid }, border: { display: false }, ticks: { color: p.muted, font: { size: 11 }, callback: (v) => fmt(v) } }, opt); }

  /* ---------- 선택 UI ---------- */
  function renderSelectors() {
    // 구 탭
    const guSeg = document.getElementById("guSeg");
    const tabs = [{ key: "city", name: "화성시 전체" }, ...H.gu];
    guSeg.innerHTML = tabs.map(t => `<button data-gu="${t.key}" class="${t.key === guKey ? "active" : ""}">${t.name}</button>`).join("");
    // 읍면동 칩
    const wrap = document.getElementById("dongSelect");
    const chips = document.getElementById("dongChips");
    if (guKey === "city") { wrap.style.display = "none"; chips.innerHTML = ""; return; }
    wrap.style.display = "flex";
    const g = H.gu.find(x => x.key === guKey);
    const items = [{ key: "", name: g.name + " 전체" }, ...g.dong.map(k => ({ key: k, name: H.raw[k].name }))];
    chips.innerHTML = items.map(it =>
      `<button class="dong-chip${(it.key || null) === dongKey ? " on" : ""}" data-dong="${it.key}">${it.name}</button>`).join("");
  }

  /* ---------- 요약 지표 ---------- */
  function renderStats() {
    const r = current();
    const welfareTotal = Object.values(r.welfare).reduce((a, b) => a + b, 0);
    const needAvg = r.needs.reduce((a, b) => a + b, 0) / r.needs.length;
    const gr = H.needGrade(needAvg);
    const eldReal = r.demoElderlyReal;
    document.getElementById("statRow").innerHTML = `
      <div class="stat">
        <div class="label">총인구 (${r.name}) <span class="badge good" style="font-size:.62rem;padding:1px 6px;">공식</span></div>
        <div class="value">${fmt(r.population)}<span class="unit">명</span></div>
        <div class="sub">${fmt(r.households)}세대 · 1인세대 ${r.onePersonHhRate}%</div>
      </div>
      <div class="stat">
        <div class="label">65세 이상 고령인구 <span class="badge ${eldReal ? "good" : "warning"}" style="font-size:.62rem;padding:1px 6px;">${eldReal ? "공식" : "추정"}</span></div>
        <div class="value">${fmt(r.ageStructure[2])}<span class="unit">명</span></div>
        <div class="sub"><span class="up">▲ 고령화율 ${r.elderlyRate}%</span>${r.elderlyRate >= 20 ? " · 초고령" : ""}</div>
      </div>
      <div class="stat">
        <div class="label">복지 대상 (중복 포함) <span class="badge warning" style="font-size:.62rem;padding:1px 6px;">추정</span></div>
        <div class="value">${fmt(welfareTotal)}<span class="unit">명</span></div>
        <div class="sub">수급·차상위·장애·독거·한부모·다문화</div>
      </div>
      <div class="stat">
        <div class="label">종합 필요도 등급</div>
        <div class="value" style="font-size:1.7rem;">${needAvg.toFixed(0)}<span class="unit">/100</span></div>
        <div class="sub"><span class="badge ${gr.level}">${gr.label}</span></div>
      </div>`;
    document.getElementById("metaLabel").textContent = `기준 ${H.meta.popAsOf} · ${H.meta.source}`;
  }

  /* ---------- 연령 구조 (% 구성비, 선택 vs 화성평균) ---------- */
  function renderAge(p) {
    const r = current(), c = cityRef();
    const pctOf = (x) => [x.childRate, +(100 - x.childRate - x.elderlyRate).toFixed(1), x.elderlyRate];
    const ds = [
      { label: r.name, data: pctOf(r), backgroundColor: p.s1, borderRadius: 4, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.66 },
    ];
    if (!isCity()) ds.push({ label: "화성시 평균", data: pctOf(c), backgroundColor: p.s2 + "88", borderRadius: 4, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.66 });
    mk("chartAge", "bar", { labels: H.ageLabels, datasets: ds }, baseOpts(p, {
      plugins: { legend: { display: !isCity(), position: "bottom", labels: { color: p.sec, usePointStyle: true, pointStyleWidth: 12, boxHeight: 8, padding: 14 } },
        tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8, callbacks: { label: (x) => `${x.dataset.label}: ${x.parsed.y}%` } } },
      scales: { x: xAxis(p, { ticks: { color: p.muted, font: { size: 12 } } }), y: yAxis(p, { ticks: { color: p.muted, callback: (v) => v + "%" } }) },
    }));
  }

  /* ---------- 필요도 레이더 (선택 vs 화성평균) ---------- */
  function renderNeeds(p) {
    const r = current(), c = cityRef();
    const ds = [{ label: r.name, data: r.needs, borderColor: p.s1, backgroundColor: p.s1 + "33", pointBackgroundColor: p.s1, pointRadius: 4, borderWidth: 2 }];
    if (!isCity()) ds.push({ label: "화성시 평균", data: c.needs, borderColor: p.s2, backgroundColor: p.s2 + "22", pointBackgroundColor: p.s2, pointRadius: 3, borderWidth: 1.5 });
    mk("chartNeeds", "radar", { labels: H.needsDomains, datasets: ds }, baseOpts(p, {
      plugins: { legend: { display: !isCity(), position: "bottom", labels: { color: p.sec, usePointStyle: true, pointStyleWidth: 12, boxHeight: 8, padding: 14 } } },
      scales: { r: { min: 0, max: 100, grid: { color: p.grid }, angleLines: { color: p.grid }, pointLabels: { color: p.sec, font: { size: 12 } }, ticks: { display: false, stepSize: 25 } } },
    }));
  }

  /* ---------- 하위 지역별 인구 (막대) ---------- */
  function renderPop(p) {
    const subs = subRegions();
    const cols = subs.map(s => (dongKey && s.key === dongKey) ? p.s1 : p.s1 + "99");
    mk("chartPop", "bar", { labels: subs.map(s => s.name), datasets: [{ data: subs.map(s => s.pop), backgroundColor: cols, borderRadius: 4, borderSkipped: false, barPercentage: 0.72 }] },
      baseOpts(p, {
        plugins: { legend: { display: false }, tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8, callbacks: { label: (x) => fmt(x.parsed.y) + "명" } } },
        scales: { x: xAxis(p, { ticks: { color: p.muted, font: { size: 10 }, maxRotation: 45, minRotation: 0 } }), y: yAxis(p) },
      }));
    document.getElementById("popChartHint").textContent = guKey === "city" ? "4개 구 · 명" : `${H.gu.find(g => g.key === guKey).name} 읍면동 · 명`;
  }

  /* ---------- 하위 지역별 고령화율 (막대, 초고령 진하게) ---------- */
  function renderAging(p) {
    const subs = subRegions();
    const cols = subs.map(s => s.eld >= 25 ? p.s4 : s.eld >= 20 ? p.s2 : s.eld >= 12 ? p.s1 : p.s1 + "77");
    mk("chartAging", "bar", { labels: subs.map(s => s.name), datasets: [{ data: subs.map(s => s.eld), backgroundColor: cols, borderRadius: 4, borderSkipped: false, barPercentage: 0.72 }] },
      baseOpts(p, {
        plugins: { legend: { display: false }, tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8, callbacks: { label: (x) => x.parsed.y + "%" } } },
        scales: { x: xAxis(p, { ticks: { color: p.muted, font: { size: 10 }, maxRotation: 45 } }), y: yAxis(p, { ticks: { color: p.muted, callback: (v) => v + "%" } }) },
      }));
  }

  /* ---------- 복지 대상 현황 (막대) ---------- */
  function renderWelfare(p) {
    const r = current();
    const cats = H.welfareCats;
    mk("chartWelfare", "bar", { labels: cats.map(c => c.label), datasets: [{ data: cats.map(c => r.welfare[c.key]), backgroundColor: p.s1, borderRadius: 4, borderSkipped: false, barPercentage: 0.68 }] },
      baseOpts(p, {
        indexAxis: "y",
        plugins: { legend: { display: false }, tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8, callbacks: { label: (x) => fmt(x.parsed.x) } } },
        scales: { x: xAxis(p, { grid: { color: p.grid }, ticks: { color: p.muted, callback: (v) => fmt(v) } }), y: xAxis(p, { ticks: { color: p.sec, font: { size: 12 } } }) },
      }));
  }

  /* ---------- 복지 인프라 (막대) ---------- */
  function renderFacil(p) {
    const r = current();
    mk("chartFacil", "bar", { labels: H.facilLabels, datasets: [{ data: r.facilities, backgroundColor: p.s3, borderRadius: 4, borderSkipped: false, barPercentage: 0.7 }] },
      baseOpts(p, {
        plugins: { legend: { display: false }, tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8, callbacks: { label: (x) => fmt(x.parsed.y) + "개소" } } },
        scales: { x: xAxis(p, { ticks: { color: p.muted, font: { size: 10 } } }), y: yAxis(p) },
      }));
  }

  /* ---------- 필요도 미터 ---------- */
  const STATUS = { critical: "--status-critical", serious: "--status-serious", warning: "--status-warning", good: "--status-good" };
  function renderMeters() {
    const r = current();
    const rows = H.needsDomains.map((d, i) => ({ name: d, val: r.needs[i] })).sort((a, b) => b.val - a.val);
    document.getElementById("needsMeters").innerHTML = rows.map(d => {
      const gr = H.needGrade(d.val); const col = css(STATUS[gr.level]);
      return `<div class="meter-row">
        <span class="m-label">${d.name}</span>
        <div class="meter-track"><div class="meter-fill" style="width:${d.val}%;background:${col};"></div></div>
        <span class="m-val">${d.val} <span class="badge ${gr.level}" style="margin-left:4px;">${gr.label}</span></span>
      </div>`;
    }).join("");
    document.getElementById("needsRegionLabel").textContent = r.name + " 기준";
  }

  /* ---------- 데이터 표 (동적) ---------- */
  function renderTable() {
    const r = current();
    document.getElementById("dataTableHead").innerHTML =
      `<th>구분</th><th class="num">${r.name}</th><th>단위</th><th>구분</th>`;
    const tb = document.querySelector("#dataTable tbody");
    tb.innerHTML = H.welfareCats.map(c => `
      <tr>
        <td>${c.icon} ${c.label}</td>
        <td class="num"><b>${fmt(r.welfare[c.key])}</b></td>
        <td>${c.unit}</td>
        <td style="color:var(--text-muted);font-size:.82rem;">추정</td>
      </tr>`).join("");
    document.getElementById("tableSource").textContent = `${H.meta.note} · 기준 ${H.meta.popAsOf}`;
  }

  /* ---------- 렌더 ---------- */
  function renderAll() {
    const p = palette();
    renderSelectors();
    renderStats();
    renderAge(p); renderNeeds(p); renderPop(p); renderAging(p);
    renderWelfare(p); renderFacil(p); renderMeters(); renderTable();
  }

  /* ---------- 이벤트 ---------- */
  document.getElementById("guSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    guKey = b.dataset.gu; dongKey = null; renderAll();
  });
  document.getElementById("dongChips").addEventListener("click", (e) => {
    const b = e.target.closest(".dong-chip"); if (!b) return;
    dongKey = b.dataset.dong || null; renderAll();
  });
  document.addEventListener("themechange", renderAll);

  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif";
    renderAll();
  } else {
    renderSelectors(); renderStats(); renderMeters(); renderTable();
  }
})();
