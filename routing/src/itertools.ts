// removeAt([1, 2, 3], 1) // -> [1, 3]
export function removeAt<T>(arr: T[], i: number) {
  return [...arr.slice(0, i), ...arr.slice(i + 1)];
}

// range(3) -> [0, 1, 2]
export function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

// [...subsets([1, 2, 3], 2)] // -> [[1, 2], [1, 3], [2, 3]]
export function* subsets<T>(pool: T[], size: number): Generator<T[]> {
  if (size === 0) {
    yield [];
    return;
  }

  for (let i = 0; i < pool.length; i++) {
    for (const subpool of subsets(pool.slice(i + 1), size - 1)) {
      yield [pool[i], ...subpool];
    }
  }
}

// [...subsetsUpTo([1, 2, 3], 2)] // -> [[], [1], [2], [3], [1, 2], [1, 3], [2, 3]]
export function* subsetsUpTo<T>(pool: T[], size: number): Generator<T[]> {
  for (let i = 0; i <= size; i++) {
    yield* subsets(pool, i);
  }
}

export function subsetsCount(poolSize: number, size: number) {
  if (size > poolSize) return 0;
  if (size === 0 || size === poolSize) return 1;
  let result = 1;
  for (let i = 0; i < size; i++) {
    result *= (poolSize - i) / (i + 1);
  }
  return result;
}

export function subsetsUpToCount(poolLength: number, size: number) {
  let total = 0;
  for (let k = 0; k <= size; k++) {
    total += subsetsCount(poolLength, k);
  }
  return total;
}

// flatten([[1, 2, 3], [4, 5]])  // -> [1, 2, 3, 4, 5]
export function flatten<T>(array: Iterable<Iterable<T>>) {
  return [...array].reduce((acc, val) => [...acc, ...val], [] as T[]);
}
