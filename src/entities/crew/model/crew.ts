export type CrewSummary = {
  id: string;
  name: string;
  memberCount: number;
};

export type CrewMember = {
  userId: string;
  nickname: string | null;
  isOwner: boolean;
};

export type CrewDetail = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: CrewMember[];
};
