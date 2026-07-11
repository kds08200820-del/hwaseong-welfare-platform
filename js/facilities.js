/* =============================================================
   우정읍·장안면 실제 복지시설 (카카오맵 마커용)
   출처: 카카오맵 장소검색 (실제 시설·주소)
   ※ 좌표는 카카오 SDK 지오코더로 주소를 변환해 표시
   ============================================================= */

/* 카카오 JavaScript 앱키 (https://developers.kakao.com → 내 애플리케이션 →
   앱 키 → JavaScript 키). 도메인에 배포 주소와 localhost 등록 필요.
   비워두면 지도 대신 시설 목록(폴백)이 표시됩니다. */
const KAKAO_APPKEY = "";

const FAC_TYPES = {
  노인: { color: "#2a78d6", label: "노인 (경로당·노인회관)" },
  아동: { color: "#1baf7a", label: "아동 (지역아동센터)" },
  공공: { color: "#eb6834", label: "행정·공공" },
  의료: { color: "#e34948", label: "보건·의료" },
};

const FACILITIES = [
  { name: "우정읍행정복지센터", type: "공공", addr: "경기 화성시 우정읍 쌍봉로 109-14", url: "http://place.map.kakao.com/8026311" },
  { name: "이화3리경로당", type: "노인", addr: "경기 화성시 우정읍 이화뱅곳길 102", url: "http://place.map.kakao.com/9344915" },
  { name: "이화5리경로당", type: "노인", addr: "경기 화성시 우정읍 한말배미길 21-3", url: "http://place.map.kakao.com/1417183833" },
  { name: "호곡리할머니회(경로당)", type: "노인", addr: "경기 화성시 우정읍 안두미2길 4", url: "http://place.map.kakao.com/27290496" },
  { name: "화수화구단위경로당", type: "노인", addr: "경기 화성시 우정읍 버들로 732-2", url: "http://place.map.kakao.com/23799824" },
  { name: "화수지역아동센터", type: "아동", addr: "경기 화성시 우정읍 작골길 66-5", url: "http://place.map.kakao.com/1921067099" },
  { name: "밀알지역아동센터", type: "아동", addr: "경기 화성시 우정읍 조암북로19번길 16", url: "http://place.map.kakao.com/9007173" },
  { name: "장안1리마을회관경로당", type: "노인", addr: "경기 화성시 장안면 상두원길86번길 9", url: "http://place.map.kakao.com/1968616869" },
  { name: "장안노인회관", type: "노인", addr: "경기 화성시 장안면 물골길 18-1", url: "http://place.map.kakao.com/9924311" },
  { name: "장안6리모범경로당", type: "노인", addr: "경기 화성시 장안면 물골길 22-3", url: "http://place.map.kakao.com/26121298" },
  { name: "석포4리경로당", type: "노인", addr: "경기 화성시 장안면 버들로 1217-9", url: "http://place.map.kakao.com/255946349" },
];
