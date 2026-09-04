"""
Runs every a11y spec, parses their output, and writes a machine-readable report
to public/a11y-report.json which powers the live /a11y dashboard.

For each check it records the viewport label, CSS width x height, text zoom,
current status and — crucially — when and where it LAST failed, so regressions
stay visible after a green re-run.

Usage:
  python3 tests/a11y/run_all.py            # run all suites
  python3 tests/a11y/run_all.py keyboard   # run suites matching a substring
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC_DIR = Path(__file__).resolve().parent
REPORT = ROOT / "public" / "a11y-report.json"

SUITES = [
    ("interactive_demo", "ARIA describedby / invalid / focus", "interactive_demo.spec.py"),
    ("keyboard_nav", "Keyboard focus order", "keyboard_nav.spec.py"),
    ("keyboard_320", "Keyboard reachability at 320px", "keyboard_320.spec.py"),
    ("contrast_landmarks", "Contrast, landmarks & headings", "contrast_landmarks.spec.py"),
    ("contrast_narrow", "Narrow-width color contrast", "contrast_narrow.spec.py"),
    ("landmarks_narrow", "Narrow-width landmarks & heading order", "landmarks_narrow.spec.py"),
    ("reduced_motion", "prefers-reduced-motion", "reduced_motion.spec.py"),
    ("live_regions", "ARIA live announcements", "live_regions.spec.py"),
    ("reflow_zoom", "Reflow at 200% text zoom", "reflow_zoom.spec.py"),
    ("mobile_page", "Mobile-first page (/mobile)", "mobile_page.spec.py"),
    ("tablet_desktop", "Tablet & desktop widths (768/1024, landscape)", "tablet_desktop.spec.py"),
]

HEADER_RE = re.compile(
    r"^===\s*(?:Viewport:\s*)?(?P<name>.+?)\s*\((?P<w>\d+)x(?P<h>\d+)(?:,\s*text x(?P<zoom>[\d.]+))?\)\s*===\s*$"
)
CHECK_RE = re.compile(r"^\s+(?P<mark>PASS|FAIL|✓|✗)\s+(?P<msg>.+?)\s*$")
FAIL_MARKS = {"FAIL", "✗"}


def parse(output: str) -> list[dict]:
    case = {"viewport": "default", "width": None, "height": None, "zoom": 1.0}
    checks: list[dict] = []
    for raw in output.splitlines():
        line = raw.rstrip()
        header = HEADER_RE.match(line.strip())
        if header:
            case = {
                "viewport": header.group("name"),
                "width": int(header.group("w")),
                "height": int(header.group("h")),
                "zoom": float(header.group("zoom") or 1.0),
            }
            continue
        m = CHECK_RE.match(line)
        if not m:
            continue
        msg = m.group("msg")
        # Strip the "[viewport]" prefix some suites add; the case already has it.
        label = re.sub(r"^\[[^\]]+\]\s*", "", msg)
        detail = ""
        if m.group("mark") in FAIL_MARKS and ": " in label:
            label, detail = label.split(": ", 1)
        checks.append({
            **case,
            "name": label.strip(),
            "detail": detail.strip(),
            "status": "fail" if m.group("mark") in FAIL_MARKS else "pass",
        })
    return checks


def key(suite: str, c: dict) -> str:
    return f"{suite}|{c['viewport']}|{c['zoom']}|{c['name']}"


def main() -> int:
    filt = sys.argv[1] if len(sys.argv) > 1 else ""
    now = datetime.now(timezone.utc).isoformat()

    previous: dict = {}
    if REPORT.exists():
        try:
            prev_doc = json.loads(REPORT.read_text())
            for s in prev_doc.get("suites", []):
                for c in s.get("checks", []):
                    previous[key(s["id"], c)] = c
        except (json.JSONDecodeError, KeyError):
            previous = {}

    suites = []
    exit_code = 0
    for suite_id, title, filename in SUITES:
        if filt and filt not in suite_id:
            # Keep the previous result for suites we skipped this run.
            prior = [c for k, c in previous.items() if k.startswith(f"{suite_id}|")]
            if prior:
                suites.append({
                    "id": suite_id,
                    "title": title,
                    "file": f"tests/a11y/{filename}",
                    "status": "skipped",
                    "ranAt": None,
                    "checks": prior,
                })
            continue

        print(f"\n### {title} ({filename})")
        proc = subprocess.run(
            [sys.executable, str(SPEC_DIR / filename)],
            capture_output=True,
            text=True,
            cwd=str(ROOT),
        )
        output = proc.stdout + "\n" + proc.stderr
        print(output)
        checks = parse(output)
        for c in checks:
            prior = previous.get(key(suite_id, c), {})
            if c["status"] == "fail":
                c["lastFailedAt"] = now
                c["lastFailureDetail"] = c["detail"]
                c["lastFailedViewport"] = c["viewport"]
                c["lastFailedSize"] = f"{c['width']}x{c['height']}"
                c["lastFailedZoom"] = c["zoom"]
            else:
                for k in ("lastFailedAt", "lastFailureDetail", "lastFailedViewport", "lastFailedSize", "lastFailedZoom"):
                    if k in prior:
                        c[k] = prior[k]
            c["lastRunAt"] = now

        failed = sum(1 for c in checks if c["status"] == "fail")
        crashed = proc.returncode != 0 and not checks
        if proc.returncode != 0:
            exit_code = 1
        suites.append({
            "id": suite_id,
            "title": title,
            "file": f"tests/a11y/{filename}",
            "status": "error" if crashed else ("fail" if failed else "pass"),
            "ranAt": now,
            "error": (output.strip()[-1200:] if crashed else None),
            "checks": checks,
        })

    doc = {
        "generatedAt": now,
        "suites": suites,
        "totals": {
            "checks": sum(len(s["checks"]) for s in suites),
            "failing": sum(1 for s in suites for c in s["checks"] if c["status"] == "fail"),
            "suites": len(suites),
            "failingSuites": sum(1 for s in suites if s["status"] in ("fail", "error")),
        },
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"\nReport written to {REPORT.relative_to(ROOT)} "
          f"({doc['totals']['failing']} failing of {doc['totals']['checks']} checks)")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
