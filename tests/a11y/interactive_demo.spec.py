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


def check(cond: bool, msg: str, failures: list[str]) -> None:
    marker = "✓" if cond else "✗"
    print(f"  {marker} {msg}")
    if not cond:
        failures.append(msg)


async def main() -> int:
    failures: list[str] = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()

        await page.goto(f"{BASE}/#demo", wait_until="domcontentloaded")
        await page.wait_for_selector(FIELD, timeout=10000)
        field = page.locator(FIELD)

        # -- Initial state: valid, describedby -> hint --
        print("Initial state")
        aria_invalid = await field.get_attribute("aria-invalid")
        describedby = await field.get_attribute("aria-describedby")
        check(aria_invalid == "false", 'aria-invalid="false" before interaction', failures)
        check(
            describedby is not None and page.locator(f"#{describedby}").first is not None,
            "aria-describedby points to an existing element (hint)",
            failures,
        )
        hint_id = describedby
        hint_el = page.locator(f"#{hint_id}")
        await expect(hint_el).to_be_visible()
        hint_role = await hint_el.get_attribute("role")
        check(hint_role != "alert", "hint element has no alert role", failures)

        # -- Blur while empty: touched but empty -> should stay valid (no error) --
        print("Blur while empty (not submitted)")
        await field.focus()
        await field.evaluate("el => el.blur()")
        await page.wait_for_timeout(250)
        aria_invalid = await field.get_attribute("aria-invalid")
        check(aria_invalid == "false", "empty blur before submit does not flag invalid", failures)

        # -- Type invalid characters and blur --
        print("Blur with invalid characters")
        await field.click()
        await field.fill("!!")  # too short + disallowed chars
        await page.keyboard.press("Escape")
        await field.evaluate("el => el.blur()")
        await page.wait_for_timeout(300)
        aria_invalid = await field.get_attribute("aria-invalid")
        describedby = await field.get_attribute("aria-describedby")
        aria_invalid = await field.get_attribute("aria-invalid")
        describedby = await field.get_attribute("aria-describedby")
        check(aria_invalid == "true", 'aria-invalid="true" after invalid blur', failures)
        check(describedby != hint_id, "aria-describedby now points to the error id", failures)
        err = page.locator(f"#{describedby}")
        await expect(err).to_be_visible()
        check(await err.get_attribute("role") == "alert", 'error text has role="alert"', failures)
        check(
            await err.get_attribute("aria-live") == "polite",
            'error text has aria-live="polite"',
            failures,
        )
        err_text = (await err.inner_text()).strip()
        check(len(err_text) > 0, "error text is non-empty", failures)

        # -- Correcting the input updates aria-describedby back to hint --
        print("Correcting input clears invalid state")
        await field.click()
        await field.fill("Ado LGA, Ekiti State")
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(150)
        aria_invalid = await field.get_attribute("aria-invalid")
        describedby_after = await field.get_attribute("aria-describedby")
        check(aria_invalid == "false", "aria-invalid returns to false after correction", failures)
        check(
            describedby_after == hint_id,
            "aria-describedby returns to the hint id after correction",
            failures,
        )

        # -- Submit empty form: summary appears, receives focus, links to field --
        print("Submit empty form")
        await field.click()
        await field.fill("")
        await page.keyboard.press("Escape")
        submit = page.get_by_role("button", name="Analyze")
        await submit.click()
        await page.wait_for_timeout(300)

        summary = page.locator('[role="alert"][aria-live="assertive"]').first
        await expect(summary).to_be_visible()
        check(await summary.get_attribute("tabindex") == "-1", "summary is focusable (tabindex=-1)", failures)

        focused_id = await page.evaluate("document.activeElement?.id || ''")
        summary_id = await summary.get_attribute("id")
        check(
            focused_id == summary_id,
            f"focus moved to summary on submit (focused={focused_id!r}, summary={summary_id!r})",
            failures,
        )

        aria_invalid = await field.get_attribute("aria-invalid")
        describedby = await field.get_attribute("aria-describedby")
        check(aria_invalid == "true", "aria-invalid=true on empty submit (highlight)", failures)
        check(describedby != hint_id, "aria-describedby -> error id on empty submit", failures)

        # Summary link focuses field on activation
        link = summary.get_by_role("link").first
        await link.click()
        await page.wait_for_timeout(200)
        field_id = await field.get_attribute("id")
        focused_id = await page.evaluate("document.activeElement?.id || ''")
        check(focused_id == field_id, "summary link moves focus to the field", failures)

        await page.screenshot(path=str(SHOTS / "empty_submit.png"))

        await browser.close()

    print()
    if failures:
        print(f"FAILED: {len(failures)} assertion(s)")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("All a11y regression checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
