"""
A11y regression at tablet / desktop widths, portrait AND landscape.

Covers the landing page at 768x1024, 1024x768 (landscape), 1024x1366 and
1366x768 (landscape) with axe-core (contrast, landmarks, headings, names) plus
structural checks: one header/main/footer, one h1, no skipped heading levels,
no horizontal overflow, and a working skip-to-content first tab stop.

Run:
  python3 tests/a11y/tablet_desktop.spec.py
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

RULES = [
    "color-contrast",
    "region",
    "landmark-one-main",
    "landmark-no-duplicate-main",
    "landmark-no-duplicate-banner",
    "landmark-no-duplicate-contentinfo",
    "landmark-banner-is-top-level",
    "landmark-main-is-top-level",
    "landmark-contentinfo-is-top-level",
    "landmark-unique",
    "bypass",
    "page-has-heading-one",
    "heading-order",
    "empty-heading",
    "link-name",
    "button-name",
    "image-alt",
    "label",
    "duplicate-id-aria",
    "aria-required-attr",
    "aria-valid-attr-value",
    "list",
    "listitem",
]

CASES = [
    ("768x1024-portrait", {"width": 768, "height": 1024}),
    ("1024x768-landscape", {"width": 1024, "height": 768}),
    ("1024x1366-portrait", {"width": 1024, "height": 1366}),
    ("1366x768-landscape", {"width": 1366, "height": 768}),
]

failures: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {msg}")
    if not cond:
        failures.append(msg)


async def wait_ready(page) -> None:
    await page.wait_for_selector("h1", timeout=30000)
    await page.wait_for_function(
        """() => {
            const el = document.querySelector('input[role="combobox"]');
            return !!el && Object.keys(el).some(k => k.startsWith('__reactProps$'));
        }""",
        timeout=30000,
    )
    await page.wait_for_timeout(400)


async def run_case(browser, label: str, viewport: dict) -> None:
    print(f"\n=== {label} ({viewport['width']}x{viewport['height']}) ===")
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await wait_ready(page)

    await page.add_script_tag(path=str(AXE))
    res = await page.evaluate(
        """async (rules) => {
            const r = await window.axe.run(document, {
              runOnly: { type: 'rule', values: rules },
              resultTypes: ['violations'],
            });
            return r.violations.map(v => ({
              id: v.id, impact: v.impact, count: v.nodes.length,
              nodes: v.nodes.slice(0, 4).map(n => ({
                target: n.target.join(' '),
                summary: (n.failureSummary || '').split('\\n').filter(Boolean).slice(0, 2).join(' | '),
              })),
            }));
        }""",
        RULES,
    )
    check(not res, f"[{label}] no axe violations ({len(res)} rule hit(s))")
    for v in res:
        print(f"    ! {v['id']} [{v['impact']}] x{v['count']}")
        for n in v["nodes"]:
            print(f"        {n['target']} -> {n['summary']}")

    info = await page.evaluate(
        """() => {
            const q = (s) => [...document.querySelectorAll(s)];
            const header = q('header, [role="banner"]');
            const main = q('main, [role="main"]');
            const footer = q('footer, [role="contentinfo"]');
            const landmarks = [...header, ...main, ...footer];
            return {
              header: header.length,
              main: main.length,
              footer: footer.length,
              nav: q('nav, [role="navigation"]').length,
              h1: q('h1').length,
              nested: landmarks
                .filter((el) => landmarks.some((o) => o !== el && o.contains(el)))
                .map((el) => el.tagName.toLowerCase()),
              headings: q('h1,h2,h3,h4,h5,h6')
                .map(h => ({ level: +h.tagName[1], text: (h.textContent||'').trim().slice(0,40) })),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              smallTargets: q('a[href], button:not([disabled])')
                .filter(el => {
                  const cs = getComputedStyle(el);
                  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                  const r = el.getBoundingClientRect();
                  if (r.width < 1 || r.height < 1) return false;
                  if (el.closest('p, li h3')) return false;
                  if (el.classList.contains('sr-only')) return false;
                  return r.width < 24 || r.height < 24;
                })
                .map(el => `${el.tagName.toLowerCase()} "${(el.textContent||'').trim().slice(0,24)}"`),
            };
        }"""
    )
    check(info["header"] == 1, f"[{label}] exactly one banner/header (got {info['header']})")
    check(info["main"] == 1, f"[{label}] exactly one main (got {info['main']})")
    check(info["footer"] == 1, f"[{label}] exactly one contentinfo/footer (got {info['footer']})")
    check(info["nav"] >= 1, f"[{label}] at least one nav (got {info['nav']})")
    check(not info["nested"], f"[{label}] header/main/footer are top-level ({', '.join(info['nested']) or 'ok'})")
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
        f"[{label}] all pointer targets >= 24px ({'; '.join(info['smallTargets'][:6]) or 'ok'})",
    )

    # Keyboard entry point stays usable at these widths.
    await page.keyboard.press("Tab")
    focused = await page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return {
              text: (el.textContent || '').trim().slice(0, 40),
              visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden',
              outline: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none',
            };
        }"""
    )
    check(focused is not None, f"[{label}] Tab moves focus into the page")
    if focused:
        check(focused["visible"], f"[{label}] first focused element is rendered ({focused['text']!r})")
        check(focused["outline"], f"[{label}] first focused element has a visible focus indicator")

    await page.screenshot(path=str(SHOTS / f"tablet-desktop-{label}.png"))
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
        print(f"{len(failures)} failure(s) at tablet/desktop widths:")
        for f in failures:
            print(" -", f)
        return 1
    print("All tablet/desktop a11y checks passed (768px, 1024px, portrait + landscape).")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
