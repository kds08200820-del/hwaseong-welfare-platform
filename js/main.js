/* PWA 서비스워커 등록 (설치형 앱) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* 공통 UI: 테마 토글, 모바일 네비, 연도, 카운트업 */
(function () {
  // 테마 초기화
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  window.toggleTheme = function () {
    const cur = document.documentElement.getAttribute("data-theme");
    const isDark = cur ? cur === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    document.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  };

  window.toggleNav = function () {
    document.getElementById("navLinks")?.classList.toggle("open");
  };

  // 현재 연도
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = "2025";
  });

  // 스크롤 시 숫자 카운트업
  const nums = document.querySelectorAll("[data-count]");
  if (nums.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const dec = (el.dataset.count.split(".")[1] || "").length;
        let start = 0; const dur = 1100; const t0 = performance.now();
        function step(now) {
          const p = Math.min((now - t0) / dur, 1);
          const val = (target * (1 - Math.pow(1 - p, 3)));
          el.textContent = val.toLocaleString("ko-KR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    nums.forEach(n => io.observe(n));
  }
})();
