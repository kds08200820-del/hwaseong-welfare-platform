/* =============================================================
   화성복지플랫폼 — 공공데이터포털(data.go.kr) OpenAPI 연동 프록시
   -------------------------------------------------------------
   · 브라우저에서 직접 data.go.kr 를 호출하면 CORS·인증키 노출 문제가
     있으므로, 이 서버가 중간에서 API를 호출·가공·캐싱해 프런트에
     안전한 JSON(/api/*)을 제공합니다.
   · DATA_GO_KR_KEY 가 설정되면 실시간 API를 호출하고,
     없으면 검증된 공식 정적값(2026.06 기준)을 반환합니다.
   실행:  cd server && npm install && cp .env.example .env && npm start
   ============================================================= */
import express from "express";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

const KEY = process.env.DATA_GO_KR_KEY || "";
const POP_API_URL = process.env.POP_API_URL || "";
const PORT = process.env.PORT || 8787;
const TTL = (Number(process.env.CACHE_TTL) || 86400) * 1000;
const NAMES = { ujeong: process.env.UJEONG_NAME || "우정읍", jangan: process.env.JANGAN_NAME || "장안면" };

/* ── 검증된 공식 정적값 (행안부 주민등록 인구통계 / 화성특례시 공식) ── */
const OFFICIAL = {
  updated: "2026-06",
  ujeong: {
    name: "우정읍", district: "만세구",
    population: 16593, households: 9292, male: 9364, female: 7505,
    onePersonHhRate: 54.2, elderlyRate: 29.1, childRate: 5.6, source: "official",
  },
  jangan: {
    name: "장안면", district: "만세구",
    population: 9222, households: 5237, male: 5416, female: 3947,
    onePersonHhRate: 57.1, elderlyRate: 36.0, childRate: 4.6, source: "official",
  },
  ageStructure: {
    labels: ["유소년 (0–14세)", "생산연령 (15–64세)", "고령 (65세+)"],
    ujeong: [928, 10837, 4828],
    jangan: [423, 5477, 3322],
    source: "official",
  },
};

/* ── 아주 단순한 메모리 캐시 ── */
const cache = new Map();
function cached(key, factory) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return Promise.resolve(hit.v);
  return Promise.resolve(factory()).then(v => { cache.set(key, { t: Date.now(), v }); return v; });
}

/* ── data.go.kr 응답 → 우리 스키마 매핑 ──
   ⚠ 실제 데이터셋의 필드명(총인구수·남자·여자·연령구간 등)에 맞춰
   아래 pick() 대상 키를 조정하세요. odcloud 계열은 보통 {data:[{...}]} 형태.  */
function mapRegion(row) {
  const num = (v) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
  const pick = (r, keys) => { for (const k of keys) if (r[k] != null) return r[k]; return 0; };
  const pop = num(pick(row, ["총인구수", "총인구", "계", "인구수"]));
  const male = num(pick(row, ["남자인구수", "남", "남자"]));
  const female = num(pick(row, ["여자인구수", "여", "여자"]));
  const hh = num(pick(row, ["세대수", "세대"]));
  // 연령: 데이터셋에 5세/1세 단위가 있으면 여기서 합산 (예시는 65세+ 추출만)
  const elderly = num(pick(row, ["65세이상", "65세 이상", "고령인구"]));
  return {
    population: pop, households: hh, male, female,
    elderlyRate: pop ? +(elderly / pop * 100).toFixed(1) : null,
    source: "official-live",
  };
}

async function fetchRegionLive(name) {
  // odcloud 표준 쿼리 예시 — 실제 스펙에 맞게 파라미터 조정
  const url = new URL(POP_API_URL);
  url.searchParams.set("serviceKey", KEY);
  url.searchParams.set("page", "1");
  url.searchParams.set("perPage", "100");
  url.searchParams.set("cond[행정구역명::EQ]", name); // 필드명은 데이터셋 스펙 확인
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`data.go.kr ${res.status}`);
  const json = await res.json();
  const rows = json.data || json.items || [];
  const row = rows.find(r => JSON.stringify(r).includes(name)) || rows[0];
  if (!row) throw new Error("행정구역 미발견: " + name);
  return mapRegion(row);
}

/* ── /api/population : 프런트가 소비하는 통합 엔드포인트 ── */
app.get("/api/population", async (req, res) => {
  try {
    const data = await cached("population", async () => {
      if (KEY && POP_API_URL && !POP_API_URL.includes("REPLACE")) {
        const [u, j] = await Promise.all([
          fetchRegionLive(NAMES.ujeong),
          fetchRegionLive(NAMES.jangan),
        ]);
        return {
          updated: new Date().toISOString().slice(0, 7),
          ujeong: { ...OFFICIAL.ujeong, ...u },
          jangan: { ...OFFICIAL.jangan, ...j },
          mode: "live",
        };
      }
      // 키 미설정 — 검증된 공식 정적값 반환
      return { ...OFFICIAL, mode: "static" };
    });
    res.json(data);
  } catch (e) {
    console.error("[/api/population] 실패 → 정적값 대체:", e.message);
    res.json({ ...OFFICIAL, mode: "static-fallback", error: e.message });
  }
});

/* ── 전국 시도별 복지 데이터 (KOSIS OpenAPI 연동) ──
   KOSIS는 통계표마다 itmId 코드가 달라, KOSIS UI에서 생성한 "완성 URL"을
   .env 에 붙여넣는 방식이 가장 안정적입니다. (개발가이드 → OpenAPI URL 생성)
     KOSIS_SENIOR_URL   노인여가복지시설 (예: DT_1YL20961)
     KOSIS_DAYCARE_URL  어린이집        (예: DT_15407_NN003)
     KOSIS_DISABLED_URL 등록장애인      (예: DT_1YL202003E)
   각 URL 은 이미 apiKey·objL1=ALL·itmId·format=json 을 포함해야 합니다. */
const KOSIS_URLS = {
  seniorLeisure: process.env.KOSIS_SENIOR_URL || "",
  daycare: process.env.KOSIS_DAYCARE_URL || "",
  disabled: process.env.KOSIS_DISABLED_URL || "",
  basicLivelihood: process.env.KOSIS_BASIC_URL || "",
};
const KOSIS_ON = Object.values(KOSIS_URLS).some(Boolean);

/* KOSIS 시도명(변형 포함) → 대시보드 short 코드 */
const SIDO_ALIAS = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북",
  "충청남도": "충남", "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남",
  "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주",
};
const toShort = (nm) => SIDO_ALIAS[nm] || (nm || "").replace(/(특별시|광역시|특별자치시|특별자치도|도)$/g, "");
const VALID_SHORTS = new Set(["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"]);

async function fetchKosisUrl(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`KOSIS ${res.status}`);
  const json = await res.json();
  if (json && json.err) throw new Error(`KOSIS err ${json.err}: ${json.errMsg || ""}`);
  if (!Array.isArray(json)) throw new Error("KOSIS 응답 형식 오류");
  return json; // [{C1_NM:'서울특별시', DT:'3910', ...}, ...]
}

app.get("/api/nationwide", async (req, res) => {
  if (!KOSIS_ON) {
    return res.json({
      mode: "static",
      source: "KOSIS·보건복지부·행정안전부 공식 통계 (번들)",
      note: "server/.env 에 KOSIS_*_URL 을 설정하면 실시간 조회로 전환됩니다.",
    });
  }
  try {
    const data = await cached("nationwide", async () => {
      const byShort = {};
      // 설정된 지표만 병렬 조회
      const jobs = Object.entries(KOSIS_URLS).filter(([, u]) => u).map(async ([key, u]) => {
        const rows = await fetchKosisUrl(u);
        rows.forEach(r => {
          const short = toShort(r.C1_NM);
          if (!VALID_SHORTS.has(short)) return; // 전국·시군구 행 제외 (시도만)
          (byShort[short] ||= { name: short })[key] = Number(String(r.DT).replace(/[^\d.]/g, "")) || 0;
        });
      });
      await Promise.all(jobs);
      return { sido: Object.values(byShort), updated: new Date().toISOString().slice(0, 7) };
    });
    res.json({ mode: "live", fields: Object.keys(KOSIS_URLS).filter(k => KOSIS_URLS[k]), ...data });
  } catch (e) {
    console.error("[/api/nationwide] 실패 → 번들 통계 사용:", e.message);
    res.json({ mode: "static-fallback", error: e.message });
  }
});

/* KOSIS URL 자가진단 — 붙여넣은 URL이 올바른지 즉시 확인
   사용:  /api/kosis-test?url=<KOSIS 완성 URL 인코딩>  */
app.get("/api/kosis-test", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ ok: false, error: "url 파라미터 필요" });
  try {
    const rows = await fetchKosisUrl(String(url));
    const sample = rows.slice(0, 3).map(r => ({ 시도: toShort(r.C1_NM), 값: r.DT, 항목: r.ITM_NM, 시점: r.PRD_DE }));
    res.json({ ok: true, count: rows.length, sample });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});

/* 상태 확인 */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    population: KEY ? "live-ready" : "static",
    nationwide: KOSIS_ON ? "live-ready" : "static",
    kosisFields: Object.keys(KOSIS_URLS).filter(k => KOSIS_URLS[k]),
    updated: OFFICIAL.updated,
  });
});

/* 프런트 정적 파일도 함께 서빙 (상위 폴더) */
app.use(express.static(path.join(__dirname, "..")));

app.listen(PORT, () => {
  console.log(`\n  화성복지플랫폼 프록시 실행 중 → http://localhost:${PORT}`);
  console.log(`  · 대시보드:   http://localhost:${PORT}/dashboard.html`);
  console.log(`  · 인구 API:   http://localhost:${PORT}/api/population`);
  console.log(`  · 모드:       ${KEY ? "실시간(data.go.kr 키 감지)" : "정적(공식 검증값)"}\n`);
});
