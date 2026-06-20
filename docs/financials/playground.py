# Run with: uvx --with plotly --with numpy streamlit run playground.py

import dataclasses
import typing
from dataclasses import dataclass
from typing import Annotated
import numpy as np
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ── Model ─────────────────────────────────────────────────────────────────────

COURIER_TIME_RATIO = (365 - 22) * 5 / 7 / 365


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
    orders_per_day: Annotated[
        float, InputAnnotation("Operations", "Orders per day", 60, 10, 2000, 10)
    ] = 0.0
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
    growth_fund_balance_ratio: Annotated[
        float,
        InputAnnotation(
            "Operations",
            "Growth fund fill level (0=empty, 1=full)",
            0.17,
            0.0,
            1.1,
            0.05,
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
class OutputAnnotation:
    display: str


@dataclass
class Output:
    courier_cost: Annotated[float, OutputAnnotation("Courier cost (€)")] = 0.0
    courier_count: Annotated[float, OutputAnnotation("Courier count")] = 0.0
    deficit: Annotated[float, OutputAnnotation("Monthly deficit (€)")] = 0.0
    gmv: Annotated[float, OutputAnnotation("Monthly GMV (€)")] = 0.0
    growth_fund_contribution: Annotated[
        float, OutputAnnotation("Growth fund contribution (€)")
    ] = 0.0
    ktlo: Annotated[float, OutputAnnotation("KTLO (€)")] = 0.0
    net_surplus: Annotated[float, OutputAnnotation("Net surplus (€)")] = 0.0
    operational_expenses: Annotated[
        float, OutputAnnotation("Operational expenses (€)")
    ] = 0.0
    restaurant_commission_pct: Annotated[
        float, OutputAnnotation("Effective commission (%)")
    ] = 0.0
    restaurant_reimbursement: Annotated[
        float, OutputAnnotation("Restaurant reimbursement (€)")
    ] = 0.0
    variable_costs: Annotated[float, OutputAnnotation("Variable costs (€)")] = 0.0


def compute(inp: Input) -> Output:
    output = Output()
    food_gmv = inp.orders_per_day * inp.avg_order_value * 30
    platform_fee_revenue = inp.orders_per_day * 30 * inp.per_order_fee
    output.gmv = food_gmv + platform_fee_revenue

    k = inp.orders_per_courier_per_day
    output.courier_count = inp.orders_per_day / k / COURIER_TIME_RATIO if k > 0 else 0

    output.variable_costs = output.gmv * inp.variable_cost_over_gmv
    output.courier_cost = output.courier_count * (
        inp.courier_wage + inp.courier_equipment_reimbursement
    )
    developer_cost = inp.developer_count * inp.developer_wage
    manager_cost = inp.manager_count * inp.manager_wage
    output.operational_expenses = sum(
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
    output.ktlo = (
        output.courier_cost
        + developer_cost
        + manager_cost
        + output.operational_expenses
    )
    output.net_surplus = output.gmv - output.ktlo - output.variable_costs
    minimum_restaurant_reimbursement = (1 - inp.restaurant_commision_cap) * food_gmv

    growth_fund_target = max(0, 1 - inp.growth_fund_balance_ratio) * 3 * output.ktlo
    growth_fund_cap_by_rate = output.net_surplus * inp.growth_fund_contribution_rate
    growth_fund_cap_by_surplus = output.net_surplus - minimum_restaurant_reimbursement
    output.growth_fund_contribution = max(
        min(growth_fund_target, growth_fund_cap_by_rate, growth_fund_cap_by_surplus),
        0,
    )

    output.restaurant_reimbursement = max(
        output.net_surplus - output.growth_fund_contribution,
        minimum_restaurant_reimbursement,
    )
    output.restaurant_commission_pct = (
        (food_gmv - output.restaurant_reimbursement) / food_gmv * 100
        if food_gmv > 0
        else 0.0
    )
    output.deficit = (
        output.ktlo
        + output.variable_costs
        + output.growth_fund_contribution
        + output.restaurant_reimbursement
        - output.gmv
    )
    return output


# ── Variable metadata ─────────────────────────────────────────────────────────


def _get_input_meta(name):
    meta_for = {f.name: f for f in dataclasses.fields(Input)}
    for arg in typing.get_args(meta_for[name].type):
        if isinstance(arg, InputAnnotation):
            return (arg.display, arg.default, arg.min, arg.max, arg.step)
    raise KeyError(name)


def _all_input_keys():
    return [f.name for f in dataclasses.fields(Input)]


def _build_groups():
    groups = {}
    for field in dataclasses.fields(Input):
        for arg in typing.get_args(field.type):
            if isinstance(arg, InputAnnotation):
                groups.setdefault(arg.group, []).append(field.name)
    return list(groups.items())


def _get_output_meta(name):
    meta_for = {f.name: f for f in dataclasses.fields(Output)}
    for arg in typing.get_args(meta_for[name].type):
        if isinstance(arg, OutputAnnotation):
            return arg.display
    raise KeyError(name)


def _all_output_keys():
    return [f.name for f in dataclasses.fields(Output)]


# ── App ───────────────────────────────────────────────────────────────────────

st.set_page_config(page_title="OurFood Playground", layout="wide")
st.title("OurFood — Financial Playground")

col_x, col_y = st.columns([1, 2])
with col_x:
    x_key = st.selectbox(
        "X axis (sweep)",
        _all_input_keys(),
        format_func=lambda k: _get_input_meta(k)[0],
    )
with col_y:
    y_keys = st.multiselect(
        "Y axis",
        _all_output_keys(),
        default=[
            "deficit",
            "growth_fund_contribution",
            "restaurant_commission_pct",
        ],
        format_func=_get_output_meta,
    )

# ── Sidebar ───────────────────────────────────────────────────────────────────

st.sidebar.header("Fixed parameters")
params = {}

x_label, x_default, x_vmin, x_vmax, x_step = _get_input_meta(x_key)

for group_label, keys in _build_groups():
    visible = [k for k in keys if k != x_key]
    if not visible:
        continue

    ctx = (
        st.sidebar.expander(group_label, expanded=(group_label != "Opex"))
        if group_label == "Opex"
        else None
    )

    def render_sliders(target, visible_keys):
        for key in visible_keys:
            label, default, vmin, vmax, step = _get_input_meta(key)
            if isinstance(step, float) or isinstance(default, float):
                params[key] = target.slider(
                    label,
                    float(vmin),
                    float(vmax),
                    float(default),
                    float(step),
                    key=key,
                )
            else:
                params[key] = target.slider(
                    label, int(vmin), int(vmax), int(default), int(step), key=key
                )

    if ctx is not None:
        with ctx:
            render_sliders(st, visible)
    else:
        st.sidebar.subheader(group_label)
        render_sliders(st.sidebar, visible)

# X-axis sweep range
st.sidebar.subheader(f"X range: {x_label}")
x_range = st.sidebar.slider(
    "Sweep range",
    int(x_vmin),
    int(x_vmax),
    (int(x_vmin), int(x_vmax)),
    int(x_step),
    key="_xrange",
)

# ── Compute sweep ─────────────────────────────────────────────────────────────

x_vals = np.linspace(x_range[0], x_range[1], 300)
results = {k: [] for k in y_keys}
for xv in x_vals:
    inp = Input(**{**params, x_key: xv})
    r = compute(inp)
    for k in y_keys:
        results[k].append(getattr(r, k))

# ── Plot ──────────────────────────────────────────────────────────────────────

if not y_keys:
    st.info("Select at least one Y-axis variable.")
else:
    colors = ["#636EFA", "#EF553B", "#00CC96", "#AB63FA", "#FFA15A"]

    fig = make_subplots(
        rows=len(y_keys),
        cols=1,
        shared_xaxes=True,
        subplot_titles=[_get_output_meta(k) for k in y_keys],
        vertical_spacing=0.08 if len(y_keys) > 1 else 0,
    )

    for i, k in enumerate(y_keys):
        fig.add_trace(
            go.Scatter(
                x=x_vals,
                y=results[k],
                mode="lines",
                name=_get_output_meta(k),
                line={"color": colors[i % len(colors)]},
                showlegend=False,
            ),
            row=i + 1,
            col=1,
        )
        fig.add_hline(y=0, line_dash="dot", line_color="lightgray", row=i + 1, col=1)

    fig.update_xaxes(title_text=x_label, row=len(y_keys), col=1)
    fig.update_layout(
        hovermode="x unified",
        height=280 * len(y_keys),
        margin={"t": 40, "b": 40},
    )
    st.plotly_chart(fig, use_container_width=True)
