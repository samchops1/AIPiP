"""PIP-AutoFire Prototype

This module implements a demonstration workflow for automatically
handling Performance Improvement Plans (PIPs) and auto-firing
employees who fail to improve.  It is based on the PRD requirements
in the repository's documentation.  The code is designed for a
low-code/no-code environment such as Replit and purposely avoids
external dependencies beyond pandas, datetime, and json.

Usage:
    python pip_autofire.py

The script will generate a sample CSV file with employee metrics,
trigger PIP actions for underperforming employees, provide rule-based
coaching, monitor progress, and auto-fire employees who do not show
sufficient improvement.  All actions are logged to JSON files for
ethical and compliance auditing.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

import pandas as pd

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Kill-Switch for Reliability (Toggle to True to pause/rollback)
KILL_SWITCH = False

# Paths for generated files
METRICS_CSV = Path("employee_metrics.csv")
PIP_LOG = Path("pip_log.json")
TERMINATION_LOG = Path("termination_log.json")


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class PIP:
    employee_id: str
    start_date: str
    end_date: str
    goals: List[str]
    coaching: str


@dataclass
class Termination:
    employee_id: str
    reason: str
    date: str


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def generate_sample_data() -> pd.DataFrame:
    """Create a sample metrics CSV for demonstration purposes."""
    data = {
        "employee_id": ["E001", "E001", "E001", "E002", "E002", "E002"],
        "score": [65, 60, 55, 85, 88, 90],  # E001 will be flagged for PIP
        "date": [
            datetime.now() - timedelta(days=15),
            datetime.now() - timedelta(days=10),
            datetime.now() - timedelta(days=5),
            datetime.now() - timedelta(days=15),
            datetime.now() - timedelta(days=10),
            datetime.now() - timedelta(days=5),
        ],
    }
    df = pd.DataFrame(data)
    df.to_csv(METRICS_CSV, index=False)
    return df

def check_threshold(df: pd.DataFrame, *, threshold: int = 70, consecutive_low: int = 3) -> List[str]:
    """Return a list of employee IDs who fall below the threshold for the
    specified number of consecutive periods."""
    low_performers: List[str] = []
    for emp in df["employee_id"].unique():
        emp_df = df[df["employee_id"] == emp].sort_values("date").tail(consecutive_low)
        if len(emp_df) == consecutive_low and (emp_df["score"] < threshold).all():
            low_performers.append(emp)
    return low_performers

def log_json(obj: dict, path: Path) -> None:
    """Append a JSON object to the specified log file."""
    with path.open("a") as f:
        json.dump(obj, f)
        f.write("\n")

def generate_pip(emp_id: str, *, grace_days: int = 21) -> PIP:
    """Create a PIP structure and log it."""
    pip = PIP(
        employee_id=emp_id,
        start_date=datetime.now().strftime("%Y-%m-%d"),
        end_date=(datetime.now() + timedelta(days=grace_days)).strftime("%Y-%m-%d"),
        goals=["Achieve average score >80%", "Complete all assigned tasks"],
        coaching="Weekly automated feedback on performance metrics",
    )
    log_json(pip.__dict__, PIP_LOG)
    return pip

def provide_coaching(score: int) -> str:
    """Return rule-based coaching feedback for the given score."""
    if score < 60:
        return "Focus on improving tone and rubric adherence."
    return "Increase task completion rate for better results."

def check_progress(
    df: pd.DataFrame,
    emp_id: str,
    pip_start: datetime,
    *,
    grace_days: int = 21,
    min_improvement: int = 10,
) -> bool:
    """Evaluate post-PIP performance and log termination if required.

    Returns True if the employee was terminated, False otherwise.
    """
    pip_end = pip_start + timedelta(days=grace_days)
    post_pip_df = df[(df["employee_id"] == emp_id) & (df["date"] > pip_start)]
    if post_pip_df.empty:
        return False
    pre_avg = df[(df["employee_id"] == emp_id) & (df["date"] <= pip_start)]["score"].mean()
    post_avg = post_pip_df["score"].mean()
    improvement = ((post_avg - pre_avg) / pre_avg * 100) if pre_avg > 0 else 0
    if improvement < min_improvement:
        termination = Termination(
            employee_id=emp_id,
            reason=f"Improvement {improvement:.2f}% < {min_improvement}% threshold",
            date=pip_end.strftime("%Y-%m-%d"),
        )
        log_json(termination.__dict__, TERMINATION_LOG)
        return True
    return False

def display_dashboard(df: pd.DataFrame) -> None:
    """Print a simple dashboard summarizing performance metrics."""
    summary = df.groupby("employee_id").agg({"score": ["mean", "min", "max"]}).round(2)
    print("\nPerformance Dashboard:")
    print(summary)


# ---------------------------------------------------------------------------
# Main Workflow
# ---------------------------------------------------------------------------

def main() -> None:
    if KILL_SWITCH:
        print("Kill-switch activated: Workflow paused for rollback.")
        return

    df = generate_sample_data()
    print("Loaded Data:")
    print(df)

    low_performers = check_threshold(df)
    if low_performers:
        emp_id = low_performers[0]
        pip = generate_pip(emp_id)
        print("\nPIP Generated:")
        print(pip)

        coaching = provide_coaching(df[df["employee_id"] == emp_id]["score"].iloc[-1])
        print("\nCoaching Feedback:")
        print(coaching)

        # Simulate post-PIP data for demo purposes (employee fails to improve)
        new_data = pd.DataFrame({
            "employee_id": [emp_id],
            "score": [58],
            "date": [datetime.now() + timedelta(days=22)],
        })
        df = pd.concat([df, new_data], ignore_index=True)

        fired = check_progress(df, emp_id, datetime.now() - timedelta(days=21))
        if fired:
            print("\nAuto-Firing Triggered. See termination_log.json")
        else:
            print("\nImprovement Detected: PIP Successful.")

    display_dashboard(df)


if __name__ == "__main__":
    main()
