"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { SaveUserExerciseResult, UserExercise, UserExerciseInput } from "../model/user-exercise";

type UserExercisesContextValue = {
  exercises: UserExercise[];
  // 입력칸이 처음 그려질 때 부른다. 그 전에는 읽지 않아 기록 폼이 없는 화면에서는 요청이 없다.
  request: () => void;
  save: (input: UserExerciseInput) => Promise<SaveUserExerciseResult>;
  // 관리 화면에서 고치거나 지운 뒤 추천 목록을 다시 읽게 한다.
  refresh: () => Promise<void>;
};

const UserExercisesContext = createContext<UserExercisesContextValue | null>(null);

/**
 * 종목 입력칸(ExerciseNameInput)에 내 종목을 대 준다. 실제 앱은 (app) layout이 Server Action을,
 * 체험 데모는 체험 저장소 함수를 넘긴다. 기록 폼 파일은 이 provider를 몰라도 된다.
 * provider가 없으면(컴포넌트 테스트 등) 입력칸은 사전 종목만 추천하고 "새 종목으로 추가"를 숨긴다.
 */
export function UserExercisesProvider({
  list,
  save,
  queryKey,
  children,
}: {
  list: () => Promise<UserExercise[]>;
  save: (input: UserExerciseInput) => Promise<SaveUserExerciseResult>;
  /**
   * 캐시 키. 실제 앱은 ["user-exercises", 사용자 id]처럼 사용자를 꼭 넣는다.
   * QueryClient는 루트에 하나이고 로그아웃이 캐시를 비우지 않아서, 사용자를 빼면 같은 탭에서
   * 다음에 로그인한 사람의 추천·중복 판단에 앞사람 종목이 섞인다.
   */
  queryKey: readonly unknown[];
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState(false);
  // queryKey는 보통 인라인 배열이라 렌더마다 새로 생긴다. 내용으로 고정한다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 배열 내용이 같으면 같은 키다.
  const key = useMemo(() => queryKey, [JSON.stringify(queryKey)]);
  // 추천은 곁들이는 기능이라 읽기가 실패해도 사전 종목은 그대로 추천한다. 다음 입력칸에서 다시 시도한다.
  const { data } = useQuery({ enabled: requested, queryFn: list, queryKey: key, retry: 1 });

  const request = useCallback(() => setRequested(true), []);
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);
  const value = useMemo<UserExercisesContextValue>(
    () => ({
      exercises: data ?? [],
      refresh,
      request,
      save: async (input) => {
        const result = await save(input);
        if (result.ok) {
          queryClient.setQueryData<UserExercise[]>(key, (current = []) => [
            ...current.filter((exercise) => exercise.id !== result.exercise.id),
            result.exercise,
          ]);
          setRequested(true);
        }
        return result;
      },
    }),
    [data, key, queryClient, refresh, request, save],
  );

  return <UserExercisesContext.Provider value={value}>{children}</UserExercisesContext.Provider>;
}

// provider가 없으면 null. 입력칸은 이때 사전 종목만 쓴다.
export const useUserExercises = () => {
  const context = useContext(UserExercisesContext);
  const request = context?.request;
  useEffect(() => request?.(), [request]);
  return context;
};

// 관리 화면처럼 목록을 직접 읽지 않고 바꾸기만 하는 곳에서 쓴다. 추천 캐시만 다시 읽게 한다.
export const useRefreshUserExercises = () => {
  const context = useContext(UserExercisesContext);
  return context?.refresh ?? noopRefresh;
};

const noopRefresh = async () => {};
