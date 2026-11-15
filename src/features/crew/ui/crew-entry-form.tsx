"use client";

import { useActionState, useId } from "react";

import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

import { type CrewFormState, INITIAL_CREW_FORM_STATE } from "../model/crew-form";

type CrewEntryFormProps = {
  mode: "create" | "join";
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
};

export function CrewEntryForm({ mode, action }: CrewEntryFormProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_CREW_FORM_STATE);
  const id = useId();
  const creating = mode === "create";
  return (
    <form action={submit} className="flex flex-col gap-4">
      <Field data-invalid={Boolean(state.error)}>
        <FieldLabel htmlFor={id}>{creating ? "크루 이름" : "초대 코드"}</FieldLabel>
        <Input
          id={id}
          name={creating ? "name" : "inviteCode"}
          required
          disabled={pending}
          autoComplete="off"
          autoCapitalize={creating ? "off" : "characters"}
          spellCheck={false}
          aria-invalid={Boolean(state.error)}
          aria-describedby={`${id}-help${state.error ? ` ${id}-error` : ""}`}
        />
        <FieldDescription id={`${id}-help`}>
          {creating
            ? "함께 운동할 친구들이 알아볼 수 있는 이름을 1~30자로 적어 주세요."
            : "친구에게 받은 8자리 초대 코드를 입력해 주세요."}
        </FieldDescription>
        {state.error && <FieldError id={`${id}-error`}>{state.error}</FieldError>}
      </Field>
      <Button type="submit" disabled={pending} variant={creating ? "primary" : "secondary"}>
        {pending ? "처리 중…" : creating ? "크루 만들기" : "코드로 가입하기"}
      </Button>
    </form>
  );
}
