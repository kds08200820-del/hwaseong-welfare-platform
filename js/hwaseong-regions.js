/* =============================================================
   화성시 정규화 지역 데이터 — 4개 구 → 29개 읍면동
   -------------------------------------------------------------
   ◎ 인구·세대: 경기도 화성특례시 공식 인구현황(2026.03).
     우정읍·장안면은 행안부/POPIN 2026.06 실데이터.
     동탄 9개 동은 개별 공표 미확보 → 동탄구 총계(426,960) 배분 추정.
   ◎ 고령화율(65세+): POPIN/행안부 실측(우정·장안·향남·남양·봉담·진안 등),
     미확보 지역은 지역 특성 기반 추정(demoElderlyReal 플래그로 구분).
   ◎ 복지지표·인프라: 읍면동 공표 미존재 → 인구·고령 비례 배분 추정.
   ◎ 필요도: 조합 산정 지수.
   ============================================================= */
const HW_REGIONS = (function () {
  // key: {name, gu, pop, hh, eld(고령화율%), chd(유소년%), er(고령화율 실측?)}
  const R = {
    // ── 만세구 (우정읍·장안면은 실증지역 실데이터) ──
    ujeong:   { name: "우정읍", gu: "manse", pop: 16593, hh: 9292, eld: 29.1, chd: 5.6, er: true },
    jangan:   { name: "장안면", gu: "manse", pop: 9222, hh: 5237, eld: 36.0, chd: 4.6, er: true },
    hyangnam: { name: "향남읍", gu: "manse", pop: 84902, hh: 41198, eld: 12.3, chd: 13.4, er: true },
    namyang:  { name: "남양읍", gu: "manse", pop: 60412, hh: 30139, eld: 15.9, chd: 12.3, er: true },
    mado:     { name: "마도면", gu: "manse", pop: 6445, hh: 3874, eld: 27, chd: 7 },
    songsan:  { name: "송산면", gu: "manse", pop: 10202, hh: 5501, eld: 24, chd: 8 },
    seosin:   { name: "서신면", gu: "manse", pop: 6996, hh: 4063, eld: 29, chd: 6 },
    paltan:   { name: "팔탄면", gu: "manse", pop: 9150, hh: 5808, eld: 21, chd: 8 },
    yanggam:  { name: "양감면", gu: "manse", pop: 3698, hh: 2309, eld: 29, chd: 6 },
    saesol:   { name: "새솔동", gu: "manse", pop: 27015, hh: 9053, eld: 8, chd: 17 },
    // ── 효행구 ──
    bongdam:  { name: "봉담읍", gu: "hyohaeng", pop: 111015, hh: 47115, eld: 13.0, chd: 15.0, er: true },
    maesong:  { name: "매송면", gu: "hyohaeng", pop: 6182, hh: 3386, eld: 23, chd: 8 },
    bibong:   { name: "비봉면", gu: "hyohaeng", pop: 16458, hh: 8806, eld: 17, chd: 11 },
    jeongnam: { name: "정남면", gu: "hyohaeng", pop: 10201, hh: 5889, eld: 22, chd: 9 },
    gibae:    { name: "기배동", gu: "hyohaeng", pop: 15595, hh: 6074, eld: 12, chd: 15 },
    // ── 병점구 ──
    jinan:    { name: "진안동", gu: "byeongjeom", pop: 50027, hh: 23564, eld: 11.1, chd: 13.8, er: true },
    bj1:      { name: "병점1동", gu: "byeongjeom", pop: 36045, hh: 15963, eld: 14, chd: 12 },
    bj2:      { name: "병점2동", gu: "byeongjeom", pop: 22019, hh: 8759, eld: 16, chd: 12 },
    banwol:   { name: "반월동", gu: "byeongjeom", pop: 37313, hh: 13327, eld: 10, chd: 16 },
    hwasan:   { name: "화산동", gu: "byeongjeom", pop: 28705, hh: 13539, eld: 13, chd: 14 },
    // ── 동탄구 (9개 동 — 동탄구 총계 배분 추정) ──
    dt1: { name: "동탄1동", gu: "dongtan", pop: 26000, hh: 10277, eld: 8, chd: 16, est: true },
    dt2: { name: "동탄2동", gu: "dongtan", pop: 21000, hh: 8300, eld: 9, chd: 15, est: true },
    dt3: { name: "동탄3동", gu: "dongtan", pop: 54000, hh: 21344, eld: 7, chd: 17, est: true },
    dt4: { name: "동탄4동", gu: "dongtan", pop: 43000, hh: 16996, eld: 6, chd: 18, est: true },
    dt5: { name: "동탄5동", gu: "dongtan", pop: 51000, hh: 20158, eld: 6, chd: 18, est: true },
    dt6: { name: "동탄6동", gu: "dongtan", pop: 94000, hh: 37154, eld: 6, chd: 19, est: true },
    dt7: { name: "동탄7동", gu: "dongtan", pop: 46000, hh: 18182, eld: 7, chd: 17, est: true },
    dt8: { name: "동탄8동", gu: "dongtan", pop: 52960, hh: 20933, eld: 7, chd: 17, est: true },
    dt9: { name: "동탄9동", gu: "dongtan", pop: 39000, hh: 15417, eld: 8, chd: 16, est: true },
  };

  const GU = [
    { key: "manse", name: "만세구", dong: ["ujeong", "jangan", "hyangnam", "namyang", "mado", "songsan", "seosin", "paltan", "yanggam", "saesol"] },
    { key: "hyohaeng", name: "효행구", dong: ["bongdam", "maesong", "bibong", "jeongnam", "gibae"] },
    { key: "byeongjeom", name: "병점구", dong: ["jinan", "bj1", "bj2", "banwol", "hwasan"] },
    { key: "dongtan", name: "동탄구", dong: ["dt1", "dt2", "dt3", "dt4", "dt5", "dt6", "dt7", "dt8", "dt9"] },
  ];

  const round = Math.round;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* 복지지표 추정 모델 (인구·고령 비례) */
  function welfareOf(pop, eld) {
    const elderly = pop * eld / 100;
    return {
      basic:        round(pop * (0.012 + eld * 0.0011)),   // 기초수급
      nearpoor:     round(pop * (0.008 + eld * 0.0006)),   // 차상위
      disabled:     round(pop * (0.024 + eld * 0.0007)),   // 등록장애인
      seniorAlone:  round(elderly * 0.184),                // 독거노인(가구)
      singleParent: round(pop * 0.0105),                   // 한부모(가구)
      multiCulture: round(pop * 0.0165),                   // 다문화(가구)
    };
  }
  /* 인프라(개소) 추정 */
  function facilOf(pop, eld) {
    const elderly = pop * eld / 100;
    return [
      round(elderly * 0.0075) || 1,   // 경로당·노인여가
      round(pop / 900),               // 어린이집
      round(pop / 18000) || (pop > 8000 ? 1 : 0), // 지역아동센터
      round(pop / 60000),             // 노인복지시설
      pop > 6000 ? 1 : 1,             // 보건지소·진료소
      round(pop / 90000),             // 장애인시설
    ];
  }
  /* 필요도 지수(0-100, 조합 산정) */
  function needsOf(pop, eld) {
    const rural = pop < 15000;
    return [
      clamp(round(eld * 2.3), 20, 95),                 // 돌봄 공백
      clamp(round(eld * 1.9 + (rural ? 30 : 8)), 20, 95), // 의료 접근성
      clamp(round(52 + eld * 0.5), 40, 90),            // 일자리·소득
      clamp(round(48 + eld * 0.4), 40, 85),            // 주거 안정
      clamp(round((rural ? 66 : 42) + eld * 0.4), 40, 90), // 교육·문화
    ];
  }

  /* 단일 읍면동 → 풀 지역 객체 */
  function regionOf(key) {
    const r = R[key]; if (!r) return null;
    const childPop = round(r.pop * r.chd / 100);
    const elderPop = round(r.pop * r.eld / 100);
    return {
      key, name: r.name, gu: r.gu,
      population: r.pop, households: r.hh,
      elderlyRate: r.eld, childRate: r.chd,
      onePersonHhRate: clamp(round(30 + r.eld * 0.9), 20, 65),
      ageStructure: [childPop, r.pop - childPop - elderPop, elderPop],
      welfare: welfareOf(r.pop, r.eld),
      facilities: facilOf(r.pop, r.eld),
      needs: needsOf(r.pop, r.eld),
      demoElderlyReal: !!r.er,   // 고령화율 실측 여부
      popEstimated: !!r.est,     // 인구 추정(동탄 개별) 여부
    };
  }

  /* 여러 읍면동 집계(구/전체) */
  function aggregate(keys, name) {
    const rs = keys.map(regionOf);
    const pop = rs.reduce((a, x) => a + x.population, 0);
    const hh = rs.reduce((a, x) => a + x.households, 0);
    const elderPop = rs.reduce((a, x) => a + x.ageStructure[2], 0);
    const childPop = rs.reduce((a, x) => a + x.ageStructure[0], 0);
    const sumArr = (f) => rs.reduce((acc, x) => f(x).map((v, i) => (acc[i] || 0) + v), []);
    const welfare = {};
    ["basic", "nearpoor", "disabled", "seniorAlone", "singleParent", "multiCulture"].forEach(k =>
      welfare[k] = rs.reduce((a, x) => a + x.welfare[k], 0));
    return {
      key: name, name, gu: null,
      population: pop, households: hh,
      elderlyRate: +(elderPop / pop * 100).toFixed(1),
      childRate: +(childPop / pop * 100).toFixed(1),
      onePersonHhRate: +(rs.reduce((a, x) => a + x.onePersonHhRate * x.households, 0) / hh).toFixed(0),
      ageStructure: [childPop, pop - childPop - elderPop, elderPop],
      welfare,
      facilities: sumArr(x => x.facilities),
      needs: rs.reduce((acc, x) => x.needs.map((v, i) => (acc[i] || 0) + v * x.population), []).map(v => round(v / pop)),
      demoElderlyReal: rs.every(x => x.demoElderlyReal),
      popEstimated: rs.some(x => x.popEstimated),
    };
  }

  const welfareCats = [
    { key: "basic", label: "기초생활수급자", unit: "명", icon: "🏠" },
    { key: "nearpoor", label: "차상위계층", unit: "명", icon: "📉" },
    { key: "disabled", label: "등록장애인", unit: "명", icon: "♿" },
    { key: "seniorAlone", label: "독거노인", unit: "가구", icon: "👵" },
    { key: "singleParent", label: "한부모가정", unit: "가구", icon: "👨‍👧" },
    { key: "multiCulture", label: "다문화가정", unit: "가구", icon: "🌏" },
  ];

  return {
    meta: {
      popAsOf: "2026-03", source: "경기도 화성특례시 공식 인구현황 · 행안부/POPIN",
      note: "인구·연령은 공식/실측, 복지지표·인프라는 화성시 총계 배분 추정, 필요도는 조합 지수.",
    },
    gu: GU,
    keys: Object.keys(R),
    raw: R,
    ageLabels: ["유소년 (0–14세)", "생산연령 (15–64세)", "고령 (65세+)"],
    facilLabels: ["경로당·노인여가", "어린이집", "지역아동센터", "노인복지시설", "보건지소", "장애인시설"],
    needsDomains: ["돌봄 공백", "의료 접근성", "일자리·소득", "주거 안정", "교육·문화"],
    welfareCats,
    region: regionOf,
    guRegion(guKey) { const g = GU.find(x => x.key === guKey); return aggregate(g.dong, g.name); },
    cityRegion() { return aggregate(Object.keys(R), "화성시 전체"); },
    needGrade(s) {
      if (s >= 80) return { level: "critical", label: "매우 시급" };
      if (s >= 65) return { level: "serious", label: "시급" };
      if (s >= 50) return { level: "warning", label: "주의" };
      return { level: "good", label: "양호" };
    },
  };
})();

if (typeof module !== "undefined") module.exports = HW_REGIONS;
