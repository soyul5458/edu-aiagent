# AI 에이전트 스튜디오 (edu_AIagent)

Claude Code 교육용 플랫폼. 수강생이 붙여넣은 기획서를 짧은 MVP 프롬프트로 정제(범용 AI 연동)하고,
SQLite에 저장한 뒤 갤러리로 공유한다. 사용자(강사)와의 대화는 한국어로.

## 명령어

- 개발: `npm run dev` / 운영: `npm run build && npm start` (수업일: `npm start -- -H 0.0.0.0`)
- **서버 재시작 전 반드시 포트 기준으로 정리**: `kill $(lsof -t -iTCP:3000 -sTCP:LISTEN)`
  (Next 프로덕션 프로세스는 이름이 `next-server`라 pkill "next start"로는 안 죽는다)
- 타입체크: `npx tsc --noEmit`

## 구조와 함정

- `lib/ai.ts` — 범용 AI 제공자 계층(9개 프리셋 + custom, 자동 감지). 새 회사 추가는 PRESETS 배열에
- `lib/refine.ts` — 정제 시스템 프롬프트/스키마. 수업 정책(기능 수, 분량 제한) 변경은 여기
- `lib/db.ts` — node:sqlite. **행은 null-프로토타입 객체: 클라이언트 컴포넌트에 넘기기 전 `toPlain()`/`toPlainOne()` 필수** (안 하면 직렬화 오류로 페이지가 통째로 깨짐)
- `data/platform.db` — 유일한 원본 데이터. 백업은 `data/` 폴더 복사. 절대 임의 삭제 금지
- `obsidian-vault/` — 지식 레이어(로드맵·학습노트·아이디어 내보내기). DB가 원본, 볼트는 파생물

## 운영 규칙

- 수업 24시간 전 코드 동결(T-24 프리즈). 개선은 수업 다음 날
- DB 스키마 변경 전 `data/` 백업 먼저

## learning law

after every non-trivial solved problem, run the extract-approach skill before moving on
a solution without its learnings note is unfinished work
