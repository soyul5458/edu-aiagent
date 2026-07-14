# 배포 가이드

AI 에이전트 스튜디오 배포 절차. 이 문서대로만 하면 됨.

## ⚠️ 배포처 제약 — 가장 먼저 읽을 것

이 앱은 **로컬 SQLite 파일**(`data/platform.db`)을 데이터베이스로 사용한다.

- **Vercel / Netlify 등 서버리스 배포 금지.** 파일시스템이 휘발성이라 재배포·재시작 때마다 데이터가 전부 사라진다.
- 가능한 배포처: **디스크가 유지되는 서버**
  - VPS (예: Vultr, Lightsail, iwinv 등) + pm2 — 권장
  - Railway / Fly.io — 반드시 persistent volume을 `data/`에 마운트

## 요구사항

- **Node.js 22 이상 필수** (`node:sqlite` 내장 모듈 사용. 개발은 v26에서 진행됨)
- npm

## 설치

```bash
git clone <이 저장소 URL>
cd edu_AIagent
npm install
```

## 환경변수

프로젝트 루트에 `.env.local` 파일 생성. **값은 담당자에게 별도 채널로 전달받을 것** (git에 절대 커밋 금지):

```
FIREWORKS_API_KEY=   # AI 정제 기능용 API 키
ADMIN_USERNAME=      # 관리자 계정 아이디
ADMIN_PASSWORD=      # 관리자 계정 비밀번호
```

## 실행

```bash
npm run build
npm start                    # 기본: localhost:3000
npm start -- -H 0.0.0.0      # 외부 접속 허용 (수업일)
```

pm2 사용 시:

```bash
pm2 start npm --name edu-agent -- start -- -H 0.0.0.0
```

## 데이터베이스

- 첫 실행 시 `data/platform.db`가 **자동 생성**된다. 별도 마이그레이션 명령 없음.
- 관리자 계정은 환경변수(`ADMIN_USERNAME`/`ADMIN_PASSWORD`)로 자동 시드된다.
- 기존 데이터를 이관받은 경우: 전달받은 `data/` 폴더를 프로젝트 루트에 그대로 놓고 실행하면 된다.

## 운영 규칙

- **백업**: `data/` 폴더 전체를 복사하면 끝. 코드 업데이트·스키마 변경 전 반드시 백업.
- **재시작**: 포트 기준으로 기존 프로세스 정리 후 시작
  ```bash
  kill $(lsof -t -iTCP:3000 -sTCP:LISTEN)
  npm start -- -H 0.0.0.0
  ```
  (Next 프로덕션 프로세스 이름은 `next-server`라서 `pkill "next start"`로는 안 죽는다)
- **코드 업데이트**:
  ```bash
  cp -r data data.bak.$(date +%Y%m%d)   # 백업 먼저
  git pull
  npm install
  npm run build
  kill $(lsof -t -iTCP:3000 -sTCP:LISTEN)
  npm start -- -H 0.0.0.0
  ```

## 문제 생기면

- `node:sqlite` 모듈 못 찾는다는 에러 → Node 버전이 22 미만. `node --version` 확인.
- 페이지가 통째로 깨지며 직렬화 오류 → 코드 문제 (DB 행을 `toPlain()` 없이 클라이언트 컴포넌트에 넘긴 것). 개발자에게 연락.
- 데이터 관련 작업은 임의로 하지 말고 반드시 담당자 확인 후 진행. **`data/` 폴더는 유일한 원본이다.**
