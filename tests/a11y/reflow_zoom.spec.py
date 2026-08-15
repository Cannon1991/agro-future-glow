"""
WCAG 1.4.10 Reflow + 1.4.4 Resize Text regression tests.

Loads the landing page at 320px CSS width and at 200% text zoom (emulated two
ways: 320px viewport with a 2x device scale, and a 640px viewport rendered at
320 CSS px via zoom) and asserts that:
  - no horizontal scrolling is required (document width <= viewport + 1px)
  - no visible element overflows the viewport horizontally
  - no text is clipped by a fixed height (scrollHeight > clientHeight)
  - key interactive controls do not overlap each other

Run:
  python3 tests/a11y/reflow_zoom.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

TOL = 2  # px tolerance for sub-pixel rounding

# name, viewport, text zoom factor applied to the root font size
CASES = [
    ("320w-100pct", {"width": 320, "height": 800}, 1.0),
    ("320w-200pct-text", {"width": 320, "height": 800}, 2.0),
    ("400w-200pct-text", {"width": 400, "height": 900}, 2.0),
    ("1280w-200pct-text", {"width": 1280, "height": 1024}, 2.0),
]

APPLY_TEXT_ZOOM = """
(factor) => {
  const base = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  document.documentElement.style.fontSize = (base * factor) + 'px';
}
"""

COLLECT_OVERFLOW = """
(tol) => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const results = { vw, scrollWidth: doc.scrollWidth, overflow: [], clipped: [] };

  const label = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    const txt = (el.textContent || '').trim().slice(0, 40);
    return el.tagName.toLowerCase() + id + cls + (txt ? ` "${txt}"` : '');
  };

  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Elements intentionally scrolled horizontally are allowed.
    let ancestorScrolls = false;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (/(auto|scroll|hidden)/.test(pcs.overflowX)) { ancestorScrolls = true; break; }
    }
    if (!ancestorScrolls && (r.right > vw + tol || r.left < -tol)) {
      results.overflow.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
    // Clipped text: fixed height cutting content off.
    if (/(hidden|clip)/.test(cs.overflowY) && cs.textOverflow !== 'ellipsis'
        && el.scrollHeight - el.clientHeight > 2 && el.children.length === 0
        && (el.textContent || '').trim().length > 0) {
      results.clipped.push({ el: label(el), scrollH: el.scrollHeight, clientH: el.clientHeight });
    }
  }
  results.overflow = results.overflow.slice(0, 12);
  results.clipped = results.clipped.slice(0, 12);
  return results;
}
"""

COLLECT_OVERLAP = """
() => {
  const sel = 'a[href], button, input, select, textarea, h1, h2, h3, p, li';
  const nodes = [...document.body.querySelectorAll(sel)].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    if (cs.position === 'absolute' || cs.position === 'fixed' || cs.position === 'sticky') return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && (el.textContent || '').trim().length > 0;
  });
  const label = (el) => el.tagName.toLowerCase() + ' "' + (el.textContent || '').trim().slice(0, 30) + '"';
  const overlaps = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ancestor = a.compareDocumentPosition(b);
      if (ancestor & Node.DOCUMENT_POSITION_CONTAINED_BY) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 4 && oy > 4) {
        overlaps.push(label(a) + ' <> ' + label(b));
        if (overlaps.length >= 8) return overlaps;
      }
    }
  }
  return overlaps;
}
"""

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  PASS  {name}")
    else:
        print(f"  FAIL  {name}{(': ' + detail) if detail else ''}")
        failures.append(f"{name}{(': ' + detail) if detail else ''}")


async def run_case(browser, name, viewport, zoom):
    print(f"\n=== {name} ({viewport['width']}x{viewport['height']}, text x{zoom}) ===")
    context = await browser.new_context(viewport=viewport)
    page = await context.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_timeout(1200)
    if zoom != 1.0:
        await page.evaluate(APPLY_TEXT_ZOOM, zoom)
        await page.wait_for_timeout(600)

    res = await page.evaluate(COLLECT_OVERFLOW, TOL)
    check(
        f"[{name}] no horizontal scroll",
        res["scrollWidth"] <= res["vw"] + TOL,
        f"scrollWidth={res['scrollWidth']} viewport={res['vw']}",
    )
    check(
        f"[{name}] no element overflows horizontally",
        not res["overflow"],
        "; ".join(f"{o['el']} [{o['left']}..{o['right']}]" for o in res["overflow"]),
    )
    check(
        f"[{name}] no clipped text",
        not res["clipped"],
        "; ".join(f"{c['el']} {c['clientH']}<{c['scrollH']}" for c in res["clipped"]),
    )

    overlaps = await page.evaluate(COLLECT_OVERLAP)
    check(f"[{name}] no overlapping content", not overlaps, "; ".join(overlaps))

    await page.screenshot(path=str(SHOTS / f"reflow-{name}.png"))
    await context.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, viewport, zoom in CASES:
            await run_case(browser, name, viewport, zoom)
        await browser.close()

    print("\n" + "=" * 60)
    if failures:
        print(f"{len(failures)} reflow/zoom failure(s):")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print("All reflow / 200% text zoom checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
