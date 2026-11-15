import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-5 py-10 text-center", className)}>
      <div aria-hidden="true" className="mb-1 rounded-full bg-muted p-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="break-words font-semibold text-title">{title}</h3>
      {description && <p className="max-w-xs text-body text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
