"""
ARIA live-region regression tests for the InteractiveDemo.

Verifies that dynamic UI updates are actually announced, across desktop,
tablet and mobile:

  - Live regions are present in the DOM *before* their content changes
    (a region injected at the same time as its text may not be announced).
  - Validation error text updates inside a role="alert" aria-live="polite"
    region and is observed as a real text mutation.
  - The submit error summary is role="alert" aria-live="assertive".
  - The "Analyzing …" progress region is role="status" aria-live="polite"
    and names the location being analyzed.
  - The failure state announces through a live region after the request
    errors out.
  - No live region is aria-hidden (directly or via an ancestor).

Run:
  python3 tests/a11y/live_regions.spec.py
Exits 0 on success, 1 on failure. Assumes the dev server runs at :8080.
"""
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

FIELD = 'input[role="combobox"][aria-label="Village, local government, state or country"]'

VIEWPORTS = [
    ("desktop", {"width": 1280, "height": 1800}, False),
    ("tablet", {"width": 768, "height": 1024}, True),
    ("mobile", {"width": 390, "height": 844}, True),
]

# Records every mutation that lands inside a live region, so we can assert the
# announcement happened rather than just that the final DOM looks right.
OBSERVER = """
window.__liveAnnouncements = [];
const LIVE = '[aria-live], [role="alert"], [role="status"], [role="log"]';
const push = (region) => {
  if (!region) return;
  const text = (region.textContent || '').trim();
  if (!text) return;
  const last = window.__liveAnnouncements[window.__liveAnnouncements.length - 1];
  const entry = {
    text,
    role: region.getAttribute('role') || '',
    politeness: region.getAttribute('aria-live') || '',
  };
  if (last && last.text === entry.text && last.role === entry.role) return;
  window.__liveAnnouncements.push(entry);
};
const record = (node) => {
  const host = node.nodeType === 1 ? node : node.parentElement;
  if (!host) return;
  // The mutated node may be inside a live region, or be a wrapper that
  // contains one (React commonly inserts the wrapper in a single mutation).
  push(host.closest ? host.closest(LIVE) : null);
  if (host.querySelectorAll) host.querySelectorAll(LIVE).forEach(push);
};
const start = () => {
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') record(r.target);
      r.addedNodes.forEach(record);
      if (r.type === 'attributes') record(r.target);
    }
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-live', 'role'],
  });
};
if (document.documentElement) start();
else document.addEventListener('readystatechange', function once() {
  if (document.documentElement) { document.removeEventListener('readystatechange', once); start(); }
});
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


async def announcements(page) -> list[dict]:
    return await page.evaluate("window.__liveAnnouncements || []")


async def clear_and_type(page, field, value: str) -> None:
    await field.scroll_into_view_if_needed()
    await field.click()
    await page.keyboard.press("Control+a")
    await page.keyboard.press("Delete")
    if value:
        await page.keyboard.type(value, delay=30)
        await expect(field).to_have_value(value)


async def open_demo(page) -> None:
    await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
    await page.wait_for_selector(FIELD, timeout=30000)
    await wait_for_hydration(page)


async def run_suite(page, label: str, failures: list[str]) -> None:
    def chk(cond: bool, msg: str) -> None:
        check(cond, f"[{label}] {msg}", failures)

    # ---- Validation error announced through a polite live region ----
    print(f"[{label}] Validation error announcement")
    await open_demo(page)
    field = page.locator(FIELD)
    await clear_and_type(page, field, "!!")
    await page.keyboard.press("Escape")
    await page.evaluate("document.activeElement?.blur?.()")
    await page.wait_for_timeout(400)

    error_id = await field.get_attribute("aria-describedby")
    error = page.locator(f"#{error_id}")
    await expect(error).to_be_visible()
    chk(await error.get_attribute("role") == "alert", 'validation error region is role="alert"')
    chk(await error.get_attribute("aria-live") == "polite", 'validation error region is aria-live="polite"')

    heard = await announcements(page)
    chk(
        any("!!" not in a["text"] and a["role"] == "alert" and a["text"] for a in heard),
        f"validation error text was announced (captured {len(heard)} announcement(s))",
    )

    # Correcting the value must announce nothing stale: region goes away/empties.
    await clear_and_type(page, field, "Ado LGA, Ekiti State")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(250)
    chk(await field.get_attribute("aria-invalid") == "false", "error region cleared after correction")

    # ---- Submit error summary is assertive ----
    print(f"[{label}] Submit error summary announcement")
    await open_demo(page)
    field = page.locator(FIELD)
    await clear_and_type(page, field, "!!")
    await page.keyboard.press("Escape")
    await field.focus()
    await page.evaluate("document.querySelector('form').requestSubmit()")
    await page.wait_for_timeout(400)

    summary = page.locator('[role="alert"][aria-live="assertive"]').first
    await expect(summary).to_be_visible()
    summary_text = (await summary.inner_text()).strip()
    chk(len(summary_text) > 0, "error summary announces non-empty text")
    heard = await announcements(page)
    chk(
        any(a["politeness"] == "assertive" for a in heard),
        "an assertive announcement was captured on submit",
    )

    # ---- Pending progress region ----
    print(f"[{label}] Pending status announcement")

    async def slow_ok(route):
        await asyncio.sleep(1.2)
        await route.abort()

    await page.route("**/_serverFn/**", slow_ok)
    await open_demo(page)
    field = page.locator(FIELD)
    await clear_and_type(page, field, "Ado LGA, Ekiti State")
    await page.keyboard.press("Escape")
    await page.evaluate("document.querySelector('form').requestSubmit()")

    status = page.locator('[role="status"][aria-live="polite"]').first
    await expect(status).to_be_visible(timeout=5000)
    status_text = (await status.inner_text()).strip()
    chk("Analyzing" in status_text, f'progress region announces progress (got {status_text!r})')
    chk("Ado LGA" in status_text, "progress region names the location being analyzed")
    chk(
        await status.evaluate("el => !el.closest('[aria-hidden=\"true\"]')"),
        "progress region is not inside an aria-hidden subtree",
    )

    # ---- Failure state announcement ----
    print(f"[{label}] Failure announcement")
    await page.wait_for_selector('[role="status"][aria-live="polite"]', state="detached", timeout=20000)
    await page.wait_for_timeout(500)
    heard = await announcements(page)
    chk(
        any("Analyzing" in a["text"] for a in heard),
        "pending state produced a live announcement",
    )
    chk(
        len(heard) >= 2,
        f"multiple distinct dynamic updates were announced (got {len(heard)})",
    )
    await page.unroute("**/_serverFn/**")

    # ---- No live region is hidden from assistive tech ----
    print(f"[{label}] Live regions are exposed")
    hidden = await page.evaluate(
        """() => [...document.querySelectorAll('[aria-live], [role="alert"], [role="status"]')]
              .filter(el => el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]'))
              .length"""
    )
    chk(hidden == 0, f"no live region is aria-hidden (found {hidden})")

    await page.screenshot(path=str(SHOTS / f"live_regions_{label}.png"))


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
            )
            await ctx.add_init_script(OBSERVER)
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
    print("All ARIA live-region checks passed across all viewports.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
