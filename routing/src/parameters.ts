class Wire {
  public sliderElement: HTMLInputElement;
  public displayElement: HTMLElement;
  public eventListener: () => void;

  constructor(
    sliderId: string,
    displayId: string,
    public formatValue: (value: number) => string = (v) => `${v}`,
  ) {
    this.sliderElement = document.getElementById(sliderId) as HTMLInputElement;
    this.displayElement = document.getElementById(displayId) as HTMLElement;
    this.eventListener = () => {
      this.displayElement.innerText = this.formatValue(
        +this.sliderElement.value,
      );
    };
    this.sliderElement.addEventListener("input", this.eventListener);
    this.eventListener();
  }
}

const WIRES = {
  avgPrepTime: new Wire("i-avgPrepTime", "o-avgPrepTime", (v) => `${v} min`),
  avgTravelMinutes: new Wire(
    "i-avgTravelMinutes",
    "o-avgTravelMinutes",
    (v) => `${v} min`,
  ),
  budget: new Wire("i-budget", "o-budget"),
  courierCount: new Wire("i-courierCount", "o-courierCount"),
  delayWeight: new Wire("i-delayWeight", "o-delayWeight"),
  durationWeight: new Wire("i-durationWeight", "o-durationWeight"),
  horizon: new Wire("i-horizon", "o-horizon"),
  maxBatch: new Wire("i-maxBatch", "o-maxBatch"),
  orderRate: new Wire("i-orderRate", "o-orderRate", (v) => `${v} /day`),
  prepStddev: new Wire("i-prepStddev", "o-prepStddev", (v) => `± ${v} min`),
  restaurantCount: new Wire("i-restaurantCount", "o-restaurantCount"),
  simSpeed: new Wire("i-simSpeed", "o-simSpeed", (s) => `${60 * +s}x`),
};

export const parameters = {
  get(key: keyof typeof WIRES): number {
    const wire = WIRES[key];
    return +wire.sliderElement.value;
  },

  set(key: keyof typeof WIRES, value: number): void {
    const wire = WIRES[key];
    wire.sliderElement.value = `${value}`;
    wire.displayElement.innerText = wire.formatValue(value);
    wire.sliderElement.dispatchEvent(new Event("input")); // Trigger input event to update display
  },

  on(key: keyof typeof WIRES, callback: (n: number) => void) {
    const wire = WIRES[key];
    wire.sliderElement.removeEventListener("input", wire.eventListener);
    wire.eventListener = () => {
      wire.displayElement.innerText = wire.formatValue(
        +wire.sliderElement.value,
      );
      callback(+wire.sliderElement.value);
    };
    wire.sliderElement.addEventListener("input", wire.eventListener);
  },
};

export const outputs = {
  get(key: string) {
    const element = document.getElementById(key)!;
    return +element.textContent;
  },

  set(key: string, valueOrFunc: any) {
    const element = document.getElementById(key)!;
    const value =
      valueOrFunc instanceof Function
        ? valueOrFunc(+element.textContent)
        : valueOrFunc;
    element.textContent = `${value}`;
  },
};
