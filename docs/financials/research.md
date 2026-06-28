## Income

### Addressable restaurant base (Patras)

Data pulled live from efood and Wolt APIs (June 2026), cross-referenced via
fuzzy name matching.

| Platform                     | Food venues | All venues (incl. non-food) |
| ---------------------------- | ----------- | --------------------------- |
| efood                        | 429         | 530                         |
| Wolt                         | 246         | 246                         |
| On **both** platforms        | ~90         | —                           |
| **Total unique food venues** | **~585**    | —                           |

**efood methodology:** queried from three coordinate points covering the full
Patras municipality (city centre, Γούβα, Πόρτες). The single city-centre query
returns 474 venues but misses ~56 in the southern districts; the corrected total
is 530 (429 food + 101 non-food: mini markets, pharmacies, pet shops, florists,
wine shops).

**Wolt:** 246 unique venues across two query points. ~90 of these also appear on
efood (fuzzy-matched by name, ~5% error margin), so the platforms are largely
complementary rather than mirrors of each other.

**Exclusivity:** neither platform enforces exclusivity. Restaurants are free to
list on multiple platforms simultaneously; the low overlap (~15% of the 585
total) reflects economics and operational preference, not contractual lock-in.

### Total food venue count (Patras)

Estimating the full universe of food venues — not just those already on a
delivery platform — required triangulating multiple sources, as no single
authoritative dataset is freely available at city level.

- **Restaurant Guru (~1,960):** 787 "restaurants" + 1,172 hidden "non-restaurant
  eating places" (cafes, bakeries, bars).
- **Population-based estimate (~1,500–1,700):** Patras 216k people × ~7–8 food
  venues per 1,000 (university/port city, high cafe density).
- **TripAdvisor (254):** reviewed venues only; significant undercount.
- **ΓΕΜΗ — not suitable:** captures formal legal entities only; most small
  restaurants and cafes operate as ατομικές επιχειρήσεις registered with ΑΑΔΕ,
  not ΓΕΜΗ. The portal returned only 77 food/accommodation businesses for all of
  Achaia — clearly incomplete.

**Working estimate: ~1,500–2,000 total food venues in Patras.**

### Market segmentation for FairBite

| Segment                        | Venues      | Notes                               |
| ------------------------------ | ----------- | ----------------------------------- |
| Already on a delivery platform | ~585        | efood + Wolt combined, deduplicated |
| Not on any platform            | ~900–1,400  | Greenfield TAM                      |
| **Platform penetration**       | **~30–40%** |                                     |

- _Already on a platform (~585 venues):_ delivery-ready, existing platform
  relationship. Winning them requires better economics or tooling.
- _Not on any platform (~900–1,400 venues):_ greenfield TAM; no incumbent to
  displace. These venues have either never tried delivery or found existing
  platforms too costly.

### Total delivery GMV in Patras

**Working estimate: €15–20M/year (central case), range €10–30M.**

#### Source data

Verified from efood's ΓΕΜΗ-filed annual accounts and Delivery Hero's 2024 annual
report:

- efood Greece **total revenue 2024: €211M** (up 29% from €163.8M in 2023)
- efood **order commission revenue 2024: €136.2M** (up €29M YoY) — this is the
  fee charged to restaurants, a subset of total revenue, not GMV
- Delivery Hero Europe segment **GMV 2024: €8.88B** across 20+ countries — no
  Greece-specific breakdown is published
- Greek delivery market **total GMV 2022: €364.7M** (Stochasis research agency),
  up from €50M in 2018; extrapolating at ~18%/yr implies ~€500–600M by 2024
- Household penetration (IELKA survey, 2021): ~25–40% of internet users order
  via delivery apps — flagged as COVID-inflated, not a structural baseline

#### Top-down estimate

Patras as the 3rd city is heavily outweighed by Athens in delivery GMV. A
conservative 2–4% national share implies:

> €500–600M × 2–4% = **€10–24M/year**

#### Bottom-up estimate

> 585 venues × 8 orders/day × 365 days × €18 avg order value ≈ **€31M/year**

This is likely an upper bound: many of the 585 venues are cafes with low
delivery volume and are not open every day.

#### Uncertainty

The range is wide because no city-level data for Patras exists publicly, the
top-down relies on a national share assumption, and the bottom-up is sensitive
to the orders/day figure (halving it halves the result). The €15–20M central
case is a midpoint that weights the top-down slightly higher, given that Athens
disproportionately dominates Greek delivery GMV.

### Key operational constants

These are the input parameters for scenario modelling. Derived from efood's
ΓΕΜΗ-filed financials, Delivery Hero / Sensor Tower data, and industry
benchmarks — no Greek platform publishes these figures directly.

#### Average order value (AOV): €18 (range €16–22)

Derived: efood commission revenue €136.2M ÷ ~28% take rate = implied GMV ~€486M.
efood had ~1.5M active users (Sensor Tower, Q4 2024 peak). At ~18
orders/user/year (1.5× per month): ~27M total orders. €486M ÷ 27M ≈ **€18 per
order**. Cross-checks with Statista's Greece Meal Delivery ARPU of
$79/user/year.

#### Orders per restaurant per day

- **Platform average (all venues, incl. dormant):** ~3–4 orders/day — derived
  from 27M annual orders ÷ 21,000 efood stores.
- **Active, committed restaurant (mature platform):** 15–25 orders/day
- **Upper bound (popular, delivery-focused venue):** 30–40 orders/day
- **FairBite early phase (low customer adoption):** 5–10 orders/day

The long tail of low-activity cafes drags the platform average down sharply.
Planning should use the early-phase figure until customer adoption is
demonstrated.

#### Orders per courier per day: 20–25 (full 8-hour shift)

Patras is compact (~8km radius covers the full municipality), which reduces
transit time relative to Athens. At 4–6 orders/hour with realistic idle time
between peaks, a full-shift courier handles **20–30 orders/day**. Use 20–25 as
the planning figure to leave headroom for demand variability.

| Metric                         | Conservative | Central | Optimistic |
| ------------------------------ | -----------: | ------: | ---------: |
| AOV                            |          €16 |     €18 |        €22 |
| Orders/restaurant/day (early)  |            3 |       7 |         12 |
| Orders/restaurant/day (mature) |           10 |      18 |         35 |
| Orders/courier/day             |           15 |      22 |         30 |
