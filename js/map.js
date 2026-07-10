/* =============================================================
   전국 복지 지도 렌더링 — 타일그리드 추로플레스 + 순위 + 상세
   ============================================================= */
(function () {
  const N = NATIONWIDE_DATA;
  let metricKey = "seniorLeisure";
  let norm = "abs";          // abs | per (인구 10만명당)
  let selected = null;        // sido code
  let sortKey = null, sortDir = -1;
  let compChart = null;

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("ko-KR") : n);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function usePer() { return norm === "per" && N.metric(metricKey).normalizable; }
  function val(s) { return N.value(s, metricKey, usePer()); }
  function unitLabel() {
    const m = N.metric(metricKey);
    return usePer() ? `${m.unit}/10만명` : m.unit;
  }

  /* 색상 구간 — 값 → 램프 인덱스 (7단계 분위) */
  function colorScale() {
    const vals = N.sido.map(val).sort((a, b) => a - b);
    const min = vals[0], max = vals[vals.length - 1];
    return {
      min, max,
      color(v) {
        if (max === min) return N.ramp[3];
        const t = (v - min) / (max - min);
        const idx = Math.min(N.ramp.length - 1, Math.floor(t * N.ramp.length));
        return N.ramp[idx];
      },
      isDark(v) {
        if (max === min) return true;
        const t = (v - min) / (max - min);
        return Math.floor(t * N.ramp.length) >= 3; // 진한 3단계부터 흰 글씨
      },
    };
  }

  /* ---------- 전국 요약 ---------- */
  function renderNatStats() {
    const el = document.getElementById("natStats");
    el.innerHTML = `
      <div class="stat"><div class="label">노인여가복지시설</div><div class="value">${fmt(N.national("seniorLeisure"))}<span class="unit">개소</span></div><div class="sub">경로당·복지관 등 · 2023</div></div>
      <div class="stat"><div class="label">어린이집</div><div class="value">${fmt(N.national("daycare"))}<span class="unit">개소</span></div><div class="sub">전국 · 2025</div></div>
      <div class="stat"><div class="label">등록장애인</div><div class="value">${(N.national("disabled")/10000).toFixed(0)}<span class="unit">만명</span></div><div class="sub">전국 · 2025</div></div>
      <div class="stat"><div class="label">전국 고령화율</div><div class="value">${N.national("elderlyRate")}<span class="unit">%</span></div><div class="sub">65세+ · 2024</div></div>`;
  }

  /* ---------- 컨트롤 ---------- */
  function renderMetricSeg() {
    const seg = document.getElementById("metricSeg");
    seg.innerHTML = N.metrics.map(m =>
      `<button data-metric="${m.key}" class="${m.key === metricKey ? "active" : ""}">${m.short}</button>`).join("");
  }

  /* ---------- 지도 ---------- */
  function renderMap() {
    const map = document.getElementById("kmap");
    const sc = colorScale();
    const m = N.metric(metricKey);
    map.innerHTML = N.sido.map(s => {
      const v = val(s);
      const dark = sc.isDark(v);
      const sel = s.code === selected ? " selected" : "";
      const disp = m.key === "elderlyRate" ? v + "%" : (usePer() ? v : fmt(v));
      return `<div class="ktile${dark ? " on-dark" : ""}${sel}" role="button" tabindex="0"
                data-code="${s.code}" title="${s.name}: ${disp} ${unitLabel()}"
                style="grid-column:${s.col};grid-row:${s.row};background:${sc.color(v)};">
                <span class="kt-name">${s.short}</span>
                <span class="kt-val">${disp}</span>
              </div>`;
    }).join("");

    document.getElementById("mapTitle").textContent = `${m.label} 분포`;
    document.getElementById("mapHint").textContent = `${m.year} · 단위 ${unitLabel()}`;
    document.getElementById("mapNote").textContent = `${m.sub} — ${usePer() ? "인구 10만명당으로 정규화한 값입니다(지역 규모 보정)." : "시도별 절대 수치입니다."}`;

    // 범례 그라디언트
    document.getElementById("legBar").innerHTML = N.ramp.map(c => `<span style="background:${c}"></span>`).join("");
    document.getElementById("legLow").textContent = m.key === "elderlyRate" ? sc.min + "%" : fmt(usePer() ? sc.min : Math.round(sc.min));
    document.getElementById("legHigh").textContent = m.key === "elderlyRate" ? sc.max + "%" : fmt(usePer() ? sc.max : Math.round(sc.max));
  }

  /* ---------- 순위 ---------- */
  function renderRank() {
    const el = document.getElementById("rankList");
    const m = N.metric(metricKey);
    const sc = colorScale();
    const rows = [...N.sido].sort((a, b) => val(b) - val(a));
    document.getElementById("rankHint").textContent = `${m.short} · ${unitLabel()}`;
    el.innerHTML = rows.map((s, i) => {
      const v = val(s);
      const pct = sc.max === sc.min ? 100 : (v - sc.min) / (sc.max - sc.min) * 92 + 8;
      const disp = m.key === "elderlyRate" ? v + "%" : (usePer() ? v : fmt(v));
      const sel = s.code === selected ? " selected" : "";
      return `<div class="rank-row${sel}" data-code="${s.code}">
        <span class="rk">${i + 1}</span>
        <span class="nm">${s.short}</span>
        <span class="rank-bar-track"><span class="rank-bar-fill" style="width:${pct}%;background:${sc.color(v)};"></span></span>
        <span class="rv">${disp}</span>
      </div>`;
    }).join("");
  }

  /* ---------- 상세 ---------- */
  function renderDetail() {
    const el = document.getElementById("regionDetail");
    const s = N.sido.find(x => x.code === selected) || N.sido[0];
    document.getElementById("detailTitle").textContent = s.name;
    const per = (k) => (s[k] / s.population * 100000).toFixed(1);
    el.innerHTML = `
      <div class="rd-metric"><span class="k">총인구 (2025)</span><span class="v">${fmt(s.population)}명</span></div>
      <div class="rd-metric"><span class="k">고령화율 (65세+, 2024)</span><span class="v">${s.elderlyRate}%</span></div>
      <div class="rd-metric"><span class="k">노인여가복지시설 (2023)</span><span class="v">${fmt(s.seniorLeisure)}개소 <span style="color:var(--text-muted);font-weight:500;">(10만명당 ${per("seniorLeisure")})</span></span></div>
      <div class="rd-metric"><span class="k">어린이집 (2025)</span><span class="v">${fmt(s.daycare)}개소 <span style="color:var(--text-muted);font-weight:500;">(10만명당 ${per("daycare")})</span></span></div>
      <div class="rd-metric"><span class="k">등록장애인 (2025)</span><span class="v">${fmt(s.disabled)}명 <span style="color:var(--text-muted);font-weight:500;">(인구대비 ${(s.disabled/s.population*100).toFixed(1)}%)</span></span></div>`;
  }

  /* ---------- 시설 구성 비교 차트 ---------- */
  function renderComposition() {
    if (typeof Chart === "undefined") return;
    const rows = [...N.sido].sort((a, b) => (b.seniorLeisure + b.daycare) - (a.seniorLeisure + a.daycare));
    const labels = rows.map(s => s.short);
    const p = { s1: css("--series-1"), s3: css("--series-3"), sec: css("--text-secondary"), muted: css("--text-muted"), grid: css("--grid"), ink: css("--text-primary"), surf: css("--surface-1") };
    if (compChart) compChart.destroy();
    compChart = new Chart(document.getElementById("chartComposition"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "노인여가복지시설", data: rows.map(s => s.seniorLeisure), backgroundColor: p.s1, borderRadius: 3, borderSkipped: false },
          { label: "어린이집", data: rows.map(s => s.daycare), backgroundColor: p.s3, borderRadius: 3, borderSkipped: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: p.sec, usePointStyle: true, pointStyleWidth: 12, boxHeight: 8, padding: 16 } },
          tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)}개소` } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: p.muted, font: { size: 11 } } },
          y: { stacked: true, grid: { color: p.grid }, border: { display: false }, ticks: { color: p.muted, callback: (v) => fmt(v) } },
        },
      },
    });
  }

  /* ---------- 데이터 표 ---------- */
  function renderTable() {
    const head = document.getElementById("natTableHead");
    const cols = [
      { k: "short", label: "시도", num: false },
      { k: "population", label: "인구", num: true },
      { k: "elderlyRate", label: "고령화율", num: true },
      { k: "seniorLeisure", label: "노인여가시설", num: true },
      { k: "daycare", label: "어린이집", num: true },
      { k: "disabled", label: "등록장애인", num: true },
    ];
    head.innerHTML = cols.map(c => `<th class="${c.num ? "num" : ""}" data-sort="${c.k}" style="cursor:pointer;">${c.label}${sortKey === c.k ? (sortDir < 0 ? " ▼" : " ▲") : ""}</th>`).join("");
    let rows = [...N.sido];
    if (sortKey) rows.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1) * sortDir);
    const tb = document.querySelector("#natTable tbody");
    tb.innerHTML = rows.map(s => `
      <tr data-code="${s.code}" style="cursor:pointer;">
        <td><b>${s.short}</b></td>
        <td class="num">${fmt(s.population)}</td>
        <td class="num">${s.elderlyRate}%</td>
        <td class="num">${fmt(s.seniorLeisure)}</td>
        <td class="num">${fmt(s.daycare)}</td>
        <td class="num">${fmt(s.disabled)}</td>
      </tr>`).join("");
  }

  /* ---------- 렌더 ---------- */
  function renderDynamic() { renderMap(); renderRank(); renderDetail(); }
  function renderAll() { renderNatStats(); renderMetricSeg(); renderDynamic(); renderComposition(); renderTable(); }

  /* ---------- 이벤트 ---------- */
  document.getElementById("metricSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    metricKey = b.dataset.metric;
    const normBtns = document.querySelectorAll("#normSeg button");
    normBtns.forEach(x => x.disabled = !N.metric(metricKey).normalizable);
    renderMetricSeg(); renderDynamic();
  });
  document.getElementById("normSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    norm = b.dataset.norm;
    document.querySelectorAll("#normSeg button").forEach(x => x.classList.toggle("active", x === b));
    renderDynamic();
  });
  function pick(code) { selected = code; renderMap(); renderRank(); renderDetail(); }
  document.getElementById("kmap").addEventListener("click", (e) => { const t = e.target.closest(".ktile"); if (t) pick(t.dataset.code); });
  document.getElementById("kmap").addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.code) { e.preventDefault(); pick(e.target.dataset.code); } });
  document.getElementById("rankList").addEventListener("click", (e) => { const r = e.target.closest(".rank-row"); if (r) pick(r.dataset.code); });
  document.querySelector("#natTable tbody").addEventListener("click", (e) => { const r = e.target.closest("tr"); if (r) pick(r.dataset.code); });
  document.getElementById("natTableHead").addEventListener("click", (e) => {
    const th = e.target.closest("th"); if (!th) return;
    const k = th.dataset.sort;
    if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
    renderTable();
  });
  document.addEventListener("themechange", () => { renderMap(); renderComposition(); });
  document.addEventListener("nationwidelive", () => { console.info("[nationwide] 실시간 데이터 반영"); renderAll(); });

  renderAll();
  // server/ 프록시(KOSIS)가 켜져 있으면 실데이터로 갱신 (없으면 번들 통계 유지)
  if (typeof fetchLiveNationwide === "function") fetchLiveNationwide();
})();
