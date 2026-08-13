"""
Keyboard-only navigation regression tests for the InteractiveDemo.

Covers, at desktop / tablet / mobile viewports:
  - Tab order: location input -> Analyze submit button -> example buttons
  - Shift+Tab reverses that order
  - The autocomplete listbox is not a tab stop (no focus trap)
  - ArrowDown/ArrowUp move aria-activedescendant while focus stays on input
  - Escape closes the dropdown without moving focus
  - Enter selects the active option
  - After an invalid submit, focus lands on the error summary and Tab reaches
    its activator button, which returns focus to the field

Run:
  python3 tests/a11y/keyboard_nav.spec.py
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


def check(cond: bool, msg: str, failures: list[str]) -> None:
    print(f"  {'✓' if cond else '✗'} {msg}")
    if not cond:
        failures.append(msg)


async def wait_for_hydration(page) -> None:
    """Wait until React has attached handlers to the location input.

    In a cold dev server the markup streams in before hydration, so early key
    presses are dropped and component state never updates.
    """
    await page.wait_for_function(
        """() => {
            const el = document.querySelector('input[role="combobox"]');
            return !!el && Object.keys(el).some(k => k.startsWith('__reactProps$'));
        }""",
        timeout=30000,
    )


async def active(page) -> dict:
    return await page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el) return {};
            return {
              tag: el.tagName.toLowerCase(),
              id: el.id || '',
              role: el.getAttribute('role') || '',
              type: el.getAttribute('type') || '',
              label: el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 40),
            };
        }"""
    )


async def run_suite(page, label: str, failures: list[str]) -> None:
    def chk(cond: bool, msg: str) -> None:
        check(cond, f"[{label}] {msg}", failures)

    await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
    await page.wait_for_selector(FIELD, timeout=30000)
    await wait_for_hydration(page)
    field = page.locator(FIELD)
    field_id = await field.get_attribute("id")

    # ---- Forward tab order from the location field ----
    # Enter a valid location first: the Analyze button is intentionally disabled
    # for an invalid/empty value, and disabled buttons are not tab stops.
    print(f"[{label}] Forward tab order")
    await field.scroll_into_view_if_needed()
    await field.click()
    await page.keyboard.type("Ado LGA, Ekiti State", delay=20)
    await page.keyboard.press("Escape")  # ensure dropdown closed
    await expect(field).to_be_focused()


    await page.keyboard.press("Tab")
    a = await active(page)
    chk(a.get("type") == "submit", f"Tab from input reaches the submit button (got {a})")

    await page.keyboard.press("Tab")
    a = await active(page)
    chk(
        a.get("tag") == "button" and "Ado LGA" in a.get("label", ""),
        f"Tab from submit reaches the first example button (got {a})",
    )

    # ---- Reverse (Shift+Tab) order ----
    print(f"[{label}] Shift+Tab reverses the order")
    await page.keyboard.press("Shift+Tab")
    a = await active(page)
    chk(a.get("type") == "submit", f"Shift+Tab returns to the submit button (got {a})")

    await page.keyboard.press("Shift+Tab")
    a = await active(page)
    chk(a.get("id") == field_id, f"Shift+Tab returns to the location input (got {a})")

    # ---- Open dropdown: it must not become a tab stop ----
    print(f"[{label}] Autocomplete is not a tab stop")
    await field.click()
    await page.keyboard.press("Control+a")
    await page.keyboard.press("Delete")
    await page.keyboard.type("Ado", delay=60)
    listbox = page.locator('ul[role="listbox"]')
    await expect(listbox).to_be_visible()
    chk(
        await page.evaluate(
            """() => [...document.querySelectorAll('ul[role="listbox"] *')]
                 .every(el => !el.hasAttribute('tabindex') && !el.matches('a,button,input,select,textarea'))"""
        ),
        "no focusable elements inside the listbox (no focus trap)",
    )

    # ---- Arrow keys drive aria-activedescendant, focus stays on the input ----
    print(f"[{label}] Arrow key navigation")
    option_count = await page.locator('li[role="option"]').count()
    before = await field.get_attribute("aria-activedescendant")
    await page.keyboard.press("ArrowDown")
    await page.wait_for_timeout(150)
    after_down = await field.get_attribute("aria-activedescendant")
    chk(await field.evaluate("el => el === document.activeElement"), "focus stays on the input while arrowing")
    chk(after_down is not None, "ArrowDown sets aria-activedescendant")
    if option_count >= 3:
        await page.keyboard.press("ArrowDown")
        await page.wait_for_timeout(150)
        second = await field.get_attribute("aria-activedescendant")
        await page.keyboard.press("ArrowUp")
        await page.wait_for_timeout(150)
        back = await field.get_attribute("aria-activedescendant")
        chk(second != after_down, "ArrowDown advances to the next option")
        chk(back == after_down, "ArrowUp returns to the previous option")
    chk(
        await page.locator(f"#{await field.get_attribute('aria-activedescendant')}")
        .get_attribute("aria-selected")
        == "true",
        "active option is marked aria-selected=true",
    )


    # ---- Escape closes without losing focus ----
    print(f"[{label}] Escape closes the dropdown")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(150)
    chk(await field.get_attribute("aria-expanded") == "false", 'aria-expanded="false" after Escape')
    chk(await field.evaluate("el => el === document.activeElement"), "focus remains on the input after Escape")

    # ---- Enter selects the active option ----
    print(f"[{label}] Enter selects the highlighted option")
    await page.keyboard.press("ArrowDown")
    await expect(listbox).to_be_visible()
    opt_id = await field.get_attribute("aria-activedescendant")
    opt_text = (await page.locator(f"#{opt_id} .font-medium").first.inner_text()).strip()
    await page.keyboard.press("Enter")
    await page.wait_for_timeout(200)
    value = await field.input_value()
    chk(value.startswith(opt_text.split(",")[0]), f"Enter fills the input from the active option (got {value!r})")
    chk(await field.evaluate("el => el === document.activeElement"), "focus stays on the input after selection")

    # ---- Keyboard-only invalid submit -> summary focus -> back to field ----
    print(f"[{label}] Keyboard submit error flow")
    await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
    await page.wait_for_selector(FIELD, timeout=30000)
    await wait_for_hydration(page)
    field = page.locator(FIELD)
    await field.scroll_into_view_if_needed()
    await field.click()
    await page.keyboard.press("Control+a")
    await page.keyboard.press("Delete")
    await page.keyboard.type("!!", delay=40)
    await page.keyboard.press("Escape")
    await field.focus()
    await page.evaluate("document.querySelector('form').requestSubmit()")
    await page.wait_for_timeout(400)

    summary = page.locator('[role="alert"][aria-live="assertive"]').first
    await expect(summary).to_be_visible()
    summary_id = await summary.get_attribute("id")
    a = await active(page)
    chk(a.get("id") == summary_id, f"focus moves to the error summary (got {a})")

    await page.keyboard.press("Tab")
    a = await active(page)
    chk(a.get("tag") == "button", f"Tab from the summary reaches its activator button (got {a})")

    await page.keyboard.press("Enter")
    await page.wait_for_timeout(200)
    a = await active(page)
    chk(a.get("id") == field_id, f"activating the summary link focuses the field (got {a})")

    await page.screenshot(path=str(SHOTS / f"keyboard_nav_{label}.png"))


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
    print("All keyboard navigation checks passed across all viewports.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
