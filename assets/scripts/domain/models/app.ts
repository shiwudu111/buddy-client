export type SceneName = "Login" | "Main";

export type DashboardTab = "overview" | "homework";

export type HomeworkSubject = "chinese" | "math" | "english";

export const HOMEWORK_SUBJECTS: HomeworkSubject[] = [
  "chinese",
  "math",
  "english",
];

export const HOMEWORK_SUBJECT_LABELS: Record<HomeworkSubject, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
};
