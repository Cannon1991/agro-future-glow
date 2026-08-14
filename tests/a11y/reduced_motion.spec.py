"""
WCAG reduced-motion regression tests (2.2.2 Pause/Stop/Hide, 2.3.3 Animation
from Interactions).

Loads the landing page with `prefers-reduced-motion: reduce` emulated at
desktop / tablet / mobile viewports and asserts that:
  - no element runs a non-instant CSS animation (incl. infinite loops)
  - no element runs a non-instant CSS transition
  - scroll-behavior is not "smooth"
  - the demo's loading skeletons / scan overlay are still rendered (motion is
    removed, content is not)
and, as a sanity control, that the same page DOES animate when reduced motion
is not requested (so the assertions above can actually fail).

Run:
  python3 tests/a11y/reduced_motion.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

MAX_MS = 1.0  # anything at or under this is considered "instant"

VIEWPORTS = [
    ("desktop", {"width": 1280, "height": 1800}, False),
    ("tablet", {"width": 768, "height": 1024}, True),
    ("mobile", {"width": 390, "height": 844}, True),
]

COLLECT_MOTION = """
(maxMs) => {
  const toMs = (v) => (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000)
    .filter(n => !Number.isNaN(n));

  const describe = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '').slice(0, 60);
    return el.tagName.toLowerCase() + (cls ? '.' + cls.trim().split(/\\s+/).join('.') : '');
  };

  const animated = [];
  const transitioned = [];
  const smoothScroll = [];

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);

    const names = (cs.animationName || 'none').split(',').map(s => s.trim());
    if (names.some(n => n && n !== 'none')) {
      const durs = toMs(cs.animationDuration);
      if (durs.some(d => d > maxMs)) {
        animated.push({
          el: describe(el),
          name: cs.animationName,
          duration: cs.animationDuration,
          iterations: cs.animationIterationCount,
        });
      }
    }

    const props = (cs.transitionProperty || 'none').split(',').map(s => s.trim());
    if (props.some(p => p && p !== 'none')) {
      const durs = toMs(cs.transitionDuration);
      if (durs.some(d => d > maxMs)) {
        transitioned.push({
          el: describe(el),
          property: cs.transitionProperty,
          duration: cs.transitionDuration,
        });
      }
    }

    if (cs.scrollBehavior === 'smooth') smoothScroll.push(describe(el));
  }

  return {
    animated: animated.slice(0, 8),
    animatedCount: animated.length,
    transitioned: transitioned.slice(0, 8),
    transitionedCount: transitioned.length,
    smoothScroll: smoothScroll.slice(0, 5),
    smoothScrollCount: smoothScroll.length,
    running: document.getAnimations().filter(a => a.playState === 'running').length,
  };
}
"""


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


async def load(page) -> None:
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector("h1", timeout=30000)
    await wait_for_hydration(page)
    await page.wait_for_timeout(400)


async def run_suite(page, label: str, failures: list[str]) -> None:
    def chk(cond: bool, msg: str) -> None:
        check(cond, f"[{label}] {msg}", failures)

    await load(page)

    print(f"[{label}] Static page motion")
    res = await page.evaluate(COLLECT_MOTION, MAX_MS)
    chk(res["animatedCount"] == 0, f"no running CSS animations ({res['animatedCount']} element(s))")
    chk(
        res["transitionedCount"] == 0,
        f"no non-instant CSS transitions ({res['transitionedCount']} element(s))",
    )
    chk(res["smoothScrollCount"] == 0, f"no smooth scroll-behavior ({res['smoothScrollCount']})")
    for item in res["animated"] + res["transitioned"]:
        print(f"    ! {item}")
    if res["smoothScroll"]:
        print(f"    ! smooth scroll on {res['smoothScroll']}")

    # ---- Loading state: skeletons must still render, just without motion ----
    print(f"[{label}] Demo loading state")
    field = page.locator('input[role="combobox"]').first
    await field.scroll_into_view_if_needed()
    await field.click()
    await page.keyboard.type("Ado LGA, Ekiti State", delay=20)
    await page.keyboard.press("Escape")
    await page.evaluate("document.querySelector('form').requestSubmit()")
    await page.wait_for_timeout(700)

    pending = await page.evaluate(
        """() => ({
            skeletons: document.querySelectorAll('.animate-pulse').length,
            spinners: document.querySelectorAll('.animate-spin').length,
        })"""
    )
    chk(
        pending["skeletons"] + pending["spinners"] > 0,
        f"loading indicators still render under reduced motion "
        f"({pending['skeletons']} skeleton(s), {pending['spinners']} spinner(s))",
    )

    res = await page.evaluate(COLLECT_MOTION, MAX_MS)
    chk(
        res["animatedCount"] == 0,
        f"loading skeletons/spinners do not animate ({res['animatedCount']} element(s))",
    )
    for item in res["animated"]:
        print(f"    ! {item}")

    await page.screenshot(path=str(SHOTS / f"reduced_motion_{label}.png"))


async def run_control(page, failures: list[str]) -> None:
    """Sanity check: without the preference, the page really does animate."""
    print("\n=== Control: prefers-reduced-motion: no-preference ===")
    await load(page)
    res = await page.evaluate(COLLECT_MOTION, MAX_MS)
    check(
        res["animatedCount"] > 0 or res["transitionedCount"] > 0,
        "control run detects motion (assertions above are meaningful)",
        failures,
    )


async def main() -> int:
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
                reduced_motion="reduce",
            )
            page = await ctx.new_page()
            try:
                await run_suite(page, label, failures)
            finally:
                await ctx.close()

        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 1800}, reduced_motion="no-preference"
        )
        page = await ctx.new_page()
        try:
            await run_control(page, failures)
        finally:
            await ctx.close()

        await browser.close()

    print()
    if failures:
        print(f"FAILED: {len(failures)} assertion(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All reduced-motion checks passed across all viewports.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
