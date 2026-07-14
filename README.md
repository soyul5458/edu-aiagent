# 🌱 AI 에이전트 스튜디오

Claude Code 교육용 플랫폼입니다. 수강생이 Claude(웹)에게 받은 아이디어 기획서를 붙여넣으면,
**수업 시간 안에 완성 가능한 짧은 MVP 프롬프트**로 자동으로 다듬어 주고,
모든 수강생의 아이디어를 **갤러리에서 카테고리별로 공유**합니다.

## 전체 워크플로우

```
[수강생]  Claude(웹)에게 아이디어 기획서 받기
   ↓ 복사해서 붙여넣기
[이 플랫폼]  Claude API(Opus 4.8)가 Claude Code 모범사례 기반으로 정제
   ·  핵심 기능 1개로 범위 축소
   ·  단일 index.html (서버/DB/라이브러리 없음)으로 스택 단순화
   ·  완성 확인 체크리스트 포함, 2,000자 이내로 압축
   ·  제목/카테고리/태그/요약 자동 생성 → DB 저장
   ↓ 복사 버튼 한 번
[Claude Code]  붙여넣기 → 10분 안에 기초 MVP 완성
   ↓ 자동
[아이디어 갤러리]  전체 수강생 아이디어를 카테고리별 목록화·공유
```

## 실행 방법

```bash
# 1. (필수) AI API 키 설정 — .env.local에 사용하는 회사의 키를 입력
#    자동 인식: FIREWORKS_API_KEY / OPENAI_API_KEY / GROQ_API_KEY /
#              TOGETHER_API_KEY / OPENROUTER_API_KEY / DEEPSEEK_API_KEY /
#              XAI_API_KEY / GEMINI_API_KEY / ANTHROPIC_API_KEY
#    목록에 없는 회사(OpenAI 호환 API):
#      AI_PROVIDER=custom + AI_BASE_URL + AI_API_KEY + AI_MODEL
#    모델 변경: AI_MODEL=원하는모델 (비우면 제공자별 기본값)

# 2. 실행
npm install
npm run dev        # 개발용 (http://localhost:3000)

# 수업(운영)용
npm run build
npm start
```

같은 와이파이의 수강생들이 접속하려면: `npm run dev -- -H 0.0.0.0`
(또는 `npm start -- -H 0.0.0.0`) 후 강사 컴퓨터의 IP 주소로 접속
→ `http://강사IP:3000`

## 첫 로그인

최초 실행 시 관리자 계정이 자동 생성됩니다.

| 아이디 | 비밀번호 |
| ------ | -------- |
| `admin` | `admin1234` |

> 로그인 후 **관리자 페이지에서 반드시 비밀번호를 변경**하세요
> (계정 목록에서 본인 계정의 [비밀번호] 버튼).
> 기본값을 바꾸려면 `.env.local`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`를 사용하세요.

## 화면 구성

| 경로 | 대상 | 설명 |
| ---- | ---- | ---- |
| `/login` | 전체 | 강사가 발급한 아이디/비밀번호로 로그인 |
| `/` | 수강생 | **내 작업실** — 기획서 붙여넣기 → MVP 프롬프트 생성 → 복사. 내 기록 관리 |
| `/gallery` | 전체 | **아이디어 갤러리** — 전체 아이디어 검색·카테고리 필터·상세 보기 |
| `/admin` | 관리자 | 계정 발급(원하는 아이디/비밀번호), 비밀번호 재설정, 삭제, 수업 현황 |

## 데이터

- 모든 데이터는 `data/platform.db` (SQLite, Node 내장 — 별도 설치 불필요)에 저장됩니다.
- 백업: `data/` 폴더를 통째로 복사하면 됩니다.
- 초기화: 서버를 끄고 `data/platform.db` 를 삭제하면 처음 상태(관리자 계정만 존재)로 돌아갑니다.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Node 내장 SQLite (`node:sqlite`) — 네이티브 모듈 컴파일 불필요
- Claude API (`claude-opus-4-8`, 구조화 출력 + 적응형 사고)
- 세션: JWT(HttpOnly 쿠키), 비밀번호: bcrypt 해시
