export type AuthFormState = {
  error: string | null;
};

export const INITIAL_AUTH_FORM_STATE: AuthFormState = { error: null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLogin = (email: string, password: string) => {
  if (!EMAIL_PATTERN.test(email)) return "이메일 형식을 확인해 주세요.";
  if (password.length < 6) return "비밀번호는 6자 이상이에요.";
  return null;
};

export const validateSignup = (email: string, password: string, nickname: string) => {
  const loginError = validateLogin(email, password);
  if (loginError) return loginError;

  const trimmed = nickname.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return "닉네임은 1~20자로 적어 주세요.";
  return null;
};

// Supabase Auth 오류 문구를 사용자에게 보여줄 한국어로 바꾼다.
export const getAuthErrorMessage = (message: string) => {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 맞지 않아요.";
  if (message.includes("User already registered")) return "이미 가입한 이메일이에요.";
  if (message.includes("Email not confirmed")) return "메일함에서 가입 확인 링크를 눌러 주세요.";
  return "잠시 후 다시 시도해 주세요.";
};
