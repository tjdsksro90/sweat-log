import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

const HEADING_TAGS = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  headingLevel = 3,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  headingLevel?: keyof typeof HEADING_TAGS;
}) {
  const Heading = HEADING_TAGS[headingLevel];

  return (
    <div className={cn("flex flex-col items-center gap-3 px-5 py-10 text-center", className)}>
      <div aria-hidden="true" className="mb-1 rounded-full bg-muted p-4 text-muted-foreground">
        {icon}
      </div>
      <Heading className="break-words font-semibold text-title">{title}</Heading>
      {description && <p className="max-w-xs text-body text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
