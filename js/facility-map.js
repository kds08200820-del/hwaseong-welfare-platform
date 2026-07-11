/* =============================================================
   우정읍·장안면 복지시설 지도 — Leaflet + OpenStreetMap (무료)
   ============================================================= */
(function () {
  const mapEl = document.getElementById("facMap");
  const listEl = document.getElementById("facList");
  const legendEl = document.getElementById("facLegend");
  if (!mapEl) return;

  let activeType = "all";
  const layers = [];   // {type, marker}

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

  function renderList() {
    const items = FACILITIES.filter(f => activeType === "all" || f.type === activeType);
    listEl.innerHTML = items.map((f, i) => `
      <button class="fac-item" data-i="${FACILITIES.indexOf(f)}">
        <span class="fac-dot" style="background:${FAC_TYPES[f.type].color}"></span>
        <span class="fac-body"><b>${f.name}</b><span class="fac-addr">${f.addr}</span></span>
        <span class="fac-cat">${f.type}</span>
      </button>`).join("");
  }

  function applyFilter() {
    layers.forEach(l => {
      const show = activeType === "all" || l.type === activeType;
      if (show) l.marker.addTo(map); else map.removeLayer(l.marker);
    });
  }
  function setType(t) { activeType = t; renderLegend(); renderList(); applyFilter(); }

  renderLegend(); renderList();
  legendEl.addEventListener("click", (e) => { const b = e.target.closest(".fac-chip"); if (b) setType(b.dataset.type); });

  if (typeof L === "undefined") {
    mapEl.innerHTML = '<div class="fac-map-msg">지도 라이브러리를 불러오지 못했습니다. 아래 목록으로 확인하세요.</div>';
    return;
  }

  // 지도: 우정·장안 일대
  const map = L.map(mapEl, { scrollWheelZoom: false, attributionControl: true }).setView([37.083, 126.815], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "© OpenStreetMap",
  }).addTo(map);

  const bounds = L.latLngBounds();
  FACILITIES.forEach(f => {
    const color = FAC_TYPES[f.type].color;
    const marker = L.circleMarker([f.lat, f.lng], {
      radius: 8, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1,
    }).bindPopup(`<b>${f.name}</b><br><span style="color:#666">${f.addr}</span><br><span style="color:${color};font-weight:700">${FAC_TYPES[f.type].label.split(" ")[0]}</span>`);
    marker.addTo(map);
    layers.push({ type: f.type, marker });
    bounds.extend([f.lat, f.lng]);
  });
  map.fitBounds(bounds, { padding: [30, 30] });

  // 목록 클릭 → 해당 마커로 이동·팝업
  listEl.addEventListener("click", (e) => {
    const b = e.target.closest(".fac-item"); if (!b) return;
    const f = FACILITIES[+b.dataset.i];
    map.setView([f.lat, f.lng], 15, { animate: true });
    const l = layers.find(x => x.marker.getLatLng().lat === f.lat && x.marker.getLatLng().lng === f.lng);
    if (l) l.marker.openPopup();
  });
})();
