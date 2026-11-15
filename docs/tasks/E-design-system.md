# E. 디자인 시스템 — Codex

브랜치: `feat/design-system`

## 먼저 읽을 것

- `AGENTS.md`, `docs/guides/convention.md`의 "스타일"
- `src/app/styles/globals.css` (지금 있는 토큰)
- `src/shared/ui/` (shadcn base-nova로 추가한 button, input, label, card)
- `src/entities/workout/model/contracts.ts`, `fixtures.ts` (화면에 나올 숫자와 정보)

## 방향

- **숫자가 주인공**: 거리, 페이스, 시간, 볼륨이 크고 또렷하게 보인다. 숫자는 `tabular-nums`.
- **브랜드**: 형광 라임(`primary`). 강조는 한 화면에 한두 곳만. 나머지는 무채색.
- **종류 색**: 러닝 `workout-run`, 헬스 `workout-strength`, 기타 `workout-other`. 점·칩·막대에만 쓰고 넓은 면은 칠하지 않는다.
- **모바일 PWA 우선**: 최대 너비 `max-w-md`, 손가락 터치 영역 최소 44px, 하단 탭과 안전 영역(`env(safe-area-inset-*)`)을 고려한다.
- **라이트·다크 모두**: 색은 시맨틱 토큰으로만. 컴포넌트에 `dark:` 색 덮어쓰기를 두지 않는다.

## 만들 것

1. 토큰 다듬기 (`globals.css`)
   - 글자 크기 단계(큰 숫자, 제목, 본문, 캡션), 간격, 둥글기, 그림자 정리
   - 라이트·다크 대비 확인(본문 글자 4.5:1 이상)
2. 공용 컴포넌트 (`src/shared/ui/`). 이미 있는 것은 변형만 다듬는다.
   - `button`: primary, secondary, outline, ghost, destructive / 크기 sm, md, lg, icon
   - `card`
   - `chip`: 운동 종류 표시용(색 점 + 이름), 선택 가능한 필터 칩
   - `segmented-control`: 타임라인/달력, 러닝/헬스/기타 전환
   - `stat`: 라벨 + 큰 숫자 + 단위(예: 거리 7.20 km)
   - `empty-state`: 아이콘 + 문구 + 행동 버튼
   - `bottom-sheet`: 아래에서 올라오는 시트(필터, 확인)
   - `number-input`: 숫자 키패드가 뜨는 입력(거리, 무게, 횟수). `inputMode="decimal"`
   - `textarea`, `field`(라벨 + 입력 + 오류 문구 묶음)
   - shadcn에 있는 것은 `pnpm dlx shadcn@latest add <이름>`으로 받은 뒤 다듬는다.
3. 디자인 가이드 `docs/guides/design.md`
   - 토큰 표, 컴포넌트별 언제 쓰는지와 예시 코드, 하지 말 것
4. 컴포넌트 미리보기 화면 `/design` (`src/pages/design/`, `app/design/page.tsx`)
   - 모든 컴포넌트의 변형을 한 화면에 나열. 로그인 없이 열리게 `src/shared/api/supabase/session.ts`의 `PUBLIC_PATHS`에 `/design`을 추가한다(이 한 줄은 예외로 허용).
5. 로그인·회원가입, 설정 화면, 하단 탭을 새 컴포넌트와 토큰으로 바꾼다. 홈·기록·크루 화면은 C·D가 만들므로 건드리지 않는다.

## 수정 가능

`src/app/styles/`, `src/shared/ui/`, `src/shared/lib/utils.ts`, `src/widgets/bottom-navigation/`, `src/pages/auth/`, `src/pages/settings/`, `src/pages/design/`, `app/design/`, `app/layout.tsx`, `docs/guides/design.md`, `components.json`

## 하지 않을 것

- 기능 로직, 데이터 조회, DB
- B·C·D 영역의 화면 구현. 그쪽 PR은 디자인 리뷰로만 참여한다.
- 애니메이션 라이브러리 추가. 필요하면 PR 설명에 제안만 한다.

## 시작 순서

다른 영역보다 먼저 시작한다. 1번(토큰)과 2번(컴포넌트)을 먼저 PR로 올려 `main`에 병합하면 B·C·D가 그걸 가져다 쓴다. 3~5번은 두 번째 PR로 나눠도 된다.

## 1단계 이후: 디자인 리뷰

B·C·D PR이 올라오면 다음을 본다.

- raw 색(hex, `lime-500` 등)이나 `dark:` 색 덮어쓰기
- 공용 컴포넌트가 있는데 자기 폴더에 비슷한 것을 새로 만든 곳
- 다크 모드, 좁은 화면(360px), 긴 닉네임·긴 제목에서 깨지는 곳
- "E로 옮길 후보"라고 적힌 컴포넌트는 `src/shared/ui`로 옮기는 후속 PR을 만든다.

## 완료 조건

- `/design`에서 모든 컴포넌트를 라이트·다크로 직접 확인
- `pnpm exec tsc --noEmit`, `pnpm exec biome check --write src app`, `pnpm lint`
- PR 설명은 `docs/tasks/README.md` 양식, 스크린샷(라이트·다크) 첨부
