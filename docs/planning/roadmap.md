# 땀일기 로드맵

- 갱신일: 2026-11-21
- 구현을 마친 항목은 체크하고, 자세한 이력은 Git과 PR에서 확인한다.

## 0단계: 뼈대 (완료)

- [x] Next.js 16 App Router, TypeScript, Tailwind 4, shadcn(Base UI), TanStack Query, Biome, pnpm
- [x] FSD 폴더 구조와 `@/` → `src/` 별칭, Vitest
- [x] Supabase 클라이언트(브라우저·서버), `proxy.ts` 세션 갱신, `requireUser`
- [x] 이메일 회원가입·로그인·로그아웃, 가입 시 프로필 자동 생성
- [x] 하단 탭 4개(홈, 기록, 크루, 설정)와 빈 화면
- [x] 기본 스키마와 RLS: `supabase/migrations/20261113000000_initial_schema.sql`
- [x] 러닝 페이스·거리·시간 계산 유틸과 테스트
- [x] 로컬 Supabase에서 마이그레이션 적용, 권한 검증(`supabase/tests/access-control.sql`), `pnpm db:types`로 타입 재생성
- [x] Supabase 클라우드 프로젝트 연결(서울 리전), Vercel 배포(`https://sweat-log-crew.vercel.app`)
- [x] GitHub Actions CI(lint·typecheck·test)와 `main` 보호 규칙(PR·Squash 병합만, CI 통과 필수)

## 1단계: MVP 기능 (완료)

### 작업 영역

한 세션은 자기 영역의 폴더만 수정한다. 영역 밖 파일이 필요하면 PR 설명에 적는다.

| 영역 | 담당 범위 | 주로 수정하는 폴더 | 의존 |
| --- | --- | --- | --- |
| A. DB·서버 | 기록 저장 RPC(공통+상세를 한 트랜잭션으로), 조회 쿼리, 통계용 SQL 함수, RLS 테스트 | `supabase/`, `src/shared/api/supabase/`, `src/entities/workout/api/` | 없음. 바로 시작 |
| B. 기록 작성 | 단계형 작성 폼(언제 → 무엇 → 상세 → 메모·공유), 러닝 입력, 헬스 세트 입력, 수정·삭제 | `src/features/workout/`, `src/widgets/workout-form/`, `src/pages/workout/new`, `src/pages/workout/edit` | A의 저장 RPC, E의 입력 컴포넌트 |
| C. 목록·통계 | 기록 타임라인, 달력, 기록 상세, 홈 주간 요약(거리·횟수·연속 기록) | `src/pages/workout/list`, `src/pages/workout/detail`, `src/pages/home`, `src/entities/workout/ui/` | A의 조회 쿼리, E의 컴포넌트 |
| D. 크루·소통 | 크루 만들기·초대 코드 가입·탈퇴, 크루 피드, 댓글 | `src/features/crew/`, `src/entities/crew/`, `src/pages/crew/`, `src/features/workout-comment/` | 스키마는 0단계에 있음, E의 컴포넌트 |
| E. 디자인 시스템 | 토큰, 공용 컴포넌트, 디자인 가이드, 화면 PR 디자인 리뷰 | `src/app/styles/`, `src/shared/ui/`, `docs/guides/design.md` | 없음. 가장 먼저 시작 |

세부 브리프는 `docs/tasks/`에 있다. A가 RPC와 쿼리의 함수 이름·인자를 먼저 PR로 올리면 B와 C는 그 시그니처에 맞춰 작업한다.

### 기능 목록

- [x] 운동 기록 작성: 날짜, 종류(러닝/헬스/기타), 장소 이름, 메모, 함께한 크루 친구, 공유 크루
  - [x] 러닝: 거리(km)와 시간 입력, 페이스 자동 표시
  - [x] 헬스: 종목 추가, 세트(무게 × 횟수) 추가·삭제, 맨몸 운동은 무게 비움
- [x] 기록 목록: 날짜순 타임라인, 월 달력(운동 종류별 색 점)
- [x] 기록 상세와 수정·삭제
- [x] 홈: 이번 주 러닝 거리, 운동 횟수, 연속 운동 일수
- [x] 크루: 만들기, 초대 코드 공유, 코드로 가입, 탈퇴, 구성원 목록
- [x] 크루 피드: 크루에 공유된 기록 모아 보기
- [x] 댓글
- [x] 회원가입 비밀번호 확인 입력(비밀번호 오타 방지)
- [x] 로그인·회원가입 비밀번호 보기 토글
- [x] 가입 없이 써 보는 체험 데모(`/demo`, 샘플 데이터는 탭 안에만 저장)

## 2단계: 다듬기 (완료)

### 1차 (완료)

- [x] PWA 설치(manifest, 아이콘, 오프라인 안내용 서비스 워커)
- [x] 러닝 월간 누적 거리(최근 12개월), 최고 페이스, 개인 기록
- [x] 화면 모드 선택(라이트/다크/시스템)

### 2차 (완료)

- [x] 새 기록·댓글 푸시 알림(설정에서 기기별로 켜고 끄기)
- [x] 헬스 종목 사전과 초성 검색 자동완성, 종목별 최고 무게
- [x] 사진 첨부(기록당 4장, 볼 수 있는 사람만 보기)

### 3차 (완료)

- [x] 헬스 루틴 템플릿(루틴 저장·불러오기, 기록에서 루틴 만들기)

### 4차 (완료)

- [x] 루틴으로 운동한 뒤 저장한 구성으로 루틴 업데이트 제안
- [x] 최근 7일 내 헬스 기록 불러오기
- [x] 부위를 받는 내 종목 추가와 설정의 내 종목 관리
