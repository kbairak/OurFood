import { bench, beforeAll, vi } from "vitest";
import path from "node:path";

vi.mock("highs/runtime?url", () => ({
  default: path.join(process.cwd(), "node_modules/highs/build/highs.wasm"),
}));

const params = vi.hoisted(() => ({
  avgTravelMinutes: 30,
  budget: 1_000_000,
  delayWeight: 1,
  durationWeight: 1,
  geoCutoff: -1,
  horizon: 60,
  maxBatch: 3,
}));

vi.mock("./parameters", () => ({
  parameters: {
    get: (key: string) => params[key as keyof typeof params] ?? 0,
    on: () => {},
  },
  outputs: {
    get: () => 0,
    set: () => {},
  },
}));

import { Courier, MyGame, Order, Restaurant } from "./game";
import { Vector } from "./game_engine";
import { highsReady, tryMatch } from "./solver";
import { mulberry32 } from "./rand";

const CANVAS_SIZE = 700;

function createScenario(
  rng: () => number,
  courierCount: number,
  orderCount: number,
  restaurantCount: number,
) {
  [Order, Courier, Restaurant].forEach((cls) => cls.clear());

  const restaurants = Array.from({ length: restaurantCount }, () => {
    return new Restaurant(new Vector(rng() * CANVAS_SIZE, rng() * CANVAS_SIZE));
  });

  Array.from({ length: courierCount }, () => {
    return new Courier(new Vector(rng() * CANVAS_SIZE, rng() * CANVAS_SIZE));
  });

  Array.from({ length: orderCount }, () => {
    const restaurant = restaurants[Math.floor(rng() * restaurants.length)];
    return new Order(
      0,
      0,
      restaurant,
      new Vector(rng() * CANVAS_SIZE, rng() * CANVAS_SIZE),
    );
  });
}

beforeAll(async () => {
  await highsReady;
});

const CONFIGS: {
  couriers: number;
  orders: number;
  maxBatch: number;
  restaurants: number;
  geoCutoff: number;
}[] = [
  { couriers: 2, orders: 5, maxBatch: 3, restaurants: 3, geoCutoff: -1 },
  { couriers: 2, orders: 5, maxBatch: 3, restaurants: 3, geoCutoff: -0.5 },
  { couriers: 2, orders: 5, maxBatch: 3, restaurants: 3, geoCutoff: 0 },
  { couriers: 4, orders: 10, maxBatch: 3, restaurants: 5, geoCutoff: -1 },
  { couriers: 4, orders: 10, maxBatch: 3, restaurants: 5, geoCutoff: -0.5 },
  { couriers: 4, orders: 10, maxBatch: 3, restaurants: 5, geoCutoff: 0 },
  { couriers: 4, orders: 10, maxBatch: 4, restaurants: 5, geoCutoff: -1 },
  { couriers: 4, orders: 10, maxBatch: 4, restaurants: 5, geoCutoff: -0.5 },
  { couriers: 4, orders: 10, maxBatch: 4, restaurants: 5, geoCutoff: 0 },
  { couriers: 4, orders: 15, maxBatch: 4, restaurants: 5, geoCutoff: -1 },
  { couriers: 4, orders: 15, maxBatch: 4, restaurants: 5, geoCutoff: -0.5 },
  { couriers: 4, orders: 15, maxBatch: 4, restaurants: 5, geoCutoff: 0 },
];

for (const c of CONFIGS) {
  bench(
    `tryMatch(${c.couriers}c ${c.orders}o r=${c.restaurants} mb=${c.maxBatch} gc=${c.geoCutoff})`,
    () => {
      params.maxBatch = c.maxBatch;
      params.geoCutoff = c.geoCutoff;
      createScenario(mulberry32(42), c.couriers, c.orders, c.restaurants);
      tryMatch({ simTime: 0, paused: false } as MyGame);
    },
    { iterations: 5, time: 0 },
  );
}

