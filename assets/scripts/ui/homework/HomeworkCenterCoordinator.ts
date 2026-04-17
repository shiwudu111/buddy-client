import { HOMEWORK_SUBJECT_LABELS, type HomeworkSubject } from "../../domain/models/app";
import { homeworkService } from "../../services/HomeworkService";

// 文件整体作用：
// 这是“作业中心”的流程小管家。
// 它不画界面，只负责记住当前选中的科目、每个科目的草稿、以及提交后的提示信息。
//
// 一句话版本：
// 这段代码的核心意思就是：帮作业页面记住“现在选哪一科、每一科写了什么、提交后该提示什么”。
//
// 美术需要关注的重点：
// 1. 切换语文 / 数学 / 英语时，草稿不会互相覆盖，就是这里在管。
// 2. 提交成功后只会清掉当前科目的输入，不会把其它科目一起清空。
// 3. 这里决定“提示文案显示什么”，但不决定按钮样式和排版。
export type HomeworkCenterHint = {
  // message：作业页底部提示文案。
  // isWarning：是否要用“提醒色”显示。
  message: string;
  isWarning: boolean;
};

export type HomeworkSubmitFeedback = {
  // success：提交是否成功。
  // message：提交完成后给用户看的结果文案。
  success: boolean;
  message: string;
};

const EMPTY_DRAFTS: Record<HomeworkSubject, string> = {
  chinese: "",
  math: "",
  english: "",
};

export class HomeworkCenterCoordinator {
  // 作业中心把“当前选中的科目”和“每个科目的草稿”分开保存，
  // 这样切换科目时不会把别的科目内容串进来。
  private selectedSubject: HomeworkSubject = "chinese";
  // drafts：三个科目的草稿仓库。
  private drafts: Record<HomeworkSubject, string> = { ...EMPTY_DRAFTS };

  getSelectedSubject(): HomeworkSubject {
    return this.selectedSubject;
  }

  setSelectedSubject(subject: HomeworkSubject): void {
    this.selectedSubject = subject;
  }

  getCurrentDraft(): string {
    return this.drafts[this.selectedSubject];
  }

  syncCurrentDraft(value: string): void {
    // 只更新当前科目的草稿，切换页签前后都能保持用户刚输入的内容。
    this.drafts[this.selectedSubject] = value;
  }

  clearDraftForSubject(subject: HomeworkSubject): void {
    // 提交成功后，只清掉这一科的草稿，其他科目不受影响。
    this.drafts[subject] = "";
  }

  clearDraftForSubjectIfMatch(subject: HomeworkSubject, content: string): boolean {
    // 只有当前草稿和“刚刚提交出去的内容”完全一致时，才允许清空。
    // 这样如果用户在网络返回前又重新输入了新内容，就不会被晚到的成功回调误删。
    if (this.drafts[subject] !== content) {
      return false;
    }

    this.drafts[subject] = "";
    return true;
  }

  isCurrentSubjectSubmittedToday(): boolean {
    // 检查当前科目今天是否已经交过作业。
    return homeworkService.isSubmittedToday(this.selectedSubject);
  }

  getCurrentHint(): HomeworkCenterHint {
    // 提示文案要尽量直接：告诉用户当前科目是“已提交”还是“可继续编辑”。
    const subjectLabel = HOMEWORK_SUBJECT_LABELS[this.selectedSubject];
    if (this.isCurrentSubjectSubmittedToday()) {
      return {
        message: `\u4eca\u65e5${subjectLabel}\u5df2\u63d0\u4ea4\uff0c\u518d\u6b21\u63d0\u4ea4\u53ef\u80fd\u4f1a\u88ab\u540e\u7aef\u62e6\u622a`,
        isWarning: true,
      };
    }

    return {
      message: `\u5f53\u524d\u9009\u62e9\uff1a${subjectLabel}`,
      isWarning: false,
    };
  }

  async submitCurrent(
    subject: HomeworkSubject,
    rawContent: string
  ): Promise<HomeworkSubmitFeedback> {
    // 提交前先 trim 一下，避免只输入空格也被当成有效内容。
    const content = rawContent.trim();
    this.drafts[subject] = content;

    if (!content) {
      return {
        success: false,
        message: "\u8bf7\u5148\u8f93\u5165\u4f5c\u4e1a\u5185\u5bb9",
      };
    }

    const result = await homeworkService.submit({
      subject,
      content,
    });

    return {
      success: result.success,
      message: result.success
        ? "\u4f5c\u4e1a\u63d0\u4ea4\u6210\u529f\uff0c\u5df2\u5c1d\u8bd5\u5237\u65b0\u8bb0\u5f55"
        : result.message ?? "\u4f5c\u4e1a\u63d0\u4ea4\u5931\u8d25",
    };
  }
}
