import { Component, Node } from "cc";

// 文件整体作用：
// 这是所有“运行时动态拼出来的页面”的公共父类。
// MainController、HomeworkController 这类页面控制器，都会继承它。
//
// 一句话版本：
// 这段代码的核心意思就是：给页面准备一个专门放动态内容的容器，需要时自动创建，刷新时统一清空。
//
// 美术需要关注的重点：
// 1. 这里不直接决定按钮长什么样，也不直接处理业务逻辑。
// 2. 它只负责管理一个“页面根容器”，方便整页删除、整页重建。
// 3. 放进这个根容器里的子节点，大多都是运行时动态创建的，刷新页面时可能被全部删掉重建。
export abstract class ScreenController extends Component {
  // managedRoot：当前页面专门用来承载“动态 UI”的总容器。
  // 可以把它理解成“这一页临时搭出来的舞台底板”。
  private managedRoot: Node | null = null;

  protected ensureManagedRoot(name: string): Node {
    // 确保当前页面一定有一个指定名字的根容器。
    // 如果已经有了，就直接复用；如果没有，就现场创建一个。
    if (this.managedRoot?.isValid) {
      return this.managedRoot;
    }

    const existing = this.node.getChildByName(name);
    if (existing) {
      this.managedRoot = existing;
      return existing;
    }

    const root = new Node(name);
    root.setParent(this.node);
    this.managedRoot = root;
    return root;
  }

  protected clearManagedRoot(): Node {
    // 重新渲染前，清空之前动态生成出来的所有子节点。
    // 这一步会把旧按钮、旧文字、旧卡片都删掉，所以后面通常要整页重画。
    const root = this.ensureManagedRoot("ManagedRoot");
    root.destroyAllChildren();
    return root;
  }
}
