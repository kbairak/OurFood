import { parameters } from "./parameters";

const PREFIX = "run:";

const PARAM_KEYS = [
  "restaurantCount",
  "courierCount",
  "avgTravelMinutes",
  "orderRate",
  "avgPrepTime",
  "prepStddev",
  "maxBatch",
  "budget",
  "horizon",
  "durationWeight",
  "delayWeight",
  "geoCutoff",
] as const;

const SHORT_LABELS: Record<string, string> = {
  restaurantCount: "R",
  courierCount: "C",
  avgTravelMinutes: "T",
  orderRate: "O",
  avgPrepTime: "P",
  prepStddev: "PS",
  maxBatch: "B",
  budget: "BD",
  horizon: "H",
  durationWeight: "DW",
  delayWeight: "DLW",
  geoCutoff: "GC",
};

const STAT_KEYS = ["v-time", "v-completed", "v-efficiency", "v-delay", "v-util"] as const;

function getParamValues(): Record<string, number> {
  const obj: Record<string, number> = {};
  for (const k of PARAM_KEYS) obj[k] = parameters.get(k as any);
  return obj;
}

export function saveRun(): string {
  const params = getParamValues();
  const key = PREFIX + JSON.stringify(params);
  const stats: Record<string, string> = {};
  for (const id of STAT_KEYS) {
    stats[id] = document.getElementById(id)!.textContent!;
  }
  localStorage.setItem(key, JSON.stringify(stats));
  return key;
}

export function deleteRun(key: string): void {
  localStorage.removeItem(key);
}

export function parseParamKey(storedKey: string): Record<string, number> {
  return JSON.parse(storedKey.slice(PREFIX.length));
}

export interface SavedRun {
  key: string;
  params: Record<string, number>;
  stats: Record<string, string>;
}

export function getAllRuns(): SavedRun[] {
  const runs: SavedRun[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith(PREFIX)) continue;
    try {
      const stats = JSON.parse(localStorage.getItem(key)!);
      const params = parseParamKey(key);
      runs.push({ key, params, stats });
    } catch {
      /* skip malformed entries */
    }
  }
  return runs;
}

function formatKey(params: Record<string, number>): string {
  const pairs = PARAM_KEYS.map((k) => `${SHORT_LABELS[k]}:${params[k]}`);
  const mid = Math.ceil(pairs.length / 2);
  return pairs.slice(0, mid).join("  ") + "<br>" + pairs.slice(mid).join("  ");
}

export function renderRuns(container: HTMLElement): void {
  const runs = getAllRuns();
  if (runs.length === 0) {
    container.innerHTML =
      '<span style="font-size: 12px; color: #6060a0">No saved runs yet.</span>';
    return;
  }
  container.innerHTML = runs
    .map(
      (r) => `
    <div class="saved-run" data-key="${r.key.replace(/"/g, "&quot;")}">
      <div class="saved-run-key">${formatKey(r.params)}</div>
      <div class="saved-run-metrics">${r.stats["v-time"]}  |  C: ${r.stats["v-completed"]}  |  Eff: ${r.stats["v-efficiency"]}  |  Del: ${r.stats["v-delay"]}  |  Util: ${r.stats["v-util"]}</div>
      <div style="display:flex;gap:4px;margin-top:4px">
        <button class="btn-sm" data-action="use">USE</button>
        <button class="btn-sm" data-action="delete">DELETE</button>
      </div>
    </div>
  `,
    )
    .join("");
}