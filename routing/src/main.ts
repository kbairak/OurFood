import { highsReady } from "./solver";
import { MyGame } from "./game";

highsReady.then(() => {
  new MyGame().start(document.getElementById("app") as HTMLCanvasElement);
});