import { SneakerIcon } from "@phosphor-icons/react/ssr";

import type { WorkoutPage } from "@/entities/workout/model/contracts";
import { WorkoutCard } from "@/entities/workout/ui/workout-card";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function CrewFeed({ crewId, page, hasCursor }: { crewId: string; page: WorkoutPage; hasCursor: boolean }) {
  return (
    <section aria-labelledby="crew-feed-title" className="flex flex-col gap-4">
      <h2 id="crew-feed-title" className="font-semibold text-title">
        함께 남긴 땀일기
      </h2>
      {page.items.length ? (
        <ul className="flex flex-col gap-3">
          {page.items.map((workout) => (
            <li key={workout.id}>
              <WorkoutCard workout={workout} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<SneakerIcon size={28} />}
          title={hasCursor ? "이전 기록이 없어요" : "아직 함께 남긴 기록이 없어요"}
          description="운동을 기록할 때 이 크루에 공유해 보세요."
        />
      )}
      {(hasCursor || page.nextCursor) && (
        <nav aria-label="크루 피드 페이지" className="flex flex-wrap gap-3">
          {hasCursor && (
            <Button variant="ghost" role="link" render={<AppLink href={`/crews/${crewId}`} />} nativeButton={false}>
              최신 기록으로
            </Button>
          )}
          {page.nextCursor && (
            <Button
              variant="outline"
              role="link"
              render={
                <AppLink href={`/crews/${crewId}?cursor=${encodeURIComponent(page.nextCursor)}#crew-feed-title`} />
              }
              nativeButton={false}
            >
              이전 기록 보기
            </Button>
          )}
        </nav>
      )}
    </section>
  );
}
