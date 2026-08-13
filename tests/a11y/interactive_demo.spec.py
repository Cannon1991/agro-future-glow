"""
A11y regression tests for the InteractiveDemo location field.

Covers:
  - aria-invalid toggles on blur (empty) and on submit
  - aria-describedby switches between hint id (valid) and error id (invalid)
  - error text has role="alert" and aria-live="polite"
  - form error summary appears on submit and moves focus to itself
  - clicking a summary link focuses the offending field

Run:
  python3 tests/a11y/interactive_demo.spec.py
Exits 0 on success, 1 on failure.

Assumes the dev server is already running at http://localhost:8080.
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

FIELD = 'input[role="combobox"][aria-label="Village, local government, state or country"]'


async def clear_and_type(page, field, value: str) -> None:
    """Type into the location input the way a keyboard user would.

    Playwright's `fill()` / `evaluate` shortcuts don't always drive React 19's
    controlled input reliably in headless Chromium — the DOM value updates but
    the React state doesn't, so downstream state (validation, aria-invalid)
    stays stale. Real key events do update state.
    """
    await field.scroll_into_view_if_needed()
    await field.click()
    await expect(field).to_be_focused()
    await page.keyboard.press("Control+a")
    await page.keyboard.press("Delete")
    if value:
        await page.keyboard.type(value, delay=40)
        await expect(field).to_have_value(value)


async def blur_field(page) -> None:
    """Move focus off the input and let scheduled close timers run."""
    await page.keyboard.press("Escape")  # close autocomplete first
    await page.evaluate("document.activeElement?.blur?.()")
    await page.wait_for_timeout(350)



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


def check(cond: bool, msg: str, failures: list[str]) -> None:
    marker = "✓" if cond else "✗"
    print(f"  {marker} {msg}")
    if not cond:
        failures.append(msg)


VIEWPORTS = [
    ("desktop", {"width": 1280, "height": 1800}, False),
    ("tablet", {"width": 768, "height": 1024}, True),
    ("mobile", {"width": 390, "height": 844}, True),
]


async def run_suite(page, label: str, failures: list[str]) -> None:
    def chk(cond: bool, msg: str) -> None:
        check(cond, f"[{label}] {msg}", failures)

    await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
    await page.wait_for_selector(FIELD, timeout=30000)
    await wait_for_hydration(page)
    field = page.locator(FIELD)

    # -- Initial state: valid, describedby -> hint --
    print(f"[{label}] Initial state")
    aria_invalid = await field.get_attribute("aria-invalid")
    describedby = await field.get_attribute("aria-describedby")
    chk(aria_invalid == "false", 'aria-invalid="false" before interaction')
    chk(
        describedby is not None and page.locator(f"#{describedby}").first is not None,
        "aria-describedby points to an existing element (hint)",
    )
    hint_id = describedby
    hint_el = page.locator(f"#{hint_id}")
    await expect(hint_el).to_be_visible()
    chk(await hint_el.get_attribute("role") != "alert", "hint element has no alert role")

    # -- Blur while empty: touched but empty -> should stay valid (no error) --
    print(f"[{label}] Blur while empty (not submitted)")
    await field.scroll_into_view_if_needed()
    await field.click()
    await blur_field(page)
    aria_invalid = await field.get_attribute("aria-invalid")
    chk(aria_invalid == "false", "empty blur before submit does not flag invalid")

    # -- Type invalid characters and blur --
    print(f"[{label}] Blur with invalid characters")
    await clear_and_type(page, field, "!!")
    await blur_field(page)
    aria_invalid = await field.get_attribute("aria-invalid")
    describedby = await field.get_attribute("aria-describedby")
    chk(aria_invalid == "true", 'aria-invalid="true" after invalid blur')
    chk(describedby != hint_id, "aria-describedby now points to the error id")
    err = page.locator(f"#{describedby}")
    await expect(err).to_be_visible()
    chk(await err.get_attribute("role") == "alert", 'error text has role="alert"')
    chk(await err.get_attribute("aria-live") == "polite", 'error text has aria-live="polite"')
    chk(len((await err.inner_text()).strip()) > 0, "error text is non-empty")

    # -- Correcting the input updates aria-describedby back to hint --
    print(f"[{label}] Correcting input clears invalid state")
    await clear_and_type(page, field, "Ado LGA, Ekiti State")
    await page.keyboard.press("Escape")
    await page.wait_for_timeout(200)
    aria_invalid = await field.get_attribute("aria-invalid")
    describedby_after = await field.get_attribute("aria-describedby")
    chk(aria_invalid == "false", "aria-invalid returns to false after correction")
    chk(describedby_after == hint_id, "aria-describedby returns to the hint id after correction")

    # -- Submit with invalid content: summary appears, receives focus --
    print(f"[{label}] Submit invalid form")
    await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
    await page.wait_for_selector(FIELD, timeout=30000)
    await wait_for_hydration(page)
    field = page.locator(FIELD)
    await clear_and_type(page, field, "!!")
    await page.keyboard.press("Escape")
    await field.focus()
    await page.evaluate("document.querySelector('form').requestSubmit()")
    await page.wait_for_timeout(400)

    summary = page.locator('[role="alert"][aria-live="assertive"]').first
    await expect(summary).to_be_visible()
    chk(await summary.get_attribute("tabindex") == "-1", "summary is focusable (tabindex=-1)")

    focused_id = await page.evaluate("document.activeElement?.id || ''")
    summary_id = await summary.get_attribute("id")
    chk(
        focused_id == summary_id,
        f"focus moved to summary on submit (focused={focused_id!r}, summary={summary_id!r})",
    )

    aria_invalid = await field.get_attribute("aria-invalid")
    describedby = await field.get_attribute("aria-describedby")
    chk(aria_invalid == "true", "aria-invalid=true after invalid submit")
    chk(describedby != hint_id, "aria-describedby -> error id after submit")

    # Summary "field: message" activator focuses the field.
    activator = summary.get_by_role("button").first
    await activator.click()
    await page.wait_for_timeout(200)
    field_id = await field.get_attribute("id")
    focused_id = await page.evaluate("document.activeElement?.id || ''")
    chk(focused_id == field_id, "summary activator moves focus to the field")

    await page.screenshot(path=str(SHOTS / f"invalid_submit_{label}.png"))


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
    print("All a11y regression checks passed across all viewports.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

