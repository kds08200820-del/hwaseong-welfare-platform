/* =============================================================
   화성복지플랫폼 — 전국 시도별 복지 데이터 모듈
   -------------------------------------------------------------
   ◎ 출처(모두 공식 통계):
     · 노인여가복지시설(경로당·노인복지관·노인교실): KOSIS/보건복지부, 2023
     · 어린이집: 보육통계(KOSIS), 2025
     · 등록장애인: 보건복지부 등록장애인 현황(KOSIS), 2025
     · 총인구: 행정안전부 주민등록 인구통계, 2025
     · 고령화율(65세+): 행정안전부/통계청, 2024
   ◎ 지도 배치: 17개 시도 타일그리드(schematic) — 실제 지리 형태가 아닌
     방위 기반 격자. col(1=서→5=동), row(1=북→6=남).
   ============================================================= */

const NATIONWIDE_DATA = {
  meta: {
    source: "KOSIS·보건복지부·행정안전부 공식 통계",
    note: "노인여가시설 2023 · 어린이집·등록장애인 2025 · 인구 2025 · 고령화율 2024",
  },

  /* 지도에서 선택 가능한 지표(복지시설 구분 포함) */
  metrics: [
    { key: "seniorLeisure", label: "노인여가복지시설", short: "노인여가시설", unit: "개소", sub: "경로당·노인복지관·노인교실", year: "2023", kind: "facility", normalizable: true },
    { key: "daycare",       label: "어린이집",        short: "어린이집",     unit: "개소", sub: "영유아 보육시설",            year: "2025", kind: "facility", normalizable: true },
    { key: "disabled",      label: "등록장애인",      short: "등록장애인",   unit: "명",   sub: "복지 대상 인구",            year: "2025", kind: "welfare",  normalizable: true },
    { key: "population",    label: "총인구",          short: "총인구",       unit: "명",   sub: "주민등록 인구",             year: "2025", kind: "demo",     normalizable: false },
    { key: "elderlyRate",   label: "고령화율(65세+)", short: "고령화율",     unit: "%",    sub: "65세 이상 비율",            year: "2024", kind: "demo",     normalizable: false },
  ],

  /* 17개 시도 (값은 위 출처의 실측치) */
  sido: [
    { code: "11", name: "서울특별시",       short: "서울", col: 2, row: 2, population: 9308000,  elderlyRate: 19.4, seniorLeisure: 3910,  daycare: 4010, disabled: 384934 },
    { code: "28", name: "인천광역시",       short: "인천", col: 1, row: 2, population: 3032000,  elderlyRate: 17.5, seniorLeisure: 1559,  daycare: 1556, disabled: 153635 },
    { code: "41", name: "경기도",           short: "경기", col: 3, row: 2, population: 13664000, elderlyRate: 16.0, seniorLeisure: 10082, daycare: 8030, disabled: 591698 },
    { code: "51", name: "강원특별자치도",   short: "강원", col: 4, row: 1, population: 1517000,  elderlyRate: 24.7, seniorLeisure: 3308,  daycare: 779,  disabled: 98676 },
    { code: "44", name: "충청남도",         short: "충남", col: 1, row: 3, population: 2135000,  elderlyRate: 22.0, seniorLeisure: 5886,  daycare: 1272, disabled: 132909 },
    { code: "36", name: "세종특별자치시",   short: "세종", col: 2, row: 3, population: 393000,   elderlyRate: 11.0, seniorLeisure: 505,   daycare: 286,  disabled: 13002 },
    { code: "43", name: "충청북도",         short: "충북", col: 3, row: 3, population: 1591000,  elderlyRate: 21.5, seniorLeisure: 4214,  daycare: 837,  disabled: 96199 },
    { code: "47", name: "경상북도",         short: "경북", col: 4, row: 3, population: 2539000,  elderlyRate: 25.4, seniorLeisure: 8261,  daycare: 1162, disabled: 176183 },
    { code: "52", name: "전북특별자치도",   short: "전북", col: 1, row: 4, population: 1728000,  elderlyRate: 24.6, seniorLeisure: 6865,  daycare: 856,  disabled: 127760 },
    { code: "30", name: "대전광역시",       short: "대전", col: 2, row: 4, population: 1442000,  elderlyRate: 17.4, seniorLeisure: 848,   daycare: 826,  disabled: 71212 },
    { code: "27", name: "대구광역시",       short: "대구", col: 4, row: 4, population: 2361000,  elderlyRate: 20.6, seniorLeisure: 1574,  daycare: 992,  disabled: 130970 },
    { code: "31", name: "울산광역시",       short: "울산", col: 5, row: 4, population: 1097000,  elderlyRate: 16.4, seniorLeisure: 867,   daycare: 535,  disabled: 50990 },
    { code: "29", name: "광주광역시",       short: "광주", col: 1, row: 5, population: 1411000,  elderlyRate: 17.2, seniorLeisure: 1385,  daycare: 785,  disabled: 68816 },
    { code: "46", name: "전라남도",         short: "전남", col: 2, row: 5, population: 1788000,  elderlyRate: 26.0, seniorLeisure: 9179,  daycare: 869,  disabled: 133180 },
    { code: "48", name: "경상남도",         short: "경남", col: 3, row: 5, population: 3237000,  elderlyRate: 21.0, seniorLeisure: 7563,  daycare: 1613, disabled: 186926 },
    { code: "26", name: "부산광역시",       short: "부산", col: 4, row: 5, population: 3266000,  elderlyRate: 23.5, seniorLeisure: 2529,  daycare: 1278, disabled: 173871 },
    { code: "50", name: "제주특별자치도",   short: "제주", col: 1, row: 6, population: 668000,   elderlyRate: 18.0, seniorLeisure: 470,   daycare: 378,  disabled: 36800 },
  ],

  /* 순차 팔레트(블루 100→700) — 낮음 밝음 → 높음 진함 */
  ramp: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],

  metric(key) { return this.metrics.find(m => m.key === key); },

  /* 지표값 (정규화 옵션: 인구 10만명당) */
  value(s, key, per100k = false) {
    const raw = s[key];
    if (!per100k) return raw;
    return +(raw / s.population * 100000).toFixed(1);
  },

  /* 전국 합계/평균 */
  national(key) {
    if (key === "elderlyRate") {
      const totPop = this.sido.reduce((a, s) => a + s.population, 0);
      const totOld = this.sido.reduce((a, s) => a + s.population * s.elderlyRate / 100, 0);
      return +(totOld / totPop * 100).toFixed(1);
    }
    return this.sido.reduce((a, s) => a + s[key], 0);
  },
};

/* 실시간 프록시(/api/nationwide)가 KOSIS 실데이터를 주면 덮어씀.
   프록시가 없거나 static 모드면 번들된 공식 통계를 그대로 사용. */
async function fetchLiveNationwide(baseUrl = "") {
  try {
    const res = await fetch(`${baseUrl}/api/nationwide`, { cache: "no-store" });
    if (!res.ok) throw new Error("proxy off");
    const live = await res.json();
    if (live.mode === "live" && Array.isArray(live.sido)) {
      live.sido.forEach(r => {
        const t = NATIONWIDE_DATA.sido.find(s => s.name === r.name || s.short === r.name);
        if (t) ["seniorLeisure", "daycare", "disabled", "population"].forEach(k => { if (r[k] != null) t[k] = r[k]; });
      });
      document.dispatchEvent(new CustomEvent("nationwidelive"));
      return true;
    }
  } catch (e) {
    console.info("[nationwide] 실시간 API 미연결 — 번들 공식 통계 사용:", e.message);
  }
  return false;
}

if (typeof module !== "undefined") module.exports = NATIONWIDE_DATA;
