# B. 기록 작성 — Claude

브랜치: `feat/workout-form`

## 목표

러닝·헬스·기타 기록을 단계별로 쉽게 남기는 작성·수정·삭제 흐름을 만든다.

## 만들 것

1. 단계형 작성 폼 (`/workouts/new`, 수정은 `/workouts/[workoutId]/edit`)
   - 1단계 언제·무엇: 날짜(기본 오늘), 종류(러닝/헬스/기타)
   - 2단계 상세
     - 러닝: 거리(km, 소수 둘째 자리), 시간(시·분·초). 입력하는 동안 페이스를 `formatPace`로 바로 보여준다.
     - 헬스: 종목 추가·삭제, 종목마다 세트 추가·삭제(무게 kg, 횟수). 직전 세트 값을 복사해 새 세트를 채운다. 무게를 비우면 맨몸 운동.
     - 기타: 전체 운동 시간
   - 3단계 마무리: 제목, 장소 이름, 메모, 공유할 크루, 함께한 친구(선택한 크루 구성원 중에서)
   - 작성 중 뒤로 가기·이탈 시 확인
2. 폼 값 ↔ `WorkoutInput` 변환과 검증은 `model/`의 순수 함수로 두고 테스트한다.
3. Server Action `saveWorkout(input: WorkoutInput)`, `deleteWorkout(id: string)` — A의 `save_workout` RPC를 부른다. A가 아직이면 시그니처만 맞춘 채 화면부터 완성한다.
4. 홈과 기록 탭에서 "기록하기" 버튼으로 진입

## 수정 가능

`src/features/workout/`, `src/widgets/workout-form/`, `src/pages/workout/new/`, `src/pages/workout/edit/`, `app/(app)/workouts/new/`, `app/(app)/workouts/[workoutId]/edit/`

## 공용 UI

- `src/shared/ui`와 `globals.css`는 E(디자인 시스템)만 수정한다. 입력은 E의 `number-input`, `field`, `segmented-control`, `chip`, `bottom-sheet`를 쓴다.
- E가 아직 병합되지 않았으면 폼 로직과 상태(`model/`)부터 만들고, 화면은 E 병합 후 `main`을 받아서 붙인다.
- 필요한 컴포넌트가 E에 없으면 자기 폴더에 임시로 만들고 PR 설명에 "E로 옮길 후보"라고 적는다.

## 하지 않을 것

목록·상세 화면(C), 크루 만들기(D), DB 스키마(A)

## 완료 조건

- 러닝·헬스·기타 각각 작성 → 저장 → 수정 → 삭제를 로컬에서 직접 해 본다
- 변환·검증 테스트, tsc, biome
