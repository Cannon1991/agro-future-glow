"""
Semantic landmark + heading-order regression at narrow widths (320px / 375px).

Asserts:
  - exactly one <header>/banner, one <main>, one <footer>/contentinfo
  - those landmarks are top-level (not nested inside each other)
  - at least one <nav>, with unique accessible names when there are several
  - exactly one <h1>, it is the first heading, no skipped levels, no empty headings
  - axe-core landmark/heading rule set reports no violations

Run:
  python3 tests/a11y/landmarks_narrow.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
ROOT = Path(__file__).resolve().parents[2]
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

VIEWPORTS = [
    ("320w", {"width": 320, "height": 640}),
    ("375w", {"width": 375, "height": 667}),
]

RULES = [
    "landmark-one-main",
    "landmark-no-duplicate-main",
    "landmark-no-duplicate-banner",
    "landmark-no-duplicate-contentinfo",
    "landmark-banner-is-top-level",
    "landmark-main-is-top-level",
    "landmark-contentinfo-is-top-level",
    "landmark-complementary-is-top-level",
    "landmark-unique",
    "region",
    "bypass",
    "page-has-heading-one",
    "heading-order",
    "empty-heading",
]

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}{(': ' + detail) if (detail and not cond) else ''}")
    if not cond:
        failures.append(f"{name}{(': ' + detail) if detail else ''}")


COLLECT = """
() => {
  const q = (s) => [...document.querySelectorAll(s)];
  const nameOf = (el) =>
    (el.getAttribute('aria-label') || '').trim() ||
    (el.getAttribute('aria-labelledby')
      ? (document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || '').trim()
      : '');
  const header = q('header, [role="banner"]');
  const main = q('main, [role="main"]');
  const footer = q('footer, [role="contentinfo"]');
  const nav = q('nav, [role="navigation"]');
  const landmarks = [...header, ...main, ...footer];
  const nested = landmarks
    .filter((el) => landmarks.some((o) => o !== el && o.contains(el)))
    .map((el) => el.tagName.toLowerCase());
  return {
    header: header.length,
    main: main.length,
    footer: footer.length,
    nav: nav.length,
    navNames: nav.map(nameOf),
    nested,
    mainHasSections: main[0] ? main[0].querySelectorAll('section').length : 0,
    headings: q('h1,h2,h3,h4,h5,h6').map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent || '').trim().slice(0, 40),
    })),
  };
}
"""


async def wait_ready(page) -> None:
    await page.wait_for_selector("h1", timeout=30000)
    await page.wait_for_function(
        """() => {
            const el = document.querySelector('input[role="combobox"]');
            return !!el && Object.keys(el).some(k => k.startsWith('__reactProps$'));
        }""",
        timeout=30000,
    )
    await page.wait_for_timeout(300)


async def run_axe(page, name: str) -> None:
    await page.add_script_tag(path=str(AXE))
    violations = await page.evaluate(
        """async (rules) => {
            const res = await window.axe.run(document, {
              runOnly: { type: 'rule', values: rules },
              resultTypes: ['violations'],
            });
            return res.violations.map(v => ({
              id: v.id,
              count: v.nodes.length,
              nodes: v.nodes.slice(0, 5).map(n => ({
                target: n.target.join(' '),
                summary: (n.failureSummary || '').split('\\n').filter(Boolean).slice(0, 2).join(' | '),
              })),
            }));
        }""",
        RULES,
    )
    detail = "; ".join(
        f"{v['id']} x{v['count']} {n['target']} -> {n['summary']}"
        for v in violations
        for n in v["nodes"]
    )
    check(f"[{name}] axe landmark/heading rules", not violations, detail)


async def run_case(browser, name: str, viewport: dict) -> None:
    print(f"\n=== {name} ({viewport['width']}x{viewport['height']}) ===")
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await wait_ready(page)

    d = await page.evaluate(COLLECT)

    check(f"[{name}] exactly one banner/header", d["header"] == 1, f"got {d['header']}")
    check(f"[{name}] exactly one main", d["main"] == 1, f"got {d['main']}")
    check(f"[{name}] exactly one contentinfo/footer", d["footer"] == 1, f"got {d['footer']}")
    check(f"[{name}] at least one navigation landmark", d["nav"] >= 1, f"got {d['nav']}")
    check(
        f"[{name}] header/main/footer are top-level",
        not d["nested"],
        f"nested: {', '.join(d['nested'])}",
    )
    check(
        f"[{name}] main contains the page sections",
        d["mainHasSections"] >= 1,
        f"got {d['mainHasSections']} section(s)",
    )

    names = [n for n in d["navNames"]]
    if d["nav"] > 1:
        check(
            f"[{name}] multiple navs have unique accessible names",
            all(names) and len(set(names)) == len(names),
            f"names: {names}",
        )

    headings = d["headings"]
    levels = [h["level"] for h in headings]
    check(f"[{name}] exactly one h1", levels.count(1) == 1, f"got {levels.count(1)}")
    check(f"[{name}] first heading is the h1", bool(levels) and levels[0] == 1, f"first: h{levels[0] if levels else '-'}")
    check(f"[{name}] no empty headings", all(h["text"] for h in headings))
    skips = [
        f"h{a['level']} -> h{b['level']} at {b['text']!r}"
        for a, b in zip(headings, headings[1:])
        if b["level"] > a["level"] + 1
    ]
    check(f"[{name}] no skipped heading levels", not skips, "; ".join(skips))

    await run_axe(page, name)
    await page.screenshot(path=str(SHOTS / f"landmarks-{name}.png"))
    await ctx.close()


async def main() -> int:
    if not AXE.exists():
        print(f"axe-core not found at {AXE}; run `bun install` first.")
        return 1
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, viewport in VIEWPORTS:
            await run_case(browser, name, viewport)
        await browser.close()

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} landmark/heading failure(s):")
        for f in failures:
            print(" -", f)
        return 1
    print("Landmarks and heading order are valid at 320px and 375px.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
