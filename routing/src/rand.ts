export function mulberry32(seed?: number) {
  return function () {
    if (seed === undefined) {
      seed = Math.floor(Math.random() * 0xffffffff);
    }
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function expRandom(mean: number) {
  return -Math.log(Math.random()) * mean;
}

export function pick<T>(pool: Iterable<T>) {
  const poolList = [...pool];
  const index = Math.floor(Math.random() * poolList.length);
  return poolList[index];
}

export function normalRandom(mean: number, stddev: number) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(1, mean + z * stddev);
}
