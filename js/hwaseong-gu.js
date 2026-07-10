/* =============================================================
   화성특례시 4개 구 복지 현황 비교
   -------------------------------------------------------------
   ◎ 인구·세대·성비: 경기도 공식 인구현황(2026.03) — 실값(official)
   ◎ 고령화율·독거노인·등록장애인·노인여가시설: 4개 구는 2026.2 신설로
     KOSIS는 아직 화성시 단일 집계 → 화성시 실제 총계를 구별 인구/고령
     비례로 배분한 추정값(estimate). 배분 근거는 아래 note 참고.
   ◎ 외국인: 화성시 공식 외국인 65,352명(2024.12, 등록외국인+외국국적동포)을
     산업단지 분포(만세구·동탄 집중)를 반영해 구별 배분한 추정값.
   ============================================================= */
const HWASEONG_GU = {
  meta: {
    popAsOf: "2026-03",
    welfareNote: "복지지표는 화성시 KOSIS 실제 총계(독거노인 19,382·등록장애인 33,286·노인여가시설 786)를 구별 인구·고령 비례로 배분한 추정치입니다. 외국인은 화성시 공식 총계(65,352명, 2024.12)를 산업단지 분포로 배분한 추정입니다.",
  },
  city: { pop: 995253, households: 431545, foreign: 65352 },

  /* 4개 구 — pop/households/sexRatio는 공식, 나머지는 배분 추정
     foreign=외국인수(추정), foreignRate=외국인 비율%(외국인/(내국인+외국인)) */
  gu: [
    { name: "만세구", pop: 234733, households: 116459, sexRatio: 119.9, elderlyRate: 17.5, seniorAlone: 7318, disabled: 7853, seniorLeisure: 297, foreign: 27448, foreignRate: 10.5,
      dong: "우정읍·향남읍·남양읍·마도면·송산면·서신면·팔탄면·장안면·양감면·새솔동",
      note: "우정읍·장안면이 속한 구 — 서부 농·어촌 고령지역, 산업단지 밀집으로 외국인 최다·성비 119.9", focus: true },
    { name: "효행구", pop: 159451, households: 71270, sexRatio: 106.7, elderlyRate: 12.5, seniorAlone: 3551, disabled: 5333, seniorLeisure: 144, foreign: 7842, foreignRate: 4.7,
      dong: "봉담읍·매송면·비봉면·정남면·기배동", note: "도농 복합 지역" },
    { name: "병점구", pop: 174109, households: 75152, sexRatio: 107.3, elderlyRate: 11.5, seniorAlone: 3568, disabled: 5822, seniorLeisure: 145, foreign: 10456, foreignRate: 5.7,
      dong: "진안동·병점1동·병점2동·반월동·화산동", note: "구도심·주거 지역" },
    { name: "동탄구", pop: 426960, households: 168664, sexRatio: 101.8, elderlyRate: 6.5, seniorAlone: 4945, disabled: 14278, seniorLeisure: 200, foreign: 19606, foreignRate: 4.4,
      dong: "동탄1동~동탄9동", note: "동탄신도시 — 화성 인구의 43%, 젊은 인구 구조" },
  ],

  metrics: [
    { key: "pop",           label: "인구",          unit: "명",   tag: "official", per: false },
    { key: "households",    label: "세대수",        unit: "세대", tag: "official", per: false },
    { key: "elderlyRate",   label: "고령화율(추정)", unit: "%",   tag: "estimate", per: false, rate: true },
    { key: "foreign",       label: "외국인",        unit: "명",   tag: "estimate", per: true },
    { key: "foreignRate",   label: "외국인 비율",    unit: "%",   tag: "estimate", per: false, rate: true },
    { key: "seniorAlone",   label: "독거노인",      unit: "가구", tag: "estimate", per: true },
    { key: "disabled",      label: "등록장애인",    unit: "명",   tag: "estimate", per: true },
    { key: "seniorLeisure", label: "노인여가시설",  unit: "개소", tag: "estimate", per: true },
  ],
  metric(k) { return this.metrics.find(m => m.key === k); },
};

if (typeof module !== "undefined") module.exports = HWASEONG_GU;
