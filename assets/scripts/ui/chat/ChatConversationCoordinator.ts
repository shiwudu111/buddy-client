export class ChatConversationCoordinator {
  private draft = "";

  getDraft(): string {
    return this.draft;
  }

  setDraft(value: string): void {
    this.draft = value;
  }

  clearDraft(): void {
    this.draft = "";
  }

  clearDraftIfMatch(value: string): boolean {
    if (this.draft !== value) {
      return false;
    }

    this.draft = "";
    return true;
  }

  buildHint(
    petName: string | null | undefined,
    messageCount: number,
    petMood: number | null | undefined,
    sending: boolean
  ): string {
    if (sending) {
      return "宠物正在回复，请稍等一下。";
    }

    if (!petName) {
      return "先创建宠物，再来聊天。";
    }

    if (messageCount === 0) {
      return `${petName}在等你先说第一句话。`;
    }

    if (typeof petMood === "number" && petMood < 40) {
      return `${petName}今天情绪低一点，记得多鼓励它。`;
    }

    if (typeof petMood === "number" && petMood >= 80) {
      return `${petName}今天状态不错，可以多聊两句。`;
    }

    return `${petName}会记住本次会话最近 3 轮内容。`;
  }
}
