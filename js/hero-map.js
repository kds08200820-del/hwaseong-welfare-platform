/* =============================================================
   시네마틱 히어로 — 전국 지도 → 화성으로 줌인 → 4개 구 순차 순회
   KRGeo(build) 재사용, viewBox 애니메이션으로 이동
   ============================================================= */
(function () {
  const svg = document.getElementById("heroSvg");
  if (!svg || typeof KRGeo === "undefined" || !window.KR_TOPO) { revealAll(); return; }

  const GEO = KRGeo.build();
  const W = GEO.w, H = GEO.h;
  const P = (lon, lat) => GEO.project([lon, lat]);

  // 화성 4개 구 대략 중심(경위도)
  const GU = [
    { key: "manse", lon: 126.85, lat: 37.11, big: "만세구", sm: "우정·장안 등 서부 농·어촌" },
    { key: "hyohaeng", lon: 126.96, lat: 37.18, big: "효행구", sm: "봉담·정남 등" },
    { key: "byeongjeom", lon: 127.045, lat: 37.205, big: "병점구", sm: "진안·병점 등" },
    { key: "dongtan", lon: 127.09, lat: 37.20, big: "동탄구", sm: "동탄 신도시" },
  ].map(g => ({ ...g, pt: P(g.lon, g.lat) }));

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 지도 + 4개 구 마커
  const provs = GEO.provinces.map(p =>
    `<path class="hprov${p.short === "경기" ? " hi" : ""}" d="${p.d}"></path>`).join("");
  const gw = W * 0.115, gh = gw * (H / W) * (935 / 1000);  // 구 확대 뷰 크기(멀리서)
  const markR = gw * 0.02;
  const markers = GU.map((g, i) =>
    `<g class="hmark" data-i="${i}" transform="translate(${g.pt[0].toFixed(1)},${g.pt[1].toFixed(1)})" opacity="0">
      <circle class="hmarker-pulse" r="${markR}"></circle>
      <circle class="hmarker-dot" r="${markR}"></circle>
    </g>`).join("");
  svg.innerHTML = `<g>${provs}</g>${markers}`;

  const full = [0, 0, W, H];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const guVB = (pt) => [clamp(pt[0] - gw / 2, 0, W - gw), clamp(pt[1] - gh / 2, 0, H - gh), gw, gh];
  const setVB = (v) => svg.setAttribute("viewBox", v.map(n => n.toFixed(1)).join(" "));
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  let cur = full.slice(), raf = 0, stopped = false;

  function label(big, sm) {
    document.getElementById("sceneBig").textContent = big;
    document.getElementById("sceneSm").textContent = sm;
    document.getElementById("heroSceneLabel").classList.add("show");
  }
  function stage(id, on) { const e = document.getElementById(id); if (e) e.classList.toggle("show", on !== false); }
  function setActiveMark(i) {
    svg.querySelectorAll(".hmark").forEach(m => {
      const on = +m.dataset.i === i;
      m.setAttribute("opacity", on ? "1" : "0.42");
      m.querySelector(".hmarker-pulse").style.display = on ? "block" : "none";
    });
  }
  function animateVB(target, dur, cb) {
    const start = cur.slice(), t0 = performance.now();
    cancelAnimationFrame(raf);
    (function frame(now) {
      if (stopped) return;
      const p = Math.min((now - t0) / dur, 1), e = ease(p);
      cur = start.map((s, i) => lerp(s, target[i], e));
      setVB(cur);
      if (p < 1) raf = requestAnimationFrame(frame); else cb && cb();
    })(performance.now());
  }

  function cycle(i) {                       // 4개 구 순차 순회 (무한 루프)
    if (stopped) return;
    const g = GU[i % 4];
    setTimeout(() => {
      if (stopped) return;
      setActiveMark(i % 4); label(g.big, g.sm);
      animateVB(guVB(g.pt), 1700, () => cycle(i + 1));
    }, 850);
  }

  function run() {
    stopped = false;
    cur = full.slice(); setVB(full);
    ["hs0", "hs1", "hs2", "hs3"].forEach(id => stage(id, false));
    svg.querySelectorAll(".hmark").forEach(m => m.setAttribute("opacity", "0"));
    label("전국", "17개 시도 복지 데이터");

    if (reduce) {
      // 모션 최소화: 화성 전체 뷰 + 텍스트 즉시
      const c = GU[1].pt, vb = [c[0] - W * 0.06, c[1] - H * 0.06, W * 0.12, H * 0.12];
      setVB(vb); GU.forEach((g, i) => setActiveMark(0));
      svg.querySelectorAll(".hmark").forEach(m => m.setAttribute("opacity", "1"));
      label("화성시", "복지가 필요한 곳");
      ["hs0", "hs1", "hs2", "hs3"].forEach(id => stage(id, true));
      return;
    }

    setTimeout(() => { stage("hs0", true); }, 350);
    setTimeout(() => {
      label("경기도", "수도권 서남부");
      animateVB(guVB(GU[0].pt), 2600, () => {
        stage("hs1", true); stage("hs2", true); stage("hs3", true);
        cycle(0);
      });
    }, 1000);
  }

  function revealAll() { ["hs0", "hs1", "hs2", "hs3"].forEach(id => { const e = document.getElementById(id); if (e) e.classList.add("show"); }); }

  document.getElementById("heroReplay")?.addEventListener("click", () => { stopped = true; requestAnimationFrame(() => { stopped = false; run(); }); });
  run();
})();
