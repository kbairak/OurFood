import highsLoader from "highs";
import wasmUrl from "highs/runtime?url";

type Highs = Awaited<ReturnType<typeof highsLoader>>;

export let highs: Highs | null = null;

highsLoader({ locateFile: () => wasmUrl }).then((h) => {
  highs = h;
});

export interface Candidate {
  // index of the courier in the participating-couriers array
  courierIndex: number;
  // ids of unclaimed orders this route picks up
  orderIds: number[];
  cost: number;
}

/**
 * Set-partitioning MIP: choose exactly one candidate route per courier so
 * that each unclaimed order is covered at most once, minimizing total
 * delivery delay plus a penalty for each order left unassigned.
 *
 * Returns the chosen candidate index per courier, or null if the solver
 * is unavailable or fails.
 */
export function solveAssignment(
  candidates: Candidate[],
  courierCount: number,
  orderIds: number[],
  // Cost of leaving each order unassigned this round. Must grow with the
  // order's age, otherwise serving an old order looks expensive (its
  // accrued delay lands in the objective) and old orders starve forever.
  penalties: number[],
): number[] | null {
  if (!highs) return null;

  const objTerms = candidates.map((c, i) => `${c.cost} y${i}`);
  orderIds.forEach((_, j) => objTerms.push(`${penalties[j]} u${j}`));

  const constraints: string[] = [];
  for (let c = 0; c < courierCount; c++) {
    const vars = candidates
      .map((cand, i) => (cand.courierIndex === c ? `y${i}` : null))
      .filter(Boolean);
    if (vars.length) {
      constraints.push(`courier${c}: ${vars.join(" + ")} = 1`);
    }
  }
  orderIds.forEach((orderId, j) => {
    const vars = candidates
      .map((cand, i) => (cand.orderIds.includes(orderId) ? `y${i}` : null))
      .filter(Boolean);
    constraints.push(`order${j}: ${[...vars, `u${j}`].join(" + ")} = 1`);
  });

  const binaries = [
    ...candidates.map((_, i) => `y${i}`),
    ...orderIds.map((_, j) => `u${j}`),
  ];

  const lp = [
    "Minimize",
    ` obj: ${objTerms.join(" + ")}`,
    "Subject To",
    ...constraints.map((c) => ` ${c}`),
    "Binary",
    ` ${binaries.join(" ")}`,
    "End",
  ].join("\n");

  let solution;
  try {
    solution = highs.solve(lp, { output_flag: false });
  } catch (e) {
    console.error("HiGHS solve failed", e);
    return null;
  }
  if (solution.Status !== "Optimal") {
    console.warn("HiGHS status:", solution.Status);
    return null;
  }

  const chosen: number[] = new Array(courierCount).fill(-1);
  candidates.forEach((cand, i) => {
    const col = solution.Columns[`y${i}`];
    if (col && "Primal" in col && col.Primal > 0.5) {
      chosen[cand.courierIndex] = i;
    }
  });
  return chosen;
}
