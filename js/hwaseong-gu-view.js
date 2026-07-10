/* 화성 4개 구 비교 — 좌측 구 목록 + 우측 비교 차트 (Chart.js) */
(function () {
  if (typeof HWASEONG_GU === "undefined") return;
  const G = HWASEONG_GU;
  let metricKey = "elderlyRate";  // 기본: 고령화율(구별 격차가 큼)
  let per = false;                // 인구 1만명당 정규화
  let selected = 0;               // 선택 구 index
  let chart = null, donut = null;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  // 4개 구 고정색 (팔레트 1~4)
  const guColor = () => [css("--series-1"), css("--series-2"), css("--series-3"), css("--series-8")];

  function val(g, m) {
    if (m.rate) return g[m.key];
    if (per && m.per) return +(g[m.key] / g.pop * 10000).toFixed(1);
    return g[m.key];
  }
  function unit(m) { return per && m.per ? `${m.unit}/1만명` : m.unit; }

  /* ---------- 좌측: 구 카드 목록 ---------- */
  function renderList() {
    const el = document.getElementById("guList");
    const cols = guColor();
    el.innerHTML = G.gu.map((g, i) => `
      <div class="gu-card${i === selected ? " selected" : ""}${g.focus ? " focus" : ""}" data-i="${i}">
        <div class="gu-top">
          <span class="gu-dot" style="background:${cols[i]}"></span>
          <span class="gu-name">${g.name}</span>
          ${g.focus ? '<span class="badge good" style="font-size:.6rem;">우정·장안</span>' : ""}
          <span class="gu-pop">${fmt(g.pop)}명</span>
        </div>
        <div class="gu-sub">${g.dong}</div>
        <div class="gu-meta">
          <span>세대 ${fmt(g.households)}</span><span>성비 ${g.sexRatio}</span><span>고령화율 ${g.elderlyRate}%<span class="est">추정</span></span><span>외국인 ${g.foreignRate}%<span class="est">추정</span></span>
        </div>
        ${g.focus ? `<div class="gu-note">${g.note} · <a href="dashboard.html#region">우정읍·장안면 상세 →</a></div>` : `<div class="gu-note">${g.note}</div>`}
      </div>`).join("");
  }

  /* ---------- 우측: 비교 차트 ---------- */
  function renderChart() {
    if (typeof Chart === "undefined") return;
    const m = G.metric(metricKey);
    const cols = guColor();
    const p = { ink: css("--text-primary"), sec: css("--text-secondary"), muted: css("--text-muted"), grid: css("--grid"), surf: css("--surface-1") };
    const data = G.gu.map(g => val(g, m));
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById("chartGu"), {
      type: "bar",
      data: {
        labels: G.gu.map(g => g.name),
        datasets: [{
          data, backgroundColor: G.gu.map((g, i) => i === selected ? cols[i] : cols[i] + "99"),
          borderColor: cols, borderWidth: G.gu.map((_, i) => i === selected ? 2 : 0),
          borderRadius: 6, borderSkipped: false, barPercentage: 0.7,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (e, els) => { if (els.length) { selected = els[0].index; renderAll(); } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${m.label}: ${m.rate ? c.parsed.y + "%" : fmt(c.parsed.y)} ${unit(m)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: p.sec, font: { size: 13, weight: "700" } } },
          y: { grid: { color: p.grid }, border: { display: false }, ticks: { color: p.muted, callback: (v) => m.rate ? v + "%" : fmt(v) } },
        },
      },
    });
    // 헤더/설명
    document.getElementById("guMetricLabel").innerHTML =
      `${m.label} <span class="badge ${m.tag === "official" ? "good" : "warning"}" style="font-size:.6rem;">${m.tag === "official" ? "공식" : "추정"}</span>`;
    document.getElementById("guChartNote").textContent =
      (m.tag === "official" ? "경기도 공식 인구현황(2026.03) 실값입니다. " : "화성시 KOSIS 총계를 인구·고령 비례로 배분한 추정입니다. ") +
      (per && m.per ? "인구 1만명당으로 정규화해 규모를 보정했습니다." : m.per ? "‘1만명당’ 토글로 규모 보정 비교가 가능합니다." : "");
    // per 토글 활성/비활성
    document.querySelectorAll("#guPerSeg button").forEach(b => b.disabled = !m.per);
  }

  /* ---------- 도넛: 구성비(구별 점유율) ---------- */
  function renderDonut() {
    if (typeof Chart === "undefined") return;
    const m = G.metric(metricKey);
    // 비율 지표는 구성비가 무의미 → 인구 구성비로 대체
    const dm = m.rate ? G.metric("pop") : m;
    const cols = guColor();
    const vals = G.gu.map(g => g[dm.key]);
    const total = vals.reduce((a, b) => a + b, 0);
    const p = { surf: css("--surface-1"), ink: css("--text-primary") };
    if (donut) donut.destroy();
    donut = new Chart(document.getElementById("chartGuDonut"), {
      type: "doughnut",
      data: { labels: G.gu.map(g => g.name), datasets: [{ data: vals, backgroundColor: cols, borderColor: p.surf, borderWidth: 2, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: p.ink, titleColor: p.surf, bodyColor: p.surf, padding: 10, cornerRadius: 8,
            callbacks: { label: (c) => `${c.label}: ${fmt(c.parsed)} (${(c.parsed / total * 100).toFixed(1)}%)` } },
        },
      },
    });
    document.getElementById("donutTitle").textContent = `${dm.label} 구성비` + (m.rate ? " (참고: 인구)" : "");
    document.getElementById("donutLegend").innerHTML = G.gu.map((g, i) =>
      `<span class="item"><span class="swatch" style="background:${cols[i]}"></span>${g.name} <b style="margin-left:4px;">${(g[dm.key] / total * 100).toFixed(1)}%</b></span>`).join("");
  }

  function renderAll() { renderList(); renderChart(); renderDonut(); }

  /* ---------- 이벤트 ---------- */
  document.getElementById("guMetricSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    metricKey = b.dataset.m;
    document.querySelectorAll("#guMetricSeg button").forEach(x => x.classList.toggle("active", x === b));
    renderChart(); renderDonut();
  });
  document.getElementById("guPerSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    per = b.dataset.per === "per";
    document.querySelectorAll("#guPerSeg button").forEach(x => x.classList.toggle("active", x === b));
    renderChart();
  });
  document.getElementById("guList").addEventListener("click", (e) => {
    const c = e.target.closest(".gu-card"); if (!c) return;
    if (e.target.closest("a")) return; // 링크 클릭은 통과
    selected = +c.dataset.i; renderAll();
  });
  document.addEventListener("themechange", renderAll);

  // 메트릭 버튼 생성
  document.getElementById("guMetricSeg").innerHTML = G.metrics.map(m =>
    `<button data-m="${m.key}" class="${m.key === metricKey ? "active" : ""}">${m.label.replace("(추정)", "")}</button>`).join("");

  renderAll();
})();
