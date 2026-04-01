import {
  Button,
  Color,
  EditBox,
  Graphics,
  Label,
  Node,
  UITransform,
  Vec3,
} from "cc";

type SizeLike = {
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
    label.horizontalAlign = 1;
    label.verticalAlign = 1;
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
    const node = this.createBox(parent, {
      ...options,
      color: new Color(20, 26, 37, 255),
    });

    const textLabel = this.createLabel(node, {
      name: `${options.name}Text`,
      text: options.defaultValue ?? "",
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: new Color(255, 255, 255, 255),
    });
    textLabel.horizontalAlign = 0;

    const placeholderLabel = this.createLabel(node, {
      name: `${options.name}Placeholder`,
      text: options.placeholder,
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: new Color(153, 166, 184, 255),
    });
    placeholderLabel.horizontalAlign = 0;
    placeholderLabel.node.active = !options.defaultValue;

    const editBox = node.addComponent(EditBox);
    const editBoxAny = editBox as any;
    editBox.string = options.defaultValue ?? "";
    editBox.maxLength = options.maxLength ?? 120;
    editBoxAny.textLabel = textLabel;
    editBoxAny.placeholderLabel = placeholderLabel;
    editBoxAny._textLabel = textLabel;
    editBoxAny._placeholderLabel = placeholderLabel;
    if (options.password) {
      editBoxAny.inputFlag = 0;
    }

    return { node, editBox, textLabel, placeholderLabel };
  },
};
