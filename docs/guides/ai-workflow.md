# AI 협업 방식

Claude와 Codex를 함께 쓴다. 두 도구 모두 루트의 `AGENTS.md`를 읽는다. Claude는 `CLAUDE.md`의 `@AGENTS.md`로 같은 파일을 불러온다.

## 세션 구성

```text
리드 세션 (Claude, main)          브리프 관리, 리뷰, 충돌 조정. 기능 코드는 쓰지 않는다
├─ A. DB·서버     (Claude, worktree)  docs/tasks/A-db-server.md
├─ B. 기록 작성   (Claude, worktree)  docs/tasks/B-workout-form.md
├─ C. 목록·통계   (Codex,  worktree)  docs/tasks/C-workout-list.md
├─ D. 크루·댓글   (Codex,  worktree)  docs/tasks/D-crew.md
└─ E. 디자인 시스템 (Codex, worktree) docs/tasks/E-design-system.md  ← 가장 먼저
```

누가 무엇을 맡는지, 언제 시작하는지는 [docs/tasks/README.md](../tasks/README.md)에 있다.

## 역할 나누는 기준

| 도구 | 맡기는 일 | 이유 |
| --- | --- | --- |
| Claude | 설계가 필요한 일: DB 스키마와 권한, 상태가 많은 폼, 여러 영역에 걸친 결정 | 정답이 하나가 아니고 판단이 필요하다 |
| Codex | 입력과 출력이 정해진 일: 계약 타입을 받아 그리는 화면, 이미 있는 RPC 위의 화면, 테스트 추가 | 브리프만 보고 끝까지 갈 수 있다 |

Codex에게 맡기기 좋은 일의 조건:

- 받을 데이터 모양이 이미 있다(`contracts.ts`, DB 함수).
- 수정할 폴더가 정해져 있고 다른 영역과 겹치지 않는다.
- "다 됐다"를 확인할 방법이 분명하다(테스트, 직접 눌러 볼 흐름).

## 흐름

1. 리드 세션이 브리프를 쓰고 `main`에 커밋한다. 각 세션은 `main`에서 새 브랜치(worktree)로 시작한다.
2. 각 세션에 "`docs/tasks/X.md`를 읽고 그대로 진행해 줘"라고 시킨다.
3. 끝나면 PR을 올린다. 리뷰는 엇갈려서 한다.
   - Claude가 만든 A·B → Codex 리뷰
   - Codex가 만든 C·D·E → 리드 세션에서 `reviewer` 서브에이전트로 리뷰. DB가 바뀌었으면 `db-verifier`도 돌린다.
   - B·C·D의 화면 PR → E(디자인 시스템) 세션이 디자인 리뷰도 한다.
4. 리뷰를 반영한 뒤 사람이 직접 병합한다. 순서는 `docs/tasks/README.md`의 "병합 순서"를 따른다. E와 A가 먼저 들어오고, B·C는 main을 받아 가짜 데이터를 실제 조회로 바꾼 뒤 병합한다.

## Claude 서브에이전트

`.claude/agents/`에 있다. 리드 세션에서 "reviewer로 feat/crew 리뷰해 줘"처럼 부른다.

| 이름 | 하는 일 |
| --- | --- |
| `reviewer` | 브랜치 변경을 브리프·계약·컨벤션 기준으로 리뷰하고 문제만 보고한다 |
| `db-verifier` | 로컬 DB를 다시 만들고 SQL 테스트를 돌려 권한과 타입 재생성 여부를 보고한다 |

- 서브에이전트는 결과만 받아 오는 일에 쓴다. 코드를 동시에 쓰는 일은 별도 세션에 맡긴다.

## 작업 요청 예시

- 좋은 요청: "`docs/tasks/C-workout-list.md`를 읽고 진행해 줘. 오늘은 1번 카드와 2번 타임라인까지만."
- 피할 요청: "기록 기능 만들어 줘." 범위가 넓으면 세션끼리 같은 파일을 건드린다.
