/* =============================================================
   시네마틱 히어로 — 전국 지도 → 화성 우정·장안 클로즈업
   KRGeo(build) 재사용, viewBox 애니메이션으로 줌인
   ============================================================= */
(function () {
  const svg = document.getElementById("heroSvg");
  if (!svg || typeof KRGeo === "undefined" || !window.KR_TOPO) { revealAll(); return; }

  const GEO = KRGeo.build();
  const W = GEO.w, H = GEO.h;
  // 우정읍·장안면 중심(경위도)
  const TARGET = GEO.project([126.81, 37.06]);
  const mx = TARGET[0], my = TARGET[1];
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 지도 그리기
  const provs = GEO.provinces.map(p =>
    `<path class="hprov${p.short === "경기" ? " hi" : ""}" d="${p.d}"></path>`).join("");
  const zoomW = W * 0.14, zoomH = H * 0.14;
  const markR = zoomW * 0.018;
  const marker = `<g id="heroMarker" opacity="0" transform="translate(${mx.toFixed(1)},${my.toFixed(1)})">
      <circle class="hmarker-ring" r="${markR * 2}" stroke-width="${markR * 0.5}"></circle>
      <circle class="hmarker-ring" r="${markR * 3.4}" stroke-width="${markR * 0.35}" opacity="0.5"></circle>
      <circle class="hmarker-dot" r="${markR}"></circle>
    </g>`;
  svg.innerHTML = `<g>${provs}</g>${marker}`;

  const full = [0, 0, W, H];
  const tx = Math.max(0, Math.min(W - zoomW, mx - zoomW / 2));
  const ty = Math.max(0, Math.min(H - zoomH, my - zoomH / 2));
  const target = [tx, ty, zoomW, zoomH];
  const setVB = (v) => svg.setAttribute("viewBox", v.map(n => n.toFixed(1)).join(" "));
  setVB(full);

  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function label(big, sm, show) {
    const el = document.getElementById("heroSceneLabel");
    document.getElementById("sceneBig").textContent = big;
    document.getElementById("sceneSm").textContent = sm;
    el.classList.toggle("show", show !== false);
  }
  function stage(id, on) { const el = document.getElementById(id); if (el) el.classList.toggle("show", on !== false); }
  function revealAllStages() { ["hs0", "hs1", "hs2", "hs3"].forEach(id => stage(id, true)); }

  function run() {
    // 초기화
    setVB(full); document.getElementById("heroMarker").setAttribute("opacity", "0");
    ["hs0", "hs1", "hs2", "hs3"].forEach(id => stage(id, false));
    label("전국", "17개 시도 복지 데이터", false);

    if (reduce) { setVB(target); document.getElementById("heroMarker").setAttribute("opacity", "1"); label("화성 우정·장안", "복지가 가장 필요한 곳", true); revealAllStages(); return; }

    const t0 = performance.now();
    const HOLD = 900, DUR = 2800;
    setTimeout(() => { stage("hs0", true); label("전국", "17개 시도 복지 데이터", true); }, 350);

    function frame(now) {
      const el = now - t0;
      if (el < HOLD) { requestAnimationFrame(frame); return; }
      const p = Math.min((el - HOLD) / DUR, 1);
      const e = ease(p);
      setVB([lerp(full[0], target[0], e), lerp(full[1], target[1], e), lerp(full[2], target[2], e), lerp(full[3], target[3], e)]);
      if (p > 0.35 && p < 0.7) label("경기도", "수도권 서남부", true);
      if (p >= 0.7) label("화성 · 우정 · 장안", "복지가 가장 필요한 곳", true);
      if (p >= 0.55) { stage("hs0", false); stage("hs1", true); }
      if (p >= 0.72) stage("hs2", true);
      if (p >= 0.85) { stage("hs3", true); document.getElementById("heroMarker").setAttribute("opacity", "1"); }
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function revealAll() { ["hs0", "hs1", "hs2", "hs3"].forEach(id => { const e = document.getElementById(id); if (e) e.classList.add("show"); }); }

  document.getElementById("heroReplay")?.addEventListener("click", run);
  // 최초 실행
  run();
})();
