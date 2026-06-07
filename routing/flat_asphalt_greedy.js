// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS — edit these to experiment, then reload
// ═══════════════════════════════════════════════════════════════════

const CANVAS_SIZE = 700; // px (square)
const SHIFT_HOURS = 8; // reference shift length for the efficiency metric
const RESTAURANT_SEED = 42; // seed for restaurant position layout
let AVG_PREP_MINUTES = 15; // mean preparation time (sim-min)
let AVG_TRAVEL_MINUTES = 11; // expected travel time between two random points (sim-min)
let NUM_COURIERS = 8;
let NUM_RESTAURANTS = 10;
let ORDER_RATE = 0.354; // orders per sim-min  (≈480 orders per 16-hour day)
let PREP_STDDEV_MINUTES = 10; // standard deviation of preparation time
let SIM_SPEED = 4800; // sim-seconds per real-second  (60 → 1 real-s = 1 sim-min)

// ═══════════════════════════════════════════════════════════════════
//  DERIVED
// ═══════════════════════════════════════════════════════════════════

// E[distance between two random points in a CANVAS_SIZE × CANVAS_SIZE square]
// = 0.5214 × side  (Robbins' constant)
let COURIER_SPEED = (0.5214 * CANVAS_SIZE) / AVG_TRAVEL_MINUTES; // px / sim-min

// ═══════════════════════════════════════════════════════════════════
//  CANVAS
// ═══════════════════════════════════════════════════════════════════

const canvas = document.getElementById("canvas");
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;
const ctx = canvas.getContext("2d");

// One color per restaurant (up to 10 restaurants)
const R_COLORS = [
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

// ═══════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════

let simTime = 0; // sim-minutes elapsed

let restaurants = [];
let couriers = [];
let unclaimedOrders = []; // placed, not yet assigned to a courier
let activeOrders = []; // assigned (may still be preparing, or in delivery)
let completedOrders = 0;

let nextOrderAt = 0; // sim-time at which the next order will be placed
let orderSeq = 0;
let restaurantIdSeq = 0;
let courierIdSeq = 0;

// Running totals for metrics
let totalDelayMin = 0; // Σ max(0, pickedUpAt − readyAt) over completed orders
let totalOccupiedMin = 0; // Σ non-idle courier-minutes across all couriers

// ═══════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════

function reset() {
  const M = 50;
  simTime = 0;
  orderSeq = 0;
  totalDelayMin = 0;
  totalOccupiedMin = 0;
  unclaimedOrders = [];
  activeOrders = [];
  completedOrders = 0;

  restaurantIdSeq = NUM_RESTAURANTS;
  courierIdSeq = NUM_COURIERS;

  const rng = mulberry32(RESTAURANT_SEED);
  restaurants = Array.from({ length: NUM_RESTAURANTS }, (_, i) => ({
    id: i,
    x: M + rng() * (CANVAS_SIZE - 2 * M),
    y: M + rng() * (CANVAS_SIZE - 2 * M),
    retiring: false,
  }));

  couriers = Array.from({ length: NUM_COURIERS }, (_, i) => ({
    id: i,
    x: Math.random() * CANVAS_SIZE,
    y: Math.random() * CANVAS_SIZE,
    state: "idle",
    order: null,
    destX: 0,
    destY: 0,
    retiring: false,
  }));

  nextOrderAt = expRandom(1 / ORDER_RATE);

  for (const id of ["v-efficiency", "v-delay", "v-util"])
    document.getElementById(id).textContent = "—";

  paused = false;
  const pauseBtn = document.getElementById("btn-pause");
  if (pauseBtn) pauseBtn.textContent = "PAUSE";

  const rSlider = document.getElementById("slider-restaurants");
  const cSlider = document.getElementById("slider-couriers");
  if (rSlider) rSlider.value = NUM_RESTAURANTS;
  if (cSlider) cSlider.value = NUM_COURIERS;
}

const SAVED_RUNS_KEY = "fa_saved_runs";

function paramsKey() {
  return [
    "R" + NUM_RESTAURANTS,
    "C" + NUM_COURIERS,
    "T" + AVG_TRAVEL_MINUTES + "m",
    "O" + Math.round(ORDER_RATE * 960) + "/d",
    "P" + AVG_PREP_MINUTES + "±" + PREP_STDDEV_MINUTES + "m",
  ].join(" ");
}

function saveStats() {
  if (simTime <= 10 || completedOrders === 0) return;
  const shiftFraction = simTime / 60 / SHIFT_HOURS;
  const liveCouriers = couriers.length;
  const efficiency = completedOrders / liveCouriers / shiftFraction;
  const avgDelay = totalDelayMin / completedOrders;
  const utilization = (totalOccupiedMin / (liveCouriers * simTime)) * 100;

  const key = paramsKey();
  const runs = JSON.parse(localStorage.getItem(SAVED_RUNS_KEY) || "{}");
  runs[key] = {
    params: {
      NUM_RESTAURANTS, NUM_COURIERS, AVG_TRAVEL_MINUTES,
      ORDER_RATE, AVG_PREP_MINUTES, PREP_STDDEV_MINUTES,
    },
    metrics: { efficiency, avgDelay, utilization },
  };
  localStorage.setItem(SAVED_RUNS_KEY, JSON.stringify(runs));
  renderSavedRuns();
}

function applyParams(params) {
  NUM_RESTAURANTS     = params.NUM_RESTAURANTS;
  NUM_COURIERS        = params.NUM_COURIERS;
  AVG_TRAVEL_MINUTES  = params.AVG_TRAVEL_MINUTES;
  ORDER_RATE          = params.ORDER_RATE;
  AVG_PREP_MINUTES    = params.AVG_PREP_MINUTES;
  PREP_STDDEV_MINUTES = params.PREP_STDDEV_MINUTES;
  COURIER_SPEED       = (0.5214 * CANVAS_SIZE) / AVG_TRAVEL_MINUTES;

  document.getElementById("slider-travel").value = AVG_TRAVEL_MINUTES;
  document.getElementById("p-travel").textContent = AVG_TRAVEL_MINUTES + " min";
  document.getElementById("slider-order-interval").value = Math.round(ORDER_RATE * 960);
  document.getElementById("p-order-rate").textContent = Math.round(ORDER_RATE * 960) + " /day";
  document.getElementById("slider-prep-mean").value = AVG_PREP_MINUTES;
  document.getElementById("p-prep-mean").textContent = AVG_PREP_MINUTES + " min";
  document.getElementById("slider-prep-stddev").value = PREP_STDDEV_MINUTES;
  document.getElementById("p-prep-stddev").textContent = "± " + PREP_STDDEV_MINUTES + " min";

  saveParams();
  reset();
}

function renderSavedRuns() {
  const runs = JSON.parse(localStorage.getItem(SAVED_RUNS_KEY) || "{}");
  const list = document.getElementById("saved-runs-list");
  list.innerHTML = "";
  const entries = Object.entries(runs);
  if (!entries.length) {
    list.textContent = "No saved runs yet.";
    return;
  }
  for (const [key, { params, metrics }] of entries) {
    const item = document.createElement("div");
    item.className = "saved-run";

    const keyEl = document.createElement("div");
    keyEl.className = "saved-run-key";
    keyEl.textContent = key;
    item.appendChild(keyEl);

    const metricsEl = document.createElement("div");
    metricsEl.className = "saved-run-metrics";
    metricsEl.textContent =
      "eff " + metrics.efficiency.toFixed(1) +
      " · delay " + metrics.avgDelay.toFixed(1) + "m" +
      " · util " + metrics.utilization.toFixed(0) + "%";
    item.appendChild(metricsEl);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;gap:4px;margin-top:3px";

    const useBtn = document.createElement("button");
    useBtn.className = "btn-sm";
    useBtn.textContent = "USE";
    useBtn.addEventListener("click", () => applyParams(params));
    btns.appendChild(useBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "btn-sm";
    delBtn.textContent = "DEL";
    delBtn.addEventListener("click", () => {
      const s = JSON.parse(localStorage.getItem(SAVED_RUNS_KEY) || "{}");
      delete s[key];
      localStorage.setItem(SAVED_RUNS_KEY, JSON.stringify(s));
      renderSavedRuns();
    });
    btns.appendChild(delBtn);

    item.appendChild(btns);
    list.appendChild(item);
  }
}

function saveParams() {
  localStorage.setItem("fa_NUM_RESTAURANTS",     NUM_RESTAURANTS);
  localStorage.setItem("fa_NUM_COURIERS",        NUM_COURIERS);
  localStorage.setItem("fa_AVG_TRAVEL_MINUTES",  AVG_TRAVEL_MINUTES);
  localStorage.setItem("fa_ORDER_RATE",          ORDER_RATE);
  localStorage.setItem("fa_AVG_PREP_MINUTES",    AVG_PREP_MINUTES);
  localStorage.setItem("fa_PREP_STDDEV_MINUTES", PREP_STDDEV_MINUTES);
  localStorage.setItem("fa_SIM_SPEED",           SIM_SPEED);
}

function init() {
  // Restore saved parameters; fall back to compiled-in defaults
  function ls(key, fallback) {
    const v = localStorage.getItem(key);
    return v !== null ? +v : fallback;
  }
  NUM_RESTAURANTS     = ls("fa_NUM_RESTAURANTS",     NUM_RESTAURANTS);
  NUM_COURIERS        = ls("fa_NUM_COURIERS",        NUM_COURIERS);
  AVG_TRAVEL_MINUTES  = ls("fa_AVG_TRAVEL_MINUTES",  AVG_TRAVEL_MINUTES);
  ORDER_RATE          = ls("fa_ORDER_RATE",          ORDER_RATE);
  AVG_PREP_MINUTES    = ls("fa_AVG_PREP_MINUTES",    AVG_PREP_MINUTES);
  PREP_STDDEV_MINUTES = ls("fa_PREP_STDDEV_MINUTES", PREP_STDDEV_MINUTES);
  SIM_SPEED           = ls("fa_SIM_SPEED",           SIM_SPEED);
  COURIER_SPEED       = (0.5214 * CANVAS_SIZE) / AVG_TRAVEL_MINUTES;

  function wire(sliderId, getValue, setValue, displayId, fmt) {
    const el = document.getElementById(sliderId);
    el.value = getValue();
    document.getElementById(displayId).textContent = fmt(getValue());
    el.addEventListener("input", () => {
      setValue(+el.value);
      document.getElementById(displayId).textContent = fmt(+el.value);
      saveParams();
    });
  }

  wire(
    "slider-travel",
    () => AVG_TRAVEL_MINUTES,
    (v) => {
      AVG_TRAVEL_MINUTES = v;
      COURIER_SPEED = (0.5214 * CANVAS_SIZE) / v;
    },
    "p-travel",
    (v) => v + " min",
  );
  wire(
    "slider-order-interval",
    () => Math.round(ORDER_RATE * 960),
    (v) => {
      ORDER_RATE = v / 960;
    },
    "p-order-rate",
    (v) => v + " /day",
  );
  wire(
    "slider-prep-mean",
    () => AVG_PREP_MINUTES,
    (v) => {
      AVG_PREP_MINUTES = v;
    },
    "p-prep-mean",
    (v) => v + " min",
  );
  wire(
    "slider-prep-stddev",
    () => PREP_STDDEV_MINUTES,
    (v) => {
      PREP_STDDEV_MINUTES = v;
    },
    "p-prep-stddev",
    (v) => "± " + v + " min",
  );

  const speedSlider = document.getElementById("speed-slider");
  speedSlider.value = SIM_SPEED;
  document.getElementById("v-speed").textContent = SIM_SPEED + "×";
  speedSlider.addEventListener("input", () => {
    SIM_SPEED = +speedSlider.value;
    document.getElementById("v-speed").textContent = SIM_SPEED + "×";
    saveParams();
  });

  function wireCount(sliderId, getTarget, setTarget, onInc, onDec) {
    const el = document.getElementById(sliderId);
    el.value = getTarget();
    el.addEventListener("input", () => {
      const next = +el.value;
      const delta = next - getTarget();
      setTarget(next);
      if (delta > 0) for (let i = 0; i < delta; i++) onInc();
      else for (let i = 0; i < -delta; i++) onDec();
      saveParams();
    });
  }

  wireCount(
    "slider-restaurants",
    () => NUM_RESTAURANTS,
    (v) => (NUM_RESTAURANTS = v),
    addRestaurant,
    retireRestaurant,
  );
  wireCount(
    "slider-couriers",
    () => NUM_COURIERS,
    (v) => (NUM_COURIERS = v),
    addCourier,
    retireCourier,
  );

  document.getElementById("btn-save-stats").addEventListener("click", saveStats);
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.getElementById("btn-pause").addEventListener("click", () => {
    paused = !paused;
    document.getElementById("btn-pause").textContent = paused
      ? "RESUME"
      : "PAUSE";
  });

  renderSavedRuns();
  reset();
}

function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expRandom(mean) {
  return -Math.log(Math.random()) * mean;
}

function normalRandom(mean, stddev) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(1, mean + z * stddev);
}

// ═══════════════════════════════════════════════════════════════════
//  SIMULATION STEP
// ═══════════════════════════════════════════════════════════════════

function step(dtReal) {
  const dt = (dtReal * SIM_SPEED) / 60; // convert real-seconds → sim-minutes
  simTime += dt;

  // Poisson order generation: spawn all orders whose scheduled time has passed
  while (simTime >= nextOrderAt) {
    spawnOrder(nextOrderAt);
    nextOrderAt += expRandom(1 / ORDER_RATE);
  }

  // Update each courier
  for (const c of couriers) {
    const wasOccupied = c.state !== "idle";

    if (c.state === "en-route-pickup") {
      if (moveToward(c, c.destX, c.destY, dt)) {
        // Arrived at restaurant
        if (simTime >= c.order.readyAt) {
          pickUp(c);
        } else {
          c.state = "waiting-pickup"; // arrived early; wait for order
        }
      }
    } else if (c.state === "waiting-pickup") {
      if (simTime >= c.order.readyAt) pickUp(c);
    } else if (c.state === "en-route-delivery") {
      if (moveToward(c, c.destX, c.destY, dt)) deliver(c);
    }

    // Accumulate occupied time using state at the START of this frame
    if (wasOccupied) totalOccupiedMin += dt;
  }

  pruneRetiredRestaurants();
}

// Move courier toward (tx, ty); return true if arrived this frame
function moveToward(c, tx, ty, dt) {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  const maxStep = COURIER_SPEED * dt;

  if (d <= maxStep) {
    c.x = tx;
    c.y = ty;
    return true;
  }
  const ratio = maxStep / d;
  c.x += dx * ratio;
  c.y += dy * ratio;
  return false;
}

function spawnOrder(atTime) {
  const available = restaurants.filter((r) => !r.retiring);
  if (!available.length) return;
  const rest = available[Math.floor(Math.random() * available.length)];
  const prepTime = normalRandom(AVG_PREP_MINUTES, PREP_STDDEV_MINUTES);
  const M = 20;
  const order = {
    id: orderSeq++,
    restaurant: rest,
    destX: M + Math.random() * (CANVAS_SIZE - 2 * M),
    destY: M + Math.random() * (CANVAS_SIZE - 2 * M),
    placedAt: atTime,
    readyAt: atTime + prepTime,
    pickedUpAt: null,
    deliveredAt: null,
    courierId: null,
  };
  unclaimedOrders.push(order);
  tryMatch();
}

function pickUp(c) {
  c.order.pickedUpAt = simTime;
  totalDelayMin += Math.max(0, simTime - c.order.readyAt);
  c.state = "en-route-delivery";
  c.destX = c.order.destX;
  c.destY = c.order.destY;
}

function deliver(c) {
  c.order.deliveredAt = simTime;
  activeOrders.splice(activeOrders.indexOf(c.order), 1);
  completedOrders++;
  if (c.retiring) {
    couriers.splice(couriers.indexOf(c), 1);
  } else {
    c.state = "idle";
    c.order = null;
    tryMatch();
  }
  pruneRetiredRestaurants();
}

// ═══════════════════════════════════════════════════════════════════
//  DYNAMIC SCALING
// ═══════════════════════════════════════════════════════════════════

function addRestaurant() {
  const M = 50;
  restaurants.push({
    id: restaurantIdSeq++,
    x: M + Math.random() * (CANVAS_SIZE - 2 * M),
    y: M + Math.random() * (CANVAS_SIZE - 2 * M),
    retiring: false,
  });
}

function retireRestaurant() {
  const active = restaurants.filter((r) => !r.retiring);
  if (!active.length) return;
  active[active.length - 1].retiring = true;
  pruneRetiredRestaurants();
}

function addCourier() {
  couriers.push({
    id: courierIdSeq++,
    x: Math.random() * CANVAS_SIZE,
    y: Math.random() * CANVAS_SIZE,
    state: "idle",
    order: null,
    destX: 0,
    destY: 0,
    retiring: false,
  });
  tryMatch();
}

function retireCourier() {
  const idleActive = couriers.filter((c) => c.state === "idle" && !c.retiring);
  if (idleActive.length) {
    couriers.splice(couriers.indexOf(idleActive[idleActive.length - 1]), 1);
    return;
  }
  const busy = couriers.filter((c) => c.state !== "idle" && !c.retiring);
  if (busy.length) busy[busy.length - 1].retiring = true;
}

function pruneRetiredRestaurants() {
  const stillNeeded = new Set(
    [
      ...unclaimedOrders,
      ...activeOrders.filter((o) => o.pickedUpAt === null),
    ].map((o) => o.restaurant),
  );
  restaurants = restaurants.filter((r) => !r.retiring || stillNeeded.has(r));
}

// ═══════════════════════════════════════════════════════════════════
//  MATCHING  (greedy best-pair at each event)
// ═══════════════════════════════════════════════════════════════════

function tryMatch() {
  const idle = couriers.filter((c) => c.state === "idle" && !c.retiring);

  while (idle.length > 0 && unclaimedOrders.length > 0) {
    let bestScore = Infinity,
      bestCourier = null,
      bestOrder = null;

    for (const c of idle) {
      for (const o of unclaimedOrders) {
        // ETA circle radius: how far away a courier needs to be to arrive exactly on time
        const radius = COURIER_SPEED * Math.max(0, o.readyAt - simTime);
        const d = Math.hypot(c.x - o.restaurant.x, c.y - o.restaurant.y);
        // Minimize |distance − radius|: prefer the courier that arrives closest to ready time
        const score = Math.abs(d - radius);
        if (score < bestScore) {
          bestScore = score;
          bestCourier = c;
          bestOrder = o;
        }
      }
    }

    // Assign best pair
    bestOrder.courierId = bestCourier.id;
    bestCourier.order = bestOrder;
    bestCourier.state = "en-route-pickup";
    bestCourier.destX = bestOrder.restaurant.x;
    bestCourier.destY = bestOrder.restaurant.y;
    activeOrders.push(bestOrder);
    unclaimedOrders.splice(unclaimedOrders.indexOf(bestOrder), 1);
    idle.splice(idle.indexOf(bestCourier), 1);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  DRAWING
// ═══════════════════════════════════════════════════════════════════

function draw() {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // ETA circles for all orders not yet picked up
  const pendingOrders = [
    ...unclaimedOrders,
    ...activeOrders.filter((o) => o.pickedUpAt === null),
  ];

  for (const o of pendingOrders) {
    const radius = COURIER_SPEED * Math.max(0, o.readyAt - simTime);
    if (radius < 1) continue;
    const col = R_COLORS[o.restaurant.id % R_COLORS.length];
    const claimed = o.courierId !== null;
    ctx.beginPath();
    ctx.arc(o.restaurant.x, o.restaurant.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = col + (claimed ? "99" : "cc");
    ctx.lineWidth = claimed ? 1.5 : 2;
    ctx.setLineDash(claimed ? [3, 7] : [5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Route lines for assigned couriers
  for (const c of couriers) {
    if (!c.order) continue;
    const o = c.order;
    const col = R_COLORS[o.restaurant.id % R_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    if (c.state === "en-route-pickup" || c.state === "waiting-pickup") {
      ctx.lineTo(o.restaurant.x, o.restaurant.y);
    }
    ctx.lineTo(o.destX, o.destY);
    ctx.strokeStyle = col + "44";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Delivery destinations (× markers)
  for (const o of unclaimedOrders) {
    drawCross(
      o.destX,
      o.destY,
      R_COLORS[o.restaurant.id % R_COLORS.length] + "44",
      5,
    );
  }
  for (const o of activeOrders) {
    const alpha = o.pickedUpAt !== null ? "cc" : "77";
    drawCross(
      o.destX,
      o.destY,
      R_COLORS[o.restaurant.id % R_COLORS.length] + alpha,
      6,
    );
  }

  // Restaurants
  for (const r of restaurants) {
    const col = R_COLORS[r.id % R_COLORS.length];
    ctx.beginPath();
    ctx.arc(r.x, r.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = r.retiring ? col + "55" : col;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(r.retiring ? [3, 3] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = r.retiring ? "#ffffff88" : "#000";
    ctx.font = "bold 9px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("R" + r.id, r.x, r.y);
  }

  // Pulsing glow for orders that are ready but not yet picked up
  const realNow = performance.now();
  for (const o of pendingOrders) {
    if (simTime < o.readyAt) continue;
    const pulse = (Math.sin(realNow / 400) + 1) / 2;
    const pr = 4 + 7 * pulse;
    const alpha = Math.round((0.3 + 0.7 * pulse) * 255)
      .toString(16)
      .padStart(2, "0");
    ctx.beginPath();
    ctx.arc(o.restaurant.x, o.restaurant.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff" + alpha;
    ctx.fill();
  }

  // Couriers
  const COURIER_FILL = {
    idle: "#666688",
    "en-route-pickup": "#ffd93d",
    "waiting-pickup": "#ff9f43",
    "en-route-delivery": "#6bcb77",
  };
  for (const c of couriers) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = COURIER_FILL[c.state] ?? "#888";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash(c.retiring ? [3, 3] : []);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#000";
    ctx.font = "bold 8px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("C" + c.id, c.x, c.y);
  }

  // Sim-time overlay (top-left corner)
  const h = String(Math.floor(simTime / 60)).padStart(2, "0");
  const m = String(Math.floor(simTime % 60)).padStart(2, "0");
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(8, 8, 70, 24);
  ctx.fillStyle = "#c0c0e0";
  ctx.font = "bold 14px Courier New";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(h + ":" + m, 14, 20);
}

function drawCross(x, y, color, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ═══════════════════════════════════════════════════════════════════
//  STATS PANEL
// ═══════════════════════════════════════════════════════════════════

function updateStats() {
  const h = String(Math.floor(simTime / 60)).padStart(2, "0");
  const m = String(Math.floor(simTime % 60)).padStart(2, "0");
  document.getElementById("v-time").textContent = h + ":" + m;
  document.getElementById("v-completed").textContent = completedOrders;
  document.getElementById("v-inflight").textContent = activeOrders.length;
  document.getElementById("v-queued").textContent = unclaimedOrders.length;

  const liveCouriers = couriers.length;
  document.getElementById("p-restaurants").textContent = restaurants.filter(
    (r) => !r.retiring,
  ).length;
  document.getElementById("p-couriers").textContent = couriers.filter(
    (c) => !c.retiring,
  ).length;

  if (simTime > 10 && completedOrders > 0) {
    const shiftFraction = simTime / 60 / SHIFT_HOURS;
    const efficiency = completedOrders / liveCouriers / shiftFraction;
    document.getElementById("v-efficiency").textContent = efficiency.toFixed(1);

    const avgDelay = totalDelayMin / completedOrders;
    document.getElementById("v-delay").textContent =
      avgDelay.toFixed(1) + " min";
  }

  if (simTime > 0) {
    const utilization = (totalOccupiedMin / (liveCouriers * simTime)) * 100;
    document.getElementById("v-util").textContent =
      utilization.toFixed(1) + "%";
  }
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════

let lastTs = null;
let paused = false;

function loop(ts) {
  if (lastTs !== null) {
    if (!paused) {
      const dtReal = Math.min((ts - lastTs) / 1000, 0.1);
      step(dtReal);
    }
    draw();
    updateStats();
  }
  lastTs = ts;
  requestAnimationFrame(loop);
}

init();
requestAnimationFrame(loop);
