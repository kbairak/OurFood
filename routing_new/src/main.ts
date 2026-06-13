import { Node, Vector, Game } from "./lib";
import { mulberry32, expRandom, pick, normalRandom } from "./rand";
import { drawBackground, drawCircle, drawLine, drawX } from "./graphics";
import { solveAssignment, type Candidate } from "./solver";

const COLORS = [
  "#ff6b6b",
  "#ffd93d",
  "#6bcb77",
  "#4d96ff",
  "#c77dff",
  "#ff9f43",
  "#00d2d3",
  "#ff6b81",
  "#a3e4d7",
  "#f1948a",
];

class Stop {
  constructor(
    public type: "pickup" | "deliver",
    public order: Order,
  ) {}
}

class RouteElement {
  constructor(
    public type: "pickup" | "wait" | "deliver",
    public from: Vector,
    public start: number,
    public order: Order,
  ) {}

  get to() {
    switch (this.type) {
      case "pickup":
        return this.order.restaurant.position;
      case "wait":
        return this.order.restaurant.position;
      case "deliver":
        return this.order.destination;
    }
  }

  get duration() {
    const speed = (Node.game as MyGame).courierSpeed;
    switch (this.type) {
      case "pickup":
        return this.order.restaurant.position.sub(this.from).size() / speed;
      case "wait":
        return this.order.placedAt + this.order.prepTime - this.start;
      case "deliver":
        return this.order.destination.sub(this.from).size() / speed;
    }
  }

  get end() {
    return this.start + this.duration;
  }
}

class Route extends Array<RouteElement> {
  get duration() {
    return this.reduce((sum, element) => sum + element.duration, 0);
  }

  clone(): Route {
    return new Route(...this);
  }
}

class Restaurant extends Node {
  public orders = new Set<Order>();
  public retiring = false;

  constructor(public position: Vector) {
    super();
  }

  get color() {
    return COLORS[this.id % COLORS.length];
  }

  draw(ctx: CanvasRenderingContext2D) {
    const waitingOrders = [...this.orders].filter((o) => o.isWaiting()).length;
    const label = waitingOrders
      ? `r${this.id}[${waitingOrders}]`
      : `r${this.id}`;
    drawCircle(ctx, this.position, 18, label, this.color, "line");
  }
}

class Courier extends Node {
  public carrying = new Set<Order>();
  public route: Route = new Route();
  public retiring = false;

  public constructor(public position: Vector) {
    super();
  }

  get color() {
    return COLORS[this.id % COLORS.length];
  }

  step(dt: number) {
    let step: Vector;
    (Node.game as MyGame).totalCourierTime += dt;
    if (this.route.length > 0) {
      (Node.game as MyGame).totalCourierActiveTime += dt;
    }

    switch (this.route[0]?.type) {
      case "pickup":
        const courierToRestaurant = this.route[0].to.sub(this.position);
        step = courierToRestaurant
          .normalized()
          .scale((Node.game as MyGame).courierSpeed * dt);
        if (step.size() < courierToRestaurant.size()) {
          this.position = this.position.add(step);
        } else {
          const order = this.route[0].order;
          this.position = this.route[0].to;
          this.route.splice(0, 1);
          if ((this.route[0] as RouteElement | undefined)?.type !== "wait") {
            this.carrying.add(order);
          }
        }
        break;
      case "wait":
        if (Node.game.simTime >= this.route[0].end) {
          this.carrying.add(this.route[0].order);
          this.route.splice(0, 1);
        }
        break;
      case "deliver":
        const courierToDestination = this.route[0].to.sub(this.position);
        step = courierToDestination
          .normalized()
          .scale((Node.game as MyGame).courierSpeed * dt);
        if (step.size() < courierToDestination.size()) {
          this.position = this.position.add(step);
        } else {
          const [courier, order, restaurant] = [
            this,
            this.route[0].order,
            this.route[0].order.restaurant,
          ];
          courier.position = this.route[0].to;
          courier.carrying.delete(order);
          restaurant.orders.delete(order);
          if (restaurant.retiring && restaurant.orders.size === 0) {
            restaurant.destroy();
          }
          order.destroy();
          courier.route.splice(0, 1);
          document.getElementById("v-completed")!.textContent =
            `${+document.getElementById("v-completed")!.textContent + 1}`;
          if (courier.retiring) {
            courier.destroy();
          } else {
            (Node.game as MyGame).tryMatch();
          }
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawCircle(ctx, this.position, 10, `c${this.id}`, this.color, "line");
    if (this.route.length > 0) {
      drawLine(ctx, this.route[0].to, this.position, this.color);
    }
    for (const routeElement of this.route.slice(1)) {
      drawLine(ctx, routeElement.to, routeElement.from, this.color);
    }
  }
}

class Order extends Node {
  public courier: Courier | null = null;
  static zIndex = -1;

  constructor(
    public placedAt: number,
    public prepTime: number,
    public restaurant: Restaurant,
    public destination: Vector,
  ) {
    super();
  }

  get optimalTime() {
    return (
      this.placedAt +
      this.prepTime +
      this.destination.sub(this.restaurant.position).size() /
        (Node.game as MyGame).courierSpeed
    );
  }

  isReady() {
    return Node.game.simTime >= this.placedAt + this.prepTime;
  }

  isWaiting() {
    return (
      this.isReady() && (!this.courier || !this.courier.carrying.has(this))
    );
  }

  step(dt: number) {
    if (Node.game.simTime > this.optimalTime) {
      (Node.game as MyGame).totalDelayTime += dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isReady()) {
      drawCircle(
        ctx,
        this.restaurant.position,
        (this.placedAt + this.prepTime - Node.game.simTime) *
          (Node.game as MyGame).courierSpeed,
        "",
        this.restaurant.color,
        this.courier ? "dashed-bold" : "dashed",
      );
    }
    const overdue = Node.game.simTime - this.optimalTime;
    const label = overdue > 0 ? `+${Math.round(overdue)}` : undefined;
    drawX(ctx, this.destination, this.restaurant.color, label);
  }
}

let rng: () => number;
const CANVAS_SIZE = 700;

class MyGame extends Game {
  public nextOrderAt = 0;
  private _restaurantCount = 3;
  public _courierCount = 3;
  public orderRate = 0.354;
  public avgPrepTime = 15;
  public prepStddev = 5;
  public avgTravelMinutes = 12;
  public totalOrdersCreated = 0;
  public totalDelayTime = 0;
  public totalCourierTime = 0;
  public totalCourierActiveTime = 0;
  public maxBatch = 2;

  get restaurantCount() {
    return this._restaurantCount;
  }
  set restaurantCount(v: number) {
    while (v > this._restaurantCount) {
      const retiringRestaurants = [
        ...(Restaurant.instances as Set<Restaurant>),
      ].filter((r) => r.retiring);
      if (retiringRestaurants.length) {
        pick(retiringRestaurants).retiring = false;
      } else {
        new Restaurant(
          new Vector(
            50 + rng() * (this.canvas.width - 2 * 50),
            50 + rng() * (this.canvas.height - 2 * 50),
          ),
        );
      }
      this._restaurantCount++;
    }
    while (v < this._restaurantCount) {
      const nonRetiringRestaurants = [
        ...(Restaurant.instances as Set<Restaurant>),
      ].filter((r) => !r.retiring);
      const restaurant = pick(nonRetiringRestaurants);
      restaurant.retiring = true;
      if (restaurant.orders.size === 0) {
        restaurant.destroy();
      }
      this._restaurantCount--;
    }
  }

  get courierCount() {
    return this._courierCount;
  }
  set courierCount(v: number) {
    while (v > this._courierCount) {
      const retiringCouriers = [...(Courier.instances as Set<Courier>)].filter(
        (c) => c.retiring,
      );
      if (retiringCouriers.length) {
        pick(retiringCouriers).retiring = false;
      } else {
        new Courier(
          new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
        );
      }
      this._courierCount++;
    }
    while (v < this._courierCount) {
      const nonRetiringCouriers = [
        ...(Courier.instances as Set<Courier>),
      ].filter((c) => !c.retiring);
      const courier = pick(nonRetiringCouriers);
      courier.retiring = true;
      if (courier.route.length === 0) {
        courier.destroy();
      }
      this._courierCount--;
    }
  }

  get courierSpeed() {
    return (0.5214 * CANVAS_SIZE) / this.avgTravelMinutes;
  }

  constructor() {
    super();

    function wire(
      sliderId: string,
      getValue: () => number,
      setValue: (v: number) => void,
      displayId: string,
      fmt: (s: string) => string,
    ) {
      const el = document.getElementById(sliderId) as HTMLInputElement;
      el.value = `${getValue()}`;
      document.getElementById(displayId)!.textContent = fmt(`${getValue()}`);
      el.addEventListener("input", () => {
        setValue(+el.value);
        document.getElementById(displayId)!.textContent = fmt(el.value);
      });
    }
    wire(
      "slider-restaurants",
      () => this.restaurantCount,
      (v: number) => (this.restaurantCount = v),
      "p-restaurants",
      (s) => s,
    );
    wire(
      "slider-couriers",
      () => this.courierCount,
      (v: number) => (this.courierCount = v),
      "p-couriers",
      (s) => s,
    );
    wire(
      "slider-travel",
      () => this.avgTravelMinutes,
      (v) => (this.avgTravelMinutes = v),
      "p-travel",
      (v) => v + " min",
    );
    wire(
      "slider-order-interval",
      () => Math.round(this.orderRate * 960),
      (v) => (this.orderRate = v / 960),
      "p-order-rate",
      (v) => v + " /day",
    );
    wire(
      "slider-prep-mean",
      () => this.avgPrepTime,
      (v) => (this.avgPrepTime = v),
      "p-prep-mean",
      (v) => v + " min",
    );
    wire(
      "slider-prep-stddev",
      () => this.prepStddev,
      (v) => (this.prepStddev = v),
      "p-prep-stddev",
      (v) => "± " + v + " min",
    );
    wire(
      "slider-batch",
      () => this.maxBatch,
      (v) => (this.maxBatch = v),
      "p-batch",
      (s) => s,
    );
    wire(
      "speed-slider",
      () => this.simSpeed,
      (v) => (this.simSpeed = v),
      "v-speed",
      (s) => `${60 * +s}x`,
    );
    (document.getElementById("btn-pause") as HTMLElement).addEventListener(
      "click",
      (event) => {
        this.paused = !this.paused;
        (event.target as HTMLElement).textContent = this.paused
          ? "RESUME"
          : "PAUSE";
      },
    );
    (document.getElementById("btn-reset") as HTMLElement).addEventListener(
      "click",
      () => {
        this.paused = false;
        this.reset();
        document.getElementById("btn-pause")!.textContent = "PAUSE";
      },
    );
  }

  reset() {
    super.reset();

    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;

    Order.clear();
    Courier.clear();
    Restaurant.clear();

    this.totalOrdersCreated = 0;
    this.totalDelayTime = 0;
    document.getElementById("v-delay")!.textContent = "—";
    document.getElementById("v-queued")!.textContent = "0";
    document.getElementById("v-inflight")!.textContent = "0";
    document.getElementById("v-completed")!.textContent = "0";

    this.totalCourierTime = 0;
    this.totalCourierActiveTime = 0;

    rng = mulberry32(42);
    for (let i = 0; i < this.restaurantCount; i++) {
      new Restaurant(
        new Vector(
          50 + rng() * (this.canvas.width - 2 * 50),
          50 + rng() * (this.canvas.height - 2 * 50),
        ),
      );
    }
    rng = mulberry32();

    for (let i = 0; i < this.courierCount; i++) {
      new Courier(
        new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
      );
    }

    this.nextOrderAt = expRandom(1 / this.orderRate);
  }

  step(_dt: number) {
    while (this.simTime >= this.nextOrderAt) {
      const restaurant = pick(
        [...(Restaurant.instances as Set<Restaurant>)].filter(
          (r) => !r.retiring,
        ),
      );
      const order = new Order(
        this.simTime,
        normalRandom(this.avgPrepTime, this.prepStddev),
        restaurant,
        new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
      );
      this.totalOrdersCreated++;
      restaurant.orders.add(order);
      this.tryMatch();
      this.nextOrderAt += expRandom(1 / this.orderRate);
    }
  }

  tryMatch() {
    // Start by nuking all existing routes
    for (const courier of Courier.instances as Set<Courier>) {
      if (courier.route[0]?.type === "wait") {
        courier.route.splice(0);
      } else {
        courier.route.splice(1);
      }
    }

    // Gather unclaimed orders
    const unclaimedOrders = new Set<Order>(Order.instances as Set<Order>);
    for (const courier of Courier.instances as Set<Courier>) {
      for (const order of courier.carrying) {
        unclaimedOrders.delete(order);
      }
      // We've already nuked routes
      for (const element of courier.route) {
        unclaimedOrders.delete(element.order);
      }
    }

    const freeCouriers = new Set(
      [...(Courier.instances as Set<Courier>)].filter(
        (courier) =>
          !courier.retiring &&
          (this.maxBatch > 1 || courier.route[0]?.type !== "deliver"),
      ),
    );

    if (!this.tryMatchMip([...freeCouriers], unclaimedOrders)) {
      this.tryMatchGreedy(freeCouriers, unclaimedOrders);
    }

    document.getElementById("v-queued")!.textContent =
      `${unclaimedOrders.size}`;
    document.getElementById("v-inflight")!.textContent =
      `${(Order.instances as Set<Order>).size - unclaimedOrders.size}`;
  }

  tryMatchGreedy(freeCouriers: Set<Courier>, unclaimedOrders: Set<Order>) {
    while (freeCouriers.size > 0) {
      const best: {
        courier: Courier | null;
        route: Route | null;
        duration: number;
      } = { courier: null, route: null, duration: Infinity };
      for (const courier of freeCouriers) {
        const stops: Stop[] = [];
        for (const order of unclaimedOrders) {
          stops.push(new Stop("pickup", order));
          stops.push(new Stop("deliver", order));
        }
        for (const order of courier.carrying) {
          if (
            !(
              courier.route[0]?.type === "deliver" &&
              courier.route[0].order === order
            )
          ) {
            stops.push(new Stop("deliver", order));
          }
        }
        if (courier.route[0]?.type === "pickup") {
          stops.push(new Stop("deliver", courier.route[0].order));
        }
        if (stops.length === 0) {
          freeCouriers.delete(courier);
          continue;
        }
        this.findBestRoute(courier, courier.route, stops, best);
      }
      if (!best.courier) break;
      best.courier.route = best.route!;
      freeCouriers.delete(best.courier);
      for (const routeElement of best.route!) {
        unclaimedOrders.delete(routeElement.order);
      }
    }
  }

  // Stops that any route for this courier must contain: deliveries for
  // carried orders (minus the in-progress first leg) and the delivery
  // matching an in-progress pickup.
  mandatoryStops(courier: Courier): Stop[] {
    const stops: Stop[] = [];
    for (const order of courier.carrying) {
      if (
        !(
          courier.route[0]?.type === "deliver" &&
          courier.route[0].order === order
        )
      ) {
        stops.push(new Stop("deliver", order));
      }
    }
    if (courier.route[0]?.type === "pickup") {
      stops.push(new Stop("deliver", courier.route[0].order));
    }
    return stops;
  }

  // Set-partitioning MIP: enumerate candidate routes per courier (best
  // sequence for each subset of nearby unclaimed orders), then let HiGHS
  // pick one route per courier minimizing total delivery delay.
  // Returns false if the solver isn't ready, so the caller can fall back
  // to the greedy matcher.
  tryMatchMip(couriers: Courier[], unclaimedOrders: Set<Order>): boolean {
    // Candidate pool size per courier: pick the largest K such that the
    // total number of candidate routes (couriers x subsets of a pool of
    // up to 2K orders) stays within a budget, since enumeration and the
    // MIP size explode combinatorially. Scale the budget with courier
    // count so quality doesn't degrade when the fleet grows.
    const BUDGET = Math.max(300, couriers.length * 15);
    const subsetCount = (pool: number, batch: number) => {
      let total = 1;
      let comb = 1;
      for (let i = 1; i <= batch; i++) {
        comb = (comb * (pool - i + 1)) / i;
        total += Math.max(0, comb);
      }
      return total;
    };
    let K_NEAREST = 8;
    while (
      K_NEAREST > 1 &&
      couriers.length * subsetCount(2 * K_NEAREST, this.maxBatch) > BUDGET
    ) {
      K_NEAREST--;
    }
    const candidates: (Candidate & { route: Route })[] = [];

    for (let ci = 0; ci < couriers.length; ci++) {
      const courier = couriers[ci];
      const mandatory = this.mandatoryStops(courier);
      const capacity =
        this.maxBatch -
        courier.carrying.size -
        (courier.route[0]?.type === "pickup" ? 1 : 0);
      // Cap the candidate pool to keep enumeration tractable: the K
      // nearest orders plus the K oldest (so distant orders can't starve
      // outside the model forever). "Nearest" = minimum total detour
      // (courier → restaurant → destination).
      const detour = (order: Order) =>
        order.restaurant.position.sub(courier.position).size() +
        order.destination.sub(order.restaurant.position).size();
      const nearest = new Set(
        [...unclaimedOrders].sort((a, b) => detour(a) - detour(b)).slice(0, K_NEAREST),
      );
      for (const order of [...unclaimedOrders]
        .sort((a, b) => a.placedAt - b.placedAt)
        .slice(0, K_NEAREST)) {
        nearest.add(order);
      }

      const subsets: Order[][] = [[]];
      for (const order of nearest) {
        const len = subsets.length;
        for (let i = 0; i < len; i++) {
          if (subsets[i].length < capacity) {
            subsets.push([...subsets[i], order]);
          }
        }
      }

      for (const subset of subsets) {
        const stops = [...mandatory];
        for (const order of subset) {
          stops.push(new Stop("pickup", order));
          stops.push(new Stop("deliver", order));
        }
        if (stops.length === 0) {
          candidates.push({
            courierIndex: ci,
            orderIds: [],
            cost: 0,
            route: courier.route,
          });
          continue;
        }
        const best: { route: Route | null; cost: number } = {
          route: null,
          cost: Infinity,
        };
        this.findMinDelayRoute(courier, courier.route, 0, stops, best);
        if (best.route) {
          candidates.push({
            courierIndex: ci,
            orderIds: subset.map((o) => o.id),
            cost: best.cost,
            route: best.route,
          });
        }
      }
    }

    if (candidates.length === 0) return true;

    // Penalty for leaving an order unassigned: the delay it would have
    // accrued if it's still undelivered a horizon from now, plus a base
    // so coverage is always preferred when capacity allows.
    const HORIZON = 60;
    const maxCost = candidates.reduce((m, c) => Math.max(m, c.cost), 0);
    // Orders in no candidate are trivially unassigned; keep them out of
    // the model so a big backlog doesn't bloat the LP.
    const consideredIds = new Set(candidates.flatMap((c) => c.orderIds));
    const orderList = [...unclaimedOrders].filter((o) =>
      consideredIds.has(o.id),
    );
    const chosen = solveAssignment(
      candidates,
      couriers.length,
      orderList.map((o) => o.id),
      orderList.map(
        (o) =>
          10 * maxCost +
          1000 +
          Math.max(0, this.simTime + HORIZON - o.optimalTime),
      ),
    );
    if (!chosen) return false;

    chosen.forEach((candidateIndex, ci) => {
      if (candidateIndex < 0) return;
      const candidate = candidates[candidateIndex];
      couriers[ci].route = candidate.route;
      for (const routeElement of candidate.route) {
        routeElement.order.courier = couriers[ci];
        unclaimedOrders.delete(routeElement.order);
      }
    });
    return true;
  }

  // Weight of route duration in the MIP cost. Delay is what we actually
  // care about, but pure delay ignores the opportunity cost of courier
  // time (e.g. waiting at a restaurant for prep is "free"), which kills
  // throughput under load.
  static DURATION_WEIGHT = 1;

  // Like findBestRoute, but must use ALL stops and minimizes total
  // delivery delay plus weighted route duration.
  findMinDelayRoute(
    courier: Courier,
    pre: Route,
    preCost: number,
    stops: Stop[],
    best: { route: Route | null; cost: number },
  ) {
    if (preCost >= best.cost) return;

    const pickupsInPre = pre.filter((e) => e.type === "pickup");
    if (
      courier.carrying.size + pickupsInPre.length > this.maxBatch ||
      (pre.at(-1)?.type === "deliver" &&
        ![...courier.carrying, ...pickupsInPre.map((e) => e.order)].find(
          (o) => o === pre.at(-1)?.order,
        ))
    ) {
      return;
    }

    if (stops.length === 0) {
      best.route = pre;
      best.cost = preCost;
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const routeElement = new RouteElement(
        stop.type,
        pre.length ? pre.at(-1)!.to : courier.position,
        pre.length ? pre.at(-1)!.end : this.simTime,
        stop.order,
      );
      const newPre = pre.clone();
      newPre.push(routeElement);
      if (routeElement.type === "pickup") {
        if (stop.order.placedAt + stop.order.prepTime > routeElement.end) {
          newPre.push(
            new RouteElement(
              "wait",
              routeElement.to,
              routeElement.end,
              stop.order,
            ),
          );
        }
      }
      let newCost =
        preCost +
        MyGame.DURATION_WEIGHT * (newPre.at(-1)!.end - routeElement.start);
      if (routeElement.type === "deliver") {
        newCost += Math.max(0, routeElement.end - stop.order.optimalTime);
      }
      const newStops = [...stops.slice(0, i), ...stops.slice(i + 1)];
      this.findMinDelayRoute(courier, newPre, newCost, newStops, best);
    }
  }

  findBestRoute(
    courier: Courier,
    pre: Route,
    stops: Stop[],
    best: { courier: Courier | null; route: Route | null; duration: number },
  ) {
    if (pre.duration >= best.duration) return;

    const pickupsInPre = pre.filter((e) => e.type === "pickup");
    if (
      courier.carrying.size + pickupsInPre.length > this.maxBatch ||
      (pre.at(-1)?.type === "deliver" &&
        ![...courier.carrying, ...pickupsInPre.map((e) => e.order)].find(
          (o) => o === pre.at(-1)?.order,
        ))
    ) {
      return;
    }

    if (
      stops.length === 0 ||
      (courier.carrying.size + pickupsInPre.length === this.maxBatch &&
        pre.filter((e) => e.type === "deliver").length === this.maxBatch)
    ) {
      best.courier = courier;
      best.route = pre;
      best.duration = pre.duration;
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const routeElement = new RouteElement(
        stop.type,
        pre.length ? pre.at(-1)!.to : courier.position,
        pre.length ? pre.at(-1)!.end : this.simTime,
        stop.order,
      );
      const newPre = pre.clone();
      newPre.push(routeElement);
      if (routeElement.type === "pickup") {
        if (stop.order.placedAt + stop.order.prepTime > routeElement.end) {
          newPre.push(
            new RouteElement(
              "wait",
              routeElement.to,
              routeElement.end,
              stop.order,
            ),
          );
        }
      }
      const newStops = [...stops.slice(0, i), ...stops.slice(i + 1)];
      this.findBestRoute(courier, newPre, newStops, best);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBackground(ctx);

    const h = `${Math.floor(this.simTime / 60)}`.padStart(2, "0");
    const m = `${Math.floor(this.simTime % 60)}`.padStart(2, "0");
    document.getElementById("v-time")!.textContent = `${h}:${m}`;

    const completed = +document.getElementById("v-completed")!.textContent;
    if (completed) {
      const efficiency =
        (completed / this.courierCount / this.simTime) * 60 * 8;
      document.getElementById("v-efficiency")!.textContent =
        `${efficiency.toFixed(2)}`;
    }

    if (this.totalCourierTime) {
      document.getElementById("v-util")!.textContent =
        `${((this.totalCourierActiveTime / this.totalCourierTime) * 100).toFixed(2)}%`;
    }

    if (this.totalDelayTime) {
      document.getElementById("v-delay")!.textContent =
        `${(this.totalDelayTime / this.totalOrdersCreated).toFixed(2)} min`;
    }
  }
}

new MyGame().start(document.getElementById("app") as HTMLCanvasElement);
