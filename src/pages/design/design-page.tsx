"use client";

import { type ReactNode, useState } from "react";

import { ArrowRightIcon, PlusIcon, SneakerIcon } from "@phosphor-icons/react";

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/shared/ui/bottom-sheet";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Chip, FilterChip } from "@/shared/ui/chip";
import { EmptyState } from "@/shared/ui/empty-state";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { NumberInput } from "@/shared/ui/number-input";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Stat } from "@/shared/ui/stat";
import { Textarea } from "@/shared/ui/textarea";

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t pt-6">
      <h2 className="flex items-baseline gap-3 font-semibold text-title">
        <span className="font-normal text-caption text-muted-foreground tabular-nums">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DesignPage() {
  const [view, setView] = useState("timeline");
  const [kind, setKind] = useState("run");
  const [filter, setFilter] = useState(false);
  const [distance, setDistance] = useState("7.20");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-10 px-page pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-[calc(env(safe-area-inset-bottom)+3rem)]">
      <header className="space-y-4">
        <p className="text-caption text-muted-foreground">땀일기 / DESIGN SYSTEM</p>
        <h1 className="font-bold text-4xl leading-tight tracking-tight">
          오늘의 땀을,
          <br />
          내일의 기록으로.
        </h1>
        <p className="text-body text-muted-foreground">
          숫자는 또렷하게, 응원은 따뜻하게.
          <br />
          기기 화면 모드에 따라 라이트·다크로 바뀝니다.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>차곡차곡 쌓이는 나의 움직임</CardTitle>
          <CardDescription>한강 새벽 러닝 · 11월 14일</CardDescription>
          <CardAction>
            <Chip kind="run" />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5">
          <Stat label="달린 거리" value="7.20" unit="km" />
          <div className="grid grid-cols-2 gap-4">
            <Stat label="평균 페이스" value="5′38″" unit="/km" size="sm" />
            <Stat label="운동 시간" value="40:30" size="sm" />
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-caption text-muted-foreground">어제보다 한 걸음 더.</p>
        </CardFooter>
      </Card>
      <Section number="01" title="색과 숫자">
        <div className="flex flex-wrap gap-2">
          <Chip kind="run" />
          <Chip kind="strength" />
          <Chip kind="other" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="총 볼륨" value="3,720" unit="kg" />
          <Stat label="연속 기록" value="12" unit="일" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "배경", color: "bg-background" },
            { name: "표면", color: "bg-surface" },
            { name: "중립", color: "bg-muted" },
            { name: "브랜드", color: "bg-primary" },
            { name: "오류", color: "bg-destructive" },
            { name: "테두리", color: "bg-border" },
          ].map(({ name, color }) => (
            <div key={name}>
              <div className={`h-10 rounded-lg border ${color}`} />
              <p className="mt-1 text-caption text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section number="02" title="버튼">
        <div className="flex flex-wrap gap-2">
          {(["primary", "secondary", "outline", "ghost", "destructive", "link"] as const).map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary">
            sm
          </Button>
          <Button size="md" variant="secondary">
            md
          </Button>
          <Button size="lg" variant="secondary">
            lg <ArrowRightIcon />
          </Button>
          <Button size="icon" variant="outline" aria-label="추가">
            <PlusIcon />
          </Button>
          <Button disabled>비활성</Button>
        </div>
      </Section>
      <Section number="03" title="선택">
        <SegmentedControl
          label="기록 보기"
          value={view}
          onValueChange={setView}
          options={[
            { value: "timeline", label: "타임라인" },
            { value: "calendar", label: "달력" },
          ]}
        />
        <SegmentedControl
          label="운동 종류"
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "run", label: "러닝" },
            { value: "strength", label: "헬스" },
            { value: "other", label: "기타" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip selected={filter} onClick={() => setFilter(!filter)} kind="run" />
          <FilterChip selected>전체</FilterChip>
          <FilterChip disabled>비활성</FilterChip>
        </div>
      </Section>
      <Section number="04" title="입력">
        <Field>
          <FieldLabel htmlFor="demo-place">장소</FieldLabel>
          <Input id="demo-place" placeholder="어디에서 운동했나요?" />
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-distance">거리 (km)</FieldLabel>
          <NumberInput
            id="demo-distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            aria-describedby="distance-help"
          />
          <FieldDescription id="distance-help">소수점까지 입력할 수 있어요.</FieldDescription>
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="demo-error">횟수</FieldLabel>
          <NumberInput id="demo-error" defaultValue="-1" aria-invalid aria-describedby="reps-error" />
          <FieldError id="reps-error">1회 이상 입력해 주세요.</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-disabled">입력 불가</FieldLabel>
          <Input id="demo-disabled" disabled value="저장 중이에요" />
        </Field>
        <Field>
          <FieldLabel htmlFor="demo-memo">오늘의 메모</FieldLabel>
          <Textarea id="demo-memo" placeholder="오늘 몸은 어땠나요?" />
        </Field>
      </Section>
      <Section number="05" title="빈 화면과 카드">
        <Card size="sm">
          <CardHeader>
            <CardTitle>작은 카드</CardTitle>
            <CardDescription>짧은 보조 정보를 담아요.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardContent>
            <EmptyState
              icon={<SneakerIcon size={28} />}
              title="첫 땀을 기록해 볼까요?"
              description="가벼운 산책도 좋아요. 오늘의 움직임부터 차근차근 쌓아가요."
              action={
                <Button render={<a href="#sheet-example" />} nativeButton={false}>
                  기록 시작하기
                </Button>
              }
            />
          </CardContent>
        </Card>
      </Section>
      <Section number="06" title="바텀 시트">
        <div id="sheet-example">
          <BottomSheet>
            <BottomSheetTrigger render={<Button variant="outline" />}>필터 열기</BottomSheetTrigger>
            <BottomSheetContent>
              <BottomSheetHeader>
                <BottomSheetTitle>어떤 기록을 볼까요?</BottomSheetTitle>
                <BottomSheetDescription>보고 싶은 운동 종류를 선택해 주세요.</BottomSheetDescription>
              </BottomSheetHeader>
              <div className="px-5">
                <SegmentedControl
                  label="시트 운동 종류"
                  value={kind}
                  onValueChange={setKind}
                  options={[
                    { value: "run", label: "러닝" },
                    { value: "strength", label: "헬스" },
                    { value: "other", label: "기타" },
                  ]}
                />
              </div>
              <BottomSheetFooter>
                <BottomSheetClose render={<Button />}>선택 완료</BottomSheetClose>
              </BottomSheetFooter>
            </BottomSheetContent>
          </BottomSheet>
        </div>
      </Section>
      <footer className="text-caption text-muted-foreground">땀일기 · 작지만 꾸준한 움직임</footer>
    </main>
  );
}
