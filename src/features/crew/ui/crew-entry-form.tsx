"use client";

import { type FormEvent, startTransition, useActionState, useId, useState } from "react";

import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

import { type CrewFormState, INITIAL_CREW_FORM_STATE } from "../model/crew-form";

type CrewEntryFormProps = {
  mode: "create" | "join";
  action: (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;
};

export function CrewEntryForm({ mode, action }: CrewEntryFormProps) {
  const [value, setValue] = useState("");
  const [state, submit, pending] = useActionState(async (previous: CrewFormState, formData: FormData) => {
    const result = await action(previous, formData);
    // 이동하지 않고 성공한 경우에는 예전처럼 입력을 비운다.
    if (!result.error) setValue("");
    return result;
  }, INITIAL_CREW_FORM_STATE);
  const id = useId();
  const creating = mode === "create";

  /**
   * form action은 실패해도 입력을 비우므로, 직접 제출해 실패 시 입력값을 남긴다.
   * action도 함께 걸어 두어 hydration 전에 눌러도 Server Action으로 제출되게 한다.
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => submit(formData));
  };

  return (
    <form action={submit} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field data-invalid={Boolean(state.error)}>
        <FieldLabel htmlFor={id}>{creating ? "크루 이름" : "초대 코드"}</FieldLabel>
        <Input
          id={id}
          name={creating ? "name" : "inviteCode"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
