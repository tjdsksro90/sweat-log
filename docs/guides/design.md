# 땀일기 디자인 가이드

운동한 숫자가 먼저 읽히고, 입력과 공유는 편안하게 이어지는 모바일 운동 일기다.
실행 중인 앱의 `/design`에서 예제와 상태를 확인한다. 로그인은 필요 없으며 색상 모드는 기기 설정을 따른다.

## 토큰

모든 색 값은 `src/app/styles/globals.css`에서만 정의한다. 아래 토큰은 라이트·다크에서 같은 이름으로 사용한다.

| 토큰 / 클래스 | 용도 |
| --- | --- |
| `background`, `foreground` | 화면 배경, 기본 글자 |
| `surface` | 입력, 선택된 세그먼트, 하단 탭 표면 |
| `card`, `card-foreground` | 카드 표면과 글자 |
| `popover`, `popover-foreground`, `overlay` | 시트 표면·글자·뒤쪽 가림막 |
| `primary`, `primary-foreground` | 형광 라임 행동 버튼과 어두운 글자. 항상 쌍으로 사용 |
| `secondary`, `secondary-foreground` | 보조 행동 |
| `muted`, `muted-foreground` | 보조 표면과 설명 글자 |
| `accent`, `accent-foreground` | 가벼운 상호작용 강조 |
| `destructive` | 삭제 행동, 오류 글자와 테두리 |
| `success` | 성공 상태 아이콘. 본문은 `foreground` 사용 |
| `border`, `input`, `ring` | 구분선, 입력 테두리, 키보드 포커스 |
| `workout-run`, `workout-strength`, `workout-other` | 운동 종류를 나타내는 작은 점·칩의 점·그래프 막대 |
| `text-stat` | 큰 숫자 40px / 1.1, `font-bold tabular-nums`와 사용 |
| `text-title` | 구역 제목 20px / 1.4 |
| `text-body` | 본문 16px / 1.6 |
| `text-caption` | 라벨·설명 14px / 1.5 |
| `px-page`, `gap-section` | 화면 좌우 20px, 구역 사이 32px |
| `gap-2`, `gap-3`, `gap-4`, `gap-6` | 8·12·16·24px 간격. 관련된 내용일수록 가깝게 |
| `rounded-sm/md/lg/xl` | 약 8·11·14·20px. 칩은 `rounded-full`, 시트 위쪽은 `rounded-t-3xl` |
| `shadow-card`, `shadow-sheet` | 낮은 카드 그림자, 떠 있는 시트 그림자 |

본문은 `foreground` 또는 `muted-foreground`로 쓴다. `primary`는 밝은 배경의 글자 색으로 쓰지 않는다.
Chromium sRGB 렌더링으로 측정한 대비(라이트 / 다크):

| 조합 | 대비 |
| --- | --- |
| `foreground` / `surface` | 18.81 / 16.12 |
| `muted-foreground` / `surface` | 5.99 / 6.78 |
| `destructive` / `surface` | 6.35 / 5.75 |
| `primary-foreground` / `primary` | 13.67 / 13.67 |

## 화면 구성

- 기본 너비는 `w-full max-w-md`, 가운데 정렬. 360px 화면을 기준으로 긴 이름·숫자도 확인한다.
- 화면당 주요 라임 강조는 한두 곳만 둔다. `/design`의 변형 전시는 예외다.
- 숫자는 `tabular-nums`. 거리·시간·볼륨의 계산과 포맷은 도메인에서 하고 UI에는 표시 값을 넘긴다. 페이스는 기존 `entities/workout/model/pace.ts`로 계산한다.
- 탭 화면은 `PageLayout`을 사용한다. 상단 안전 영역, 하단 탭 64px와 안전 영역을 위한 여백이 포함된다.
- 터치 대상은 높이·너비 모두 최소 44px. 아이콘만 있는 버튼에는 한국어 `aria-label`을 준다.
- 긴 제목은 줄바꿈하고, 그리드의 유연한 열은 `minmax(0,1fr)`로 만든다. 중요한 정보에 무조건 `truncate`를 쓰지 않는다.

## 버튼과 카드

`Button`은 주요 행동에 `primary`, 보조 행동에 `secondary`·`outline`, 가벼운 행동에 `ghost`, 삭제에 `destructive`를 쓴다. `link`는 글자 링크형 버튼이다.
크기는 `sm`(44px), `md`(48px), `lg`(56px), `icon`(48px). 기존 `default` variant/size는 primary/md에 대응하며 `xs`, `icon-xs`, `icon-sm`, `icon-lg`도 호환된다.
비활성은 `disabled`, 제출 상태는 호출자가 라벨과 `disabled`를 함께 지정한다.

```tsx
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

<Button variant="primary" size="lg" type="submit" disabled={isPending}>
  {isPending ? "저장 중…" : "기록 저장"}
</Button>
<Button variant="outline" render={<Link href="/workouts" />} nativeButton={false}>
  기록 보기
</Button>
<Card size="default">
  <CardHeader><CardTitle>이번 주의 움직임</CardTitle></CardHeader>
  <CardContent>요약 내용</CardContent>
</Card>
```

카드는 관련 정보를 묶을 때만 쓴다. 짧은 보조 내용은 `size="sm"`. 필요하면 `CardDescription`, `CardAction`, `CardFooter`를 조합한다.
카드 전체에 클릭을 달기보다 목적지가 분명한 링크·버튼을 넣는다.

## 종류 칩과 선택

`Chip`은 읽기 전용 종류 표시이며 `kind`는 `run | strength | other`다. 공유 UI 내부에서 도메인 타입을 import하지 않는다.
`FilterChip`은 버튼이며 `selected`, `onClick`, `disabled`로 제어한다. 선택은 색상 외에 `aria-pressed`로도 전달한다.
`SegmentedControl`은 타임라인/달력이나 운동 종류처럼 하나만 고르는 전환에 쓴다. 탭 패널 UI가 아닌 단일 선택 버튼 그룹이다.
키보드 화살표로 이동하고 Space로 선택할 수 있다. 선택된 항목을 다시 눌러도 선택을 유지한다.
폼에서 사용할 때 `name`을 지정하면 현재 `value`가 hidden input을 통해 `FormData`에 포함된다. `disabled`인 그룹은 제출에서 제외되며, `name`을 생략하면 기존처럼 선택 UI만 제공한다.

```tsx
import { Chip, FilterChip } from "@/shared/ui/chip";
import { SegmentedControl } from "@/shared/ui/segmented-control";

<Chip kind="run" />
<FilterChip kind="strength" selected={selected} onClick={() => setSelected(!selected)} />
<SegmentedControl
  label="기록 보기"
  name="view"
  value={view}
  onValueChange={setView}
  options={[{ value: "timeline", label: "타임라인" }, { value: "calendar", label: "달력" }]}
/>
```

## 통계와 빈 화면

`Stat`은 라벨·표시 값·단위를 묶는다. 대표 숫자는 기본 `size="lg"`, 좁은 보조 열은 `size="sm"`(24px)을 쓴다.
`EmptyState`는 기록이 없을 때 무엇을 하면 되는지 안내한다. `action`은 선택 사항이다. 로딩 실패는 빈 데이터와 구분해 호출 화면에서 설명한다.

```tsx
import { Stat } from "@/shared/ui/stat";
import { EmptyState } from "@/shared/ui/empty-state";

<Stat label="달린 거리" value="7.20" unit="km" />
<Stat label="운동 시간" value="40:30" size="sm" />
<EmptyState
  icon={<SneakerIcon size={28} />}
  title="첫 땀을 기록해 볼까요?"
  description="가벼운 산책도 좋아요. 오늘의 움직임을 남겨요."
  action={<Button onClick={startWorkout}>기록 시작하기</Button>}
/>
```

## 입력과 오류

`Field` 안에 `FieldLabel`, `Input`·`NumberInput`·`Textarea`, `FieldDescription`·`FieldError`를 조합한다.
라벨의 `htmlFor`와 입력의 `id`를 연결한다. 도움말·오류의 ID를 `aria-describedby`로 연결하고 오류일 때 입력에 `aria-invalid`, Field에 `data-invalid`를 지정한다.
`FieldError`는 `role="alert"`를 가지며 문자열 children 또는 `errors` 배열을 받는다.

```tsx
import { Field, FieldLabel, FieldDescription, FieldError } from "@/shared/ui/field";
import { NumberInput } from "@/shared/ui/number-input";
import { Textarea } from "@/shared/ui/textarea";

<Field data-invalid={Boolean(error)}>
  <FieldLabel htmlFor="distance">거리 (km)</FieldLabel>
  <NumberInput
    id="distance" name="distance" value={distance}
    onChange={(event) => setDistance(event.target.value)}
    aria-invalid={Boolean(error)}
    aria-describedby={error ? "distance-help distance-error" : "distance-help"}
  />
  <FieldDescription id="distance-help">소수점까지 입력할 수 있어요.</FieldDescription>
  {error && <FieldError id="distance-error">{error}</FieldError>}
</Field>
<Field>
  <FieldLabel htmlFor="memo">오늘의 메모</FieldLabel>
  <Textarea id="memo" name="memo" maxLength={1000} />
</Field>
```

`NumberInput`은 `type="text"`이며 `inputMode`는 `"decimal" | "numeric"`을 받는다. 기본값은 `"decimal"`이고, 횟수·시분초처럼 정수를 입력할 때는 `inputMode="numeric"`을 지정한다. 값은 문자열로 유지하며 빈 값이나 `7.`처럼 입력 중인 값을 성급하게 숫자로 변환하지 않는다.
`inputMode`는 키패드 힌트이므로 유효성 검증이 아니다. 음수·정수·최대값 검증 및 단위 변환은 호출하는 기능에서 한다. `min`, `max`, `step`에 숫자 검증을 맡기지 않는다.
`Input`은 이메일·비밀번호·일반 텍스트, `Textarea`는 여러 줄 메모에 쓴다. 입력 글자는 모바일 자동 확대를 피하도록 16px을 유지한다.

## 바텀 시트

`BottomSheet`는 shadcn Sheet / Base UI Dialog 기반이다. 필터나 확인 내용을 아래에서 보여준다.
제목과 설명은 반드시 제공한다. 포커스 가두기·복귀, Escape·가림막 닫기는 기본 제공된다. 내부는 최대 85dvh에서 스크롤하며 하단 안전 영역을 포함한다.
드래그로 닫는 제스처는 제공하지 않는다. 저장 결과나 실제 삭제 처리는 호출하는 기능에서 제어한다.

```tsx
import {
  BottomSheet, BottomSheetTrigger, BottomSheetContent, BottomSheetHeader,
  BottomSheetTitle, BottomSheetDescription, BottomSheetFooter, BottomSheetClose,
} from "@/shared/ui/bottom-sheet";

<BottomSheet>
  <BottomSheetTrigger render={<Button variant="outline" />}>필터</BottomSheetTrigger>
  <BottomSheetContent>
    <BottomSheetHeader>
      <BottomSheetTitle>어떤 기록을 볼까요?</BottomSheetTitle>
      <BottomSheetDescription>운동 종류를 선택해 주세요.</BottomSheetDescription>
    </BottomSheetHeader>
    <div className="px-5">필터 입력</div>
    <BottomSheetFooter>
      <BottomSheetClose render={<Button />}>선택 완료</BottomSheetClose>
    </BottomSheetFooter>
  </BottomSheetContent>
</BottomSheet>
```

비동기 확인 흐름은 `open`, `onOpenChange`를 전달하는 제어형으로 사용하고 작업이 성공한 뒤 닫는다.
저장 중 버튼을 `BottomSheetClose`로 감싸 즉시 닫아 버리지 않는다.
`sheet`, `toggle`, `toggle-group`, `separator`는 shadcn 기반 조합 부품이다. 제품 화면에서는 위의 의미가 분명한 공용 컴포넌트를 우선 사용한다.

## 하지 말 것

- 컴포넌트에 raw 색, Base 팔레트(`lime-500` 등), `dark:` 색상 덮어쓰기를 추가하지 않는다.
- 종류 색으로 카드 전체를 칠하거나 색만으로 종류·오류를 구별하지 않는다.
- `primary`를 본문이나 일반 링크 글자 색으로 쓰지 않는다. 라임 바탕에는 `primary-foreground`를 쓴다.
- 클릭할 수 없는 칩에 버튼 역할을 주거나 클릭 요소를 서로 중첩하지 않는다.
- placeholder로 라벨을 대신하거나 오류를 색상으로만 표시하지 않는다.
- 화면마다 별도 버튼·입력·시트를 복제하지 않는다. 부족한 변형은 E 영역에 요청한다.
- UI 컴포넌트에서 데이터 조회·저장·페이스 계산·값 검증을 구현하지 않는다.

## 검증

`pnpm exec biome check --write src app`, `pnpm lint`, `pnpm exec tsc --noEmit`을 실행한다. 서버/클라이언트 경계 변경은 `pnpm build`까지 확인한다.
`/design`에서 기기 라이트·다크 모드, 360px 너비, 키보드 Tab/화살표/Space, 시트 Escape와 포커스 복귀를 확인한다.
실제 모바일 소수 키패드와 노치 안전 영역은 대상 기기에서 추가 확인한다.

### 검토용 스크린샷

360px 프로덕션 미리보기에서 촬영했다. 화면 전체와 바텀 시트를 모드별로 비교할 수 있다.

| 화면 | 라이트 | 다크 |
| --- | --- | --- |
| 컴포넌트 전체 | [라이트](design-assets/design-light.png) | [다크](design-assets/design-dark.png) |
| 바텀 시트 | [라이트](design-assets/sheet-light.png) | [다크](design-assets/sheet-dark.png) |
