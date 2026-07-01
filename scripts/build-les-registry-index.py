#!/usr/bin/env python3
"""Build a compact registration lookup index from LesOutputJson export.

Usage:
  python3 scripts/build-les-registry-index.py "/path/to/LesOutputJson (1).json"
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = Path.home() / "Downloads" / "LesOutputJson (1).json"
OUT = ROOT / "static" / "tomuda" / "data" / "les-registry-index.json"


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    if not src.is_file():
        raise SystemExit(f"Source file not found: {src}")

    with src.open(encoding="utf-8") as f:
        payload = json.load(f)

    rows = payload.get("Data") or []
    index: dict[str, str] = {}
    for row in rows:
        if not row or len(row) < 2:
            continue
        reg = str(row[0]).strip()
        name = str(row[1]).strip() if row[1] is not None else ""
        if reg and name:
            index[reg] = name
            digits = re.sub(r"\D", "", reg)
            if digits and digits != reg:
                index.setdefault(digits, name)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(index)} entries to {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
