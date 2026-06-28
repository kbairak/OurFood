# Run with: uvx --with plotly --with numpy streamlit run scenarios.py

from dataclasses import dataclass
from typing import Annotated
import numpy as np
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ── Shared model ───────────────────────────────────────────────────────────────

COURIER_TIME_RATIO = (365 - 22) * 5 / 7 / 365
TOTAL_RESTAURANT_COUNT = 1200
TOTAL_ORDERS_PER_RESTAURANT_PER_DAY = 20


@dataclass
class InputAnnotation:
    group: str
    display: str
    default: float
    min: float
    max: float
    step: float


@dataclass
class Input:
    avg_order_value: Annotated[
        float, InputAnnotation("Operations", "Avg order value (€)", 18, 10, 35, 1)
    ] = 0.0
    orders_per_courier_per_day: Annotated[
        float, InputAnnotation("Operations", "Orders / courier / day", 30, 10, 60, 1)
    ] = 0.0
    restaurant_commision_cap: Annotated[
        float, InputAnnotation("Operations", "Commission cap", 0.30, 0.10, 0.45, 0.01)
    ] = 0.0
    per_order_fee: Annotated[
        float,
        InputAnnotation("Operations", "Per-order platform fee (€)", 0, 0, 3, 0.25),
    ] = 0.0
    variable_cost_over_gmv: Annotated[
        float,
        InputAnnotation(
            "Operations", "Variable costs (% of GMV)", 0.05, 0.01, 0.15, 0.005
        ),
    ] = 0.0
    growth_fund_contribution_rate: Annotated[
        float,
        InputAnnotation(
            "Operations", "Growth fund contribution rate", 0.05, 0.01, 0.20, 0.01
        ),
    ] = 0.0
    onboarding_cost_per_courier: Annotated[
        float,
        InputAnnotation(
            "Operations", "Onboarding cost / courier (€)", 320, 0, 600, 10
        ),
    ] = 0.0
    courier_wage: Annotated[
        float,
        InputAnnotation(
            "Staff costs", "Courier wage / month (€)", 2195, 1500, 3500, 50
        ),
    ] = 0.0
    courier_equipment_reimbursement: Annotated[
        float,
        InputAnnotation("Staff costs", "Courier equipment reimb (€)", 50, 0, 200, 10),
    ] = 0.0
    developer_count: Annotated[
        float, InputAnnotation("Staff costs", "Developer count", 2, 1, 5, 1)
    ] = 0.0
    developer_wage: Annotated[
        float,
        InputAnnotation(
            "Staff costs", "Developer cost / month (€)", 4281, 3000, 6000, 100
        ),
    ] = 0.0
    manager_count: Annotated[
        float, InputAnnotation("Staff costs", "Manager count", 1, 0, 3, 1)
    ] = 0.0
    manager_wage: Annotated[
        float,
        InputAnnotation(
            "Staff costs", "Manager cost / month (€)", 3302, 2000, 5000, 100
        ),
    ] = 0.0
    server_cost: Annotated[
        float, InputAnnotation("Opex", "Servers (€)", 400, 0, 2000, 50)
    ] = 0.0
    twilio_cost: Annotated[
        float, InputAnnotation("Opex", "Twilio (€)", 50, 0, 200, 10)
    ] = 0.0
    sentry_cost: Annotated[
        float, InputAnnotation("Opex", "Sentry (€)", 25, 0, 100, 5)
    ] = 0.0
    intercom_cost: Annotated[
        float, InputAnnotation("Opex", "Intercom (€)", 75, 0, 300, 25)
    ] = 0.0
    mixpanel_cost: Annotated[
        float, InputAnnotation("Opex", "Mixpanel (€)", 30, 0, 200, 10)
    ] = 0.0
    postmark_cost: Annotated[
        float, InputAnnotation("Opex", "Postmark (€)", 20, 0, 100, 5)
    ] = 0.0
    apple_store_cost: Annotated[
        float, InputAnnotation("Opex", "Apple Developer (€)", 9, 0, 20, 1)
    ] = 0.0
    docusign_cost: Annotated[
        float, InputAnnotation("Opex", "DocuSign (€)", 25, 0, 100, 5)
    ] = 0.0
    accounting_cost: Annotated[
        float, InputAnnotation("Opex", "Accounting (€)", 350, 100, 800, 50)
    ] = 0.0
    legal_cost: Annotated[
        float, InputAnnotation("Opex", "Legal (€)", 200, 0, 1000, 50)
    ] = 0.0
    rent: Annotated[float, InputAnnotation("Opex", "Rent (€)", 600, 0, 2000, 100)] = 0.0
    utilities_cost: Annotated[
        float, InputAnnotation("Opex", "Utilities (€)", 120, 0, 500, 20)
    ] = 0.0


@dataclass
class Output:
    gmv: float = 0.0
    ktlo: float = 0.0
    variable_costs: float = 0.0
    net_surplus: float = 0.0
    restaurant_reimbursement: float = 0.0
    growth_fund_contribution: float = 0.0
    deficit: float = 0.0
    effective_commission: float = 0.0
    courier_count: float = 0.0


def compute(orders_per_day: float, inp: Input, growth_fund_balance: float) -> Output:
    out = Output()
    food_gmv = orders_per_day * inp.avg_order_value * 30
    platform_fee_revenue = orders_per_day * 30 * inp.per_order_fee
    out.gmv = food_gmv + platform_fee_revenue

    k = inp.orders_per_courier_per_day
    out.courier_count = orders_per_day / k / COURIER_TIME_RATIO if k > 0 else 0

    out.variable_costs = out.gmv * inp.variable_cost_over_gmv
    courier_cost = out.courier_count * (
        inp.courier_wage + inp.courier_equipment_reimbursement
    )
    developer_cost = inp.developer_count * inp.developer_wage
    manager_cost = inp.manager_count * inp.manager_wage
    operational_expenses = sum(
        getattr(inp, v)
        for v in (
            "server_cost",
            "twilio_cost",
            "sentry_cost",
            "intercom_cost",
            "mixpanel_cost",
            "postmark_cost",
            "apple_store_cost",
            "docusign_cost",
            "accounting_cost",
            "legal_cost",
            "rent",
            "utilities_cost",
        )
    )
    out.ktlo = courier_cost + developer_cost + manager_cost + operational_expenses
    out.net_surplus = out.gmv - out.ktlo - out.variable_costs
    minimum_restaurant_reimbursement = (1 - inp.restaurant_commision_cap) * food_gmv
    growth_fund_target = 3 * out.ktlo

    if out.net_surplus > minimum_restaurant_reimbursement:
        out.growth_fund_contribution = max(
            0,
            min(
                out.net_surplus - minimum_restaurant_reimbursement,
                growth_fund_target - growth_fund_balance,
                out.net_surplus * inp.growth_fund_contribution_rate,
            ),
        )
    else:
        out.growth_fund_contribution = 0

    out.restaurant_reimbursement = max(
        out.net_surplus - out.growth_fund_contribution,
        minimum_restaurant_reimbursement,
    )
    out.effective_commission = (
        (food_gmv - out.restaurant_reimbursement) / food_gmv * 100
        if food_gmv > 0
        else 0.0
    )
    out.deficit = (
        out.ktlo
        + out.variable_costs
        + out.growth_fund_contribution
        + out.restaurant_reimbursement
        - out.gmv
    )
    return out


# ── Adoption helpers ──────────────────────────────────────────────────────────


def orders_per_day_from_adoption(
    restaurant_adoption: float, order_adoption: float
) -> float:
    return (
        TOTAL_RESTAURANT_COUNT
        * restaurant_adoption
        * TOTAL_ORDERS_PER_RESTAURANT_PER_DAY
        * order_adoption
    )


# ── Growth models ─────────────────────────────────────────────────────────────


def s_curve(month: int, ceiling: float, steepness: float) -> float:
    """Logistic function.
    steepness controls how many months to go from 10% to 90%:
      growth_rate ≈ 4.4 / steepness
    Midpoint at month where orders = ceiling/2.
    """
    k = 4.4 / steepness if steepness > 0 else 1.0
    midpoint = 3.0  # month 3 is where we transition from launch
    return ceiling / (1 + np.exp(-k * (month - midpoint)))


# ── Simulation ────────────────────────────────────────────────────────────────


@dataclass
class MonthRow:
    month: int
    orders_per_day: float
    gmv: float
    ktlo: float
    variable_costs: float
    restaurant_reimbursement: float
    deficit: float
    growth_fund_balance: float
    cash_remaining: float
    courier_count: float
    effective_commission: float
    new_couriers: float = 0.0
    onboarding_cost: float = 0.0


def simulate(
    inp: Input,
    initial_funding: float,
    m1_rest_adopt: float,
    m1_order_adopt: float,
    m2_rest_adopt: float,
    m2_order_adopt: float,
    m3_rest_adopt: float,
    m3_order_adopt: float,
    growth_model: str,
    linear_increment: float,
    s_ceiling: float,
    s_steepness: float,
    max_months: int = 60,
) -> tuple[list[MonthRow], bool, float, int | None]:
    """Returns (rows, deficit_grows_with_volume, funding_required, break_even_month)."""
    launch_ops = [
        orders_per_day_from_adoption(m1_rest_adopt, m1_order_adopt),
        orders_per_day_from_adoption(m2_rest_adopt, m2_order_adopt),
        orders_per_day_from_adoption(m3_rest_adopt, m3_order_adopt),
    ]

    cash = initial_funding
    gf = initial_funding  # initial funding IS the growth fund
    rows = []
    broke_even = False
    break_even_month = None
    gf_at_break_even = 0.0
    prev_deficit = None
    deficit_grows_with_volume_ever = False
    prev_orders = None
    prev_couriers = 0.0

    for m in range(1, max_months + 1):
        if m <= 3:
            opd = launch_ops[m - 1]
        elif growth_model == "Linear":
            opd = launch_ops[-1] + (m - 3) * linear_increment
        else:
            opd = s_curve(m, s_ceiling, s_steepness)

        r = compute(opd, inp, gf)

        new_couriers = max(0, r.courier_count - prev_couriers)
        onboarding_expense = new_couriers * inp.onboarding_cost_per_courier
        prev_couriers = r.courier_count

        # Everything drawn from the growth fund (single pool)
        gf -= r.deficit + onboarding_expense
        gf += r.growth_fund_contribution
        cash = gf  # alias for display

        rows.append(
            MonthRow(
                month=m,
                orders_per_day=opd,
                gmv=r.gmv,
                ktlo=r.ktlo,
                variable_costs=r.variable_costs,
                restaurant_reimbursement=r.restaurant_reimbursement,
                deficit=r.deficit,
                growth_fund_balance=gf,
                cash_remaining=cash,
                courier_count=r.courier_count,
                effective_commission=r.effective_commission,
                new_couriers=new_couriers,
                onboarding_cost=onboarding_expense,
            )
        )

        if not broke_even and r.deficit <= 0:
            broke_even = True
            break_even_month = m
            gf_at_break_even = gf

        if cash <= 0 and not broke_even:
            break

        # Detect if deficit grows with volume
        if prev_deficit is not None and prev_orders is not None and opd > prev_orders:
            if r.deficit > prev_deficit:
                deficit_grows_with_volume_ever = True
        prev_deficit = r.deficit
        prev_orders = opd

    if not broke_even:
        break_even_month = None

    funding_required = initial_funding - gf_at_break_even if broke_even else 0.0

    return rows, deficit_grows_with_volume_ever, funding_required, break_even_month


# ── Streamlit app ─────────────────────────────────────────────────────────────

st.set_page_config(page_title="FairBite — Scenarios", layout="wide")
st.title("FairBite — Scenario Planner")

# ── Sidebar: launch adoption ──────────────────────────────────────────────────

st.sidebar.header("Launch phase (months 1–3)")

m1_rest = st.sidebar.slider(
    "Month 1 — Restaurant adoption", 0.0, 0.50, 0.05, 0.01, format="percent"
)
m1_order = st.sidebar.slider(
    "Month 1 — Order adoption", 0.0, 0.50, 0.05, 0.01, format="percent"
)
m1_opd = orders_per_day_from_adoption(m1_rest, m1_order)
st.sidebar.caption(f"→ **{m1_opd:.0f}** orders/day")

m2_rest = st.sidebar.slider(
    "Month 2 — Restaurant adoption", 0.0, 0.50, 0.08, 0.01, format="percent"
)
m2_order = st.sidebar.slider(
    "Month 2 — Order adoption", 0.0, 0.50, 0.07, 0.01, format="percent"
)
m2_opd = orders_per_day_from_adoption(m2_rest, m2_order)
st.sidebar.caption(f"→ **{m2_opd:.0f}** orders/day")

m3_rest = st.sidebar.slider(
    "Month 3 — Restaurant adoption", 0.0, 0.50, 0.12, 0.01, format="percent"
)
m3_order = st.sidebar.slider(
    "Month 3 — Order adoption", 0.0, 0.50, 0.10, 0.01, format="percent"
)
m3_opd = orders_per_day_from_adoption(m3_rest, m3_order)
st.sidebar.caption(f"→ **{m3_opd:.0f}** orders/day")

# ── Sidebar: growth model ─────────────────────────────────────────────────────

st.sidebar.header("Growth after month 3")
growth_model = st.sidebar.radio("Growth model", ["Linear", "S-curve"], horizontal=True)

if growth_model == "Linear":
    linear_increment = st.sidebar.slider("+Orders/day per month", 0, 200, 50, 5)
    s_ceiling = 2000
    s_steepness = 3.0
else:
    linear_increment = 0
    s_ceiling = st.sidebar.slider("Ceiling (max orders/day)", 200, 2000, 1200, 50)
    s_steepness = st.sidebar.slider("Steepness (months, 10%→90%)", 1, 24, 6, 1)

# ── Sidebar: funding ──────────────────────────────────────────────────────────

st.sidebar.header("Funding")
initial_funding = st.sidebar.slider(
    "Initial funding (€)", 0, 500_000, 100_000, 10_000, format="€%d"
)

# ── Sidebar: financial parameters ─────────────────────────────────────────────

st.sidebar.header("Financial parameters")
with st.sidebar.expander("Operations", expanded=False):
    avg_order_value = st.sidebar.slider("Avg order value (€)", 10, 35, 18, 1)
    orders_per_courier_per_day = st.sidebar.slider(
        "Orders / courier / day", 10, 60, 30, 1
    )
    restaurant_commision_cap = st.sidebar.slider(
        "Commission cap", 0.10, 0.45, 0.30, 0.01
    )
    per_order_fee = st.sidebar.slider("Per-order platform fee (€)", 0.0, 3.0, 0.0, 0.25)
    variable_cost_over_gmv = st.sidebar.slider(
        "Variable costs (% of GMV)", 0.01, 0.15, 0.05, 0.005
    )
    growth_fund_contribution_rate = st.sidebar.slider(
        "Growth fund contribution rate", 0.01, 0.20, 0.05, 0.01
    )
    onboarding_cost_per_courier = st.sidebar.slider(
        "Onboarding cost / courier (€)", 0, 600, 320, 10
    )

with st.sidebar.expander("Staff costs", expanded=False):
    courier_wage = st.sidebar.slider("Courier wage / month (€)", 1500, 3500, 2195, 50)
    courier_equipment_reimbursement = st.sidebar.slider(
        "Courier equipment reimb (€)", 0, 200, 50, 10
    )
    developer_count = st.sidebar.slider("Developer count", 1, 5, 2, 1)
    developer_wage = st.sidebar.slider(
        "Developer cost / month (€)", 3000, 6000, 4281, 100
    )
    manager_count = st.sidebar.slider("Manager count", 0, 3, 1, 1)
    manager_wage = st.sidebar.slider("Manager cost / month (€)", 2000, 5000, 3302, 100)

with st.sidebar.expander("Opex", expanded=False):
    server_cost = st.sidebar.slider("Servers (€)", 0, 2000, 400, 50)
    twilio_cost = st.sidebar.slider("Twilio (€)", 0, 200, 50, 10)
    sentry_cost = st.sidebar.slider("Sentry (€)", 0, 100, 25, 5)
    intercom_cost = st.sidebar.slider("Intercom (€)", 0, 300, 75, 25)
    mixpanel_cost = st.sidebar.slider("Mixpanel (€)", 0, 200, 30, 10)
    postmark_cost = st.sidebar.slider("Postmark (€)", 0, 100, 20, 5)
    apple_store_cost = st.sidebar.slider("Apple Developer (€)", 0, 20, 9, 1)
    docusign_cost = st.sidebar.slider("DocuSign (€)", 0, 100, 25, 5)
    accounting_cost = st.sidebar.slider("Accounting (€)", 100, 800, 350, 50)
    legal_cost = st.sidebar.slider("Legal (€)", 0, 1000, 200, 50)
    rent = st.sidebar.slider("Rent (€)", 0, 2000, 600, 100)
    utilities_cost = st.sidebar.slider("Utilities (€)", 0, 500, 120, 20)

# ── Build Input ───────────────────────────────────────────────────────────────

inp = Input(
    avg_order_value=avg_order_value,
    orders_per_courier_per_day=orders_per_courier_per_day,
    restaurant_commision_cap=restaurant_commision_cap,
    per_order_fee=per_order_fee,
    variable_cost_over_gmv=variable_cost_over_gmv,
    growth_fund_contribution_rate=growth_fund_contribution_rate,
    onboarding_cost_per_courier=onboarding_cost_per_courier,
    courier_wage=courier_wage,
    courier_equipment_reimbursement=courier_equipment_reimbursement,
    developer_count=developer_count,
    developer_wage=developer_wage,
    manager_count=manager_count,
    manager_wage=manager_wage,
    server_cost=server_cost,
    twilio_cost=twilio_cost,
    sentry_cost=sentry_cost,
    intercom_cost=intercom_cost,
    mixpanel_cost=mixpanel_cost,
    postmark_cost=postmark_cost,
    apple_store_cost=apple_store_cost,
    docusign_cost=docusign_cost,
    accounting_cost=accounting_cost,
    legal_cost=legal_cost,
    rent=rent,
    utilities_cost=utilities_cost,
)

# ── Simulate ──────────────────────────────────────────────────────────────────

rows, deficit_grows, funding_required, be_month = simulate(
    inp,
    initial_funding,
    m1_rest,
    m1_order,
    m2_rest,
    m2_order,
    m3_rest,
    m3_order,
    growth_model,
    linear_increment,
    s_ceiling,
    s_steepness,
)

# ── Summary banner ────────────────────────────────────────────────────────────

st.subheader("Summary")

col1, col2, col3, col4 = st.columns(4)

with col1:
    if be_month:
        st.metric("Break-even month", be_month)
    else:
        if deficit_grows:
            st.metric(
                "Break-even",
                "Impossible",
                help="Deficit grows with order volume — check courier efficiency and order value.",
            )
        else:
            st.metric(
                "Break-even",
                "Not reached (in 60 months)",
                delta="Reduce deficit or increase ramp",
            )

with col2:
    peak_deficit = max((r.deficit for r in rows), default=0)
    st.metric("Peak monthly deficit", f"€{peak_deficit:,.0f}")

with col3:
    st.metric(
        "Funding required to break even",
        f"€{funding_required:,.0f}",
        delta=f"€{initial_funding - funding_required:+,.0f}" if be_month else None,
        delta_color="inverse",
    )

with col4:
    final_cash = rows[-1].cash_remaining if rows else initial_funding
    st.metric("Cash remaining at end", f"€{final_cash:,.0f}")

if deficit_grows and not be_month:
    st.warning(
        "Deficit grows with order volume. Break-even is impossible under current parameters. Try increasing orders/courier/day or average order value, or adding a platform fee."
    )

# ── Table ─────────────────────────────────────────────────────────────────────

st.subheader("Month-by-month projection")

table_data = []
for r in rows:
    total_expenses = r.ktlo + r.variable_costs + r.restaurant_reimbursement
    table_data.append(
        {
            "Mo": r.month,
            "Orders/d": f"{r.orders_per_day:.0f}",
            "Couriers": f"{r.courier_count:.1f}",
            "+Couriers": f"{r.new_couriers:.1f}",
            "OnbCost": f"€{r.onboarding_cost:,.0f}",
            "GMV": f"€{r.gmv:,.0f}",
            "KTLO": f"€{r.ktlo:,.0f}",
            "VarCost": f"€{r.variable_costs:,.0f}",
            "RestReim": f"€{r.restaurant_reimbursement:,.0f}",
            "Cash": f"€{r.cash_remaining:,.0f}",
            "EffComm": f"{r.effective_commission:.1f}%",
        }
    )

st.dataframe(
    table_data,
    column_config={
        "Mo": st.column_config.NumberColumn("Mo", width="small"),
        "Orders/d": st.column_config.TextColumn("Orders/d", width="small"),
        "Couriers": st.column_config.TextColumn("Couriers", width="small"),
        "+Couriers": st.column_config.TextColumn("+Couriers", width="small"),
        "OnbCost": st.column_config.TextColumn("OnbCost", width="small"),
        "GMV": st.column_config.TextColumn("GMV", width="small"),
        "KTLO": st.column_config.TextColumn("KTLO", width="small"),
        "VarCost": st.column_config.TextColumn("VarCost", width="small"),
        "RestReim": st.column_config.TextColumn("RestReim", width="small"),
        "Cash": st.column_config.TextColumn("Cash", width="small"),
        "EffComm": st.column_config.TextColumn("EffComm", width="small"),
    },
    width="stretch",
    hide_index=True,
)

# ── Chart ─────────────────────────────────────────────────────────────────────

months = [r.month for r in rows]
orders = [r.orders_per_day for r in rows]
deficits = [r.deficit for r in rows]
cash = [r.cash_remaining for r in rows]

fig = make_subplots(
    rows=3,
    cols=1,
    shared_xaxes=True,
    subplot_titles=["Orders per day", "Monthly deficit", "Growth fund / Cash remaining"],
    vertical_spacing=0.10,
)

fig.add_trace(
    go.Scatter(x=months, y=orders, mode="lines+markers", name="Orders/day",
               line={"color": "#FFA15A", "width": 2}),
    row=1, col=1,
)

fig.add_trace(
    go.Bar(x=months, y=deficits, name="Deficit", marker_color="#EF553B"),
    row=2, col=1,
)
fig.add_hline(y=0, line_dash="dot", line_color="lightgray", row=2, col=1)

fig.add_trace(
    go.Scatter(
        x=months, y=cash, mode="lines", name="Cash remaining",
        line={"color": "#636EFA", "width": 3},
    ),
    row=3, col=1,
)
fig.add_hline(y=0, line_dash="dot", line_color="red", row=3, col=1)

fig.update_xaxes(title_text="Month", row=3, col=1)
fig.update_layout(height=600, margin={"t": 30, "b": 30}, hovermode="x unified")
st.plotly_chart(fig, width="stretch")

