@echo off
chcp 65001 >nul
title 화성복지플랫폼 서버
echo ================================================
echo   화성복지플랫폼 - 홈페이지 + API 서버 실행
echo ================================================
echo.

cd /d "%~dp0server"

if not exist node_modules (
  echo [설치] 최초 1회 의존성 설치 중... 잠시만 기다려 주세요.
  call npm install
  echo.
)

if not exist .env (
  echo [설정] .env 파일 생성 ^(환경변수^)
  copy .env.example .env >nul
  echo.
)

echo [실행] 서버를 시작합니다. 브라우저에서 아래 주소로 접속하세요:
echo.
echo    홈페이지:   http://localhost:8787
echo    전국 지도:  http://localhost:8787/map.html
echo    인구 API:   http://localhost:8787/api/population
echo.
echo (종료하려면 이 창에서 Ctrl+C)
echo.

start "" http://localhost:8787
call npm start

pause
