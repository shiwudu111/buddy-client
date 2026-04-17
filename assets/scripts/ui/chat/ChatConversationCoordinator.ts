// 文件整体作用：
// 这是学生端“宠物对话”小流程的流程记忆器。
// 它不画界面，只负责记住当前输入框里写了什么、以及给页面一句更好懂的提示。
//
// 一句话版本：
// 这段代码的核心意思就是：帮宠物对话页记住输入草稿，并告诉页面现在该怎么提示用户。
//
// 美术需要关注的重点：
// 1. 这里不生成任何节点，只保存输入框里的草稿内容。
// 2. 切换主界面页签时，对话草稿可以保留，不会因为重绘丢掉。

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

    return `${petName}会记住本次会话的最近 3 轮内容。`;
  }
}
