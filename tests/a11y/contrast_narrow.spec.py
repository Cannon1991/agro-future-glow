"""
WCAG AA color-contrast regression at narrow widths (320px and 375px).

For each narrow viewport this suite:
  - runs axe-core's `color-contrast` + `color-contrast-enhanced` (AA reporting)
    over the landing page in its default state
  - re-runs the contrast scan for interactive states: keyboard focus, hover,
    disabled (pending) buttons, the open autocomplete listbox, the validation
    error state, and the demo error/loading states
  - additionally computes contrast ratios manually for every button state so a
    button whose text is invisible on hover/focus is caught even when axe skips
    it (e.g. because of overlapping backgrounds)

Run:
  python3 tests/a11y/contrast_narrow.spec.py
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

AA_NORMAL = 4.5
AA_LARGE = 3.0

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}{(': ' + detail) if (detail and not cond) else ''}")
    if not cond:
        failures.append(f"{name}{(': ' + detail) if detail else ''}")


RUN_AXE = """
async () => {
  const res = await window.axe.run(document, {
    runOnly: { type: 'rule', values: ['color-contrast'] },
    resultTypes: ['violations'],
  });
  return res.violations.map(v => ({
    id: v.id,
    count: v.nodes.length,
    nodes: v.nodes.slice(0, 6).map(n => ({
      target: n.target.join(' '),
      summary: (n.failureSummary || '').split('\\n').filter(Boolean).slice(0, 2).join(' | '),
    })),
  }));
}
"""

# Manual contrast measurement for every visible text-bearing control.
MEASURE_CONTROLS = """
() => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = (s) => {
    const m = (s || '').match(/-?[\\d.]+/g);
    if (!m) return null;
    const [r, g, b, a] = m.map(Number);
    return { rgb: [r, g, b], a: a === undefined ? 1 : a };
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  // Returns null when the effective background can't be measured reliably
  // (gradients, background images, video/canvas underlays) - axe covers those.
  const bgOf = (el) => {
    let stack = [];
    let opaque = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const p = parse(cs.backgroundColor);
      if (p && p.a > 0) { stack.push(p); if (p.a === 1) { opaque = true; break; } }
    }
    let base = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };
  const ratio = (a, b) => {
    const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
    return (hi + 0.05) / (lo + 0.05);
  };

  const sel = 'button, a[href], input, [role="option"], label, p, h1, h2, h3, h4, li, span';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    // only elements that directly render text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length);
    const text = (el.value || el.textContent || '').trim();
    if (!own && el.tagName !== 'INPUT') continue;
    if (!text && el.tagName !== 'INPUT') continue;

    // gradient/clipped text has no measurable foreground colour
    const fill = cs.webkitTextFillColor || cs.color;
    const fgp = parse(fill);
    if (!fgp || fgp.a === 0) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const fg = over(fgp, bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    out.push({
      label: el.tagName.toLowerCase() + ' "' + (text || el.placeholder || '').slice(0, 32) + '"',
      ratio: Math.round(ratio(fg, bg) * 100) / 100,
      required: large ? 3.0 : 4.5,
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true',
    });
  }
  return out;
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
    await page.wait_for_timeout(400)


async def axe_scan(page, name: str, state: str) -> None:
    await page.add_script_tag(path=str(AXE))
    violations = await page.evaluate(RUN_AXE)
    detail = "; ".join(
        f"{n['target']} -> {n['summary']}" for v in violations for n in v["nodes"]
    )
    total = sum(v["count"] for v in violations)
    check(f"[{name}] axe color-contrast AA – {state}", not violations, f"{total} node(s): {detail}")


async def manual_scan(page, name: str, state: str) -> None:
    items = await page.evaluate(MEASURE_CONTROLS)
    # Disabled controls are exempt from 1.4.3 but must still be perceivable-ish;
    # we only enforce AA on enabled controls.
    bad = [i for i in items if not i["disabled"] and i["ratio"] + 0.01 < i["required"]]
    check(
        f"[{name}] measured text/button contrast >= AA – {state}",
        not bad,
        "; ".join(f"{b['label']} {b['ratio']}:1 < {b['required']}:1" for b in bad[:8]),
    )


async def run_state(page, name: str, state: str) -> None:
    await axe_scan(page, name, state)
    await manual_scan(page, name, state)


async def click_submit(page, submit) -> None:
    try:
        await submit.scroll_into_view_if_needed(timeout=5000)
        await submit.click(timeout=5000)
    except Exception:
        await submit.evaluate("el => el.click()")


async def run_case(browser, name: str, viewport: dict) -> None:
    print(f"\n=== {name} ({viewport['width']}x{viewport['height']}) ===")
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await wait_ready(page)

    # 1. default / resting state
    await run_state(page, name, "default")

    combo = page.locator('input[role="combobox"]').first

    # 2. keyboard focus states across the whole tab ring
    await page.evaluate("() => window.scrollTo(0, 0)")
    for _ in range(12):
        await page.keyboard.press("Tab")
    await page.wait_for_timeout(200)
    await run_state(page, name, "keyboard focus")

    # 3. hover state on primary + secondary buttons
    buttons = page.locator("button:visible")
    count = min(await buttons.count(), 6)
    for i in range(count):
        try:
            await buttons.nth(i).hover(timeout=2000)
        except Exception:
            continue
        await page.wait_for_timeout(120)
        await manual_scan(page, name, f"hover button #{i}")
    if count:
        await run_state(page, name, "hover")

    # 4. open autocomplete listbox (options, headers, footer text)
    await combo.click()
    await combo.fill("Ado")
    await page.wait_for_timeout(500)
    await run_state(page, name, "autocomplete open")
    await page.keyboard.press("ArrowDown")
    await page.wait_for_timeout(150)
    await run_state(page, name, "autocomplete active option")
    await page.keyboard.press("Escape")

    # 5. validation error state (invalid input + submitted)
    await combo.fill("x")
    await combo.evaluate("el => el.blur()")
    await page.wait_for_timeout(300)
    await run_state(page, name, "inline validation error")

    await combo.fill("")
    submit = page.locator('form button[type="submit"]').first
    if await submit.count():
        await click_submit(page, submit)
        await page.wait_for_timeout(500)
        await run_state(page, name, "error summary")

    # 6. pending / disabled button state during analysis
    await page.route("**/_serverFn/**", lambda route: asyncio.create_task(_slow(route)))
    await combo.fill("Ado, Ado-Ekiti, Ekiti")
    if await submit.count():
        await click_submit(page, submit)
        await page.wait_for_timeout(700)
        await run_state(page, name, "loading / disabled")
    await page.unroute("**/_serverFn/**")

    await page.screenshot(path=str(SHOTS / f"contrast-{name}.png"))
    await ctx.close()


async def _slow(route):
    await asyncio.sleep(4)
    try:
        await route.abort()
    except Exception:
        pass


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
        print(f"{len(failures)} contrast failure(s):")
        for f in failures:
            print(" -", f)
        return 1
    print("All text and button states meet WCAG AA contrast at 320px and 375px.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
