import { BarbellIcon } from "@phosphor-icons/react/ssr";

import type { StrengthRecord } from "@/entities/exercise/model/strength-records";
import { AppLink } from "@/shared/lib/app-navigation";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";

const weightFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

export function StrengthRecordsCard({ records }: { records: StrengthRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-title">헬스 최고 무게</h2>
        <p className="text-caption text-muted-foreground">내가 쓰거나 함께한 헬스에서 많이 한 종목 5개를 모았어요.</p>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <EmptyState
            className="py-4"
            icon={<BarbellIcon size={28} />}
            headingLevel={3}
            title="아직 헬스 기록이 없어요"
            description="헬스를 기록하면 종목별 최고 무게와 처음 달성한 날을 보여 드려요."
            action={
              <Button
                variant="outline"
                render={<AppLink href="/workouts/new?kind=strength" />}
                nativeButton={false}
                role="link"
              >
                헬스 기록하기
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {records.map((record) => (
              <li key={record.exerciseName}>
                <AppLink
                  href={`/workouts/${record.workoutId}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-md py-3 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="break-words font-medium">{record.exerciseName}</span>
                    <span className="text-caption text-muted-foreground">
                      {record.workoutCount}회 기록 · {record.maxWeightKg === null ? "첫 기록" : "최초 달성"}{" "}
                      {record.workoutDate.replaceAll("-", ".")}
                    </span>
                    {record.maxWeightKg === null && (
                      <span className="text-caption text-muted-foreground">무게 기록 없음</span>
                    )}
                  </span>
                  <span className="shrink-0 font-bold text-xl tabular-nums">
                    {record.maxWeightKg === null ? (
                      "맨몸"
                    ) : (
                      <>
                        {weightFormat.format(record.maxWeightKg)}
                        <span className="ml-1 font-normal text-caption text-muted-foreground">kg</span>
                      </>
                    )}
                  </span>
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
