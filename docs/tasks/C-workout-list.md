# C. 목록·통계 — Codex

브랜치: `feat/workout-list`

## 먼저 읽을 것

- `AGENTS.md`, `docs/guides/convention.md`
- `src/entities/workout/model/contracts.ts` (받을 데이터 모양)
- `src/entities/workout/model/fixtures.ts` (가짜 데이터)
- `src/entities/workout/model/pace.ts` (거리·시간·페이스 표시)

## 목표

남긴 기록을 타임라인, 달력, 상세, 홈 주간 요약으로 돌아보는 화면을 만든다.

## 만들 것

1. 운동 기록 카드 `src/entities/workout/ui/workout-card.tsx`
   - 입력: `WorkoutListItem`
   - 러닝: 거리, 시간, 페이스 / 헬스: 종목 수, 세트 수, 총 볼륨 / 기타: 운동 시간
   - 종류 색은 `bg-workout-run`, `bg-workout-strength`, `bg-workout-other` 토큰을 쓴다(raw 색 금지)
   - 작성자, 함께한 친구, 크루 이름, 댓글 수
2. 기록 탭 `/workouts` (`src/pages/workout/list/`)
   - 타임라인(날짜별 묶음)과 월 달력 전환. 달력은 운동한 날에 종류 색 점.
   - 종류 필터(전체/러닝/헬스/기타). 필터는 URL searchParams로 둔다.
   - "더 보기"로 다음 페이지
3. 기록 상세 `/workouts/[workoutId]` (`src/pages/workout/detail/`)
   - 입력: `WorkoutDetail`. 헬스는 종목별 세트 표.
   - 내 기록이면(`isMine`) 수정 링크(`/workouts/[id]/edit`)와 삭제 버튼 자리만 둔다. 동작은 B가 붙인다.
   - 댓글 영역은 비워 둔다(D가 붙인다).
4. 홈 이번 주 요약 (`src/pages/home/`)
   - 입력: `WeeklySummary`. 운동 횟수, 러닝 거리, 연속 운동 일수, 월~일 7칸에 운동한 날 표시.
5. 날짜 묶기, 달력 칸 계산 같은 로직은 `model/`의 순수 함수로 두고 `*.test.ts`(Vitest)로 테스트한다.

## 데이터 연결 순서

1. A가 끝나기 전: `fixtures.ts`로 화면을 완성한다.
2. A의 `src/entities/workout/api/server-queries.ts`가 `main`에 들어오면 main을 받아서 `getWorkoutPage`, `getWorkoutDetail`, `getWeeklySummary`로 바꾼다.
3. PR을 올릴 때 화면 코드에 fixtures import가 없어야 한다.

## 수정 가능

`src/entities/workout/ui/`, `src/pages/workout/list/`, `src/pages/workout/detail/`, `src/pages/home/`, `app/(app)/workouts/page.tsx`, `app/(app)/workouts/[workoutId]/page.tsx`, `app/(app)/page.tsx`

## 공용 UI

- `src/shared/ui`와 `globals.css`는 E(디자인 시스템)만 수정한다. 카드, 칩, 세그먼트 토글, 숫자 타일(`stat`), 빈 상태는 E의 컴포넌트를 쓴다. 사용법은 `docs/guides/design.md`.
- E가 아직 병합되지 않았으면 날짜 묶기·달력 계산(`model/`)과 테스트부터 만들고, 화면은 E 병합 후 `main`을 받아서 만든다.
- 필요한 컴포넌트가 E에 없으면 자기 폴더에 임시로 만들고 PR 설명에 "E로 옮길 후보"라고 적는다.

## 하지 않을 것

- DB, 마이그레이션, `src/shared/api/supabase/` 수정
- `src/shared/ui`, `globals.css` 수정(E 담당)
- 작성·수정 폼(B), 크루·댓글(D)
- 차트 라이브러리 추가. 막대·점은 Tailwind로 그린다.

## 완료 조건

- 테스트, `pnpm exec tsc --noEmit`, `pnpm exec biome check --write src app`, `pnpm lint`
- 로컬에서 기록 탭(타임라인·달력·필터), 상세, 홈을 직접 열어 확인
- PR 설명은 `docs/tasks/README.md` 양식
