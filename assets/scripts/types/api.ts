export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export type UserRole = "CHILD" | "PARENT";

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  role: UserRole;
  parentId?: string | null;
}

export interface AuthPayload {
  user: AuthUser;
  token: string;
}

export interface PetStatus {
  pet_id: string;
  name: string;
  level: number;
  hunger: number;
  mood: number;
  experience: number;
  stage?: string;
  status?: boolean;
  next_evolve_days?: number;
}

export interface PetResourcesPayload {
  hunger: number;
  mood: number;
  experience: number;
  isAlive: boolean;
  events: string[];
}

export interface HomeworkItem {
  id: string;
  subject: string;
  content: string;
  imageUrl?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  createdAt?: string;
}

export interface HomeworkHistoryPayload {
  list: HomeworkItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ChildPetPayload {
  pet: {
    name: string;
    level: number;
    status: boolean;
    hunger: number;
    mood: number;
  };
  today_homework: Record<string, { score: number | null } | null>;
}
