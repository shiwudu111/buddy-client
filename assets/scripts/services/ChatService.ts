import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  ChatConversationItem,
  ChatHistoryPayload,
  ChatReplyPayload,
} from "../types/api";

export type ChatSendOutcome = {
  success: boolean;
  usedFallback: boolean;
  message: string;
  reply: string | null;
  moodFactor: number;
  moodImpact: string;
};

type SendChatInput = {
  petId: string;
  message: string;
  petMood?: number | null;
  canCommit?: () => boolean;
};

const MAX_CONTEXT_ROUNDS = 3;
const MESSAGES_PER_ROUND = 2;
const MAX_CONTEXT_MESSAGES = MAX_CONTEXT_ROUNDS * MESSAGES_PER_ROUND;

class ChatService {
  async refreshHistory(
    petId: string,
    limit = 20,
    canCommit?: () => boolean
  ): Promise<ApiResponse<ChatHistoryPayload>> {
    const result = await apiClient.getChatHistory(petId, limit);
    if (result.success && result.data && (!canCommit || canCommit())) {
      appState.setChatHistory(normalizeHistory(result.data.conversations));
    }
    return result;
  }

  async sendMessage(input: SendChatInput): Promise<ChatSendOutcome> {
    const message = input.message.trim();
    if (!message) {
      return {
        success: false,
        usedFallback: false,
        message: "请先输入想对宠物说的话",
        reply: null,
        moodFactor: 1,
        moodImpact: "stable",
      };
    }

    const userEntry: ChatConversationItem = {
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    const result = await apiClient.sendChat({
      pet_id: input.petId,
      message,
    });

    if (input.canCommit && !input.canCommit()) {
      return {
        success: false,
        usedFallback: false,
        message: "会话已切换，已取消本次回复",
        reply: null,
        moodFactor: 1,
        moodImpact: "stable",
      };
    }

    if (result.success && result.data?.reply) {
      const petEntry: ChatConversationItem = {
        role: "pet",
        content: result.data.reply,
        created_at: new Date().toISOString(),
        source: "backend",
      };
      appState.appendChatHistory([userEntry, petEntry]);
      return {
        success: true,
        usedFallback: false,
        message: "宠物回复完成",
        reply: result.data.reply,
        moodFactor: result.data.mood_factor,
        moodImpact: result.data.mood_impact,
      };
    }

    const fallback = composeFallbackReply(message, input.petMood, appState.getChatHistory());
    if (input.canCommit && !input.canCommit()) {
      return {
        success: false,
        usedFallback: false,
        message: "会话已切换，已取消本次回复",
        reply: null,
        moodFactor: 1,
        moodImpact: "stable",
      };
    }
    const petEntry: ChatConversationItem = {
      role: "pet",
      content: fallback.reply,
      created_at: new Date().toISOString(),
      source: "fallback",
    };
    appState.appendChatHistory([userEntry, petEntry]);

    return {
      success: true,
      usedFallback: true,
      message: result.message ?? "后端暂时不可用，已使用本地预设回复",
      reply: fallback.reply,
      moodFactor: fallback.moodFactor,
      moodImpact: fallback.moodImpact,
    };
  }
}

function normalizeHistory(history: ChatConversationItem[]): ChatConversationItem[] {
  return history.map((item) => ({
    role: item.role === "pet" ? "pet" : "user",
    content: item.content,
    created_at: item.created_at ?? null,
    source: "backend",
  }));
}

function composeFallbackReply(
  message: string,
  petMood: number | null | undefined,
  history: ChatConversationItem[]
): {
  reply: string;
  moodFactor: number;
  moodImpact: string;
} {
  const recentHistory = history.slice(-MAX_CONTEXT_MESSAGES);
  const recentUserMessages = recentHistory
    .filter((item) => item.role === "user")
    .map((item) => item.content);
  const contextMessage = [message, ...recentUserMessages].join(" ");
  const recentPetReply =
    [...recentHistory].reverse().find((item) => item.role === "pet")?.content ?? "";
  const moodFactor = resolveMoodFactor(petMood);
  const moodImpact = resolveMoodImpact(petMood);
  const candidates = resolveReplyCandidates(contextMessage, petMood);
  const reply = pickNonRepeatingReply(candidates, recentPetReply);

  return {
    reply,
    moodFactor,
    moodImpact,
  };
}

function resolveReplyCandidates(message: string, petMood: number | null | undefined): string[] {
  if (containsAny(message, ["作业", "题", "不会", "难", "错"])) {
    return [
      "没关系，我们把题目拆小一点。",
      "先从第一步开始，我陪你一起想。",
      "遇到难题慢慢来，别着急。",
    ];
  }

  if (containsAny(message, ["累", "困", "休息", "困了"])) {
    return [
      "先休息一下也可以，状态好了再继续。",
      "累了就歇一会儿，我帮你记着。",
      "休息一下，等会儿再一起继续吧。",
    ];
  }

  if (containsAny(message, ["谢谢", "开心", "棒", "厉害"])) {
    return [
      "嘿嘿，我也很开心。",
      "你这样说我会更有劲。",
      "今天状态不错，继续保持！",
    ];
  }

  if (containsAny(message, ["难过", "伤心", "生气", "烦"])) {
    return [
      "没关系，我在呢。",
      "慢慢来，先把情绪放一放。",
      "你可以先跟我说说发生了什么。",
    ];
  }

  if (typeof petMood === "number" && petMood < 40) {
    return [
      "我今天会更温柔一点陪你。",
      "先别急，我一直都在。",
      "我们慢慢来，先把心情放平。",
    ];
  }

  if (typeof petMood === "number" && petMood >= 80) {
    return [
      "今天状态不错，要不要再聊一会儿？",
      "我也觉得今天很棒。",
      "一起把这份好心情留住吧。",
    ];
  }

  return [
    "我在听，你慢慢说。",
    "嗯嗯，我陪着你。",
    "继续跟我聊聊吧。",
  ];
}

function pickNonRepeatingReply(candidates: string[], recentReply: string): string {
  if (!candidates.length) {
    return "我在听，你慢慢说。";
  }

  const normalizedRecent = normalizeText(recentReply);
  const firstDifferent = candidates.find((candidate) => normalizeText(candidate) !== normalizedRecent);
  return firstDifferent ?? candidates[0];
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

function resolveMoodFactor(mood: number | null | undefined): number {
  if (typeof mood !== "number") {
    return 0.95;
  }

  if (mood >= 80) {
    return 1.0;
  }
  if (mood >= 60) {
    return 0.95;
  }
  if (mood >= 40) {
    return 0.85;
  }
  return 0.75;
}

function resolveMoodImpact(mood: number | null | undefined): string {
  if (typeof mood !== "number") {
    return "stable";
  }

  if (mood >= 80) {
    return "boosted";
  }
  if (mood >= 60) {
    return "stable";
  }
  if (mood >= 40) {
    return "gentle";
  }
  return "soothing";
}

export const chatService = new ChatService();
