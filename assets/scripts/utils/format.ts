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
    `饥饿度：${pet.hunger}%`,
    `心情值：${pet.mood}%`,
    `经验值：${pet.experience}`,
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
