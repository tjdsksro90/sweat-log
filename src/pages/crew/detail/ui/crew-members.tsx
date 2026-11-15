import type { CrewMember } from "@/entities/crew/model/crew";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function CrewMembers({ members }: { members: CrewMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>
            구성원 <span className="tabular-nums">{members.length}</span>명
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0 break-words text-body">{member.nickname ?? "크루 친구"}</span>
              {member.isOwner && (
                <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-caption text-secondary-foreground">
                  크루장
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
