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
    note: "노인여가시설·어린이집·등록장애인 KOSIS 실시간 · 인구 2025 · 고령화율 2024",
  },

  /* 지도에서 선택 가능한 지표(복지시설 구분 포함)
     tag: official=공식 실통계 / estimate=전국 총계 기반 추정 */
  metrics: [
    { key: "seniorLeisure", label: "노인여가복지시설", short: "노인여가시설", unit: "개소", sub: "경로당·노인복지관·노인교실", year: "2024", kind: "facility", normalizable: true, tag: "official" },
    { key: "daycare",       label: "어린이집",        short: "어린이집",     unit: "개소", sub: "영유아 보육시설",            year: "2025", kind: "facility", normalizable: true, tag: "official" },
    { key: "foodbank",      label: "푸드뱅크·마켓",   short: "푸드뱅크",     unit: "개소", sub: "결식·저소득 먹거리 지원",   year: "2024", kind: "facility", normalizable: true, tag: "estimate" },
    { key: "disabled",      label: "등록장애인",      short: "등록장애인",   unit: "명",   sub: "복지 대상 인구",            year: "2025", kind: "welfare",  normalizable: true, tag: "official" },
    { key: "basicLivelihood", label: "기초생활수급자", short: "기초수급",   unit: "명",   sub: "국민기초생활보장",          year: "2024", kind: "welfare",  normalizable: true, tag: "official" },
    { key: "seniorAlone",   label: "독거노인",        short: "독거노인",     unit: "가구", sub: "65세 이상 1인가구",         year: "2024", kind: "welfare",  normalizable: true, tag: "official" },
    { key: "population",    label: "총인구",          short: "총인구",       unit: "명",   sub: "주민등록 인구",             year: "2025", kind: "demo",     normalizable: false, tag: "official" },
    { key: "elderlyRate",   label: "고령화율(65세+)", short: "고령화율",     unit: "%",    sub: "65세 이상 비율",            year: "2024", kind: "demo",     normalizable: false, tag: "official" },
  ],

  /* 17개 시도 — 노인여가시설·어린이집·등록장애인은 KOSIS 실측(2024~2025),
     푸드뱅크는 전국푸드뱅크 총계 기반 시도 배분 추정 */
  sido: [
    { code: "11", name: "서울특별시",       short: "서울", col: 2, row: 2, population: 9308000,  elderlyRate: 19.4, seniorLeisure: 4075,  daycare: 4010, disabled: 384934, basicLivelihood: 443952, seniorAlone: 356186, foodbank: 52 },
    { code: "28", name: "인천광역시",       short: "인천", col: 1, row: 2, population: 3032000,  elderlyRate: 17.5, seniorLeisure: 1624,  daycare: 1556, disabled: 153635, basicLivelihood: 184260, seniorAlone: 112189, foodbank: 24 },
    { code: "41", name: "경기도",           short: "경기", col: 3, row: 2, population: 13664000, elderlyRate: 16.0, seniorLeisure: 10499, daycare: 8030, disabled: 591698, basicLivelihood: 506929, seniorAlone: 443569, foodbank: 78 },
    { code: "51", name: "강원특별자치도",   short: "강원", col: 4, row: 1, population: 1517000,  elderlyRate: 24.7, seniorLeisure: 3444,  daycare: 779,  disabled: 98676,  basicLivelihood: 89150,  seniorAlone: 97404,  foodbank: 18 },
    { code: "44", name: "충청남도",         short: "충남", col: 1, row: 3, population: 2135000,  elderlyRate: 22.0, seniorLeisure: 6049,  daycare: 1272, disabled: 132909, basicLivelihood: 97896,  seniorAlone: 112239, foodbank: 22 },
    { code: "36", name: "세종특별자치시",   short: "세종", col: 2, row: 3, population: 393000,   elderlyRate: 11.0, seniorLeisure: 529,   daycare: 286,  disabled: 13002,  basicLivelihood: 9369,   seniorAlone: 8326,   foodbank: 4 },
    { code: "43", name: "충청북도",         short: "충북", col: 3, row: 3, population: 1591000,  elderlyRate: 21.5, seniorLeisure: 4308,  daycare: 837,  disabled: 96199,  basicLivelihood: 84716,  seniorAlone: 84379,  foodbank: 18 },
    { code: "47", name: "경상북도",         short: "경북", col: 4, row: 3, population: 2539000,  elderlyRate: 25.4, seniorLeisure: 8208,  daycare: 1162, disabled: 176183, basicLivelihood: 157471, seniorAlone: 167622, foodbank: 26 },
    { code: "52", name: "전북특별자치도",   short: "전북", col: 1, row: 4, population: 1728000,  elderlyRate: 24.6, seniorLeisure: 6961,  daycare: 856,  disabled: 127760, basicLivelihood: 135324, seniorAlone: 111025, foodbank: 20 },
    { code: "30", name: "대전광역시",       short: "대전", col: 2, row: 4, population: 1442000,  elderlyRate: 17.4, seniorLeisure: 878,   daycare: 826,  disabled: 71212,  basicLivelihood: 80729,  seniorAlone: 58287,  foodbank: 14 },
    { code: "27", name: "대구광역시",       short: "대구", col: 4, row: 4, population: 2361000,  elderlyRate: 20.6, seniorLeisure: 1895,  daycare: 992,  disabled: 130970, basicLivelihood: 161699, seniorAlone: 117487, foodbank: 22 },
    { code: "31", name: "울산광역시",       short: "울산", col: 5, row: 4, population: 1097000,  elderlyRate: 16.4, seniorLeisure: 888,   daycare: 535,  disabled: 50990,  basicLivelihood: 46345,  seniorAlone: 40443,  foodbank: 12 },
    { code: "29", name: "광주광역시",       short: "광주", col: 1, row: 5, population: 1411000,  elderlyRate: 17.2, seniorLeisure: 1440,  daycare: 785,  disabled: 68816,  basicLivelihood: 100201, seniorAlone: 59993,  foodbank: 14 },
    { code: "46", name: "전라남도",         short: "전남", col: 2, row: 5, population: 1788000,  elderlyRate: 26.0, seniorLeisure: 9340,  daycare: 869,  disabled: 133180, basicLivelihood: 110861, seniorAlone: 128425, foodbank: 24 },
    { code: "48", name: "경상남도",         short: "경남", col: 3, row: 5, population: 3237000,  elderlyRate: 21.0, seniorLeisure: 7688,  daycare: 1613, disabled: 186926, basicLivelihood: 184319, seniorAlone: 178888, foodbank: 28 },
    { code: "26", name: "부산광역시",       short: "부산", col: 4, row: 5, population: 3266000,  elderlyRate: 23.5, seniorLeisure: 2607,  daycare: 1278, disabled: 173871, basicLivelihood: 243110, seniorAlone: 187176, foodbank: 30 },
    { code: "50", name: "제주특별자치도",   short: "제주", col: 1, row: 6, population: 668000,   elderlyRate: 18.0, seniorLeisure: 502,   daycare: 378,  disabled: 36800,  basicLivelihood: 37154,  seniorAlone: 25169,  foodbank: 8 },
  ],

  /* 순차 팔레트(브론즈/세피아) — 낮음 밝음 → 높음 진함 (테마 통일) */
  ramp: ["#f0e6d4", "#e2cba6", "#d1ac78", "#bd8d52", "#a3703a", "#83572b", "#5f3e1e"],

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
        if (t) ["seniorLeisure", "daycare", "disabled", "basicLivelihood", "seniorAlone", "population"].forEach(k => { if (r[k] != null) t[k] = r[k]; });
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
