"""
Keyboard-only navigation checks at 320px width (WCAG 2.1.1, 2.4.3, 2.4.7).

At a 320px CSS viewport (and, as a control, 375px) this suite asserts:
  - every visible interactive element is reachable by Tab alone
  - focus order follows DOM/visual order (top-to-bottom, no jumps backwards)
  - each focused element has a visible focus indicator (outline / ring /
    box-shadow / border change versus its unfocused state)
  - no positive tabindex values and no keyboard traps (Tab always advances)
  - the focused element is scrolled into the viewport, not clipped offscreen

Run:
  python3 tests/a11y/keyboard_320.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

CASES = [
    ("320w", {"width": 320, "height": 640}),
    ("375w", {"width": 375, "height": 667}),
]

MAX_TABS = 200

INTERACTIVE_SEL = (
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), "
    "textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
)

COLLECT_INTERACTIVE = """
(sel) => {
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest('[inert]')) continue;
    el.setAttribute('data-kb-id', out.length.toString());
    out.push({
      style: {
        outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor, boxShadow: cs.boxShadow,
        borderColor: cs.borderColor, backgroundColor: cs.backgroundColor,
      },
      id: out.length,
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 40),
      top: Math.round(r.top + window.scrollY),
      tabindex: el.getAttribute('tabindex'),
    });
  }
  return out;
}
"""

ACTIVE_INFO = """
() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const r = el.getBoundingClientRect();
  return {
    kbId: el.getAttribute('data-kb-id'),
    tag: el.tagName.toLowerCase(),
    label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 40),
    top: Math.round(r.top + window.scrollY),
    inViewport: r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth,
    tabindex: el.getAttribute('tabindex'),
  };
}
"""

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}{(': ' + detail) if (detail and not cond) else ''}")
    if not cond:
        failures.append(f"{name}{(': ' + detail) if detail else ''}")


def visible_ring(unfocused: dict, focused: dict) -> bool:
    """A focus indicator counts when a visible outline appears, or any of the
    ring-capable properties changes between the unfocused and focused state."""
    if focused["outlineStyle"] not in ("none", "") and focused["outlineWidth"] not in ("0px", ""):
        return True
    for key in ("boxShadow", "borderColor", "backgroundColor", "outlineColor"):
        if unfocused.get(key) != focused.get(key):
            return True
    return False


async def run_case(browser, name: str, viewport: dict) -> None:
    print(f"\n=== {name} ({viewport['width']}x{viewport['height']}) ===")
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)

    expected = await page.evaluate(COLLECT_INTERACTIVE, INTERACTIVE_SEL)
    print(f"  {len(expected)} visible interactive element(s)")
    check(f"[{name}] page exposes interactive controls", len(expected) > 0)

    check(
        f"[{name}] no positive tabindex",
        all((e["tabindex"] in (None, "0", "-1")) for e in expected),
        "; ".join(f"{e['tag']} \"{e['label']}\" tabindex={e['tabindex']}" for e in expected if e["tabindex"] not in (None, "0", "-1")),
    )

    # Walk the whole tab ring from the top of the document.
    await page.evaluate("() => { window.scrollTo(0, 0); document.body.focus(); }")
    await page.keyboard.press("Tab")

    reached: list[int] = []
    order: list[dict] = []
    no_ring: list[str] = []
    offscreen: list[str] = []
    seen_signatures: set[str] = set()

    for _ in range(MAX_TABS):
        info = await page.evaluate(ACTIVE_INFO)
        if info is None:
            break
        sig = f"{info['kbId']}|{info['tag']}|{info['label']}|{info['top']}"
        if sig in seen_signatures:
            break  # wrapped around the ring / returned to the browser UI
        seen_signatures.add(sig)

        match = next(
            (e for e in expected if e["tag"] == info["tag"] and e["label"] == info["label"]
             and abs(e["top"] - info["top"]) <= 40 and e["id"] not in reached),
            None,
        )
        if match is not None:
            kb = match["id"]
            reached.append(kb)
            order.append(info)

            focused_style = await page.evaluate(
                "() => { const el = document.activeElement; const cs = getComputedStyle(el);"
                " return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth,"
                " outlineColor: cs.outlineColor, boxShadow: cs.boxShadow,"
                " borderColor: cs.borderColor, backgroundColor: cs.backgroundColor }; }"
            )
            baseline = match["style"]
            if not visible_ring(baseline, focused_style):
                no_ring.append(f'{info["tag"]} "{info["label"]}"')
            if not info["inViewport"]:
                offscreen.append(f'{info["tag"]} "{info["label"]}"')

        await page.keyboard.press("Tab")

    check(
        f"[{name}] tabbing advances (no keyboard trap)",
        len(reached) >= max(1, min(len(expected), 5)),
        f"only reached {len(reached)} of {len(expected)}",
    )

    missed = [e for e in expected if e["id"] not in set(reached)]
    check(
        f"[{name}] every interactive element is reachable by Tab",
        not missed,
        "; ".join(f'{m["tag"]} "{m["label"]}"' for m in missed[:10]),
    )

    # Focus order should progress down the page (allow small overlaps inside a row).
    regressions = []
    for prev, cur in zip(order, order[1:]):
        if cur["top"] < prev["top"] - 80:
            regressions.append(f'{prev["tag"]} "{prev["label"]}" -> {cur["tag"]} "{cur["label"]}"')
    check(
        f"[{name}] focus order follows visual order",
        not regressions,
        "; ".join(regressions[:6]),
    )

    check(f"[{name}] every focused element has a visible focus indicator", not no_ring, "; ".join(no_ring[:10]))
    check(f"[{name}] focused element is scrolled into view", not offscreen, "; ".join(offscreen[:10]))

    await page.screenshot(path=str(SHOTS / f"keyboard-{name}.png"))
    await ctx.close()


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, viewport in CASES:
            await run_case(browser, name, viewport)
        await browser.close()

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} keyboard navigation failure(s):")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print("All keyboard-only navigation checks passed at narrow widths.")


if __name__ == "__main__":
    asyncio.run(main())
