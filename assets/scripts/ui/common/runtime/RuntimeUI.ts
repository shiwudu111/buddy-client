import {
  Button,
  Color,
  EditBox,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Mask,
  Node,
  ScrollView,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";

// 鏂囦欢鏁翠綋浣滅敤锛?// 杩欐槸椤圭洰閲屸€滆繍琛屾椂鐜版嫾 UI鈥濈殑閫氱敤宸ュ叿绠便€?// 鐧诲綍椤点€佷富鐣岄潰銆佷綔涓氫腑蹇冦€佸疇鐗╂垚闀块〉閲屽緢澶氱洅瀛愩€佹寜閽€佽緭鍏ユ銆佹粴鍔ㄦ枃瀛楋紝閮戒細浠庤繖閲屽姩鎬佸垱寤恒€?//
// 涓€鍙ヨ瘽鐗堟湰锛?// 杩欐浠ｇ爜鐨勬牳蹇冩剰鎬濆氨鏄細闇€瑕佷粈涔堟寜閽€佹枃瀛椼€佽緭鍏ユ銆佹粴鍔ㄥ尯锛屽氨鍦ㄨ繍琛屾椂鐜板満鐢熸垚鍑烘潵锛屼笉鐢ㄦ彁鍓嶅叏鎽嗗湪鍦烘櫙閲屻€?//
// 缇庢湳闇€瑕佸叧娉ㄧ殑閲嶇偣锛?// 1. 杩欓噷鍒涘缓鍑烘潵鐨勮妭鐐癸紝寰堝涓嶄細鎻愬墠鍑虹幇鍦ㄥ満鏅眰绾ч噷锛岃€屾槸杩愯鏃朵复鏃剁敓鎴愩€?// 2. 涓€鏃﹂〉闈㈤噸缁橈紝杩欎簺鑺傜偣鍙兘琚暣浣撳垹鎺夊啀閲嶅缓锛屾墍浠ヤ笉瑕佹妸鎵嬪伐璧勬簮鐩存帴鎸傚湪杩欎簺涓存椂鑺傜偣涓嬮潰銆?// 3. name 瀛楁浼氭垚涓虹湡瀹炶妭鐐瑰悕锛岃皟璇曞姩鎬佸眰绾ф椂寰堥噸瑕併€?// 4. 杩欓噷涓嶈礋璐ｂ€滅偣鎸夐挳鍚庡彂鐢熶粈涔堚€濓紝鍙礋璐ｆ妸鎸夐挳銆佹枃瀛椼€佸鍣ㄧ敾鍑烘潵銆?type SizeLike = {
  width: number;
  height: number;
};

type PositionLike = {
  x: number;
  y: number;
};

type LabelOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    fontSize?: number;
    color?: Color;
    horizontalAlign?: HorizontalTextAlignment;
    verticalAlign?: VerticalTextAlignment;
  };

type BoxOptions = SizeLike &
  PositionLike & {
    name: string;
    color?: Color;
  };

type ButtonOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
  };

type EditBoxOptions = SizeLike &
  PositionLike & {
    name: string;
    placeholder: string;
    defaultValue?: string;
    maxLength?: number;
    password?: boolean;
  };

type ScrollTextOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    fontSize?: number;
    color?: Color;
    backgroundColor?: Color;
    padding?: number;
  };

function setNodeFrame(node: Node, x: number, y: number, width: number, height: number): UITransform {
  node.setPosition(new Vec3(x, y, 0));
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

function drawRect(node: Node, width: number, height: number, color: Color): void {
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color;
  graphics.roundRect(-width / 2, -height / 2, width, height, 12);
  graphics.fill();
}

export const RuntimeUI = {
  clear(node: Node): void {
    node.destroyAllChildren();
  },

  createBox(parent: Node, options: BoxOptions): Node {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);
    drawRect(
      node,
      options.width,
      options.height,
      options.color ?? new Color(38, 47, 63, 255)
    );
    return node;
  },

  createLabel(parent: Node, options: LabelOptions): Label {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const label = node.addComponent(Label);
    label.string = options.text;
    label.fontSize = options.fontSize ?? 24;
    label.lineHeight = (options.fontSize ?? 24) + 8;
    label.color = options.color ?? new Color(245, 247, 250, 255);
    label.horizontalAlign = options.horizontalAlign ?? HorizontalTextAlignment.CENTER;
    label.verticalAlign = options.verticalAlign ?? VerticalTextAlignment.CENTER;
    label.overflow = 1;
    label.enableWrapText = true;
    return label;
  },

  createButton(parent: Node, options: ButtonOptions): {
    node: Node;
    button: Button;
    label: Label;
  } {
    const node = this.createBox(parent, {
      ...options,
      color: options.color ?? new Color(76, 128, 255, 255),
    });

    const button = node.addComponent(Button);
    button.transition = 0;

    const label = this.createLabel(node, {
      name: `${options.name}Label`,
      text: options.text,
      x: 0,
      y: 0,
      width: options.width - 24,
      height: options.height - 12,
      fontSize: options.fontSize ?? 22,
      color: options.textColor ?? new Color(255, 255, 255, 255),
    });

    return { node, button, label };
  },

  createEditBox(parent: Node, options: EditBoxOptions): {
    node: Node;
    editBox: EditBox;
    textLabel: Label;
    placeholderLabel: Label;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    this.createBox(node, {
      ...options,
      name: `${options.name}Background`,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      color: new Color(20, 26, 37, 255),
    });

    const inputNode = new Node(`${options.name}Input`);
    inputNode.setParent(node);
    setNodeFrame(inputNode, 0, 0, options.width, options.height);

    const editBox = inputNode.addComponent(EditBox);
    inputNode.destroyAllChildren();

    const textLabel = this.createLabel(inputNode, {
      name: `${options.name}Text`,
      text: options.defaultValue ?? "",
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: new Color(255, 255, 255, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const placeholderLabel = this.createLabel(inputNode, {
      name: `${options.name}Placeholder`,
      text: options.placeholder,
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: new Color(153, 166, 184, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    placeholderLabel.node.active = !options.defaultValue;

    editBox.string = options.defaultValue ?? "";
    editBox.maxLength = options.maxLength ?? 120;
    editBox.placeholder = options.placeholder;
    editBox.textLabel = textLabel;
    editBox.placeholderLabel = placeholderLabel;
    const editBoxAny = editBox as any;
    editBoxAny.textLabel = textLabel;
    editBoxAny.placeholderLabel = placeholderLabel;
    editBoxAny._textLabel = textLabel;
    editBoxAny._placeholderLabel = placeholderLabel;
    if (options.password) {
      editBoxAny.inputFlag = 0;
    }

    return { node, editBox, textLabel, placeholderLabel };
  },

  createScrollText(parent: Node, options: ScrollTextOptions): {
    node: Node;
    scrollView: ScrollView;
    content: Node;
    label: Label;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const background = this.createBox(node, {
      name: `${options.name}Background`,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      color: options.backgroundColor ?? new Color(23, 29, 40, 255),
    });
    background.setSiblingIndex(0);

    node.addComponent(Mask);
    const scrollView = node.addComponent(ScrollView);
    scrollView.horizontal = false;
    scrollView.vertical = true;
    scrollView.inertia = true;
    scrollView.brake = 0.35;
    scrollView.elastic = true;

    const padding = options.padding ?? 16;
    const innerWidth = options.width - padding * 2;
    const label = this.createLabel(node, {
      name: `${options.name}Label`,
      text: options.text,
      x: 0,
      y: 0,
      width: innerWidth,
      height: options.height - padding * 2,
      fontSize: options.fontSize ?? 18,
      color: options.color ?? new Color(219, 226, 236, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
      verticalAlign: VerticalTextAlignment.TOP,
    });
    label.overflow = Label.Overflow.RESIZE_HEIGHT;

    const labelTransform = label.node.getComponent(UITransform)!;
    const content = new Node(`${options.name}Content`);
    content.setParent(node);
    const contentTransform = content.addComponent(UITransform);
    const contentHeight = Math.max(
      options.height,
      labelTransform.height + padding * 2
    );
    contentTransform.setContentSize(innerWidth, contentHeight);
    label.node.setParent(content);
    label.node.setPosition(
      new Vec3(
        0,
        contentHeight / 2 - padding - labelTransform.height / 2,
        0
      )
    );
    content.setPosition(Vec3.ZERO);

    scrollView.content = content;
    // 内容要等到这一帧布局都稳定后，再把视图拉回顶部。
    // 这样进入页面时，用户会先看到最上面的文字，而不是中间一段。
    scrollView.scheduleOnce(() => {
      if (scrollView.node.isValid) {
        scrollView.scrollToTop(0);
      }
    }, 0);

    return { node, scrollView, content, label };
  },
};
