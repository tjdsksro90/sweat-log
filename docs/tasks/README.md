# 작업 브리프

세션 하나에 브리프 하나를 맡긴다. 세션을 시작할 때 이렇게만 말하면 된다.

> `docs/tasks/A-db-server.md`를 읽고 그대로 진행해 줘.

## 누가 무엇을

| 브리프 | 담당 | 브랜치 | 시작 시점 |
| --- | --- | --- | --- |
| [E. 디자인 시스템](E-design-system.md) | Codex | `feat/design-system` | 가장 먼저 |
| [A. DB·서버](A-db-server.md) | Claude | `feat/workout-db` | 바로 |
| [B. 기록 작성](B-workout-form.md) | Claude | `feat/workout-form` | 바로 (로직부터, 화면은 E 병합 후. 데이터는 A 병합 후 연결) |
| [C. 목록·통계](C-workout-list.md) | Codex | `feat/workout-list` | 바로 (로직부터, 화면은 E 병합 후. 데이터는 A 병합 후 연결) |
| [D. 크루·댓글](D-crew.md) | Codex | `feat/crew` | 바로 (서버·검증부터, 화면은 E 병합 후) |
| 리드 | Claude | `main` | 항상 |

- **리드 세션**은 코드를 쓰지 않는다. 브리프 갱신, Codex PR 리뷰, 충돌 조정, 로드맵 체크를 맡는다.
- **Claude**에게는 설계가 필요한 A(DB·권한)와 B(단계형 폼, 상태가 많음)를 준다.
- **Codex**에게는 브리프만 보고 끝까지 갈 수 있는 E(정해진 방향의 컴포넌트), C(계약 타입 위의 화면), D(이미 있는 RPC 위의 화면)를 준다.
- PR 리뷰는 엇갈려서 한다. A·B는 Codex가, C·D·E는 Claude(리드 세션의 `reviewer` 서브에이전트)가 본다. B·C·D의 화면 PR은 E가 디자인 리뷰도 한다.

## 병합 순서

```text
1. E 토큰·컴포넌트   ─┐
2. A 저장·조회 함수   ─┼─ 먼저 들어오는 순서대로
3. D 크루·댓글        ─┘  (E 이후 화면 작업)
4. B 기록 작성, C 목록·통계  (A·E 이후, main을 받아 가짜 데이터를 실제 조회로 바꾼 뒤)
5. D가 C의 상세 화면에 댓글을 붙이는 마무리 PR
```

## 공통 규칙

- 영역 간 데이터 모양은 `src/entities/workout/model/contracts.ts`로 정해져 있다. 바꿔야 하면 PR 설명 맨 위에 적는다.
- A의 조회 함수가 들어오기 전에는 `src/entities/workout/model/fixtures.ts`의 가짜 데이터로 화면을 만든다. PR을 올릴 때 화면 코드에 fixtures import가 남아 있으면 안 된다(테스트는 괜찮다).
- 자기 브리프의 "수정 가능" 폴더 밖을 고쳐야 하면 PR 설명에 이유를 적는다.
- `src/shared/ui`와 `src/app/styles/globals.css`는 E만 수정한다. 없는 컴포넌트는 자기 폴더에 임시로 만들고 PR 설명에 "E로 옮길 후보"라고 적는다.
- `package.json`에 패키지를 추가하면 PR 설명에 적는다. 같은 날 두 브랜치가 추가하면 나중에 병합하는 쪽이 lockfile 충돌을 푼다.
- 끝나면 `docs/guides/verification.md` 순서로 검증하고 PR을 올린다.

## PR 설명 양식

```md
## 작업 내용
- 

## 계약·공용 파일 변경
- 없음 / contracts.ts의 ○○ 필드 추가 (이유)

## 검증
- [ ] biome, tsc, test
- [ ] (DB 변경 시) access-control.sql과 새 SQL 테스트
- [ ] (화면 변경 시) 로컬에서 직접 눌러 본 흐름
```
