/* =============================================================
   화성복지플랫폼 — 지역 복지 데이터 모듈 (실데이터 반영본)
   -------------------------------------------------------------
   ◎ 인구·세대·연령·성비: 공식 통계 (행정안전부 주민등록 인구통계 /
     경기도 화성특례시 공식 인구현황 기반). — "official"
       · 총인구·연령구조·세대: 2026년 06월 기준
       · 성별(남/여)·성비: 2025년 08월말 경기도 공식자료 기준
   ◎ 복지대상(수급·장애·독거 등): 읍면 단위 공표 수치 미확보로
     화성시 비율을 적용한 추정치입니다. — "estimated"
     → 정확값은 data.go.kr OpenAPI(보건복지부 수급자현황·등록장애인현황
       등) 연동으로 갱신하세요. (server/ 프록시 + fetchLiveData 참고)
   ◎ 필요도 지수: 본 조합이 인구·복지지표로 산정한 종합지수. — "index"
   -------------------------------------------------------------
   행정구역: 경기도 화성특례시 만세구 우정읍·장안면 (2025년 구제 시행)
   ============================================================= */

const WELFARE_DATA = {
  meta: {
    updated: "2026-06",
    genderAsOf: "2025-08",
    source: "행정안전부 주민등록 인구통계 · 경기도 화성특례시 공식 인구현황",
    region: "경기도 화성특례시 만세구 우정읍·장안면",
    note: "인구·연령·세대는 공식 통계, 복지대상은 화성시 비율 적용 추정치입니다.",
  },

  /* 지역 요약 (인구·세대·성별: 공식) */
  regions: {
    ujeong: {
      name: "우정읍", district: "만세구",
      population: 16593, households: 9292,
      male: 9364, female: 7505,          // 2025-08 공식 (성비 124.8)
      onePersonHhRate: 54.2,              // 1인세대 비율 %
      elderlyRate: 29.1,                  // 65세+ %
      childRate: 5.6,                     // 0-14세 %
      source: "official",
    },
    jangan: {
      name: "장안면", district: "만세구",
      population: 9222, households: 5237,
      male: 5416, female: 3947,           // 2025-08 공식 (성비 137.2)
      onePersonHhRate: 57.1,
      elderlyRate: 36.0,
      childRate: 4.6,
      source: "official",
    },
  },

  /* 인구 구조 — 3대 연령 (공식) */
  ageStructure: {
    labels: ["유소년 (0–14세)", "생산연령 (15–64세)", "고령 (65세+)"],
    ujeong: [928, 10837, 4828],
    jangan: [423, 5477, 3322],
    source: "official",
  },

  /* 성별 인구 (공식, 2025-08) */
  gender: {
    labels: ["남", "여"],
    ujeong: [9364, 7505],
    jangan: [5416, 3947],
    source: "official",
  },

  /* 인구·고령화 추이
     ※ 2025-08·2026-06 은 공식 발표치, 그 이전은 최신값 기준 보정 추정 */
  trend: {
    years: ["2022", "2023", "2024", "2025", "2026"],
    real: [false, false, false, true, true], // 공식 발표치 여부
    ujeong_pop: [17420, 17180, 16980, 16869, 16593],
    jangan_pop: [9880, 9670, 9480, 9363, 9222],
    ujeong_elderly: [24.8, 26.2, 27.6, 28.4, 29.1],
    jangan_elderly: [30.6, 32.5, 34.2, 35.1, 36.0],
    source: "official+estimated",
  },

  /* 복지 대상 현황 (추정 — 읍면 단위 공표 미확보) */
  welfare: {
    source: "estimated",
    categories: [
      { key: "basic",       label: "기초생활수급자", unit: "명",  ujeong: 624, jangan: 538, icon: "🏠" },
      { key: "nearpoor",    label: "차상위계층",     unit: "명",  ujeong: 341, jangan: 262, icon: "📉" },
      { key: "disabled",    label: "등록장애인",     unit: "명",  ujeong: 862, jangan: 561, icon: "♿" },
      { key: "aloneSenior", label: "독거노인",       unit: "명",  ujeong: 1460, jangan: 1320, icon: "👵" },
      { key: "singleParent",label: "한부모가정",     unit: "가구", ujeong: 176, jangan: 92, icon: "👨‍👧" },
      { key: "multiCulture",label: "다문화가정",     unit: "가구", ujeong: 318, jangan: 132, icon: "🌏" },
    ],
  },

  /* 복지 인프라(시설) — 추정 */
  facilities: {
    source: "estimated",
    labels: ["경로당", "어린이집", "지역아동센터", "노인복지시설", "보건지소·진료소", "장애인시설"],
    ujeong: [26, 12, 3, 2, 2, 1],
    jangan: [33, 5, 1, 1, 2, 0],
  },

  /* 복지 필요도 지수 (0–100, 조합 산정) — 고령화 심화 반영 */
  needs: {
    source: "index",
    domains: ["돌봄 공백", "의료 접근성", "일자리·소득", "주거 안정", "교육·문화"],
    ujeong: [72, 78, 63, 58, 66],
    jangan: [88, 91, 68, 62, 81],
  },

  needGrade(score) {
    if (score >= 80) return { level: "critical", label: "매우 시급" };
    if (score >= 65) return { level: "serious",  label: "시급" };
    if (score >= 50) return { level: "warning",  label: "주의" };
    return { level: "good", label: "양호" };
  },

  /* 복지 서비스/자원 디렉터리 */
  services: [
    { cat: "노인", icon: "👵", title: "독거노인 안부확인·돌봄", desc: "우정읍·장안면 독거노인 대상 정기 안부확인, 응급안전안심서비스 연계.", tags: ["방문돌봄", "응급안전"] },
    { cat: "노인", icon: "🍱", title: "노인 무료급식·도시락 배달", desc: "거동불편 어르신 대상 도시락 배달 및 경로당 공동급식 지원.", tags: ["식사지원", "경로당"] },
    { cat: "장애", icon: "♿", title: "장애인 활동지원·이동지원", desc: "등록장애인 활동지원사 매칭, 장애인 콜택시·이동차량 연계.", tags: ["활동지원", "이동권"] },
    { cat: "아동", icon: "📚", title: "지역아동센터·방과후돌봄", desc: "취약계층 아동 학습·급식·정서 지원, 방과후 돌봄 공백 해소.", tags: ["아동돌봄", "학습지원"] },
    { cat: "가족", icon: "🌏", title: "다문화·외국인주민 통합지원", desc: "결혼이민자·외국인근로자 한국어·정착 지원, 이중언어 자녀 교육.", tags: ["다문화", "정착지원"] },
    { cat: "저소득", icon: "💳", title: "긴급복지·생계지원 연계", desc: "위기가구 긴급복지지원, 기초생활·차상위 신청 상담 원스톱.", tags: ["긴급복지", "생계지원"] },
    { cat: "의료", icon: "🩺", title: "찾아가는 방문건강관리", desc: "보건지소 연계 만성질환·거동불편자 방문 간호 및 건강 모니터링.", tags: ["방문건강", "만성질환"] },
    { cat: "주거", icon: "🏚️", title: "주거환경 개선·집수리", desc: "저소득·고령 가구 노후주택 수리, 안전손잡이·미끄럼방지 시공.", tags: ["집수리", "주거안전"] },
    { cat: "교육", icon: "🧩", title: "다함께 돌봄", desc: "초등 방과후 돌봄 공백 해소 — 화성 다함께돌봄센터(향남2·동탄한빛·동탄9동·새솔 등) 연계. 학습·놀이체육·정서 프로그램 운영.", tags: ["초등돌봄", "방과후"] },
    { cat: "교육", icon: "📖", title: "방과후 학습·진로 멘토링", desc: "취약계층 아동·청소년 학습지원과 진로 멘토링, 교육급여·장학 연계로 교육 격차를 줄입니다.", tags: ["학습지원", "진로멘토링"] },
    { cat: "일자리", icon: "🥐", title: "장애인 고용 베이커리", desc: "발달장애인 제과·바리스타 일자리 — 아르딤장애인종합복지관 등 직업재활·중증장애인생산품 시설과 연계한 보호·지원 고용.", tags: ["장애인고용", "직업재활"] },
    { cat: "일자리", icon: "🧑‍🍳", title: "노인 일자리·사회활동", desc: "어르신 공익활동·시장형 일자리 매칭, 경로당·노인복지관 연계로 활기찬 노후를 지원합니다.", tags: ["노인일자리", "사회활동"] },
    { cat: "일자리", icon: "🌱", title: "자활·직업훈련 연계", desc: "저소득·근로능력 가구 대상 자활근로·직업훈련, 취업성공패키지 연계로 자립을 돕습니다.", tags: ["자활", "직업훈련"] },
  ],
};

/* =============================================================
   실시간 데이터 연동 — data.go.kr OpenAPI (선택)
   server/ 프록시가 켜져 있으면 /api/* 로부터 실데이터를 받아
   WELFARE_DATA 를 덮어씁니다. 프록시가 없으면 위 정적 데이터 사용.
   ============================================================= */
async function fetchLiveData(baseUrl = "") {
  try {
    const res = await fetch(`${baseUrl}/api/population`, { cache: "no-store" });
    if (!res.ok) throw new Error("proxy not available");
    const live = await res.json();
    // live: { ujeong:{population,households,...}, jangan:{...}, updated }
    if (live.ujeong && live.jangan) {
      Object.assign(WELFARE_DATA.regions.ujeong, live.ujeong);
      Object.assign(WELFARE_DATA.regions.jangan, live.jangan);
      if (live.updated) WELFARE_DATA.meta.updated = live.updated;
      if (live.ageStructure) Object.assign(WELFARE_DATA.ageStructure, live.ageStructure);
      document.dispatchEvent(new CustomEvent("datalive"));
      return true;
    }
  } catch (e) {
    // 프록시 미가동 — 정적 데이터로 계속 진행 (정상)
    console.info("[data] 실시간 API 미연결 — 정적 통계 사용:", e.message);
  }
  return false;
}

if (typeof module !== "undefined") module.exports = WELFARE_DATA;
