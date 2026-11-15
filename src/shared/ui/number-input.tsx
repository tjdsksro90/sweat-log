import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";

// 문자열 상태를 유지해 빈 값과 소수점 입력 중간 상태를 호출자가 처리한다.
export function NumberInput({
  className,
  inputMode = "decimal",
  ...props
}: Omit<ComponentProps<typeof Input>, "type"> & { inputMode?: "decimal" | "numeric" }) {
  return <Input {...props} type="text" inputMode={inputMode} className={cn("tabular-nums", className)} />;
}
