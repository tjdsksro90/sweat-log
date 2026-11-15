import type { ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";

export type FieldControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/**
 * 라벨·설명·오류를 입력과 이어 주는 틀. design.md의 Field 조합 규칙(htmlFor, aria-describedby, aria-invalid)을 한곳에서 지킨다.
 * children은 입력에 그대로 펼칠 props를 받는다.
 */
export function FormField({
  id,
  label,
  description,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const describedBy = [description ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({ "aria-describedby": describedBy || undefined, "aria-invalid": Boolean(error), id })}
      {description && <FieldDescription id={`${id}-help`}>{description}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
