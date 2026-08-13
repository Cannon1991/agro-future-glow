"""
WCAG color-contrast + landmark/heading regression tests.

Runs axe-core (color-contrast, landmark and heading rule sets) against the
landing page at desktop / tablet / mobile viewports, plus a few structural
assertions axe doesn't cover directly (exactly one <main>, exactly one <h1>,
no skipped heading levels).

Run:
  python3 tests/a11y/contrast_landmarks.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
ROOT = Path(__file__).resolve().parents[2]
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

RULES = [
    # Contrast
    "color-contrast",
    # Landmarks
    "region",
    "landmark-one-main",
    "landmark-no-duplicate-main",
    "landmark-unique",
    "landmark-complementary-is-top-level",
    "bypass",
    # Headings
    "page-has-heading-one",
    "heading-order",
    "empty-heading",
]

VIEWPORTS = [
    ("desktop", {"width": 1280, "height": 1800}, False),
    ("tablet", {"width": 768, "height": 1024}, True),
    ("mobile", {"width": 390, "height": 844}, True),
]


def check(cond: bool, msg: str, failures: list[str]) -> None:
    print(f"  {'✓' if cond else '✗'} {msg}")
    if not cond:
        failures.append(msg)


async def wait_for_hydration(page) -> None:
    await page.wait_for_function(
        """() => {
            const el = document.querySelector('input[role="combobox"]');
            return !!el && Object.keys(el).some(k => k.startsWith('__reactProps$'));
        }""",
        timeout=30000,
    )


async def run_axe(page) -> dict:
    await page.add_script_tag(path=str(AXE))
    return await page.evaluate(
        """async (rules) => {
            const res = await window.axe.run(document, {
              runOnly: { type: 'rule', values: rules },
              resultTypes: ['violations'],
            });
            return {
              violations: res.violations.map(v => ({
                id: v.id,
                impact: v.impact,
                help: v.help,
                nodes: v.nodes.slice(0, 5).map(n => ({
                  target: n.target.join(' '),
                  summary: (n.failureSummary || '').split('\\n').filter(Boolean).slice(0, 3).join(' | '),
                })),
                count: v.nodes.length,
              })),
            };
        }""",
        RULES,
    )


async def run_suite(page, label: str, failures: list[str]) -> None:
    def chk(cond: bool, msg: str) -> None:
        check(cond, f"[{label}] {msg}", failures)

    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector("h1", timeout=30000)
    await wait_for_hydration(page)
    await page.wait_for_timeout(500)

    # ---- axe-core: contrast + landmarks + headings ----
    print(f"[{label}] axe-core scan")
    result = await run_axe(page)
    violations = result["violations"]
    contrast = [v for v in violations if v["id"] == "color-contrast"]
    structure = [v for v in violations if v["id"] != "color-contrast"]

    chk(not contrast, f"no WCAG color-contrast violations ({len(contrast)} rule hit(s))")
    chk(not structure, f"no landmark/heading violations ({len(structure)} rule hit(s))")
    for v in violations:
        print(f"    ! {v['id']} [{v['impact']}] x{v['count']}: {v['help']}")
        for n in v["nodes"]:
            print(f"        {n['target']} -> {n['summary']}")

    # ---- Structural assertions ----
    print(f"[{label}] Landmark & heading structure")
    counts = await page.evaluate(
        """() => ({
            main: document.querySelectorAll('main, [role="main"]').length,
            h1: document.querySelectorAll('h1').length,
            nav: document.querySelectorAll('nav, [role="navigation"]').length,
            headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
              .map(h => ({ level: Number(h.tagName[1]), text: (h.textContent || '').trim().slice(0, 40) })),
        })"""
    )
    chk(counts["main"] == 1, f"exactly one main landmark (got {counts['main']})")
    chk(counts["h1"] == 1, f"exactly one h1 (got {counts['h1']})")
    chk(counts["nav"] >= 1, f"at least one navigation landmark (got {counts['nav']})")

    headings = counts["headings"]
    chk(bool(headings) and headings[0]["level"] == 1, "first heading on the page is the h1")
    chk(all(h["text"] for h in headings), "no empty headings")

    skips = [
        f"h{prev['level']} -> h{cur['level']} at {cur['text']!r}"
        for prev, cur in zip(headings, headings[1:])
        if cur["level"] > prev["level"] + 1
    ]
    chk(not skips, f"no skipped heading levels ({'; '.join(skips) if skips else 'ok'})")

    await page.screenshot(path=str(SHOTS / f"contrast_landmarks_{label}.png"))


async def main() -> int:
    if not AXE.exists():
        print(f"axe-core not found at {AXE}; run `bun install` first.")
        return 1

    failures: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for label, viewport, is_mobile in VIEWPORTS:
            print(f"\n=== Viewport: {label} ({viewport['width']}x{viewport['height']}) ===")
            ctx = await browser.new_context(
                viewport=viewport,
                is_mobile=is_mobile,
                has_touch=is_mobile,
                device_scale_factor=2 if is_mobile else 1,
            )
            page = await ctx.new_page()
            try:
                await run_suite(page, label, failures)
            finally:
                await ctx.close()
        await browser.close()

    print()
    if failures:
        print(f"FAILED: {len(failures)} assertion(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All contrast, landmark and heading checks passed across all viewports.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
