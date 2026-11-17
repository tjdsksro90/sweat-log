"use client";

import { useState } from "react";

import { FileDashedIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { WorkoutDetail } from "@/entities/workout/model/contracts";
import { isWorkoutKind } from "@/entities/workout/model/types";
import { getKstToday } from "@/entities/workout/model/weekly-summary";
import type { CrewFormAction } from "@/features/crew/model/crew-form";
import { createWorkoutFormValues, fromWorkoutDetail, getTodayInSeoul } from "@/features/workout/model/workout-form";
import type { CommentAction } from "@/features/workout-comment/model/comment-form";
import { WorkoutCommentsView } from "@/features/workout-comment/ui/workout-comments-view";
import { CrewDetailScreen } from "@/pages/crew/detail/ui/crew-detail-screen";
import { CrewListScreen } from "@/pages/crew/list/ui/crew-list-screen";
import { HomeScreen } from "@/pages/home/ui/home-screen";
import { SettingsScreen } from "@/pages/settings/ui/settings-screen";
import { WorkoutDetailScreen } from "@/pages/workout/detail/ui/workout-detail-screen";
import { parseListState } from "@/pages/workout/list/model/filters";
import { WorkoutListScreen } from "@/pages/workout/list/ui/workout-list-screen";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageLayout } from "@/shared/ui/layouts/page-layout";
import { WorkoutForm, type WorkoutFormCrew } from "@/widgets/workout-form";

import type { DemoLocation, SearchParams } from "../model/demo-path";
import { loadWorkoutList } from "../model/workout-list";
import { DEMO_USER } from "../sample-data";
import * as store from "../store";
import { UNSUPPORTED_MESSAGE, useDemoNotice } from "./demo-notice";

// 저장소는 브라우저 메모리라 매번 다시 읽어도 싸다. 저장·삭제 뒤 화면이 바로 바뀌도록 항상 다시 읽는다.
const DEMO_QUERY_KEY = ["demo"] as const;
const useDemoQuery = <T,>(key: readonly unknown[], load: () => Promise<T>) =>
  useQuery({ queryKey: [...DEMO_QUERY_KEY, ...key], queryFn: load, staleTime: 0, gcTime: 0 });

/**
 * 실제 앱은 저장 뒤 revalidatePath로 다시 그린다. 체험은 저장소를 고친 뒤 조회를 다시 실행한다.
 * 저장·삭제처럼 곧 다른 화면으로 옮겨 가는 동작은 지금 화면을 다시 읽지 않고 표시만 해 둔다.
 */
const useRefreshAfter = () => {
  const queryClient = useQueryClient();
  return <Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>, refetchNow: boolean) =>
    async (...args: Args) => {
      const result = await action(...args);
      await queryClient.invalidateQueries({ queryKey: DEMO_QUERY_KEY, refetchType: refetchNow ? "active" : "none" });
      return result;
    };
};

// 사진은 서버 Storage에 올려야 해서 체험에서는 막는다.
const DEMO_PHOTO_MESSAGE = "체험에서는 사진을 올릴 수 없어요. 가입하면 기록 하나에 4장까지 붙일 수 있어요.";

const unsupportedCrewAction: CrewFormAction = async () => ({ error: UNSUPPORTED_MESSAGE });

export function DemoRoutes({ location }: { location: DemoLocation }) {
  const { route, searchParams } = location;
  switch (route.name) {
    case "home":
      return <DemoHome />;
    case "workouts":
      return <DemoWorkoutList searchParams={searchParams} />;
    case "workout-new":
      return <DemoWorkoutNew kind={searchParams.kind} />;
    case "workout-detail":
      return <DemoWorkoutDetail key={route.workoutId} workoutId={route.workoutId} />;
    case "workout-edit":
      return <DemoWorkoutEdit key={route.workoutId} workoutId={route.workoutId} />;
    case "crews":
      return <DemoCrewList />;
    case "crew-detail":
      return (
        <DemoCrewDetail
          crewId={route.crewId}
          cursor={typeof searchParams.cursor === "string" ? searchParams.cursor : undefined}
        />
      );
    case "settings":
      return <DemoSettings />;
    case "not-found":
      return <DemoNotFound title="땀일기" message="찾는 화면이 없어요." />;
  }
}

function DemoHome() {
  const { data: summary } = useDemoQuery(["summary"], () => store.getWeeklySummary());
  const { data: runningStats } = useDemoQuery(["running-stats"], () => store.getRunningStats());
  const { data: strengthRecords } = useDemoQuery(["strength-records"], () => store.getStrengthRecords());
  return summary && runningStats && strengthRecords ? (
    <HomeScreen
      nickname={DEMO_USER.nickname}
      summary={summary}
      runningStats={runningStats}
      strengthRecords={strengthRecords}
    />
  ) : null;
}

function DemoWorkoutList({ searchParams }: { searchParams: SearchParams }) {
  const state = parseListState(searchParams, getKstToday().slice(0, 7));
  const { data } = useDemoQuery(["workouts", state], () => loadWorkoutList(store.getWorkoutPage, state));
  return data ? <WorkoutListScreen state={state} workouts={data.workouts} nextCursor={data.nextCursor} /> : null;
}

function DemoWorkoutDetail({ workoutId }: { workoutId: string }) {
  const refreshAfter = useRefreshAfter();
  const [actions] = useState<{ create: CommentAction; remove: CommentAction }>(() => ({
    create: refreshAfter(store.createComment, true),
    remove: refreshAfter(store.deleteComment, true),
  }));
  const workout = useDemoQuery(["workout", workoutId], () => store.getWorkoutDetail(workoutId));
  const comments = useDemoQuery(["comments", workoutId], () => store.getWorkoutComments(workoutId));
  if (workout.isPending) return null;
  if (!workout.data) return <DemoNotFound title="운동 기록" message="지워졌거나 볼 수 없는 기록이에요." />;
  return (
    <WorkoutDetailScreen
      workout={workout.data}
      comments={
        comments.isPending ? null : (
          <WorkoutCommentsView
            workoutId={workoutId}
            page={comments.data ?? null}
            now={new Date()}
            loadOlder={store.loadOlderComments}
            createAction={actions.create}
            deleteAction={actions.remove}
          />
        )
      }
    />
  );
}

function DemoWorkoutNew({ kind }: { kind: SearchParams[string] }) {
  const crews = useDemoQuery(["form-crews"], () => store.getWorkoutFormCrews());
  if (!crews.data) return null;
  return (
    <DemoWorkoutForm crews={crews.data} kind={typeof kind === "string" && isWorkoutKind(kind) ? kind : undefined} />
  );
}

function DemoWorkoutEdit({ workoutId }: { workoutId: string }) {
  const workout = useDemoQuery(["workout", workoutId], () => store.getWorkoutDetail(workoutId));
  const crews = useDemoQuery(["form-crews"], () => store.getWorkoutFormCrews());
  if (workout.isPending || !crews.data) return null;
  // 실제 앱처럼 남의 기록은 수정 화면이 없는 것으로 본다.
  if (!workout.data?.isMine) return <DemoNotFound title="기록 수정" message="내가 쓴 기록만 고칠 수 있어요." />;
  return <DemoWorkoutForm crews={crews.data} detail={workout.data} />;
}

// 폼은 처음 값과 지금 값을 비교해 이탈을 확인하므로, 처음 값은 화면에 들어올 때 한 번만 만든다.
function DemoWorkoutForm({
  crews,
  detail,
  kind,
}: {
  crews: WorkoutFormCrew[];
  detail?: WorkoutDetail;
  kind?: Parameters<typeof createWorkoutFormValues>[1];
}) {
  const refreshAfter = useRefreshAfter();
  const [today] = useState(() => getTodayInSeoul());
  const [initialValues] = useState(() => (detail ? fromWorkoutDetail(detail) : createWorkoutFormValues(today, kind)));
  const [actions] = useState(() => ({
    save: refreshAfter(store.saveWorkout, false),
    remove: refreshAfter(store.deleteWorkout, false),
  }));
  return (
    <WorkoutForm
      title={detail ? "기록 수정" : "기록하기"}
      initialValues={initialValues}
      crews={crews}
      existingCompanions={detail?.companions.map((companion) => ({
        userId: companion.id,
        nickname: companion.nickname,
      }))}
      today={today}
      closeHref={detail ? `/workouts/${detail.id}` : "/workouts"}
      saveWorkout={actions.save}
      deleteWorkout={detail ? actions.remove : undefined}
      photoUnavailableMessage={DEMO_PHOTO_MESSAGE}
    />
  );
}

function DemoCrewList() {
  const { data: crews } = useDemoQuery(["crews"], () => store.getMyCrews());
  return crews ? (
    <CrewListScreen crews={crews} createAction={unsupportedCrewAction} joinAction={unsupportedCrewAction} />
  ) : null;
}

function DemoCrewDetail({ crewId, cursor }: { crewId: string; cursor?: string }) {
  const crew = useDemoQuery(["crew", crewId], () => store.getCrew(crewId));
  const page = useDemoQuery(["crew-feed", crewId, cursor], () => store.getWorkoutPage({ crewId, cursor }));
  if (crew.isPending || page.isPending) return null;
  if (!crew.data || !page.data)
    return (
      <DemoNotFound title="크루" message="가입한 크루인지 확인해 주세요." backHref="/crews" backLabel="크루 목록으로" />
    );
  return (
    <CrewDetailScreen
      crew={crew.data}
      page={page.data}
      hasCursor={Boolean(cursor)}
      isOwner={crew.data.ownerId === DEMO_USER.id}
      leaveAction={unsupportedCrewAction}
    />
  );
}

function DemoSettings() {
  const notify = useDemoNotice();
  return <SettingsScreen nickname={DEMO_USER.nickname} logoutAction={() => notify(UNSUPPORTED_MESSAGE)} />;
}

function DemoNotFound({
  title,
  message,
  backHref = "/",
  backLabel = "홈으로",
}: {
  title: string;
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <PageLayout title={title}>
      <EmptyState
        icon={<FileDashedIcon size={28} />}
        headingLevel={2}
        title="찾을 수 없어요"
        description={message}
        action={
          <Button role="link" render={<AppLink href={backHref} />} nativeButton={false}>
            {backLabel}
          </Button>
        }
      />
    </PageLayout>
  );
}
