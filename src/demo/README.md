# 데모 저장소

`@/demo/store`의 함수들은 실제 조회 함수와 Server Action을 대체하는 비동기 API다. `reset`만 동기 함수다. DB·로그인·네트워크를 사용하지 않는다.

- 클라이언트에서 `@/demo/store`의 이름 있는 함수를 가져오거나, `createDemoStore()`로 만든 인스턴스를 유지해서 사용한다. 렌더링마다 팩터리를 다시 호출하지 않는다.
- 현재 사용자는 `@/demo/sample-data`의 `DEMO_USER`다. 폼의 사용자 ID에도 이 값을 사용한다.
- 첫 데이터 접근 시 `sessionStorage`를 읽는다. 저장 키는 `sweat-log:demo:v1`이며, 저장소 접근·읽기·쓰기 실패 시 해당 인스턴스의 메모리로 계속 동작한다.
- 새 세션과 `reset()`은 실행 시점의 한국 날짜로 샘플을 만든다. 기존 세션을 복원할 때는 작성·수정 내용을 보존하며 날짜를 자동으로 옮기지 않는다.
- 쓰기와 reset 후 화면에서 필요한 조회를 다시 실행한다. 구독·라우팅·캐시 무효화는 이 저장소가 담당하지 않는다.
- 서버 렌더링에서 공유 인스턴스를 호출하지 않는다. 브라우저가 없는 테스트에서는 `createDemoStore({ storage: () => null })`로 독립 인스턴스를 만든다.

| 함수 | 인자 | 반환 타입 |
| --- | --- | --- |
| `getWorkoutPage` | `filter?: WorkoutListFilter` | `Promise<WorkoutPage>` |
| `getWorkoutDetail` | `id: string` | `Promise<WorkoutDetail \| null>` |
| `getWeeklySummary` | `today?: string` (한국 날짜 `YYYY-MM-DD`) | `Promise<WeeklySummary>` |
| `getMyCrews` | 없음 | `Promise<CrewSummary[]>` |
| `getCrew` | `id: string` | `Promise<CrewDetail \| null>` |
| `getWorkoutFormCrews` | `currentUserId?: string` (기본값 `DEMO_USER.id`) | `Promise<WorkoutFormCrew[]>` |
| `getWorkoutComments` | `workoutId: string` | `Promise<WorkoutComment[]>` |
| `saveWorkout` | `input: WorkoutInput` | `Promise<SaveWorkoutResult>` |
| `deleteWorkout` | `id: string` | `Promise<DeleteWorkoutResult>` |
| `createComment` | `state: CommentFormState, formData: FormData` (`workoutId`, `body`) | `Promise<CommentFormState>` |
| `deleteComment` | `state: CommentFormState, formData: FormData` (`workoutId`, `commentId`) | `Promise<CommentFormState>` |
| `reset` | 없음 | `void` |
| `createDemoStore` | `options?: DemoStoreOptions` (`now?: () => Date`, `storage?: () => DemoStorage \| null`) | `DemoStore` |
| `createSampleData` | `now?: Date` | `DemoState` |

목록은 실제 API처럼 20개씩 날짜·작성 시각·ID 내림차순으로 반환한다. 기본 목록은 내 기록과 동행 기록이며, `crewId`를 지정하면 크루 공유 기록이다. 주간 요약은 내가 작성한 기록만 집계한다. 수정·삭제는 본인 기록과 댓글에만 허용한다.

날짜·커서·목록/상세 매핑·주간 합계·입력 검증·폼 크루 변환은 기존 순수 함수를 재사용한다. 실제 Server Action 모듈에서는 타입만 가져온다.
