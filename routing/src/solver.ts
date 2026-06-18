import highsLoader from "highs";
import wasmUrl from "highs/runtime?url";
import {
  MyGame,
  Courier,
  Order,
  Stop,
  Route,
  RouteElement,
  courierSpeed,
} from "./main";
import { flatten, subsets, subsetsUpTo, subsetsUpToCount } from "./itertools";
import { outputs, parameters } from "./parameters";

type Highs = Awaited<ReturnType<typeof highsLoader>>;

export let highs: Highs | null = null;

export const highsReady = highsLoader({ locateFile: () => wasmUrl }).then(
  (h) => {
    highs = h;
    return h;
  },
);

interface SolverMetrics {
  duration: number;
  durationSearch: number;
  durationMip: number;
  courierCount: number;
  freeCourierCount: number;
  orderCount: number;
  unclaimedOrderCount: number;
  kNearest: number;
  subsetCount: number;
  prunedByGeometricallyPromising: number;
  nodesExplored: number;
  routeCount: number;
  infeasibleSubsets: number;
  assignmentCount: number;
}

export function tryMatch(game: MyGame) {
  if (!highs) {
    console.warn("HiGHS not ready");
    game.paused = true;
    return;
  }

  const t0 = performance.now();

  // Start by nuking all existing routes
  for (const courier of Courier.instances.values() as MapIterator<Courier>) {
    if (courier.route.at(0)?.type === "wait") {
      courier.route.splice(0);
    } else {
      // Keep pickup + its following wait (if any) — waits are always for the same
      // order as the preceding pickup, so this is safe
      const keepCount = courier.route.at(1)?.type === "wait" ? 2 : 1;
      courier.route.splice(keepCount);
    }
  }

  const unclaimedOrders = new Set<Order>(
    Order.instances.values() as MapIterator<Order>,
  ).difference(
    new Set<Order>(
      flatten(
        [...(Courier.instances.values() as MapIterator<Courier>)].map(
          (courier) => [
            ...courier.carrying,
            ...courier.route.map((routeElement) => routeElement.order),
          ],
        ),
      ),
    ),
  );

  const freeCouriers = new Set(
    ([...Courier.instances.values()] as Courier[]).filter(
      (courier) =>
        !courier.retiring &&
        (parameters.get("maxBatch") > 1 ||
          courier.route.at(0)?.type !== "deliver"),
    ),
  );

  if (
    unclaimedOrders.size === 0 &&
    [...freeCouriers].every(
      (c) => c.carrying.size === 0 && c.route.length === 0,
    )
  )
    return;

  const courierList = [...freeCouriers];

  // Compute K_NEAREST: largest K such that total candidates stays within budget.
  let kNearest = 0;
  while (
    kNearest < unclaimedOrders.size &&
    courierList.length *
      subsetsUpToCount(kNearest + 1, parameters.get("maxBatch")) <=
      parameters.get("budget")
  ) {
    kNearest++;
  }

  const distanceToMidpoint = (order: Order, courier: Courier) =>
    order.restaurant.position
      .middle(order.destination)
      .sub(courier.position)
      .size();

  // Assign mandatory orders plus K nearest unclaimed orders to each courier.
  const orderAssignments = new Map<Courier, Set<Order>>(
    courierList.map((courier) => {
      const nearest = [...unclaimedOrders]
        .sort(
          (a, b) =>
            distanceToMidpoint(a, courier) - distanceToMidpoint(b, courier),
        )
        .slice(0, kNearest);
      return [
        courier,
        new Set<Order>([
          ...courier.carrying,
          ...courier.route.map((e) => e.order),
          ...nearest,
        ]),
      ];
    }),
  );

  // Assign any uncovered orders to the closest courier with remaining capacity.
  const covered = new Set(orderAssignments.values().flatMap((s) => [...s]));
  const capacity = (courier: Courier) =>
    parameters.get("maxBatch") -
    courier.carrying.size -
    (courier.route.at(0)?.type === "pickup" ? 1 : 0);
  for (const order of [...unclaimedOrders]
    .filter((o) => !covered.has(o))
    .sort((a, b) => a.optimalTime - b.optimalTime)) {
    const courier = courierList
      .filter((c) => capacity(c) > 0)
      .sort(
        (a, b) => distanceToMidpoint(order, a) - distanceToMidpoint(order, b),
      )
      .at(0);
    if (courier) orderAssignments.get(courier)!.add(order);
  }

  let subsetCount = 0;
  let prunedByGeometricallyPromising = 0;
  let infeasibleSubsets = 0;
  const nodeCounter = { count: 0 };

  const courierRoutes = new Map<Courier, Route[]>(
    [...freeCouriers].map((courier) => [courier, []]),
  );
  for (const [courier, assignment] of orderAssignments) {
    const assignmentList = [...assignment];
    for (const subset of subsetsUpTo(
      assignmentList,
      parameters.get("maxBatch"),
    )) {
      subsetCount++;
      if (!isGeometricallyPromising(courier, subset)) {
        prunedByGeometricallyPromising++;
        continue;
      }
      const best: { route?: Route; cost: number } = { cost: Infinity };
      findBestRoute(
        courier,
        courier.route,
        0,
        makeStops(courier, subset),
        game,
        best,
        nodeCounter,
      );
      if (best.route) courierRoutes.get(courier)!.push(best.route);
      else infeasibleSubsets++;
    }
  }

  const maxCost = Math.max(
    0,
    ...courierRoutes.values().flatMap((routes) => routes.map((r) => r.cost)),
  );

  // The goal is to write something like:
  //
  // Minimize
  //  obj: c(0,0) c0_0 + c(0,1) c0_1 + c(1,0) c1_0 + c(1,1) c1_1 + ... + p(0) p0 + p(1) p1 + ...
  //
  //   Where
  //   - `c(X,Y)` is the cost of route Y of courier X
  //   - cX_Y is a binary variable indicating whether the route was selected
  //   - p(X) is the penalty of not selecting order X at all
  //   - pX is a binary variable indicating whether order X was not selected at all
  //   - `c(X,Y)` and `p(X)` will actually get replaced into the string
  //
  // Subject To
  //  courier0: c0_0 + c0_1 = 1
  //
  //   Meaning that exactly one of courier X's routes must be selected
  //
  //  order0: c0_0 + c1_1 + ... + p0 <= 1
  //
  //   Meaning that order X should be selected by at most one courier (the solver will never pick
  //   a value greater than 1 since it would increase the cost)
  //
  // Bounds
  //  0 <= p0 <= 1
  //  0 <= p1 <= 1
  //
  //   Meaning that our penalty variables are binary (0 or 1). Since our order constraints are
  //   `binary + binary + ... + penalty_variable = 1`, we don't have to explicitly say that the
  //   courier variables are binary, since they will never be able to take a value other than 0 or
  //   1.
  //
  // Binary
  //  c0_0 c0_1 c1_0 c1_1 ...
  //
  //   Meaning that all variables are binary (0 or 1)
  //
  // End

  const binaries: string[] = [];
  const bounds: string[] = [];

  const objective: string[] = [];
  for (const [courier, routes] of courierRoutes) {
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      objective.push(`${route.cost} c${courier.id}_${i}`);
      binaries.push(`c${courier.id}_${i}`);
    }
  }
  for (const order of unclaimedOrders) {
    const penalty =
      10 * maxCost +
      1000 +
      Math.max(0, game.simTime + parameters.get("horizon") - order.optimalTime);
    objective.push(`${penalty} p${order.id}`);
    bounds.push(` 0 <= p${order.id} <= 1`);
  }

  const courierConstraints: string[] = [];
  for (const [courier, routes] of courierRoutes) {
    if (routes.length === 0) continue;
    courierConstraints.push(
      ` courier${courier.id}: ${routes.map((_, i) => `c${courier.id}_${i}`).join(" + ")} = 1`,
    );
  }

  const orderConstraints: string[] = [];
  for (const order of unclaimedOrders) {
    const vars = [];
    for (const [courier, routes] of courierRoutes) {
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        if (route.some((routeElement) => routeElement.order === order)) {
          vars.push(`c${courier.id}_${i}`);
        }
      }
    }
    vars.push(`p${order.id}`);
    orderConstraints.push(` order${order.id}: ${vars.join(" + ")} >= 1`);
  }

  const lp = [
    "Minimize",
    ` obj: ${objective.join(" + ")}`,
    "Subject to",
    courierConstraints.join("\n"),
    orderConstraints.join("\n"),
    "Bounds",
    bounds.join("\n"),
    "Binary",
    ` ${binaries.join(" ")}`,
    "End",
  ].join("\n");

  let solution;
  const tMip0 = performance.now();
  try {
    solution = highs.solve(lp, { output_flag: false });
  } catch (e) {
    console.error("HiGHS solve failed", e);
    game.paused = true;
    return;
  }
  const durationMip = performance.now() - tMip0;
  if (solution.Status !== "Optimal") {
    console.warn("HiGHS status:", solution.Status);
    game.paused = true;
    return;
  }
  outputs.set("v-inflight", 0);
  for (const order of Order.instances.values() as MapIterator<Order>) {
    order.courier = null;
  }
  let assignmentCount = 0;
  for (const [label, column] of Object.entries(solution.Columns)) {
    if ((column.Primal || 0) <= 0.5) continue;
    const match = /c(\d+)_(\d+)/.exec(label);
    if (!match) continue;
    const [courierId, routeIndex] = match.slice(1).map(Number) as [
      number,
      number,
    ];
    const courier = Courier.instances.get(courierId)! as Courier;
    const route = courierRoutes.get(courier)?.[routeIndex]!;
    courier.route = route;
    for (const order of new Set(
      route.map((routeElement) => routeElement.order),
    )) {
      order.courier = courier;
      outputs.set("v-inflight", (prev: number) => prev + 1);
      assignmentCount++;
    }
  }
  outputs.set(
    "v-queued",
    [...(Order.instances.values() as MapIterator<Order>)].filter(
      (order) => order.courier === null,
    ).length,
  );

  const duration = performance.now() - t0;
  if (duration > 300) {
    const routeCount = [...courierRoutes.values()].reduce(
      (sum, routes) => sum + routes.length,
      0,
    );
    const metrics: SolverMetrics = {
      duration,
      durationSearch: duration - durationMip,
      durationMip,
      courierCount: Courier.instances.size,
      freeCourierCount: freeCouriers.size,
      orderCount: Order.instances.size,
      unclaimedOrderCount: unclaimedOrders.size,
      kNearest,
      subsetCount,
      prunedByGeometricallyPromising,
      nodesExplored: nodeCounter.count,
      routeCount,
      infeasibleSubsets,
      assignmentCount,
    };
    console.warn(`[solver] slow run ${duration.toFixed(0)}ms`, metrics);
  }
}

function findBestRoute(
  courier: Courier,
  pre: Route,
  preCost: number,
  stops: Stop[],
  game: MyGame,
  best: { route?: Route; cost: number },
  nodeCounter: { count: number },
) {
  const maxBatch = parameters.get("maxBatch");
  const durationWeight = parameters.get("durationWeight");
  const delayWeight = parameters.get("delayWeight");

  // Build the set of orders already picked up (carrying + pickups in initial pre)
  const initialPickedUpOrders = new Set<Order>(courier.carrying);
  let initialPickupsInPre = 0;
  for (const el of pre) {
    if (el.type === "pickup") {
      initialPickedUpOrders.add(el.order);
      initialPickupsInPre++;
    }
  }
  const pickedUpOrders = new Set<Order>(initialPickedUpOrders);

  function search(preCost: number, stopsEnd: number, pickupsInPre: number) {
    nodeCounter.count++;
    if (preCost >= best.cost) return;

    if (stopsEnd === 0) {
      best.route = pre.clone();
      best.cost = preCost;
      return;
    }

    for (let i = 0; i < stopsEnd; i++) {
      const stop = stops[i];
      const isPickup = stop.type === "pickup";

      // Deliver validity: order must have been picked up
      if (
        !isPickup &&
        !courier.carrying.has(stop.order) &&
        !pickedUpOrders.has(stop.order)
      )
        continue;

      // Capacity: can't exceed maxBatch simultaneous pickups
      const newPickupsInPre = pickupsInPre + (isPickup ? 1 : 0);
      if (courier.carrying.size + newPickupsInPre > maxBatch) continue;

      const prev = pre.length ? pre.at(-1)! : null;
      const routeElement = new RouteElement(
        stop.type,
        prev ? prev.to : courier.position,
        prev ? prev.end : game.simTime,
        stop.order,
      );

      const waitElement =
        isPickup && stop.order.readyAt > routeElement.end
          ? new RouteElement(
              "wait",
              routeElement.to,
              routeElement.end,
              stop.order,
            )
          : null;

      const lastElement = waitElement ?? routeElement;
      const costDelta =
        durationWeight * (lastElement.end - routeElement.start) +
        (!isPickup
          ? delayWeight * (routeElement.end - stop.order.optimalTime)
          : 0);

      // Push (backtrack on return)
      pre.push(routeElement);
      if (waitElement) pre.push(waitElement);
      if (isPickup) pickedUpOrders.add(stop.order);

      // In-place stop removal: swap with last, recurse on stopsEnd - 1
      const swapped = stops[stopsEnd - 1];
      stops[stopsEnd - 1] = stop;
      stops[i] = swapped;

      search(preCost + costDelta, stopsEnd - 1, newPickupsInPre);

      stops[i] = stops[stopsEnd - 1];
      stops[stopsEnd - 1] = swapped;

      // Pop (backtrack)
      if (isPickup && !initialPickedUpOrders.has(stop.order))
        pickedUpOrders.delete(stop.order);
      if (waitElement) pre.pop();
      pre.pop();
    }
  }

  search(preCost, stops.length, initialPickupsInPre);
}

function makeStops(courier: Courier, subset: Order[]) {
  const stops: Stop[] = [];
  for (const order of subset) {
    if (!courier.carrying.has(order)) {
      stops.push(new Stop("pickup", order));
    }
    stops.push(new Stop("deliver", order));
  }
  for (const order of courier.carrying) {
    if (
      !subset.includes(order) &&
      !(
        courier.route.at(0)?.type === "deliver" &&
        courier.route.at(0)?.order === order
      )
    ) {
      stops.push(new Stop("deliver", order));
    }
  }
  if (courier.route.at(0)?.type === "pickup") {
    stops.push(new Stop("deliver", courier.route.at(0)!.order));
  }
  return stops;
}

function isGeometricallyPromising(courier: Courier, subset: Order[]): boolean {
  // Only care about conflicts when both distances are substantial
  const MIN_CONFLICT_DIST =
    parameters.get("avgTravelMinutes") * courierSpeed() * 0.3;

  const directions = subset.map((o) => o.destination.sub(courier.position));

  for (const [d1, d2] of subsets(directions, 2)) {
    const mag1 = d1.size();
    const mag2 = d2.size();

    // Only check alignment if both trips are non-trivial
    if (mag1 > MIN_CONFLICT_DIST && mag2 > MIN_CONFLICT_DIST) {
      const dot = d1.x * d2.x + d1.y * d2.y;
      const cosTheta = dot / (mag1 * mag2);

      // Prune if orders point in strongly opposite directions (angle > 135°)
      if (cosTheta < -0.7) return false;
    }
  }

  return true;
}
