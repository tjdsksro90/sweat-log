export type WorkoutComment = {
  id: string;
  userId: string;
  nickname: string | null;
  body: string;
  createdAt: string;
  isMine: boolean;
};
