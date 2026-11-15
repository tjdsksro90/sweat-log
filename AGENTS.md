## 서비스 도메인

"땀일기"(sweat-log)는 러닝과 헬스 같은 운동을 기록하고, 크루로 묶인 친구들과 서로의 기록을 보며 응원하는 운동 일기 PWA다.

- 각자 계정으로 가입하고, 크루(친구 묶음)를 만들거나 초대 코드로 들어간다.
- 운동 기록 하나는 공통 정보(날짜, 종류, 장소, 메모, 함께한 친구, 공유 크루)와 종류별 상세로 이뤄진다.
  - 러닝: 거리와 시간. 페이스는 저장하지 않고 `src/entities/workout/model/pace.ts`로 계산한다.
  - 헬스: 종목별 세트(무게 × 횟수).
- 기록은 작성자, 함께한 친구, 공유한 크루의 구성원만 본다. 수정·삭제는 작성자만 한다.

## 커밋 / 브랜치

- `git add`와 `git commit`은 사용자가 명시적으로 요청한 경우에만 수행한다.
- 푸시와 브랜치 생성/삭제/변경은 사용자가 직접 수행하고, 필요한 경우 명령어나 브랜치명만 추천한다.
- 별도 요청이 없으면 `git status`, `git diff`, `git log`, `git show` 같은 조회 명령만 사용한다.
- 커밋 메시지는 `<type>: <subject>` 형태로 한국어로 작성한다. type은 feat | fix | refactor | style | docs | chore | test 중 하나.
- 하나의 커밋에는 하나의 목적만 담는다.

## 병렬 작업 규칙

여러 세션(Claude, Codex)이 동시에 작업한다. 충돌을 막기 위해 다음을 지킨다.

- 각 작업은 자기 브랜치(worktree)에서 하고 PR로만 `main`에 합친다.
- 맡은 영역의 폴더만 수정한다. 영역은 `docs/planning/roadmap.md`의 "작업 영역" 표를 따른다.
- `src/shared/ui`와 `src/app/styles/globals.css`는 디자인 시스템(E) 담당만 수정한다. 화면 디자인 규칙은 `docs/guides/design.md`(E가 작성)를 따른다.
- 그 밖의 공용 파일(`src/shared/**`, `supabase/migrations/**`, `database.types.ts`, `package.json`)을 바꿔야 하면 PR 설명에 이유를 적는다. 기존 마이그레이션 파일은 수정하지 않고 새 파일을 추가한다.
- DB 스키마를 바꾸면 같은 PR에서 `src/shared/api/supabase/database.types.ts`도 갱신한다.

## 명령어 / 검증 정책

- 코드 파일을 생성·수정했으면 `pnpm exec biome check --write src app`을 돌린다.
- typecheck, test, build를 언제 돌릴지는 `docs/guides/verification.md`를 따른다.

## 참고 문서

- 코드 작성 시 `docs/guides/convention.md`를 따른다.
- 검증을 언제 돌릴지는 `docs/guides/verification.md`를 따른다.
- 기능 범위와 단계별 계획은 `docs/planning/`, 세션별 작업 브리프는 `docs/tasks/`, Claude·Codex 역할 분담은 `docs/guides/ai-workflow.md`에 있다.
- DB 구조와 권한은 `supabase/README.md`와 `supabase/migrations/`에 있다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
