# 데모 저장소

`@/demo/store`의 함수들은 실제 조회 함수와 Server Action을 대체하는 비동기 API다. `reset`만 동기 함수다. DB·로그인·네트워크를 사용하지 않는다.

- 클라이언트에서 `@/demo/store`의 이름 있는 함수를 가져오거나, `createDemoStore()`로 만든 인스턴스를 유지해서 사용한다. 렌더링마다 팩터리를 다시 호출하지 않는다.
- 현재 사용자는 `@/demo/sample-data`의 `DEMO_USER`다. 폼의 사용자 ID에도 이 값을 사용한다.
- 첫 데이터 접근 시 `sessionStorage`를 읽는다. 저장 키는 `sweat-log:demo:v1`이며, 저장소 접근·읽기·쓰기 실패 시 해당 인스턴스의 메모리로 계속 동작한다.
- 새 세션과 `reset()`은 실행 시점의 한국 날짜로 샘플을 만든다. 기존 세션을 복원할 때는 작성·수정 내용을 보존하며 날짜를 자동으로 옮기지 않는다.
- 쓰기와 reset 후 화면에서 필요한 조회를 다시 실행한다. 구독·라우팅·캐시 무효화는 이 저장소가 담당하지 않는다.
- 공유 인스턴스의 조회·저장·reset은 서버에서 호출하면 오류를 던진다. 브라우저가 없는 테스트에서는 `createDemoStore({ storage: () => null })`로 독립 인스턴스를 만든다.

| 함수 | 인자 | 반환 타입 |
| --- | --- | --- |
| `getWorkoutPage` | `filter?: WorkoutListFilter` | `Promise<WorkoutPage>` |
| `getWorkoutDetail` | `id: string` | `Promise<WorkoutDetail \| null>` |
| `getWeeklySummary` | `today?: string` (한국 날짜 `YYYY-MM-DD`) | `Promise<WeeklySummary>` |
| `getRunningStats` | `today?: string` (한국 날짜 `YYYY-MM-DD`) | `Promise<RunningStats>` |
| `getMyCrews` | 없음 | `Promise<CrewSummary[]>` |
| `getCrew` | `id: string` | `Promise<CrewDetail \| null>` |
| `getWorkoutFormCrews` | `currentUserId?: string` (기본값 `DEMO_USER.id`) | `Promise<WorkoutFormCrew[]>` |
| `getWorkoutComments` | `workoutId: string` | `Promise<WorkoutComment[]>` |
| `saveWorkout` | `input: WorkoutInput` | `Promise<SaveWorkoutResult>` |
| `deleteWorkout` | `id: string` | `Promise<DeleteWorkoutResult>` |
| `createComment` | `state: CommentFormState, formData: FormData` (`workoutId`, `body`) | `Promise<CommentFormState>` |
| `deleteComment` | `state: CommentFormState, formData: FormData` (`workoutId`, `commentId`) | `Promise<CommentFormState>` |
| `getRoutines` | 없음 | `Promise<Routine[]>` (최근에 고친 것부터) |
| `getRoutine` | `id: string` | `Promise<Routine \| null>` |
| `saveRoutine` | `input: RoutineInput` | `Promise<SaveRoutineResult>` |
| `deleteRoutine` | `id: string` | `Promise<DeleteRoutineResult>` |
| `getRecentStrengthWorkouts` | `options?: { today?: string; excludeId?: string }` (오늘 포함 7일, 내가 쓴 헬스만) | `Promise<RecentStrengthWorkout[]>` |
| `reset` | 없음 | `void` |
| `createDemoStore` | `options?: DemoStoreOptions` (`now?: () => Date`, `storage?: () => DemoStorage \| null`) | `DemoStore` |
| `createSampleData` | `now?: Date` | `DemoState` |

목록은 실제 API처럼 20개씩 날짜·작성 시각·ID 내림차순으로 반환한다. 기본 목록은 내 기록과 동행 기록이며, `crewId`를 지정하면 크루 공유 기록이다. 주간 요약은 내가 작성한 기록만 집계한다. 러닝 통계는 실제 앱처럼 내가 작성했거나 함께한 러닝을 `buildRunningStats`로 집계한다. 수정·삭제는 본인 기록과 댓글에만 허용한다. 루틴은 샘플 2개(하체 데이, 상체 밀기)로 시작하고 실제 앱과 같은 `parseRoutineInput`으로 검증하며 30개까지 저장한다. 루틴이 생기기 전에 저장된 세션은 기록을 그대로 두고 샘플 루틴만 채운다.

날짜·커서·목록/상세 매핑·주간 합계·입력 검증·폼 크루 변환은 기존 순수 함수를 재사용한다. 실제 Server Action 모듈에서는 타입만 가져온다.

## 화면 연결

```text
app/demo/page.tsx        # /demo: 소개 + 휴대폰 크기 iframe(/demo/app) + "처음부터 다시"
app/demo/app/page.tsx    # /demo/app: 샘플 홈을 미리 그린 DemoApp + 가드 스크립트(10분 ISR)
src/demo/model/          # 순수 로직(테스트 대상)
  demo-path.ts           #   실제 앱 경로 ↔ /demo/app?path=… 변환, 경로 → 화면 매칭
  workout-list.ts        #   목록·달력 조회(실제 목록 페이지와 같은 규칙)
  prerender-guard.ts     #   미리 그린 홈이 맞지 않는 방문이면 hydration 전까지 숨기는 인라인 스크립트
src/demo/ui/
  demo-app.tsx           #   AppNavigationProvider 주입, 링크 가로채기, 스크롤
  demo-location.ts       #   ?path= 읽기(useSyncExternalStore), hydration 여부
  demo-routes.tsx        #   화면별로 저장소를 읽어 실제 *Screen·WorkoutForm에 넘긴다
  demo-notice.tsx        #   "체험에서는 지원하지 않아요" 안내
  demo-landing.tsx, demo-preview.tsx  # /demo 소개와 iframe
```

- 화면은 실제 앱의 `*Screen`, `WorkoutForm`, `WorkoutCommentsView`, `BottomNavigation`을 그대로 쓴다. 복사하지 않는다.
- 이동은 `window.history.pushState/replaceState`로 `?path=`만 바꾸고 `demo-location`에 알린다. 서버를 다시 부르지 않는다.
- 첫 화면은 서버가 처음 방문과 같은 샘플로 홈을 미리 그린다(`store.readHome`). `useSearchParams`는 정적 페이지를 Suspense까지 클라이언트 렌더로 미뤄 HTML이 비고, JS 뒤 새 DOM이 늦은 LCP가 되어 쓰지 않는다. hydration은 서버 DOM을 그대로 이어받고, 끝나면 실제 주소와 저장소로 다시 그린다.
- 미리 그린 홈이 맞지 않는 방문(홈이 아닌 경로, 이 탭에 저장된 체험, 그린 날과 다른 KST 날짜, 저장소를 못 읽음)은 가드 스크립트가 그리기 전에 숨기고 hydration 뒤에 보인다. 데이터를 바꾼 뒤 새로고침해도 샘플이 잠깐 보이지 않는다.
- 화면 속 링크는 `/demo/app?path=…`를 가리키고, `document.body` capture 단계에서 가로채 위 방식으로 이동한다. 작성 중 이탈 확인(document capture)이 먼저 받고, Next Link의 onClick(bubble)보다는 앞선다.
- 조회는 TanStack Query(`["demo", …]`)로 한다. 댓글 작성·삭제 뒤에는 지금 화면을 다시 읽고, 기록 저장·삭제 뒤에는 표시만 해 두고 다음 화면에서 다시 읽는다.
- 크루 만들기·초대 코드 가입·나가기, 로그아웃은 안내 문구로 대신한다.
