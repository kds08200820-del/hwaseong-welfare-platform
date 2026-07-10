# 화성복지플랫폼 — 홈페이지 + API 프록시 (단일 컨테이너)
FROM node:20-alpine
WORKDIR /app

# 서버 의존성 먼저 설치 (레이어 캐시)
COPY server/package*.json ./server/
RUN npm --prefix server install --omit=dev

# 나머지 소스 복사 (프런트 정적파일 + 서버)
COPY . .

# 대부분의 PaaS는 PORT 환경변수를 주입합니다. 서버가 이를 사용합니다.
ENV PORT=8787
EXPOSE 8787

CMD ["node", "server/server.js"]
