"""Transparent, relative peril screening helpers.

These functions are intentionally simple and open. They are not BridgePoint's
private production models and must not be represented as actuarial, engineering,
or claim-coverage conclusions.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, float(value)))


@dataclass(frozen=True)
class WindScreen:
    index: float
    band: str
    inputs: dict
    interpretation: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class HailScreen:
    index: float
    band: str
    inputs: dict
    interpretation: str

    def to_dict(self) -> dict:
        return asdict(self)


def _band(score: float) -> str:
    if score >= 75:
        return "ELEVATED"
    if score >= 45:
        return "MODERATE"
    return "LOWER_RELATIVE"


def wind_screen(
    gust_mph: float,
    roof_age_years: float = 0,
    exposure_factor: float = 1.0,
    roof_complexity_factor: float = 1.0,
) -> WindScreen:
    """Return a relative wind-vulnerability screening index from 0..100.

    The formula is deliberately transparent and illustrative. It does not
    predict that a particular roof will fail at a particular wind speed.
    """
    if gust_mph < 0 or roof_age_years < 0:
        raise ValueError("gust_mph and roof_age_years must be non-negative")
    if exposure_factor <= 0 or roof_complexity_factor <= 0:
        raise ValueError("factors must be positive")

    hazard = _clamp((gust_mph - 20.0) / 80.0 * 70.0)
    age = _clamp(roof_age_years / 30.0 * 20.0, 0, 20)
    modifiers = _clamp((exposure_factor * roof_complexity_factor - 1.0) * 20.0, -10, 20)
    score = round(_clamp(hazard + age + modifiers), 1)
    return WindScreen(
        index=score,
        band=_band(score),
        inputs={
            "gust_mph": gust_mph,
            "roof_age_years": roof_age_years,
            "exposure_factor": exposure_factor,
            "roof_complexity_factor": roof_complexity_factor,
        },
        interpretation=(
            "Relative screening only. Validate roof construction, attachment, "
            "condition, code era, geometry, exposure and observed evidence before "
            "making engineering or claim conclusions."
        ),
    )


def hail_screen(
    hail_inches: float,
    roof_age_years: float = 0,
    material_susceptibility: float = 1.0,
) -> HailScreen:
    """Return a relative hail-exposure screening index from 0..100.

    This does not infer individual hailstone trajectories or confirm damage.
    """
    if hail_inches < 0 or roof_age_years < 0:
        raise ValueError("hail_inches and roof_age_years must be non-negative")
    if material_susceptibility <= 0:
        raise ValueError("material_susceptibility must be positive")

    hazard = _clamp(hail_inches / 3.0 * 75.0)
    age = _clamp(roof_age_years / 30.0 * 15.0, 0, 15)
    material = _clamp((material_susceptibility - 1.0) * 20.0, -10, 15)
    score = round(_clamp(hazard + age + material), 1)
    return HailScreen(
        index=score,
        band=_band(score),
        inputs={
            "hail_inches": hail_inches,
            "roof_age_years": roof_age_years,
            "material_susceptibility": material_susceptibility,
        },
        interpretation=(
            "Relative screening only. Radar/alert context does not prove damage at "
            "an individual property; confirm with source resolution and field evidence."
        ),
    )
