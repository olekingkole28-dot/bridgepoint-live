#!/usr/bin/env python3
"""BridgePoint Intelligence — Smart Supplement Detection public simulation.

This file is intentionally simple and simulated. It demonstrates the decision contract
without exposing BridgePoint production scoring logic, proprietary weights, customer data,
or restricted pricing sources.

Important: this demo does NOT fetch live NOAA data and does NOT determine coverage owed,
legal underpayment, engineering damage, or a guaranteed supplement amount.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone


@dataclass(frozen=True)
class RegionalBenchmark:
    location: str
    material_cost_per_square: float
    labor_multiplier: float
    benchmark_source: str = "SIMULATED_PUBLIC_DEMO"


@dataclass(frozen=True)
class PerilScreening:
    hail_size_inches: float
    wind_gust_mph: float
    observed_date: str
    source: str = "SIMULATED_SCENARIO"


class BridgePointSmartSupplementDemo:
    """Small public demonstration of BridgePoint's governed comparison workflow."""

    def __init__(self) -> None:
        self.regional_benchmarks = {
            "06457": RegionalBenchmark(
                location="Middletown, CT",
                material_cost_per_square=125.50,
                labor_multiplier=1.15,
            ),
            "FL_COASTAL_DEMO": RegionalBenchmark(
                location="Florida coastal demo market",
                material_cost_per_square=142.00,
                labor_multiplier=1.25,
            ),
            "HAIL_BELT_DEMO": RegionalBenchmark(
                location="Central U.S. hail-belt demo market",
                material_cost_per_square=118.00,
                labor_multiplier=1.10,
            ),
        }

    def run_screening(
        self,
        market_key: str,
        submitted_cost_per_square: float,
        total_squares: float,
        peril: PerilScreening,
    ) -> dict:
        if submitted_cost_per_square < 0 or total_squares <= 0:
            raise ValueError("Costs must be non-negative and total_squares must be positive.")

        benchmark = self.regional_benchmarks.get(
            market_key,
            RegionalBenchmark(
                location="Unmapped demo market",
                material_cost_per_square=110.00,
                labor_multiplier=1.00,
            ),
        )

        benchmark_cost_per_square = (
            benchmark.material_cost_per_square * benchmark.labor_multiplier
        )
        benchmark_total = benchmark_cost_per_square * total_squares
        submitted_total = submitted_cost_per_square * total_squares
        variance_amount = benchmark_total - submitted_total
        variance_percent = (
            variance_amount / submitted_total if submitted_total > 0 else None
        )

        elevated_peril_screen = (
            peril.hail_size_inches >= 1.5 or peril.wind_gust_mph >= 50
        )

        return {
            "registry_status": "SIMULATED_DEMO",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "simulation_only": True,
            "market_context": {
                "market_key": market_key,
                "location": benchmark.location,
                "benchmark_source": benchmark.benchmark_source,
            },
            "peril_screening": asdict(peril),
            "estimate_comparison": {
                "submitted_total": round(submitted_total, 2),
                "benchmark_total": round(benchmark_total, 2),
                "variance_amount": round(variance_amount, 2),
                "variance_percent": (
                    round(variance_percent, 4) if variance_percent is not None else None
                ),
                "variance_detected": abs(variance_amount) > 0.01,
            },
            "workflow": {
                "human_review_recommended": variance_amount > 0,
                "elevated_peril_review_recommended": elevated_peril_screen,
                "automatic_coverage_conclusion": False,
                "automatic_legal_conclusion": False,
                "guaranteed_payment": False,
            },
            "limitations": [
                "Demo benchmark values are simulated and are not a current market price list.",
                "Peril values are supplied scenario inputs and are not live NOAA observations.",
                "A positive variance does not prove coverage owed or wrongful underpayment.",
                "Production BridgePoint workflows require authorized evidence and human review.",
            ],
        }


if __name__ == "__main__":
    demo = BridgePointSmartSupplementDemo()

    result = demo.run_screening(
        market_key="06457",
        submitted_cost_per_square=115.00,
        total_squares=35,
        peril=PerilScreening(
            hail_size_inches=1.75,
            wind_gust_mph=58,
            observed_date="DEMO_DATE",
        ),
    )

    print(json.dumps(result, indent=2))
