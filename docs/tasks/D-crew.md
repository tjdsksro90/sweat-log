# D. 크루·댓글 — Codex

브랜치: `feat/crew`

## 먼저 읽을 것

- `AGENTS.md`, `docs/guides/convention.md`
- `supabase/README.md`, `supabase/migrations/20261113000000_initial_schema.sql`의 crews, crew_members, workout_comments, `create_crew`, `join_crew_by_code`
- `src/features/auth/`(Server Action과 `useActionState` 쓰는 방식 예시)

## 목표

친구와 크루로 묶이고, 서로의 기록에 댓글로 응원한다. DB와 권한은 이미 있으므로 화면과 Server Action만 만든다.

## 만들 것

1. 크루 탭 `/crews` (`src/pages/crew/list/`)
   - 내 크루 목록(이름, 구성원 수)
   - 크루 만들기: 이름 입력 → `supabase.rpc("create_crew", { p_name })`
   - 초대 코드로 들어가기: 코드 입력 → `supabase.rpc("join_crew_by_code", { p_invite_code })`. `invalid_invite_code` 오류는 "초대 코드를 다시 확인해 주세요."로 보여준다.
2. 크루 상세 `/crews/[crewId]` (`src/pages/crew/detail/`)
   - 크루 이름, 초대 코드와 복사 버튼, 구성원 목록(닉네임, owner 표시)
   - 크루 나가기(owner는 나갈 수 없다는 안내)
   - 크루 피드 자리: A의 `getWorkoutPage({ crewId })`가 `main`에 들어오면 C의 `WorkoutCard`로 목록을 그린다. 그 전에는 빈 상태 문구만 둔다.
3. 댓글 `src/features/workout-comment/`
   - 목록(작성자 닉네임, 시간), 작성(1~500자), 내 댓글 삭제
   - 기록 상세 화면에 끼울 수 있는 `<WorkoutComments workoutId={...} />` 컴포넌트로 만든다. 상세 화면(C)에 붙이는 한 줄은 C가 병합된 뒤 이 브랜치에서 추가한다.
4. 크루 조회는 `src/entities/crew/api/`, 타입은 `src/entities/crew/model/`에 둔다.
5. 입력 검증(크루 이름 1~30자, 초대 코드 형식)은 `model/`의 순수 함수로 두고 테스트한다.

## 수정 가능

`src/entities/crew/`, `src/features/crew/`, `src/features/workout-comment/`, `src/pages/crew/`, `app/(app)/crews/`

## 공용 UI

- `src/shared/ui`와 `globals.css`는 E(디자인 시스템)만 수정한다. 버튼, 카드, 필드, 바텀시트, 빈 상태는 E의 컴포넌트를 쓴다. 사용법은 `docs/guides/design.md`.
- E가 아직 병합되지 않았으면 Server Action, 조회, 입력 검증(`api/`, `model/`)과 테스트부터 만들고, 화면은 E 병합 후 `main`을 받아서 만든다.
- 필요한 컴포넌트가 E에 없으면 자기 폴더에 임시로 만들고 PR 설명에 "E로 옮길 후보"라고 적는다.

## 하지 않을 것

- 마이그레이션 수정. 권한이 부족하면 PR 설명에 적고 A 담당에게 넘긴다.
- `src/shared/ui`, `globals.css` 수정(E 담당)
- 기록 카드·상세 화면 자체 수정(C)

## 완료 조건

- 계정 두 개로 로컬에서 확인: A가 크루 생성 → 초대 코드 복사 → B가 코드로 가입 → 서로 구성원으로 보임 → B 나가기
- 테스트, `pnpm exec tsc --noEmit`, `pnpm exec biome check --write src app`, `pnpm lint`
- PR 설명은 `docs/tasks/README.md` 양식
