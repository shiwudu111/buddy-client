import type { HomeworkHistoryPayload, HomeworkItem, PetStatus } from "../types/api";
import { HOMEWORK_SUBJECT_LABELS, type HomeworkSubject } from "../domain/models/app";

export function formatPetSummary(pet: PetStatus | null): string[] {
  if (!pet) {
    return ["暂无宠物数据"];
  }

  const statusText =
    typeof pet.status === "string"
      ? pet.status
      : pet.status === false
      ? "dead"
      : "alive";

  return [
    `宠物名：${pet.name}`,
    `等级：Lv.${pet.level}`,
    `饱食度：${pet.hunger}%`,
    `心情值：${pet.mood}%`,
    `成长值：${pet.experience}`,
    `状态：${statusText}`,
  ];
}

export function formatHomeworkHistory(history: HomeworkHistoryPayload | null): string {
  if (!history || history.list.length === 0) {
    return "暂无作业记录";
  }

  return history.list
    .slice(0, 5)
    .map((item, index) => formatHomeworkHistoryItem(item, index + 1))
    .join("\n");
}

export function formatHomeworkHistoryItem(
  item: HomeworkItem,
  index?: number
): string {
  const prefix = index ? `${index}. ` : "";
  const scoreText =
    item.score === null || item.score === undefined ? "待评分" : `${item.score}分`;
  const feedback = item.feedback ? ` / ${item.feedback}` : "";
  return `${prefix}${mapSubjectLabel(item.subject)} - ${scoreText}${feedback}`;
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
