export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  statusCode?: number;
}

export type UserRole = "CHILD" | "PARENT";
export type HomeworkSubject = "chinese" | "math" | "english" | "general";

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
  cleanliness?: number;
  health?: number;
  stage?: string;
  status?: boolean;
  display_status?: string;
  lastDecayAt?: string;
  next_evolve_days?: number;
}

export type PetFoodType =
  | "xp"
  | "energy"
  | "expression_fruit"
  | "logic_cookie"
  | "star_milk"
  | "meal_box"
  | (string & {});
export type PetFoodQuality = "normal" | "premium" | "advanced" | (string & {});

export interface PetFoodInventoryItem {
  food_type: PetFoodType;
  food_quality: PetFoodQuality;
  count: number;
}

export interface InventoryFoodItem extends PetFoodInventoryItem {
  itemType?: "food";
}

export interface DailyBasicFoodPayload {
  date: string;
  granted: boolean;
  item?: InventoryFoodItem;
}

export type MainEventKind =
  | "system"
  | "chat"
  | "feed"
  | "homework"
  | "reward"
  | "sleep"
  | "play"
  | "care"
  | "music"
  | "mood"
  | "offline_decay"
  | "inventory_food_use"
  | "level_up"
  | "stage_up";

export interface MainEventEntry {
  id?: string;
  kind: MainEventKind | string;
  title: string;
  detail: string;
  timestamp: string;
}

export interface DiaryEntry {
  id?: string;
  kind: string;
  title: string;
  detail: string;
  timestamp: string;
  timeText: string;
}

export interface DiaryDay {
  date: string;
  dateText: string;
  summary: string;
  entries: DiaryEntry[];
}

export interface DiaryPayload {
  days?: DiaryDay[];
  logs?: MainEventEntry[];
  events?: MainEventEntry[];
}

export interface PetDashboardPayload {
  pet: PetStatus;
  foods?: PetFoodInventoryItem[];
  inventory?: InventoryFoodItem[];
  recent_events?: MainEventEntry[];
  dailyBasicFood?: DailyBasicFoodPayload;
  offlineDecay?: OfflineDecaySummary;
  offline_decay?: OfflineDecaySummaryWire;
}

export interface PetEventsPayload {
  events: MainEventEntry[];
}

export interface OfflineDecaySummary {
  applied?: boolean;
  elapsedHours?: number;
  message?: string;
}

export interface OfflineDecaySummaryWire {
  applied?: boolean;
  elapsedHours?: number;
  elapsed_hours?: number;
  message?: string;
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

export interface UseInventoryItemPayload {
  itemType: "food";
  food_type: PetFoodType;
  food_quality: PetFoodQuality;
}

export interface PetFeedResultPayload {
  pet: PetStatus;
  foods: PetFoodInventoryItem[];
  offlineDecay?: OfflineDecaySummary;
  offline_decay?: OfflineDecaySummaryWire;
}

export interface UseInventoryItemResultPayload {
  pet: PetStatus;
  inventory?: InventoryFoodItem[];
  foods?: PetFoodInventoryItem[];
  logs?: MainEventEntry[];
  offlineDecay?: OfflineDecaySummary;
  offline_decay?: OfflineDecaySummaryWire;
}

export interface PetActionResultPayload {
  pet: PetStatus;
  offlineDecay?: OfflineDecaySummary;
  offline_decay?: OfflineDecaySummaryWire;
}

export type HomeworkQualityLevel = "invalid" | "basic" | "good";
export type HomeworkRewardStatus = "none" | "granted" | "capped" | "rejected";
export type HomeworkErrorCode =
  | "INVALID_SUBJECT"
  | "EMPTY_CONTENT"
  | "UPLOAD_REQUIRED"
  | "DAILY_REWARD_LIMIT_REACHED"
  | "DUPLICATE_SUBMISSION"
  | "UPLOAD_FAILED"
  | "PET_NOT_FOUND"
  | "INVENTORY_NOT_FOUND"
  | "INTERNAL_ERROR"
  | (string & {});

export interface HomeworkUploadResult {
  url?: string;
  imageUrl?: string;
}

export interface HomeworkRewardItem {
  itemType: "food";
  food_type: PetFoodType;
  food_quality: PetFoodQuality;
  count: number;
}

export interface HomeworkReward {
  items?: HomeworkRewardItem[];
  message?: string;
}

export interface HomeworkSubmissionResult {
  id?: string;
  subject?: HomeworkSubject | string;
  qualityLevel?: HomeworkQualityLevel;
  rewardStatus?: HomeworkRewardStatus;
}

export interface HomeworkSubmitResultPayload {
  expReward?: number;
  score?: number;
  food_reward?: PetFoodInventoryItem | null;
  pet?: Partial<PetStatus> | null;
  foods?: PetFoodInventoryItem[];
  submission?: HomeworkSubmissionResult;
  reward?: HomeworkReward;
  inventory?: InventoryFoodItem[];
  logs?: MainEventEntry[];
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
  imageUrls?: string[];
  note?: string | null;
  score?: number | null;
  feedback?: string | null;
  qualityLevel?: HomeworkQualityLevel;
  rewardStatus?: HomeworkRewardStatus;
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
  content?: string;
  imageUrl?: string;
  imageUrls?: string[];
  note?: string;
  petId?: string;
}

export interface HomeworkTodayStatus {
  dailyReward?: {
    limit: number;
    used: number;
    remaining: number;
  };
  subjects?: Partial<Record<HomeworkSubject, {
    submitted: boolean;
    score?: number | null;
    rewardAvailable?: boolean;
    reason?: string;
  }>>;
  chinese: { submitted: boolean; score?: number | null };
  math: { submitted: boolean; score?: number | null };
  english: { submitted: boolean; score?: number | null };
  general?: {
    submitted: boolean;
    score?: number | null;
    rewardAvailable?: boolean;
    reason?: string;
  };
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
