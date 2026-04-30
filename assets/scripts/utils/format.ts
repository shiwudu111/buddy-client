import type {
  ChildPetPayload,
  HomeworkHistoryPayload,
  HomeworkItem,
  PetStatus,
  WeeklyReportPayload,
} from "../types/api";
import { HOMEWORK_SUBJECT_LABELS, type HomeworkSubject } from "../domain/models/app";

export function formatPetSummary(pet: PetStatus | null): string[] {
  if (!pet) {
    return ["暂无宠物数据"];
  }

  const statusText = pet.status === false ? "异常" : "正常";

  return [
    `宠物名：${pet.name}`,
    `等级：Lv.${pet.level}`,
    `成长阶段：${formatPetStageLabel(pet.stage)}`,
    `饥饿度：${pet.hunger}%`,
    `心情值：${pet.mood}%`,
    `经验值：${pet.experience}`,
    ...(typeof pet.energy === "number" ? [`体力值：${pet.energy}%`] : []),
    ...(typeof pet.health === "number" ? [`健康度：${pet.health}%`] : []),
    `进化提示：${formatPetEvolutionHint(pet.next_evolve_days)}`,
    `状态：${statusText}`,
  ];
}

export function formatHomeworkHistory(
  history: HomeworkHistoryPayload | null,
  options: { limit?: number } = {}
): string {
  if (!history || history.list.length === 0) {
    return "暂无作业记录";
  }

  const list = typeof options.limit === "number" ? history.list.slice(0, options.limit) : history.list;

  return list
    .map((item, index) => formatHomeworkHistoryItem(item, index + 1))
    .join("\n\n");
}

export function formatHomeworkHistoryItem(
  item: HomeworkItem,
  index?: number
): string {
  const prefix = index ? `${index}. ` : "";
  const scoreText =
    item.score === null || item.score === undefined ? "待评分" : `${item.score}分`;
  const feedback = item.feedback?.trim() ? item.feedback.trim() : "暂无老师反馈";
  const content = item.content?.trim() ? item.content.trim() : "未填写作业内容";
  const submittedAt = formatHistoryTimestamp(item.createdAt ?? item.submittedAt);

  return [
    `${prefix}${mapSubjectLabel(item.subject)} | ${scoreText}`,
    `内容：${content}`,
    `反馈：${feedback}`,
    `时间：${submittedAt}`,
  ].join("\n");
}

export function mapSubjectLabel(subject: string): string {
  return HOMEWORK_SUBJECT_LABELS[subject as HomeworkSubject] ?? subject;
}

export function normalizeMultilineText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function formatParentOverview(data: ChildPetPayload): string {
  const homework = data.today_homework ?? {};
  return [
    `孩子：${data.childNickname ?? data.childId ?? "未命名"}`,
    `宠物：${data.pet.name}  Lv.${data.pet.level}`,
    `成长阶段：${formatPetStageLabel(data.pet.stage)}${formatParentEvolutionSuffix(data.pet.next_evolve_days)}`,
    `状态：${data.pet.status ? "正常" : "异常"} | 饥饿 ${data.pet.hunger}% | 心情 ${data.pet.mood}%`,
    `经验值：${data.pet.experience ?? "-"}`,
    ...(typeof data.pet.energy === "number" ? [`体力值：${data.pet.energy}%`] : []),
    ...(typeof data.pet.health === "number" ? [`健康度：${data.pet.health}%`] : []),
    "今日作业状态：",
    `语文：${formatTodayHomeworkScore(homework.chinese)}`,
    `数学：${formatTodayHomeworkScore(homework.math)}`,
    `英语：${formatTodayHomeworkScore(homework.english)}`,
  ].join("\n");
}

export function formatWeeklyReportSummary(data: WeeklyReportPayload): string {
  const petSummary = data.pet_status_summary;
  const subjectBreakdown = data.subject_breakdown
    ? Object.entries(data.subject_breakdown)
        .map(([subject, item]) => `${mapSubjectLabel(subject)} ${item.count}次 / 均分${item.avg}`)
        .join("\n")
    : "暂无学科统计";

  const petStatusText = petSummary
    ? [
        `宠物：${petSummary.alive === false ? "异常" : "正常"} | 饥饿 ${petSummary.hunger ?? "-"} | 心情 ${petSummary.mood ?? "-"}`,
        `成长阶段：${formatPetStageLabel(petSummary.stage)}${formatParentEvolutionSuffix(petSummary.next_evolve_days)}`,
      ].join("\n")
    : "宠物：暂无周报数据";

  return [
    `周范围：${data.week}`,
    `孩子：${data.childNickname ?? data.childId ?? "未命名"} | 总作业 ${data.total_homework} | 平均分 ${data.average_score}`,
    "学科统计：",
    subjectBreakdown,
    petStatusText,
  ].join("\n");
}

function formatPetStageLabel(stage?: string | null): string {
  const normalized = stage?.trim();
  if (!normalized) {
    return "成长期";
  }

  const lowered = normalized.toLowerCase();
  if (lowered === "stage_1" || lowered === "stage1" || lowered === "1") {
    return "第一阶段";
  }

  if (lowered === "stage_2" || lowered === "stage2" || lowered === "2") {
    return "第二阶段";
  }

  return normalized;
}

function formatPetEvolutionHint(nextEvolveDays?: number | null): string {
  if (typeof nextEvolveDays !== "number") {
    return "等级 + 资源达标后开放进化";
  }

  if (nextEvolveDays <= 0) {
    return "满足条件后可进化";
  }

  return `距离下一次进化：${nextEvolveDays} 天`;
}

function formatParentEvolutionSuffix(nextEvolveDays?: number | null): string {
  if (typeof nextEvolveDays !== "number") {
    return "";
  }

  return nextEvolveDays <= 0 ? " | 进化待命" : ` | 进化倒计时 ${nextEvolveDays} 天`;
}

function formatHistoryTimestamp(raw?: string | null): string {
  if (!raw) {
    return "未知";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatTodayHomeworkScore(item: { score: number | null } | null | undefined): string {
  if (!item) {
    return "未提交";
  }

  return item.score === null || item.score === undefined ? "已提交 / 待评分" : `已提交 / ${item.score}分`;
}
