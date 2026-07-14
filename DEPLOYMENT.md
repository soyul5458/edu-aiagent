# 배포 설정 가이드 (Vercel + Railway + PostgreSQL)

## 1️⃣ 로컬 개발 환경 설정

### 1.1 PostgreSQL 설치 (로컬)
```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Windows
# https://www.postgresql.org/download/windows/ 에서 설치
```

### 1.2 데이터베이스 생성
```bash
psql -U postgres
CREATE DATABASE edu_aiagent;
\q
```

### 1.3 환경 변수 설정
```bash
# .env.local 파일 생성 (.env.local.example 참고)
cp .env.local.example .env.local
```

`.env.local` 파일에 다음을 입력:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/edu_aiagent
SESSION_SECRET=<아래 명령어로 생성>
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
```

### 1.4 SESSION_SECRET 생성
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
위 명령어의 출력 값을 .env.local의 SESSION_SECRET에 복사합니다.

### 1.5 의존성 설치 및 개발 서버 실행
```bash
npm install
npm run dev
```

---

## 2️⃣ Railway 배포 (백엔드)

### 2.1 Railway 프로젝트 생성
1. https://railway.app 에서 가입
2. "Create New Project" → "Deploy from GitHub"
3. 이 저장소 선택

### 2.2 PostgreSQL 데이터베이스 추가
1. Railway 대시보드에서 "Add Service" → "Database" → "PostgreSQL" 선택
2. "Create" 클릭

### 2.3 환경 변수 설정 (Railway)
Railway가 자동으로 `DATABASE_URL` 을 생성합니다.

추가로 설정할 환경 변수:
- `SESSION_SECRET`: 로컬에서 생성한 값 복사
- `ANTHROPIC_API_KEY`: Claude API 키
- `ADMIN_USERNAME`: admin (또는 원하는 이름)
- `ADMIN_PASSWORD`: 강력한 비밀번호 설정
- `NODE_ENV`: production

### 2.4 배포
GitHub에 푸시하면 자동으로 배포됩니다.

배포 후 Railway 대시보드에서:
- Domains 확인 (예: `backend-production.railway.app`)
- Health 확인

---

## 3️⃣ Vercel 배포 (프론트엔드)

### 3.1 Vercel에 프로젝트 추가
1. https://vercel.com 에서 가입
2. "Add New..." → "Project"
3. 이 저장소 선택

### 3.2 환경 변수 설정 (Vercel)
프로젝트 Settings → Environment Variables:
- `NEXT_PUBLIC_API_URL`: Railway 백엔드 URL
  - 예: `https://backend-production.railway.app`

### 3.3 배포
GitHub에 푸시하면 자동으로 배포됩니다.

배포 후 Vercel에서:
- URL 확인 (예: `https://app.vercel.app`)
- 로그인 테스트

---

## 4️⃣ 통신 검증

배포 후 다음을 확인하세요:

### 4.1 API 응답 확인
```bash
curl https://backend-production.railway.app/api/health
# 또는 POST 요청 테스트
```

### 4.2 Vercel → Railway 통신 확인
Vercel 프론트엔드에서 로그인 시도 → Railway 백엔드에 도달했는지 확인

### 4.3 데이터베이스 확인
Railway 대시보드의 PostgreSQL "Data" 탭에서 테이블 생성 확인

---

## 5️⃣ 트러블슈팅

### "DATABASE_URL is not set"
- Railway 환경 변수 확인
- PostgreSQL 데이터베이스가 생성되었는지 확인

### "SESSION_SECRET is not set"
- Railway/Vercel 환경 변수 다시 설정
- 로컬 .env.local도 확인

### API 호출 실패 (CORS 에러)
- Railway 백엔드 로그 확인
- Vercel의 NEXT_PUBLIC_API_URL 확인
- 백엔드의 CORS 설정 확인

### 데이터베이스 마이그레이션 실패
- Railway PostgreSQL 클라이언트 도구에서 SQL 직접 실행
- 또는 로컬에서 테스트 후 배포

---

## 6️⃣ 데이터 마이그레이션 (SQLite → PostgreSQL)

이전 SQLite 데이터가 있다면:

```bash
# SQLite 데이터 내보내기 (로컬)
sqlite3 data/platform.db ".dump" > backup.sql

# PostgreSQL로 복구
# (PostgreSQL 스키마와 호환되도록 SQL 수정 필요)
```

또는 Railway 대시보드에서 SQL을 직접 실행합니다.

---

## 📋 체크리스트

- [ ] .env.local 설정 (로컬 개발)
- [ ] PostgreSQL 로컬 설치 및 데이터베이스 생성
- [ ] `npm install` 실행
- [ ] `npm run dev` 로컬 테스트
- [ ] Railway 프로젝트 생성
- [ ] Railway PostgreSQL 데이터베이스 추가
- [ ] Railway 환경 변수 설정
- [ ] Railway 배포 확인
- [ ] Vercel 프로젝트 추가
- [ ] Vercel 환경 변수 설정 (NEXT_PUBLIC_API_URL)
- [ ] Vercel 배포 확인
- [ ] 로그인 테스트
- [ ] 아이디어 제출 테스트
- [ ] 갤러리 확인
