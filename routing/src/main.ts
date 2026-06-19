import { highsReady } from "./solver";
import { MyGame } from "./game";
import { parameters } from "./parameters";
import { saveRun, deleteRun, parseParamKey, renderRuns } from "./saved_runs";

highsReady.then(() => {
  const game = new MyGame();
  game.start(document.getElementById("app") as HTMLCanvasElement);

  const container = document.getElementById("saved-runs-list") as HTMLElement;

  document.getElementById("btn-save-stats")!.addEventListener("click", () => {
    saveRun();
    renderRuns(container);
  });

  container.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    const runEl = btn.closest(".saved-run") as HTMLElement;
    if (!runEl) return;
    const key = runEl.dataset.key!;
    const action = btn.dataset.action;
    if (action === "use") {
      const params = parseParamKey(key);
      for (const [k, v] of Object.entries(params)) {
        parameters.set(k as any, v);
      }
      game.reset();
    } else if (action === "delete") {
      deleteRun(key);
    }
    renderRuns(container);
  });

  renderRuns(container);
});