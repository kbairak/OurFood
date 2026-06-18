export class Vector {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  size(): number {
    return Math.hypot(this.x, this.y);
  }

  scale(n: number): Vector {
    return new Vector(this.x * n, this.y * n);
  }

  normalized(): Vector {
    return this.scale(1 / this.size());
  }

  eq(other: Vector): boolean {
    return this.x === other.x && this.y === other.y;
  }

  middle(other: Vector): Vector {
    return this.add(other).scale(0.5);
  }
}

export class Node {
  public id: number;
  public static instances = new Map<number, Node>();
  public static game: Game;
  public static zIndex = 0;

  constructor() {
    const cls = this.constructor as typeof Node;
    if (!Object.hasOwn(cls, "instances")) {
      cls.instances = new Map<number, Node>();
    }
    for (let i = 0; true; i++) {
      if (!Node.instances.has(i)) {
        this.id = i;
        break;
      }
    }
    cls.instances.set(this.id, this);
    Node.instances.set(this.id, this);
  }

  destroy() {
    const cls = this.constructor as typeof Node;
    cls.instances.delete(this.id);
    Node.instances.delete(this.id);
  }

  static clear() {
    if (!Object.hasOwn(this, "instances")) {
      return;
    }
    for (const [id] of this.instances) {
      Node.instances.delete(id);
    }
    this.instances.clear();
  }

  step(_dt: number) {}
  draw(_ctx: CanvasRenderingContext2D) {}
}

export class Game {
  public canvas!: HTMLCanvasElement;
  public canvasCtx!: CanvasRenderingContext2D;
  public realTime: number | null = null;
  public simTime = 0;
  public simSpeed = 4; // simTime / realTime
  public maxSimDt: number = 0.05; // sim-minutes per sub-step
  public maxSubSteps: number = 100;
  public paused = false;

  start(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
    Node.game = this;
    this.reset();
    requestAnimationFrame(this.frame.bind(this));
  }

  reset() {
    this.realTime = null;
    this.simTime = 0;
  }

  frame(ts: number) {
    requestAnimationFrame(this.frame.bind(this));
    if (this.realTime === null) {
      this.realTime = ts;
      return;
    }
    if (!this.paused) {
      const dtReal = Math.min((ts - this.realTime) / 1000, 0.1); // real seconds, capped
      this.realTime = ts;
      const dtSim = dtReal * this.simSpeed; // sim-minutes
      const subSteps = Math.min(
        Math.ceil(dtSim / this.maxSimDt),
        this.maxSubSteps,
      );
      const nextSimTime = this.simTime + dtSim;
      const dtSimSub = dtSim / subSteps;
      while (this.simTime < nextSimTime) {
        this.simTime += dtSimSub;
        this.step(dtSimSub);
        Node.instances.forEach((node) => node.step(dtSimSub));
      }
      this.simTime = nextSimTime;
      this.draw(this.canvasCtx);
      [...Node.instances]
        .sort(
          (a, b) =>
            (a.constructor as typeof Node).zIndex -
            (b.constructor as typeof Node).zIndex,
        )
        .forEach(([_, node]) => node.draw(this.canvasCtx));
    }
  }

  step(_dt: number) {}
  draw(_ctx: CanvasRenderingContext2D) {}
}
