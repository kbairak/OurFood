import { Node, Vector, Game } from "./game_engine";
import { mulberry32, expRandom, pick, normalRandom } from "./rand";
import { drawBackground, drawCircle, drawLine, drawX } from "./graphics";
import { tryMatch } from "./solver";
import { outputs, parameters } from "./parameters";

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

const CANVAS_SIZE = 700;

export const courierSpeed = (function () {
  let cached = (0.5214 * CANVAS_SIZE) / parameters.get("avgTravelMinutes");
  parameters.on("avgTravelMinutes", () => {
    cached = (0.5214 * CANVAS_SIZE) / parameters.get("avgTravelMinutes");
  });
  return () => cached;
})();

export class Stop {
  constructor(
    readonly type: "pickup" | "deliver",
    readonly order: Order,
  ) {}
}

export class RouteElement {
  private _duration?: number;

  constructor(
    readonly type: "pickup" | "wait" | "deliver",
    readonly from: Vector,
    readonly start: number,
    readonly order: Order,
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
    if (this._duration === undefined) {
      const speed = courierSpeed();
      switch (this.type) {
        case "pickup":
          this._duration =
            this.order.restaurant.position.sub(this.from).size() / speed;
          break;
        case "wait":
          this._duration =
            this.order.placedAt + this.order.prepTime - this.start;
          break;
        case "deliver":
          this._duration = this.order.destination.sub(this.from).size() / speed;
          break;
      }
    }
    return this._duration;
  }

  get end() {
    return this.start + this.duration;
  }
}

export class Route {
  private _data: RouteElement[];
  private _duration?: number;
  private _delay?: number;

  constructor(...items: RouteElement[]) {
    this._data = items;
  }

  get length() {
    return this._data.length;
  }

  at(index: number): RouteElement | undefined {
    return this._data.at(index);
  }

  push(...args: Parameters<Array<RouteElement>["push"]>): number {
    this._duration = this._delay = undefined;
    return this._data.push(...args);
  }

  pop(): RouteElement | undefined {
    this._duration = this._delay = undefined;
    return this._data.pop();
  }

  splice(
    start: number,
    deleteCount?: number,
    ...items: RouteElement[]
  ): RouteElement[] {
    this._duration = this._delay = undefined;
    return this._data.splice(
      start,
      deleteCount ?? this._data.length - start,
      ...items,
    );
  }

  slice(start?: number, end?: number): RouteElement[] {
    return this._data.slice(start, end);
  }

  map<T>(
    callback: (value: RouteElement, index: number, array: RouteElement[]) => T,
  ): T[] {
    return this._data.map(callback);
  }

  filter(
    predicate: (
      value: RouteElement,
      index: number,
      array: RouteElement[],
    ) => boolean,
  ): RouteElement[] {
    return this._data.filter(predicate);
  }

  some(
    predicate: (
      value: RouteElement,
      index: number,
      array: RouteElement[],
    ) => boolean,
  ): boolean {
    return this._data.some(predicate);
  }

  [Symbol.iterator](): Iterator<RouteElement> {
    return this._data[Symbol.iterator]();
  }

  get duration() {
    if (this._duration === undefined) {
      this._duration = this._data.reduce((sum, el) => sum + el.duration, 0);
    }
    return this._duration;
  }

  get delay() {
    if (this._delay === undefined) {
      this._delay = this._data
        .filter((el) => el.type === "deliver")
        .reduce((acc, el) => acc + el.end - el.order.optimalTime, 0);
    }
    return this._delay;
  }

  get cost() {
    return (
      parameters.get("durationWeight") * this.duration +
      parameters.get("delayWeight") * this.delay
    );
  }

  clone(): Route {
    return new Route(...this._data);
  }
}

export class Restaurant extends Node {
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

export class Courier extends Node {
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

    const head = this.route.at(0);
    switch (head?.type) {
      case "pickup":
        const courierToRestaurant = head.to.sub(this.position);
        step = courierToRestaurant.normalized().scale(courierSpeed() * dt);
        if (step.size() < courierToRestaurant.size()) {
          this.position = this.position.add(step);
        } else {
          const order = head.order;
          this.position = head.to;
          this.route.splice(0, 1);
          if (this.route.at(0)?.type !== "wait") {
            this.carrying.add(order);
          }
        }
        break;
      case "wait":
        if (Node.game.simTime >= head.end) {
          this.carrying.add(head.order);
          this.route.splice(0, 1);
        }
        break;
      case "deliver":
        const courierToDestination = head.to.sub(this.position);
        step = courierToDestination.normalized().scale(courierSpeed() * dt);
        if (step.size() < courierToDestination.size()) {
          this.position = this.position.add(step);
        } else {
          const [courier, order, restaurant] = [
            this,
            head.order,
            head.order.restaurant,
          ];
          courier.position = head.to;
          courier.carrying.delete(order);
          restaurant.orders.delete(order);
          if (restaurant.retiring && restaurant.orders.size === 0) {
            restaurant.destroy();
          }
          order.destroy();
          courier.route.splice(0, 1);
          outputs.set("v-completed", (p: number) => p + 1);
          if (courier.retiring && courier.carrying.size === 0) {
            courier.destroy();
          } else {
            tryMatch(Node.game as MyGame);
          }
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const label =
      this.carrying.size > 0
        ? `c${this.id}[${this.carrying.size}]`
        : `c${this.id}`;
    drawCircle(ctx, this.position, 10, label, this.color, "line");
    if (this.route.length > 0) {
      drawLine(ctx, this.route.at(0)!.to, this.position, this.color);
    }
    for (const routeElement of this.route.slice(1)) {
      drawLine(ctx, routeElement.to, routeElement.from, this.color);
    }
  }
}

export class Order extends Node {
  public courier: Courier | null = null;
  static zIndex = -1;

  constructor(
    public placedAt: number,
    public prepTime: number,
    public restaurant: Restaurant,
    public destination: Vector,
  ) {
    super();

    outputs.set("v-queued", (p: number) => p + 1);
  }

  get readyAt() {
    return this.placedAt + this.prepTime;
  }

  get optimalTime() {
    return (
      this.readyAt +
      this.destination.sub(this.restaurant.position).size() / courierSpeed()
    );
  }

  isReady() {
    return Node.game.simTime >= this.readyAt;
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
        (this.placedAt + this.prepTime - Node.game.simTime) * courierSpeed(),
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

export class MyGame extends Game {
  public nextOrderAt = 0;
  public totalOrdersCreated = 0;
  public totalDelayTime = 0;
  public totalCourierTime = 0;
  public totalCourierActiveTime = 0;

  adjustRestaurants(v: number) {
    while (true) {
      const nonRetiringRestaurants = [
        ...(Restaurant.instances.values() as MapIterator<Restaurant>),
      ].filter((restaurant) => !restaurant.retiring);

      if (nonRetiringRestaurants.length < v) {
        const retiringRestaurants = [
          ...(Restaurant.instances.values() as MapIterator<Restaurant>),
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
      } else if (nonRetiringRestaurants.length > v) {
        const restaurant = pick(nonRetiringRestaurants);
        restaurant.retiring = true;
        if (restaurant.orders.size === 0) {
          restaurant.destroy();
        }
      } else {
        break;
      }
    }
  }

  adjustCouriers(v: number) {
    while (true) {
      const nonRetiringCouriers = [
        ...(Courier.instances.values() as MapIterator<Courier>),
      ].filter((courier) => !courier.retiring);

      if (nonRetiringCouriers.length < v) {
        const retiringCouriers = [
          ...(Courier.instances.values() as MapIterator<Courier>),
        ].filter((courier) => courier.retiring);
        if (retiringCouriers.length) {
          pick(retiringCouriers).retiring = false;
        } else {
          new Courier(
            new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
          );
        }
      } else if (nonRetiringCouriers.length > v) {
        const courier = pick(nonRetiringCouriers);
        courier.retiring = true;
        if (courier.route.length === 0) {
          courier.destroy();
        }
      } else {
        break;
      }
    }
  }

  constructor() {
    super();

    this.simSpeed = parameters.get("simSpeed");
    parameters.on("simSpeed", (v) => {
      this.simSpeed = v;
    });
    parameters.on("restaurantCount", this.adjustRestaurants.bind(this));
    parameters.on("courierCount", this.adjustCouriers.bind(this));

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
    outputs.set("v-delay", "—");
    outputs.set("v-efficiency", "—");
    outputs.set("v-queued", "0");
    outputs.set("v-inflight", "0");
    outputs.set("v-completed", 0);

    this.totalCourierTime = 0;
    this.totalCourierActiveTime = 0;

    rng = mulberry32(42);
    for (let i = 0; i < parameters.get("restaurantCount"); i++) {
      new Restaurant(
        new Vector(
          50 + rng() * (this.canvas.width - 2 * 50),
          50 + rng() * (this.canvas.height - 2 * 50),
        ),
      );
    }
    rng = mulberry32();

    for (let i = 0; i < parameters.get("courierCount"); i++) {
      new Courier(
        new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
      );
    }

    this.nextOrderAt = expRandom(960 / parameters.get("orderRate"));
  }

  step(_dt: number) {
    while (this.simTime >= this.nextOrderAt) {
      const restaurant = pick(
        ([...Restaurant.instances.values()] as Restaurant[]).filter(
          (r) => !r.retiring,
        ),
      );
      const order = new Order(
        this.simTime,
        normalRandom(
          parameters.get("avgPrepTime"),
          parameters.get("prepStddev"),
        ),
        restaurant,
        new Vector(rng() * this.canvas.width, rng() * this.canvas.height),
      );
      this.totalOrdersCreated++;
      restaurant.orders.add(order);
      tryMatch(this);
      this.nextOrderAt += expRandom(960 / parameters.get("orderRate"));
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBackground(ctx);

    const h = `${Math.floor(this.simTime / 60)}`.padStart(2, "0");
    const m = `${Math.floor(this.simTime % 60)}`.padStart(2, "0");
    outputs.set("v-time", `${h}:${m}`);

    const completed = outputs.get("v-completed");
    if (completed && this.totalCourierTime) {
      const efficiency = (completed / this.totalCourierTime) * 60 * 8;
      outputs.set("v-efficiency", `${efficiency.toFixed(2)}`);
    }

    if (this.totalCourierTime) {
      outputs.set(
        "v-util",
        `${((this.totalCourierActiveTime / this.totalCourierTime) * 100).toFixed(2)}%`,
      );
    }

    if (this.totalOrdersCreated) {
      outputs.set(
        "v-delay",
        `${(this.totalDelayTime / this.totalOrdersCreated).toFixed(2)} min`,
      );
    }
  }
}
