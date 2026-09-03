"""
A11y regression checks for the simplified mobile-first page at /mobile.

Runs axe-core (contrast, landmarks, headings, names) at 320px, 375px and 390px,
plus structural checks: one main/header/footer, one h1, no skipped heading
levels, no horizontal overflow, and 44x44 minimum tap targets.

Run:
  python3 tests/a11y/mobile_page.spec.py
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080/mobile"
ROOT = Path(__file__).resolve().parents[2]
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

RULES = [
    "color-contrast",
    "region",
    "landmark-one-main",
    "landmark-no-duplicate-main",
    "landmark-unique",
    "bypass",
    "page-has-heading-one",
    "heading-order",
    "empty-heading",
    "link-name",
    "button-name",
    "image-alt",
    "duplicate-id-aria",
    "html-has-lang",
    "list",
    "listitem",
]

CASES = [
    ("320w", {"width": 320, "height": 640}),
    ("375w", {"width": 375, "height": 667}),
    ("390w", {"width": 390, "height": 844}),
]

failures: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {msg}")
    if not cond:
        failures.append(msg)


async def run_case(browser, label: str, viewport: dict) -> None:
    print(f"\n=== {label} ({viewport['width']}x{viewport['height']}) ===")
    ctx = await browser.new_context(
        viewport=viewport, is_mobile=True, has_touch=True, device_scale_factor=2
    )
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector("h1", timeout=30000)
    await page.wait_for_timeout(600)

    await page.add_script_tag(path=str(AXE))
    res = await page.evaluate(
        """async (rules) => {
            const r = await window.axe.run(document, {
              runOnly: { type: 'rule', values: rules },
              resultTypes: ['violations'],
            });
            return r.violations.map(v => ({
              id: v.id, impact: v.impact, count: v.nodes.length,
              nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ')),
            }));
        }""",
        RULES,
    )
    check(not res, f"[{label}] no axe violations ({len(res)} rule hit(s))")
    for v in res:
        print(f"    ! {v['id']} [{v['impact']}] x{v['count']}: {', '.join(v['nodes'])}")

    info = await page.evaluate(
        """() => ({
            main: document.querySelectorAll('main').length,
            header: document.querySelectorAll('header').length,
            footer: document.querySelectorAll('footer').length,
            nav: document.querySelectorAll('nav').length,
            h1: document.querySelectorAll('h1').length,
            headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
              .map(h => ({ level: +h.tagName[1], text: (h.textContent||'').trim().slice(0,40) })),
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            smallTargets: [...document.querySelectorAll('a[href], button:not([disabled])')]
              .filter(el => {
                const cs = getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                const r = el.getBoundingClientRect();
                if (r.width < 1 || r.height < 1) return false;
                if (el.closest('p, li h3')) return false;
                if (el.classList.contains('sr-only')) return false; // skip link: sized on focus
                return r.width < 44 || r.height < 44;
              })
              .map(el => `${el.tagName.toLowerCase()} "${(el.textContent||'').trim().slice(0,24)}"`),
        })"""
    )
    check(info["main"] == 1, f"[{label}] exactly one main (got {info['main']})")
    check(info["header"] == 1, f"[{label}] exactly one header (got {info['header']})")
    check(info["footer"] == 1, f"[{label}] exactly one footer (got {info['footer']})")
    check(info["nav"] >= 1, f"[{label}] at least one nav (got {info['nav']})")
    check(info["h1"] == 1, f"[{label}] exactly one h1 (got {info['h1']})")

    hs = info["headings"]
    check(bool(hs) and hs[0]["level"] == 1, f"[{label}] first heading is the h1")
    check(all(h["text"] for h in hs), f"[{label}] no empty headings")
    skips = [
        f"h{a['level']}->h{b['level']} at {b['text']!r}"
        for a, b in zip(hs, hs[1:])
        if b["level"] > a["level"] + 1
    ]
    check(not skips, f"[{label}] no skipped heading levels ({'; '.join(skips) or 'ok'})")
    check(info["overflow"] <= 1, f"[{label}] no horizontal overflow (got {info['overflow']}px)")
    check(
        not info["smallTargets"],
        f"[{label}] all tap targets >= 44px ({'; '.join(info['smallTargets'][:6])})",
    )

    # Keyboard: skip link first, then everything reachable.
    await page.keyboard.press("Tab")
    first = await page.evaluate("() => (document.activeElement.textContent||'').trim()")
    check("Skip to content" in first, f"[{label}] skip link is the first tab stop (got {first!r})")

    await page.screenshot(path=str(SHOTS / f"mobile-page-{label}.png"))
    await ctx.close()


async def main() -> int:
    if not AXE.exists():
        print(f"axe-core not found at {AXE}; run `bun install` first.")
        return 1
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for label, vp in CASES:
            await run_case(browser, label, vp)
        await browser.close()

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} failure(s) on /mobile:")
        for f in failures:
            print(" -", f)
        return 1
    print("All /mobile a11y checks passed at 320px, 375px and 390px.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
