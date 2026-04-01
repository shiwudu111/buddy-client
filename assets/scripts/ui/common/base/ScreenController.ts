import { Component, Node } from "cc";

export abstract class ScreenController extends Component {
  private managedRoot: Node | null = null;

  protected ensureManagedRoot(name: string): Node {
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
    const root = this.ensureManagedRoot("ManagedRoot");
    root.destroyAllChildren();
    return root;
  }
}
