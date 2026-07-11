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
  let drill = null;          // 드릴다운한 시도 short (null=전국)
  let sggSel = null;         // 선택 시군구 code

  // 시군구 데이터 (code → {seniorLeisure, disabled, seniorAlone})
  const SGG = {}, SGG_BY_NAME = {};
  if (typeof window.SIGUNGU_DATA !== "undefined") window.SIGUNGU_DATA.forEach(d => { SGG[d.code] = d; SGG_BY_NAME[d.name] = d; });
  // code 우선, 없으면 통합시 구(예: 수원시장안구)→시(수원시) 폴백
  function sggData(p) {
    if (SGG[p.code]) return SGG[p.code];
    const m = p.name && p.name.match(/^(.+?시).*구$/);
    if (m && SGG_BY_NAME[m[1]]) return SGG_BY_NAME[m[1]];
    return null;
  }
  const SGG_METRICS = ["seniorLeisure", "disabled", "seniorAlone"];
  const SGG_LABEL = { seniorLeisure: "노인여가시설", disabled: "등록장애인", seniorAlone: "독거노인" };
  function sggMetric() { return SGG_METRICS.includes(metricKey) ? metricKey : "seniorAlone"; }
  function canDrill(short) { return typeof KRGeo !== "undefined" && KRGeo.buildSigungu && KRGeo.buildSigungu(short); }

  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("ko-KR") : n);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function usePer() { return norm === "per" && N.metric(metricKey).normalizable; }
  function val(s) { return N.value(s, metricKey, usePer()); }
  function unitLabel() {
    const m = N.metric(metricKey);
    return usePer() ? `${m.unit}/10만명` : m.unit;
  }

  /* 색상 구간 — 값 → 램프 인덱스 (7단계 분위) */
  function activeRamp() { return N.metricRamp(drill ? sggMetric() : metricKey); }
  function colorScale(values) {
    const ramp = activeRamp();
    const vals = (values || N.sido.map(val)).slice().sort((a, b) => a - b);
    const min = vals[0], max = vals[vals.length - 1];
    return {
      min, max, ramp,
      color(v) {
        if (max === min) return ramp[3];
        const t = (v - min) / (max - min);
        const idx = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
        return ramp[idx];
      },
      isDark(v) {
        if (max === min) return false;
        const t = (v - min) / (max - min);
        return Math.floor(t * ramp.length) >= 4;
      },
    };
  }

  /* ---------- 전국 요약 ---------- */
  function renderNatStats() {
    const el = document.getElementById("natStats");
    el.innerHTML = `
      <div class="stat"><div class="label">노인여가복지시설</div><div class="value">${fmt(N.national("seniorLeisure"))}<span class="unit">개소</span></div><div class="sub">경로당·복지관 등 · 2024</div></div>
      <div class="stat"><div class="label">어린이집</div><div class="value">${fmt(N.national("daycare"))}<span class="unit">개소</span></div><div class="sub">전국 · 2025</div></div>
      <div class="stat"><div class="label">푸드뱅크·마켓</div><div class="value">${fmt(N.national("foodbank"))}<span class="unit">개소</span></div><div class="sub">먹거리 지원 · 추정</div></div>
      <div class="stat"><div class="label">전국 고령화율</div><div class="value">${N.national("elderlyRate")}<span class="unit">%</span></div><div class="sub">65세+ · 2024</div></div>`;
  }

  /* ---------- 컨트롤 ---------- */
  function renderMetricSeg() {
    const seg = document.getElementById("metricSeg");
    const shown = drill ? sggMetric() : metricKey;   // 드릴 중엔 실제 표시 지표를 active로
    seg.innerHTML = N.metrics.map(m => {
      const dis = drill && !SGG_METRICS.includes(m.key);   // 시군구 미제공 지표는 비활성
      return `<button data-metric="${m.key}" class="${m.key === shown ? "active" : ""}"${dis ? ' disabled title="시군구 단위 미제공"' : ""}>${m.short}</button>`;
    }).join("");
    // 정규화 토글: 드릴 중엔 비활성(시군구 인구 미보유)
    document.querySelectorAll("#normSeg button").forEach(b => b.disabled = drill || !N.metric(metricKey).normalizable);
  }

  /* ---------- 실제 지도(SVG 추로플레스) ---------- */
  let GEO = null;
  const shortToSido = {};
  N.sido.forEach(s => { shortToSido[s.short] = s; });

  function dispVal(s) {
    const m = N.metric(metricKey), v = val(s);
    return m.key === "elderlyRate" ? v + "%" : (usePer() ? v : fmt(v));
  }

  function renderMap() {
    if (drill) return renderSigunguMap();
    const wrap = document.getElementById("kmap");
    const m = N.metric(metricKey);
    const sc = colorScale();
    if (!GEO && window.KRGeo) GEO = KRGeo.build();

    if (GEO) {
      const paths = GEO.provinces.map(p => {
        const s = shortToSido[p.short];
        if (!s) return "";
        const v = val(s);
        const sel = s.code === selected ? " selected" : "";
        return `<path class="province${sel}" d="${p.d}" fill="${sc.color(v)}" data-short="${p.short}"></path>`;
      }).join("");
      const labels = GEO.provinces.map(p => {
        const s = shortToSido[p.short];
        if (!s) return "";
        const v = val(s);
        const ink = sc.isDark(v) ? "#fff" : "#0b0b0b";
        const stroke = sc.isDark(v) ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.7)";
        return `<text class="map-label" x="${p.cx.toFixed(0)}" y="${p.cy.toFixed(0)}"
                  text-anchor="middle" fill="${ink}" stroke="${stroke}" stroke-width="2.5"
                  style="pointer-events:none">${p.short}<tspan class="mv" x="${p.cx.toFixed(0)}" dy="15">${dispVal(s)}</tspan></text>`;
      }).join("");
      wrap.innerHTML = `<svg viewBox="${GEO.viewBox}" role="img" aria-label="대한민국 시도별 ${m.label} 지도">
        <g>${paths}</g><g>${labels}</g></svg>`;
    } else {
      wrap.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">지도 데이터를 불러오지 못했습니다.</p>';
    }

    document.getElementById("mapTitle").innerHTML =
      `${m.label} 분포 <span class="badge ${m.tag === "official" ? "good" : "warning"}" style="font-size:.62rem;">${m.tag === "official" ? "공식" : "추정"}</span>`;
    document.getElementById("mapHint").textContent = `${m.year} · 단위 ${unitLabel()}`;
    document.getElementById("mapNote").textContent =
      `${m.sub} — ${usePer() ? "인구 10만명당으로 정규화(지역 규모 보정). " : "시도별 절대 수치. "}마우스 호버 시 상세, 시도를 클릭하면 시군구 지도로 확대됩니다.`;

    document.getElementById("legBar").innerHTML = sc.ramp.map(c => `<span style="background:${c}"></span>`).join("");
    document.getElementById("legLow").textContent = m.key === "elderlyRate" ? sc.min + "%" : fmt(usePer() ? sc.min : Math.round(sc.min));
    document.getElementById("legHigh").textContent = m.key === "elderlyRate" ? sc.max + "%" : fmt(usePer() ? sc.max : Math.round(sc.max));
  }

  /* ---------- 시군구 드릴다운 지도 ---------- */
  function renderSigunguMap() {
    const wrap = document.getElementById("kmap");
    const geo = KRGeo.buildSigungu(drill);
    const sido = shortToSido[drill];
    const mk = sggMetric();
    const feats = geo.provinces.map(p => { const d = sggData(p); return { p, d, v: d ? d[mk] : null }; });
    const vals = feats.filter(f => f.v != null).map(f => f.v);
    const sc = colorScale(vals.length ? vals : [0, 1]);
    const noData = "var(--surface-2)";
    const paths = feats.map(f => {
      const sel = f.p.code === sggSel ? " selected" : "";
      const fill = f.v != null ? sc.color(f.v) : noData;
      return `<path class="province${sel}" d="${f.p.d}" fill="${fill}" data-code="${f.p.code}"></path>`;
    }).join("");
    // 라벨: 통합시 구는 시 이름으로 합치고, 같은 이름은 한 번만, 작은 곳은 숨김(호버로 확인)
    const simplify = (n) => n.replace(/(특별자치시|특별자치도|광역시|특별시)/, "").replace(/^(.{1,4}시).*(구)$/, "$1");
    const minW = 40, minH = 26;
    const seenLbl = new Set();
    const labels = [...feats].sort((a, b) => (b.p.bw * b.p.bh) - (a.p.bw * a.p.bh)).map(f => {
      const nm = simplify(f.p.name);
      if (seenLbl.has(nm) || f.p.bw < minW || f.p.bh < minH) return "";
      seenLbl.add(nm);
      const dark = f.v != null && sc.isDark(f.v);
      return `<text class="map-label" style="font-size:10.5px;pointer-events:none;font-weight:700" x="${f.p.cx.toFixed(0)}" y="${f.p.cy.toFixed(0)}"
        text-anchor="middle" dominant-baseline="middle" fill="${dark ? "#fff" : "#0b0b0b"}" stroke="${dark ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.8)"}" stroke-width="2.4" paint-order="stroke">${nm}</text>`;
    }).join("");
    wrap.innerHTML = `<svg viewBox="${geo.viewBox}" role="img" aria-label="${sido.name} 시군구 ${SGG_LABEL[mk]} 지도"><g>${paths}</g><g>${labels}</g></svg>`;

    document.getElementById("mapTitle").innerHTML =
      `<button class="btn-back" id="btnBack">← 전국</button> ${sido.name} · ${SGG_LABEL[mk]} <span class="badge good" style="font-size:.62rem;">공식</span>`;
    document.getElementById("mapHint").textContent = `2024~2025 · 시군구 단위 · 단위 ${N.metric(mk).unit}`;
    document.getElementById("mapNote").textContent =
      `${sido.name}의 시군구별 ${SGG_LABEL[mk]} 분포입니다. 마우스를 올리면 상세, 회색은 데이터 미제공(통합시 구 등).`;
    document.getElementById("legBar").innerHTML = sc.ramp.map(c => `<span style="background:${c}"></span>`).join("");
    document.getElementById("legLow").textContent = fmt(Math.round(sc.min));
    document.getElementById("legHigh").textContent = fmt(Math.round(sc.max));
  }

  /* 지도 툴팁 */
  function showTip(short, evt) {
    const s = shortToSido[short]; if (!s) return;
    const tip = document.getElementById("mapTip");
    const per = (k) => (s[k] / s.population * 100000).toFixed(1);
    const m = N.metric(metricKey);
    tip.innerHTML = `<div class="tt-name">${s.name}</div>
      <div class="tt-row"><span class="tk">${m.label}</span><span class="tv tt-hi">${dispVal(s)} ${unitLabel()}</span></div>
      <div class="tt-row"><span class="tk">총인구</span><span class="tv">${fmt(s.population)}명</span></div>
      <div class="tt-row"><span class="tk">고령화율</span><span class="tv">${s.elderlyRate}%</span></div>
      <div class="tt-row"><span class="tk">노인여가시설</span><span class="tv">${fmt(s.seniorLeisure)} · 10만명당 ${per("seniorLeisure")}</span></div>`;
    const wrap = document.getElementById("kmap").getBoundingClientRect();
    tip.style.left = (evt.clientX - wrap.left) + "px";
    tip.style.top = (evt.clientY - wrap.top) + "px";
    tip.hidden = false;
  }
  function hideTip() { document.getElementById("mapTip").hidden = true; }

  function showSggTip(code, evt) {
    const tip = document.getElementById("mapTip");
    const geo = KRGeo.buildSigungu(drill);
    const p = geo.provinces.find(x => x.code === code) || { code, name: code };
    const d = sggData(p); const nm = p.name;
    tip.innerHTML = `<div class="tt-name">${nm}</div>` + (d ?
      `<div class="tt-row"><span class="tk">노인여가시설</span><span class="tv">${fmt(d.seniorLeisure ?? 0)}개소</span></div>
       <div class="tt-row"><span class="tk">등록장애인</span><span class="tv">${fmt(d.disabled ?? 0)}명</span></div>
       <div class="tt-row"><span class="tk">독거노인</span><span class="tv tt-hi">${fmt(d.seniorAlone ?? 0)}가구</span></div>`
      : `<div class="tt-row"><span class="tk">데이터 미제공</span></div>`);
    const wrap = document.getElementById("kmap").getBoundingClientRect();
    tip.style.left = (evt.clientX - wrap.left) + "px";
    tip.style.top = (evt.clientY - wrap.top) + "px";
    tip.hidden = false;
  }

  /* ---------- 순위 ---------- */
  function renderRank() {
    const el = document.getElementById("rankList");
    if (drill) return renderSggRank();
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
        <span class="rank-bar-track"><span class="rank-bar-fill" style="width:${Math.max(pct, 6)}%;background:${sc.ramp[4]};"></span></span>
        <span class="rv">${disp}</span>
      </div>`;
    }).join("");
  }

  function renderSggRank() {
    const el = document.getElementById("rankList");
    const mk = sggMetric();
    const geo = KRGeo.buildSigungu(drill);
    const seen = {}, rows = [];
    geo.provinces.forEach(p => { const d = sggData(p); if (!d || seen[d.name]) return; seen[d.name] = 1; rows.push({ code: p.code, name: d.name, v: d[mk] }); });
    rows.sort((a, b) => b.v - a.v);
    const max = rows.length ? rows[0].v : 1, min = rows.length ? rows[rows.length - 1].v : 0;
    const sc = colorScale(rows.map(r => r.v));
    document.getElementById("rankHint").textContent = `${shortToSido[drill].name} · ${SGG_LABEL[mk]}`;
    el.innerHTML = rows.map((r, i) => {
      const pct = max === min ? 100 : (r.v - min) / (max - min) * 92 + 8;
      return `<div class="rank-row${r.code === sggSel ? " selected" : ""}" data-sgg="${r.code}">
        <span class="rk">${i + 1}</span><span class="nm" style="font-size:.82rem;">${r.name}</span>
        <span class="rank-bar-track"><span class="rank-bar-fill" style="width:${Math.max(pct, 6)}%;background:${sc.ramp[4]};"></span></span>
        <span class="rv">${fmt(r.v)}</span></div>`;
    }).join("");
  }

  /* ---------- 상세 ---------- */
  function renderDetail() {
    if (drill) return renderSggDetail();
    const el = document.getElementById("regionDetail");
    const s = N.sido.find(x => x.code === selected) || N.sido[0];
    document.getElementById("detailTitle").textContent = s.name;
    const per = (k) => (s[k] / s.population * 100000).toFixed(1);
    el.innerHTML = `
      <div class="rd-metric"><span class="k">총인구 (2025)</span><span class="v">${fmt(s.population)}명</span></div>
      <div class="rd-metric"><span class="k">고령화율 (65세+, 2024)</span><span class="v">${s.elderlyRate}%</span></div>
      <div class="rd-metric"><span class="k">노인여가복지시설 (2023)</span><span class="v">${fmt(s.seniorLeisure)}개소 <span style="color:var(--text-muted);font-weight:500;">(10만명당 ${per("seniorLeisure")})</span></span></div>
      <div class="rd-metric"><span class="k">어린이집 (2025)</span><span class="v">${fmt(s.daycare)}개소 <span style="color:var(--text-muted);font-weight:500;">(10만명당 ${per("daycare")})</span></span></div>
      <div class="rd-metric"><span class="k">등록장애인 (2025)</span><span class="v">${fmt(s.disabled)}명 <span style="color:var(--text-muted);font-weight:500;">(인구대비 ${(s.disabled/s.population*100).toFixed(1)}%)</span></span></div>
      <div class="rd-metric"><span class="k">기초생활수급자 (2024)</span><span class="v">${fmt(s.basicLivelihood)}명 <span style="color:var(--text-muted);font-weight:500;">(수급률 ${(s.basicLivelihood/s.population*100).toFixed(1)}%)</span></span></div>
      <div class="rd-metric"><span class="k">독거노인 (65세+ 1인가구, 2024)</span><span class="v">${fmt(s.seniorAlone)}가구</span></div>
      <div class="rd-metric"><span class="k">푸드뱅크·마켓 (추정)</span><span class="v">${fmt(s.foodbank)}개소</span></div>`;
  }

  function renderSggDetail() {
    const el = document.getElementById("regionDetail");
    const geo = KRGeo.buildSigungu(drill);
    const p = geo.provinces.find(x => x.code === sggSel) || geo.provinces[0];
    const d = sggData(p);
    document.getElementById("detailTitle").textContent = `${shortToSido[drill].name} ${p.name}`;
    el.innerHTML = (d ? `
      <div class="rd-metric"><span class="k">노인여가복지시설 (2024)</span><span class="v">${fmt(d.seniorLeisure ?? 0)}개소</span></div>
      <div class="rd-metric"><span class="k">등록장애인 (2025)</span><span class="v">${fmt(d.disabled ?? 0)}명</span></div>
      <div class="rd-metric"><span class="k">독거노인 (65세+ 1인가구, 2024)</span><span class="v">${fmt(d.seniorAlone ?? 0)}가구</span></div>`
      : `<div class="rd-metric"><span class="k">시군구 단위 데이터 미제공</span></div>`)
      + (p.name.includes("화성") ? `<div class="rd-metric" style="border:none;"><a class="btn btn-primary" href="dashboard.html#gu" style="width:100%;justify-content:center;">화성시 4개 구 상세 비교 →</a></div>` : "");
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
      { k: "basicLivelihood", label: "기초수급", num: true },
      { k: "seniorAlone", label: "독거노인", num: true },
      { k: "foodbank", label: "푸드뱅크", num: true },
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
        <td class="num">${fmt(s.basicLivelihood)}</td>
        <td class="num">${fmt(s.seniorAlone)}</td>
        <td class="num">${fmt(s.foodbank)}</td>
      </tr>`).join("");
  }

  /* ---------- 렌더 ---------- */
  function renderDynamic() { renderMap(); renderRank(); renderDetail(); }
  function renderAll() { renderNatStats(); renderMetricSeg(); renderDynamic(); renderComposition(); renderTable(); }

  /* ---------- 이벤트 ---------- */
  document.getElementById("metricSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    metricKey = b.dataset.metric;
    renderMetricSeg(); renderDynamic();
  });
  document.getElementById("normSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.disabled) return;
    norm = b.dataset.norm;
    document.querySelectorAll("#normSeg button").forEach(x => x.classList.toggle("active", x === b));
    renderDynamic();
  });
  function pick(code) { selected = code; renderMap(); renderRank(); renderDetail(); }
  function drillIn(short) { if (!canDrill(short)) return; drill = short; sggSel = null; hideTip(); renderMetricSeg(); renderMap(); renderRank(); renderDetail(); }
  function drillOut() { drill = null; sggSel = null; hideTip(); renderMetricSeg(); renderMap(); renderRank(); renderDetail(); }
  function pickSgg(code) { sggSel = code; renderMap(); renderRank(); renderDetail(); }

  const kmap = document.getElementById("kmap");
  kmap.addEventListener("click", (e) => {
    if (drill) { const t = e.target.closest(".province"); if (t) pickSgg(t.dataset.code); return; }
    const t = e.target.closest(".province"); if (t) drillIn(t.dataset.short);
  });
  kmap.addEventListener("mousemove", (e) => {
    const t = e.target.closest(".province"); if (!t) { hideTip(); return; }
    if (drill) showSggTip(t.dataset.code, e); else showTip(t.dataset.short, e);
  });
  kmap.addEventListener("mouseleave", hideTip);
  // 뒤로가기 버튼 (동적 생성되므로 위임)
  document.getElementById("mapTitle").addEventListener("click", (e) => { if (e.target.closest("#btnBack")) drillOut(); });
  document.getElementById("rankList").addEventListener("click", (e) => {
    const r = e.target.closest(".rank-row"); if (!r) return;
    if (drill) { if (r.dataset.sgg) pickSgg(r.dataset.sgg); } else if (r.dataset.code) pick(r.dataset.code);
  });
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
