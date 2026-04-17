import { Button, Color, EditBox, Node } from "cc";
import {
  HOMEWORK_SUBJECT_LABELS,
  HOMEWORK_SUBJECTS,
  type HomeworkSubject,
} from "../../domain/models/app";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

// 文件整体作用：
// 这是作业中心的实际界面绘制函数。
// 它会动态生成左边的作业输入区、上方科目切换按钮、右边历史记录区。
//
// 一句话版本：
// 这段代码的核心意思就是：把作业中心这块界面现场画出来，包括科目按钮、输入框、提交按钮和历史记录。
//
// 美术需要关注的重点：
// 1. HomeworkCard / HomeworkHistoryCard 都是运行时临时创建的容器。
// 2. 科目按钮名字遵循 `${subject}Button` 规则，调试层级时会看到它们。
// 3. 界面刷新时，这些节点可能会被删掉后重新生成。
export type HomeworkCenterViewState = {
  // selectedSubject：当前高亮、当前正在编辑的科目。
  // draft：当前输入框里应该显示的内容。
  // historySummary：右侧历史区显示的文字。
  // hint / hintIsWarning：底部提示区文案和颜色语义。
  selectedSubject: HomeworkSubject;
  draft: string;
  historySummary: string;
  hint: string;
  hintIsWarning: boolean;
};

export type HomeworkCenterViewActions = {
  // 这些是点击后的回调，真正逻辑由上层控制器处理。
  onSelectSubject: (subject: HomeworkSubject) => void;
  onSubmit: () => void | Promise<void>;
  onBackToOverview: () => void;
};

export type HomeworkCenterViewRefs = {
  // 把输入框回传给控制器，方便控制器读取用户当前输入。
  input: EditBox;
};

const CARD_COLOR = new Color(28, 35, 48, 255);
const ACTIVE_TAB_COLOR = new Color(76, 128, 255, 255);
const INACTIVE_TAB_COLOR = new Color(52, 61, 82, 255);
const PRIMARY_ACTION_COLOR = new Color(49, 180, 113, 255);
const SECONDARY_ACTION_COLOR = new Color(93, 102, 122, 255);
const HISTORY_TEXT_COLOR = new Color(210, 219, 230, 255);
const HINT_TEXT_COLOR = new Color(171, 183, 200, 255);
const WARNING_TEXT_COLOR = new Color(255, 194, 107, 255);

const HOMEWORK_TITLE = "\u63d0\u4ea4\u4f5c\u4e1a";
const INPUT_PLACEHOLDER =
  "\u8f93\u5165\u672c\u6b21\u4f5c\u4e1a\u5185\u5bb9\u6216\u5907\u6ce8\uff0c\u4f8b\u5982\uff1a\u4eca\u5929\u5b8c\u6210\u4e86\u6570\u5b66\u53e3\u7b97 2 \u9875";
const SUBMIT_BUTTON_TEXT = "\u63d0\u4ea4\u4f5c\u4e1a";
const BACK_BUTTON_TEXT = "\u8fd4\u56de\u603b\u89c8";
const HISTORY_TITLE = "\u4f5c\u4e1a\u5386\u53f2";

export function renderHomeworkCenter(
  root: Node,
  state: HomeworkCenterViewState,
  actions: HomeworkCenterViewActions,
  context?: object
): HomeworkCenterViewRefs {
  // 作业中心的布局很简单：左边编辑当前科目，右边看历史记录。
  // 这里不处理业务提交，只负责把 coordinator 给出的状态画出来。
  const workCard = RuntimeUI.createBox(root, {
    name: "HomeworkCard",
    x: -220,
    y: -10,
    width: 540,
    height: 420,
    color: CARD_COLOR,
  });

  const historyCard = RuntimeUI.createBox(root, {
    name: "HomeworkHistoryCard",
    x: 320,
    y: -10,
    width: 450,
    height: 420,
    color: CARD_COLOR,
  });

  RuntimeUI.createLabel(workCard, {
    name: "HomeworkTitle",
    text: HOMEWORK_TITLE,
    x: 0,
    y: 170,
    width: 420,
    height: 36,
    fontSize: 24,
  });

  HOMEWORK_SUBJECTS.forEach((subject, index) => {
    // 三个科目按钮只是“切换当前编辑对象”，不直接发请求。
    const button = RuntimeUI.createButton(workCard, {
      name: `${subject}Button`,
      text: HOMEWORK_SUBJECT_LABELS[subject],
      x: -145 + index * 145,
      y: 115,
      width: 120,
      height: 44,
      color: state.selectedSubject === subject ? ACTIVE_TAB_COLOR : INACTIVE_TAB_COLOR,
      fontSize: 18,
    });

    button.button.node.on(
      Button.EventType.CLICK,
      () => actions.onSelectSubject(subject),
      context
    );
  });

  const input = RuntimeUI.createEditBox(workCard, {
    name: "HomeworkInput",
    placeholder: INPUT_PLACEHOLDER,
    x: 0,
    y: 10,
    width: 460,
    height: 150,
    defaultValue: state.draft,
    maxLength: 200,
  }).editBox;

  const submitButton = RuntimeUI.createButton(workCard, {
    name: "SubmitHomeworkButton",
    text: SUBMIT_BUTTON_TEXT,
    x: -90,
    y: -130,
    width: 160,
    height: 52,
    color: PRIMARY_ACTION_COLOR,
    fontSize: 18,
  });
  submitButton.button.node.on(Button.EventType.CLICK, () => void actions.onSubmit(), context);

  const backButton = RuntimeUI.createButton(workCard, {
    name: "BackOverviewButton",
    text: BACK_BUTTON_TEXT,
    x: 95,
    y: -130,
    width: 160,
    height: 52,
    color: SECONDARY_ACTION_COLOR,
    fontSize: 18,
  });
  backButton.button.node.on(Button.EventType.CLICK, actions.onBackToOverview, context);

  RuntimeUI.createLabel(workCard, {
    name: "HomeworkHint",
    text: state.hint,
    x: 0,
    y: -70,
    width: 430,
    height: 36,
    fontSize: 17,
    color: state.hintIsWarning ? WARNING_TEXT_COLOR : HINT_TEXT_COLOR,
  });

  RuntimeUI.createLabel(historyCard, {
    name: "HistoryCardTitle",
    text: HISTORY_TITLE,
    x: 0,
    y: 170,
    width: 320,
    height: 36,
    fontSize: 24,
  });
  RuntimeUI.createLabel(historyCard, {
    name: "HistoryCardContent",
    text: state.historySummary,
    x: 0,
    y: 0,
    width: 380,
    height: 300,
    fontSize: 18,
    color: HISTORY_TEXT_COLOR,
  });

  return {
    input,
  };
}
