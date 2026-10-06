"""Run the open-license training pipeline. See training/README.md.

    python training/run_pipeline.py fetch
    python training/run_pipeline.py all
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable


def run(script: str, extra: list[str]) -> None:
    command = [PYTHON, str(ROOT / "training" / script), *extra]
    print("+", " ".join(command))
    subprocess.run(command, check=True, cwd=ROOT)


def main() -> None:
    parser = argparse.ArgumentParser(description="Open-license mushroom recognition pipeline")
    parser.add_argument(
        "stage",
        choices=("fetch", "prepare", "train", "evaluate", "export", "all"),
    )
    parser.add_argument("rest", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    extra = [item for item in args.rest if item != "--"]
    if args.stage in ("fetch", "all"):
        run("fetch_gbif.py", extra if args.stage == "fetch" else [])
    if args.stage in ("prepare", "all"):
        run("prepare_data.py", [])
    if args.stage in ("train", "all"):
        run("train.py", extra if args.stage == "train" else [])
    if args.stage in ("evaluate", "all"):
        run("evaluate.py", [])
    if args.stage in ("export", "all"):
        run("export_tflite.py", extra if args.stage == "export" else [])


if __name__ == "__main__":
    main()
