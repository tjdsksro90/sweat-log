export type CrewFormState = { error: string | null };

// 크루 만들기·가입·나가기 함수의 모양. 실제 앱은 Server Action을 넘긴다.
export type CrewFormAction = (state: CrewFormState, formData: FormData) => Promise<CrewFormState>;

export const INITIAL_CREW_FORM_STATE: CrewFormState = { error: null };

export const normalizeInviteCode = (code: string) => code.trim().toUpperCase();

export const validateCrewName = (name: unknown) => {
  if (typeof name !== "string" || Array.from(name.trim()).length < 1 || Array.from(name.trim()).length > 30) {
    return "크루 이름은 1~30자로 적어 주세요.";
  }
  return null;
};

export const validateInviteCode = (code: unknown) => {
  if (typeof code !== "string" || !/^[0-9A-F]{8}$/.test(normalizeInviteCode(code))) {
    return "초대 코드를 다시 확인해 주세요.";
  }
  return null;
};

export const getCrewErrorMessage = (message: string) => {
  if (message.includes("invalid_invite_code")) return "초대 코드를 다시 확인해 주세요.";
  return "크루 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
};
