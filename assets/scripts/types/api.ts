export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export type UserRole = "CHILD" | "PARENT";
export type HomeworkSubject = "chinese" | "math" | "english";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  childId?: string | null;
  petId?: string | null;
  childNickname?: string | null;
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
  energy?: number;
  health?: number;
  stage?: string;
  status?: boolean;
  next_evolve_days?: number;
}

export type PetFoodType = "xp" | "energy";
export type PetFoodQuality = "normal" | "premium" | "advanced";

export interface PetFoodInventoryItem {
  food_type: PetFoodType;
  food_quality: PetFoodQuality;
  count: number;
}

export type MainEventKind =
  | "system"
  | "chat"
  | "feed"
  | "homework"
  | "reward"
  | "level_up"
  | "stage_up";

export interface MainEventEntry {
  kind: MainEventKind;
  title: string;
  detail: string;
  timestamp: string;
}

export interface PetDashboardPayload {
  pet: PetStatus;
  foods: PetFoodInventoryItem[];
  recent_events?: MainEventEntry[];
}

export interface PetResourcesPayload {
  hunger: number;
  mood: number;
  experience: number;
  status: boolean;
  events: string[];
}

export interface PetEvolutionPayload {
  current_stage: number;
  current_visual: string;
  next_stage: number;
  next_visual: string;
  requirements: {
    level: number;
    growth: number;
  };
  days_until_evolution: number;
}

export interface PetFeedPayload {
  food_type: PetFoodType;
  food_quality: PetFoodQuality;
  count?: number;
}

export interface PetFeedResultPayload {
  pet: PetStatus;
  foods: PetFoodInventoryItem[];
}

export interface HomeworkSubmitResultPayload {
  expReward?: number;
  score?: number;
  food_reward?: PetFoodInventoryItem | null;
  pet?: Partial<PetStatus> | null;
  foods?: PetFoodInventoryItem[];
}

export type PetGrowthFeedbackSource = "homework_submit" | "pet_feed";

export interface PetGrowthFeedback {
  source: PetGrowthFeedbackSource;
  status: "success";
  message: string;
  timestamp: string;
}

export type ChatMessageRole = "user" | "pet";
export type ChatMessageSource = "backend" | "fallback";

export interface ChatConversationItem {
  role: ChatMessageRole;
  content: string;
  created_at?: string | null;
  source?: ChatMessageSource;
}

export interface ChatHistoryPayload {
  conversations: ChatConversationItem[];
  mood_factor?: number;
}

export interface ChatReplyPayload {
  reply: string;
  mood_factor: number;
  mood_impact: string;
}

export interface ChatSendPayload {
  pet_id: string;
  message: string;
}

export interface HomeworkItem {
  id: string;
  subject: HomeworkSubject;
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

export interface HomeworkSubmitPayload {
  subject: HomeworkSubject;
  content: string;
  imageUrl?: string;
}

export interface HomeworkTodayStatus {
  chinese: { submitted: boolean; score?: number | null };
  math: { submitted: boolean; score?: number | null };
  english: { submitted: boolean; score?: number | null };
}

export interface ChildPetPayload {
  childId?: string;
  childNickname?: string;
  pet: {
    name: string;
    level: number;
    status: boolean;
    hunger: number;
    mood: number;
    experience?: number;
    energy?: number;
    health?: number;
    stage?: string;
    next_evolve_days?: number;
  };
  today_homework: Record<string, { score: number | null } | null>;
}

export interface ParentBindPayload {
  childId?: string;
  childNickname?: string;
}

export interface WeeklyReportPayload {
  week: string;
  childId?: string;
  childNickname?: string;
  total_homework: number;
  average_score: number;
  subject_breakdown?: Record<string, { count: number; avg: number }>;
  pet_status_summary?: {
    alive?: boolean;
    hunger?: number;
    mood?: number;
    stage?: string;
    next_evolve_days?: number;
  };
}
