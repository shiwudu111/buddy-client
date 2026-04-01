import { director } from "cc";
import type { SceneName } from "../domain/models/app";

class SceneRouter {
  goTo(scene: SceneName): void {
    director.loadScene(scene);
  }

  goToLogin(): void {
    this.goTo("Login");
  }

  goToMain(): void {
    this.goTo("Main");
  }
}

export const sceneRouter = new SceneRouter();
