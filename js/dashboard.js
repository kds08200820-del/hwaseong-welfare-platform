/* =============================================================
   대시보드 렌더링 (Chart.js 4)
   지역 필터에 따라 모든 지표 갱신 · 라이트/다크 재렌더
   ============================================================= */
(function () {
  const D = WELFARE_DATA;
  let region = "both"; // both | ujeong | jangan
  const charts = {};

  /* CSS 변수에서 색상 읽기 (테마 대응) */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function palette() {
    return {
      s1: css("--series-1"), s2: css("--series-2"), s3: css("--series-3"),
      s4: css("--series-4"), s5: css("--series-5"), s6: css("--series-6"),
      s7: css("--series-7"), s8: css("--series-8"),
      ink: css("--text-primary"), sec: css("--text-secondary"),
      muted: css("--text-muted"), grid: css("--grid"), surf: css("--surface-1"),
    };
  }

  const fmt = (n) => n.toLocaleString("ko-KR");
  const REGION_NAME = { both: "전체", ujeong: "우정읍", jangan: "장안면" };
  // 색: 엔티티 고정 — 우정읍 = series-1, 장안면 = series-2
  const rColor = (p) => ({ ujeong: p.s1, jangan: p.s2 });

  function activeRegions() {
    return region === "both" ? ["ujeong", "jangan"] : [region];
  }

  /* ---------- Chart.js 공통 옵션 ---------- */
  function baseOpts(p, extra = {}) {
    return Object.assign({
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: region === "both",
          position: "bottom",
          labels: { color: p.sec, font: { size: 13, family: css("--font") || "sans-serif" }, usePointStyle: true, pointStyleWidth: 12, padding: 16, boxHeight: 8 },
        },
        tooltip: {
          backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf,
          padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4,
          titleFont: { weight: "700" },
        },
      },
    }, extra);
  }
  function axis(p, unit) {
    return {
      grid: { color: p.grid, drawTicks: false },
      border: { display: false },
      ticks: { color: p.muted, font: { size: 12 }, padding: 8,
        callback: (v) => fmt(v) + (unit || "") },
    };
  }

  /* ================= 요약 지표 ================= */
  function renderStats() {
    const el = document.getElementById("statRow");
    const rs = activeRegions();
    const sum = (fn) => rs.reduce((a, k) => a + fn(k), 0);
    const pop = sum(k => D.regions[k].population);
    const hh = sum(k => D.regions[k].households);
    const elderly = sum(k => Math.round(D.regions[k].population * D.regions[k].elderlyRate / 100));
    const elderlyRate = (elderly / pop * 100);
    const onePerson = activeRegions().reduce((a, k) => a + D.regions[k].onePersonHhRate * D.regions[k].households, 0) / hh;
    const welfareTotal = D.welfare.categories.reduce((a, c) => a + sum(k => c[k]), 0);
    const gr = D.needGrade(avgNeeds());

    el.innerHTML = `
      <div class="stat">
        <div class="label">총인구 (${REGION_NAME[region]}) <span class="badge good" style="font-size:.62rem;padding:1px 6px;">공식</span></div>
        <div class="value">${fmt(pop)}<span class="unit">명</span></div>
        <div class="sub">${fmt(hh)}세대 · 1인세대 ${onePerson.toFixed(0)}%</div>
      </div>
      <div class="stat">
        <div class="label">65세 이상 고령인구 <span class="badge good" style="font-size:.62rem;padding:1px 6px;">공식</span></div>
        <div class="value">${fmt(elderly)}<span class="unit">명</span></div>
        <div class="sub"><span class="up">▲ 고령화율 ${elderlyRate.toFixed(1)}%</span> · 초고령사회</div>
      </div>
      <div class="stat">
        <div class="label">복지 대상 (중복 포함) <span class="badge warning" style="font-size:.62rem;padding:1px 6px;">추정</span></div>
        <div class="value">${fmt(welfareTotal)}<span class="unit">명</span></div>
        <div class="sub">수급·차상위·장애·독거·한부모·다문화</div>
      </div>
      <div class="stat">
        <div class="label">종합 필요도 등급</div>
        <div class="value" style="font-size:1.7rem;">${avgNeeds().toFixed(0)}<span class="unit">/100</span></div>
        <div class="sub"><span class="badge ${gr.level}">${gr.label}</span></div>
      </div>`;
    document.getElementById("metaLabel").textContent = `인구 기준 ${D.meta.updated} · 성별 ${D.meta.genderAsOf} · ${D.meta.source}`;
  }

  function avgNeeds() {
    const rs = activeRegions();
    let tot = 0, n = 0;
    rs.forEach(k => D.needs[k].forEach(v => { tot += v; n++; }));
    return tot / n;
  }

  /* ================= 연령 구조 (3대 연령, 공식) ================= */
  function renderAge(p) {
    const ds = activeRegions().map(k => ({
      label: D.regions[k].name, data: D.ageStructure[k],
      backgroundColor: rColor(p)[k], borderRadius: 4, borderSkipped: false,
      barPercentage: 0.72, categoryPercentage: 0.66,
    }));
    mk("chartAge", "bar", { labels: D.ageStructure.labels, datasets: ds },
      baseOpts(p, { scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: p.muted, font: { size: 12 } } }, y: axis(p, "") } }));
  }

  /* ================= 필요도 레이더 ================= */
  function renderNeeds(p) {
    const ds = activeRegions().map(k => {
      const c = rColor(p)[k];
      return {
        label: D.regions[k].name, data: D.needs[k],
        borderColor: c, backgroundColor: c + "33",
        pointBackgroundColor: c, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2,
      };
    });
    mk("chartNeeds", "radar", { labels: D.needs.domains, datasets: ds },
      baseOpts(p, {
        scales: { r: {
          min: 0, max: 100,
          grid: { color: p.grid }, angleLines: { color: p.grid },
          pointLabels: { color: p.sec, font: { size: 12 } },
          ticks: { display: false, stepSize: 25 },
        } },
      }));
  }

  /* 공식 발표치는 큰 점, 추정치는 작은 점으로 구분 */
  const ptRadius = () => D.trend.real.map(r => (r ? 5 : 2.5));
  const ptStyle = () => D.trend.real.map(r => (r ? "rectRot" : "circle"));

  /* ================= 총인구 추이 ================= */
  function renderPop(p) {
    const ds = activeRegions().map(k => {
      const c = rColor(p)[k];
      return {
        label: D.regions[k].name, data: D.trend[k + "_pop"],
        borderColor: c, backgroundColor: c + "22", borderWidth: 2,
        pointRadius: ptRadius(), pointStyle: ptStyle(), pointHoverRadius: 7,
        tension: 0.3, fill: false, pointBackgroundColor: c,
      };
    });
    mk("chartPop", "line", { labels: D.trend.years, datasets: ds },
      baseOpts(p, { interaction: { mode: "index", intersect: false },
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: p.muted } }, y: axis(p, "") } }));
  }

  /* ================= 고령화율 추이 ================= */
  function renderAging(p) {
    const ds = activeRegions().map(k => {
      const c = rColor(p)[k];
      return {
        label: D.regions[k].name, data: D.trend[k + "_elderly"],
        borderColor: c, backgroundColor: c + "22", borderWidth: 2,
        pointRadius: ptRadius(), pointStyle: ptStyle(), pointHoverRadius: 7, tension: 0.3, fill: false, pointBackgroundColor: c,
      };
    });
    mk("chartAging", "line", { labels: D.trend.years, datasets: ds },
      baseOpts(p, {
        interaction: { mode: "index", intersect: false },
        plugins: Object.assign(baseOpts(p).plugins, {
          annotation: undefined,
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y}%` }, backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8 },
        }),
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: p.muted } },
          y: { grid: { color: p.grid }, border: { display: false }, min: 10,
            ticks: { color: p.muted, callback: (v) => v + "%" } } },
      }));
  }

  /* ================= 복지 대상 현황 ================= */
  function renderWelfare(p) {
    const labels = D.welfare.categories.map(c => c.label);
    const ds = activeRegions().map(k => ({
      label: D.regions[k].name, data: D.welfare.categories.map(c => c[k]),
      backgroundColor: rColor(p)[k], borderRadius: 4, borderSkipped: false,
      barPercentage: 0.74, categoryPercentage: 0.68,
    }));
    mk("chartWelfare", "bar", { labels, datasets: ds },
      baseOpts(p, {
        indexAxis: "y",
        scales: { x: axis(p, ""), y: { grid: { display: false }, border: { display: false }, ticks: { color: p.sec, font: { size: 12 } } } },
      }));
  }

  /* ================= 복지 인프라 ================= */
  function renderFacil(p) {
    const ds = activeRegions().map(k => ({
      label: D.regions[k].name, data: D.facilities[k],
      backgroundColor: rColor(p)[k], borderRadius: 4, borderSkipped: false,
      barPercentage: 0.72, categoryPercentage: 0.68,
    }));
    mk("chartFacil", "bar", { labels: D.facilities.labels, datasets: ds },
      baseOpts(p, { scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: p.muted, font: { size: 10.5 } } }, y: axis(p, "") } }));
  }

  /* ================= 필요도 미터 ================= */
  const STATUS_COLOR = {
    critical: css("--status-critical") || "#d03b3b",
    serious: css("--status-serious") || "#ec835a",
    warning: css("--status-warning") || "#fab219",
    good: css("--status-good") || "#0ca30c",
  };
  function renderMeters() {
    const el = document.getElementById("needsMeters");
    const rs = activeRegions();
    // 지역 평균 (both면 두 지역 평균)
    const domains = D.needs.domains.map((dm, i) => {
      const v = rs.reduce((a, k) => a + D.needs[k][i], 0) / rs.length;
      return { name: dm, val: v };
    }).sort((a, b) => b.val - a.val);

    el.innerHTML = domains.map(d => {
      const gr = D.needGrade(d.val);
      const col = STATUS_COLOR[gr.level] || css("--status-warning");
      return `<div class="meter-row">
        <span class="m-label">${d.name}</span>
        <div class="meter-track"><div class="meter-fill" style="width:${d.val}%;background:${col};"></div></div>
        <span class="m-val">${d.val.toFixed(0)} <span class="badge ${gr.level}" style="margin-left:4px;">${gr.label}</span></span>
      </div>`;
    }).join("");
    document.getElementById("needsRegionLabel").textContent = REGION_NAME[region] + " 기준";
  }

  /* ================= 데이터 표 ================= */
  function renderTable() {
    const tb = document.querySelector("#dataTable tbody");
    tb.innerHTML = D.welfare.categories.map(c => `
      <tr>
        <td>${c.icon} ${c.label}</td>
        <td class="num">${fmt(c.ujeong)}</td>
        <td class="num">${fmt(c.jangan)}</td>
        <td class="num"><b>${fmt(c.ujeong + c.jangan)}</b></td>
        <td>${c.unit}</td>
      </tr>`).join("");
    document.getElementById("tableSource").textContent = `출처: ${D.meta.source} · 기준 ${D.meta.updated}`;
  }

  /* ---------- 차트 생성/갱신 헬퍼 ---------- */
  function mk(id, type, data, options) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), { type, data, options });
  }

  /* ---------- 전체 렌더 ---------- */
  function renderAll() {
    const p = palette();
    renderStats();
    renderAge(p);
    renderNeeds(p);
    renderPop(p);
    renderAging(p);
    renderWelfare(p);
    renderFacil(p);
    renderMeters();
    renderTable();
  }

  /* ---------- 필터 이벤트 ---------- */
  document.getElementById("regionSeg").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    region = btn.dataset.region;
    document.querySelectorAll("#regionSeg button").forEach(b => b.classList.toggle("active", b === btn));
    renderAll();
  });

  document.addEventListener("themechange", renderAll);
  // 실시간 프록시가 데이터를 덮어쓰면 다시 렌더
  document.addEventListener("datalive", () => { console.info("[data] 실시간 데이터 반영"); renderAll(); });

  if (typeof Chart !== "undefined") {
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif";
    renderAll();
    // server/ 프록시가 켜져 있으면 실데이터로 갱신 (없으면 무시)
    if (typeof fetchLiveData === "function") fetchLiveData();
  } else {
    document.querySelectorAll(".chart-box").forEach(b => {
      b.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">차트 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.</p>';
    });
    renderStats(); renderMeters(); renderTable();
  }
})();
