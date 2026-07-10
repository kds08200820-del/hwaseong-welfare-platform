/* =============================================================
   대한민국 경계 → SVG path 변환기 (시도 + 시군구 드릴다운)
   - window.KR_TOPO (시도), window.KR_SIGUNGU_TOPO (시군구)
   - 경위도 → 등장방형 투영, viewBox 좌표 생성
   출처: southkorea/southkorea-maps (KOSTAT 2018, 공개)
   ============================================================= */
const KRGeo = (function () {
  const VBW = 1000;

  const GEO2SHORT = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
    "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
  };
  // 시도 short → KOSTAT 2자리 코드 (시군구 prefix 필터용)
  const SHORT2P = {
    "서울": "11", "부산": "21", "대구": "22", "인천": "23", "광주": "24", "대전": "25",
    "울산": "26", "세종": "29", "경기": "31", "강원": "32", "충북": "33", "충남": "34",
    "전북": "35", "전남": "36", "경북": "37", "경남": "38", "제주": "39",
  };

  function decodeArcs(topo) {
    const { scale, translate } = topo.transform;
    return topo.arcs.map(arc => {
      let x = 0, y = 0;
      return arc.map(p => { x += p[0]; y += p[1]; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; });
    });
  }
  function stitch(arcs, idxs) {
    const ring = [];
    idxs.forEach((idx, k) => {
      let line = idx >= 0 ? arcs[idx] : arcs[~idx].slice().reverse();
      if (k > 0) line = line.slice(1);
      ring.push(...line);
    });
    return ring;
  }

  /* topo + 선택된 geometries → {items:[{name,code,rings,d,cx,cy}], viewBox} */
  function buildGeo(topo, geoms) {
    const arcs = decodeArcs(topo);
    const items = geoms.map(g => {
      const polys = g.type === "MultiPolygon" ? g.arcs : [g.arcs];
      const rings = [];
      polys.forEach(poly => poly.forEach(r => rings.push(stitch(arcs, r))));
      return { name: g.properties.name, code: String(g.properties.code), rings };
    });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    items.forEach(p => p.rings.forEach(r => r.forEach(([lo, la]) => {
      if (lo < minX) minX = lo; if (lo > maxX) maxX = lo;
      if (la < minY) minY = la; if (la > maxY) maxY = la;
    })));
    const midLat = (minY + maxY) / 2, kx = Math.cos(midLat * Math.PI / 180);
    const scale = VBW / ((maxX - minX) * kx);
    const VBH = (maxY - minY) * scale;
    const project = ([lo, la]) => [(lo - minX) * kx * scale, (maxY - la) * scale];
    items.forEach(p => {
      let d = "", best = null, bestArea = -1;
      p.rings.forEach(r => {
        let seg = "", ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
        r.forEach((pt, i) => {
          const [x, y] = project(pt);
          seg += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
          if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y;
        });
        seg += "Z"; d += seg;
        const area = (bx - ax) * (by - ay);
        if (area > bestArea) { bestArea = area; best = [(ax + bx) / 2, (ay + by) / 2]; }
      });
      p.d = d; p.cx = best[0]; p.cy = best[1];
    });
    return { items, viewBox: `0 0 ${VBW.toFixed(0)} ${VBH.toFixed(0)}`, w: VBW, h: VBH };
  }

  let provCache = null;
  const sggCache = {};

  function build() {
    if (provCache) return provCache;
    const topo = window.KR_TOPO;
    const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries;
    const g = buildGeo(topo, geoms);
    g.provinces = g.items.map(p => ({ ...p, short: GEO2SHORT[p.name] }));
    provCache = g;
    return g;
  }

  /* 특정 시도(short)의 시군구 지도 */
  function buildSigungu(short) {
    if (sggCache[short]) return sggCache[short];
    if (!window.KR_SIGUNGU_TOPO) return null;
    const prefix = SHORT2P[short];
    const topo = window.KR_SIGUNGU_TOPO;
    const all = topo.objects[Object.keys(topo.objects)[0]].geometries;
    const geoms = all.filter(g => String(g.properties.code).startsWith(prefix));
    if (!geoms.length) return null;
    const g = buildGeo(topo, geoms);
    g.provinces = g.items; // {name, code, d, cx, cy}
    sggCache[short] = g;
    return g;
  }

  return { build, buildSigungu, GEO2SHORT, SHORT2P };
})();
