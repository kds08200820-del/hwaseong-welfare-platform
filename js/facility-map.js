/* =============================================================
   우정읍·장안면 복지시설 카카오맵 — 지오코딩 마커 + 필터 + 폴백 목록
   ============================================================= */
(function () {
  const mapEl = document.getElementById("facMap");
  const listEl = document.getElementById("facList");
  const legendEl = document.getElementById("facLegend");
  const noticeEl = document.getElementById("facNotice");
  if (!mapEl) return;

  let activeType = "all";
  const markers = [];

  /* 범례 + 필터 */
  function renderLegend() {
    const types = ["all", ...Object.keys(FAC_TYPES)];
    legendEl.innerHTML = types.map(t => {
      const on = t === activeType;
      const color = t === "all" ? "var(--text-secondary)" : FAC_TYPES[t].color;
      const label = t === "all" ? "전체" : FAC_TYPES[t].label;
      const n = t === "all" ? FACILITIES.length : FACILITIES.filter(f => f.type === t).length;
      return `<button class="fac-chip${on ? " on" : ""}" data-type="${t}">
        <span class="fac-dot" style="background:${color}"></span>${label} <b>${n}</b></button>`;
    }).join("");
  }

  /* 폴백/보조 목록 */
  function renderList() {
    const items = FACILITIES.filter(f => activeType === "all" || f.type === activeType);
    listEl.innerHTML = items.map(f => `
      <a class="fac-item" href="${f.url}" target="_blank" rel="noopener">
        <span class="fac-dot" style="background:${FAC_TYPES[f.type].color}"></span>
        <span class="fac-body"><b>${f.name}</b><span class="fac-addr">${f.addr.replace("경기 화성시 ", "")}</span></span>
        <span class="fac-cat">${f.type}</span>
      </a>`).join("");
  }

  function setType(t) {
    activeType = t; renderLegend(); renderList();
    markers.forEach(m => m.setVisible(activeType === "all" || m._type === activeType));
  }

  legendEl.addEventListener("click", (e) => { const b = e.target.closest(".fac-chip"); if (b) setType(b.dataset.type); });

  renderLegend(); renderList();

  /* 카카오 SDK 로드 → 지오코딩 → 마커 */
  if (!KAKAO_APPKEY) {
    mapEl.classList.add("fac-map-off");
    mapEl.innerHTML = '<div class="fac-map-msg">🗺️ 카카오맵을 표시하려면 <b>카카오 JavaScript 앱키</b>가 필요합니다.<br>아래 목록은 실제 시설 정보이며, 클릭 시 카카오맵으로 연결됩니다.</div>';
    if (noticeEl) noticeEl.hidden = false;
    return;
  }

  const s = document.createElement("script");
  s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + KAKAO_APPKEY + "&libraries=services&autoload=false";
  s.onerror = () => { mapEl.innerHTML = '<div class="fac-map-msg">카카오맵 SDK를 불러오지 못했습니다. 앱키·도메인 설정을 확인하세요.</div>'; };
  s.onload = () => window.kakao.maps.load(initMap);
  document.head.appendChild(s);

  function initMap() {
    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(37.065, 126.81); // 우정·장안 일대
    const map = new kakao.maps.Map(mapEl, { center, level: 8 });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    const geocoder = new kakao.maps.services.Geocoder();
    const bounds = new kakao.maps.LatLngBounds();
    const info = new kakao.maps.InfoWindow({ removable: true });

    FACILITIES.forEach(f => {
      geocoder.addressSearch(f.addr, (res, status) => {
        if (status !== kakao.maps.services.Status.OK || !res[0]) return;
        const pos = new kakao.maps.LatLng(res[0].y, res[0].x);
        const color = FAC_TYPES[f.type].color;
        // 색상 원형 커스텀 오버레이 마커
        const el = document.createElement("div");
        el.className = "fac-pin";
        el.style.background = color;
        el.title = f.name;
        const ov = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5, xAnchor: 0.5 });
        ov.setMap(map);
        ov._type = f.type;
        ov.setVisible = (v) => el.style.display = v ? "block" : "none";
        el.addEventListener("click", () => {
          info.setContent(`<div class="fac-iw"><b>${f.name}</b><br><span>${f.addr.replace("경기 화성시 ", "")}</span><br><a href="${f.url}" target="_blank" rel="noopener">카카오맵에서 보기 →</a></div>`);
          info.setPosition(pos); info.open(map);
        });
        markers.push(ov);
        bounds.extend(pos);
        map.setBounds(bounds);
      });
    });
  }
})();
