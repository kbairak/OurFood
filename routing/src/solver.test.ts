import { beforeAll, beforeEach, expect, it, vi } from "vitest";
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

import { Courier, MyGame, Order, Restaurant, RouteElement } from "./game";
import { Vector, Node } from "./game_engine";
import { highsReady, tryMatch } from "./solver";

beforeAll(async () => {
  await highsReady;
});

beforeEach(() => {
  [Order, Courier, Restaurant].forEach((cls) => cls.clear());
  Node.game = null as any;
});

it("assigns a straight-line pickup+deliver route to a free courier", () => {
  const restaurant = new Restaurant(new Vector(100, 0));
  const courier = new Courier(new Vector(0, 0));
  const order = new Order(0, 0, restaurant, new Vector(200, 0));

  tryMatch({ simTime: 0, paused: false } as MyGame);

  expect(
    courier.route.map((el) => ({ type: el.type, order: el.order })),
  ).toEqual([
    { type: "pickup", order },
    { type: "deliver", order },
  ]);
  expect(order.courier).toBe(courier);
});

it("batches two prepared orders from the same restaurant with maxBatch=2", () => {
  params.maxBatch = 2;

  const restaurant = new Restaurant(new Vector(100, 0));
  const courier = new Courier(new Vector(0, 0));
  const o1 = new Order(0, 0, restaurant, new Vector(200, 0));
  const o2 = new Order(0, 0, restaurant, new Vector(300, 0));

  tryMatch({ simTime: 0, paused: false } as MyGame);

  expect(courier.route.map((el) => el.type)).toEqual([
    "pickup",
    "pickup",
    "deliver",
    "deliver",
  ]);
  expect([o1, o2].every((o) => o.courier === courier)).toBe(true);
});

it("waits at the restaurant for O2 to be ready before departing", () => {
  params.maxBatch = 2;

  const courier = new Courier(new Vector(0, 0));
  const restaurant = new Restaurant(new Vector(100, 0));
  const o1 = new Order(0, 2, restaurant, new Vector(200, 0));
  const o2 = new Order(0, 10, restaurant, new Vector(300, 0));

  tryMatch({ simTime: 0, paused: false } as MyGame);

  // Verify both orders are assigned to the courier
  expect([o1, o2].every((o) => o.courier === courier)).toBe(true);

  expect(
    courier.route
      .filter((c) => ["pickup", "deliver"].includes(c.type))
      .map((c) => c.type),
  ).toEqual(["pickup", "pickup", "deliver", "deliver"]);
});

