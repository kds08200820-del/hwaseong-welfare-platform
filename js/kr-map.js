/* =============================================================
   대한민국 시도 경계 → SVG path 변환기
   - window.KR_TOPO (단순화 TopoJSON) 을 디코딩
   - 경위도 → 등장방형(equirectangular) 투영, viewBox 좌표 생성
   - 시도별 path(d), 라벨 중심점(cx,cy), viewBox 반환
   출처: southkorea/southkorea-maps (KOSTAT 2018, 공개)
   ============================================================= */
const KRGeo = (function () {
  const VBW = 1000; // viewBox 가로 기준

  // GeoJSON(2018) 시도명 → 대시보드 short 코드
  const GEO2SHORT = {
    "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
    "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
    "경기도": "경기", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
    "전라북도": "전북", "전라남도": "전남", "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
  };

  let cache = null;

  function decodeArcs(topo) {
    const { scale, translate } = topo.transform;
    return topo.arcs.map(arc => {
      let x = 0, y = 0;
      return arc.map(p => {
        x += p[0]; y += p[1];
        return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
      });
    });
  }

  // 아크 인덱스 목록 → 좌표 링 (음수는 역방향)
  function stitch(arcs, idxs) {
    const ring = [];
    idxs.forEach((idx, k) => {
      let line = idx >= 0 ? arcs[idx] : arcs[~idx].slice().reverse();
      if (k > 0) line = line.slice(1); // 이음점 중복 제거
      ring.push(...line);
    });
    return ring;
  }

  function build() {
    if (cache) return cache;
    const topo = window.KR_TOPO;
    const arcs = decodeArcs(topo);
    const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries;

    // 시도별 폴리곤(경위도) 수집
    const provinces = geoms.map(g => {
      const polys = g.type === "MultiPolygon" ? g.arcs : [g.arcs];
      const rings = [];
      polys.forEach(poly => poly.forEach(ringIdx => rings.push(stitch(arcs, ringIdx))));
      return { name: g.properties.name, short: GEO2SHORT[g.properties.name], rings };
    });

    // 전체 bbox
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    provinces.forEach(p => p.rings.forEach(r => r.forEach(([lon, lat]) => {
      if (lon < minX) minX = lon; if (lon > maxX) maxX = lon;
      if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
    })));
    const midLat = (minY + maxY) / 2;
    const kx = Math.cos(midLat * Math.PI / 180); // 위도 보정(가로 축소)
    const lonSpan = (maxX - minX) * kx;
    const scale = VBW / lonSpan;
    const VBH = (maxY - minY) * scale;
    const project = ([lon, lat]) => [ (lon - minX) * kx * scale, (maxY - lat) * scale ];

    // path(d) + 라벨 중심(면적 최대 링의 bbox 중심)
    provinces.forEach(p => {
      let d = "", best = null, bestArea = -1;
      p.rings.forEach(r => {
        let seg = "";
        let rminx = Infinity, rmaxx = -Infinity, rminy = Infinity, rmaxy = -Infinity;
        r.forEach((pt, i) => {
          const [x, y] = project(pt);
          seg += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
          if (x < rminx) rminx = x; if (x > rmaxx) rmaxx = x;
          if (y < rminy) rminy = y; if (y > rmaxy) rmaxy = y;
        });
        seg += "Z";
        d += seg;
        const area = (rmaxx - rminx) * (rmaxy - rminy);
        if (area > bestArea) { bestArea = area; best = [(rminx + rmaxx) / 2, (rminy + rmaxy) / 2]; }
      });
      p.d = d; p.cx = best[0]; p.cy = best[1];
    });

    cache = { provinces, viewBox: `0 0 ${VBW.toFixed(0)} ${VBH.toFixed(0)}`, w: VBW, h: VBH };
    return cache;
  }

  return { build, GEO2SHORT };
})();
