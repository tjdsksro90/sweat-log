# 땀일기 (sweat-log)

**러닝과 헬스, 크루와 함께 흘린 땀을 기록해요.**

땀일기는 운동 기록을 남기고 친구들과 크루로 묶여 서로의 기록을 보며 응원하는 운동 일기 PWA예요.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 웹 | Next.js App Router, React, TypeScript |
| 스타일·UI | Tailwind CSS, shadcn/ui, Base UI, Phosphor Icons |
| 서버 상태 | TanStack Query |
| 인증·데이터 | Supabase Auth, PostgreSQL, RLS |
| 도구 | pnpm, Biome, Vitest |

## 시작하기

```sh
pnpm install
cp .env.example .env.local   # Supabase URL과 publishable key 입력
pnpm db:start                # 로컬 Supabase (Docker 필요)
pnpm dev
```

## 프로젝트 구조

```text
app/             Next.js 라우팅 진입점
src/app/         전역 스타일, provider
src/pages/       페이지 단위 화면 조합
src/widgets/     하단 내비게이션 등 화면 블록
src/features/    로그인, 기록 작성, 크루 가입 등 사용자 행동
src/entities/    운동 기록, 크루, 프로필 등 도메인
src/shared/      공용 UI, API 클라이언트, 유틸
supabase/        DB 마이그레이션
docs/            컨벤션, 검증 가이드, 로드맵, AI 협업 방식
```

## 개발 문서

- [코드 컨벤션](docs/guides/convention.md)
- [검증 가이드](docs/guides/verification.md)
- [AI 협업 방식](docs/guides/ai-workflow.md)
- [로드맵과 작업 영역](docs/planning/roadmap.md)
- [DB 구조와 권한](supabase/README.md)
