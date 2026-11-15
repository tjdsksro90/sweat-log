"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/shared/api/supabase/server";

import { type AuthFormState, getAuthErrorMessage, validateLogin, validateSignup } from "../model/auth-form";

const readField = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export const login = async (_state: AuthFormState, formData: FormData): Promise<AuthFormState> => {
  const email = readField(formData, "email").trim();
  const password = readField(formData, "password");
  const validationError = validateLogin(email, password);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: getAuthErrorMessage(error.message) };

  redirect("/");
};

export const signup = async (_state: AuthFormState, formData: FormData): Promise<AuthFormState> => {
  const email = readField(formData, "email").trim();
  const password = readField(formData, "password");
  const nickname = readField(formData, "nickname").trim();
  const validationError = validateSignup(email, password, nickname);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  // nickname은 DB 트리거(private.handle_new_user)가 profiles에 옮겨 담는다.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } });
  if (error) return { error: getAuthErrorMessage(error.message) };

  // 메일 확인을 켠 프로젝트에서는 세션 없이 돌아온다.
  if (!data.session) return { error: "메일함에서 가입 확인 링크를 누른 뒤 로그인해 주세요." };

  redirect("/");
};

export const logout = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
};
