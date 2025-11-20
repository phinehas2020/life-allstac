from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_design(page: Page):
    # 1. Go to home page
    print("Navigating to home page...")
    page.goto("http://localhost:3000")

    # Wait for the page to load and animation to settle
    time.sleep(2)

    # Expect title to be visible
    print("Checking for title...")
    expect(page.get_by_role("heading", name="Life.Allstac")).to_be_visible()

    # Take screenshot of home page
    print("Taking home page screenshot...")
    page.screenshot(path="verification/home_page.png", full_page=True)

    # Since we don't have a real backend running easily without auth flow,
    # we might only be able to see the empty state or logged out state.
    # Let's check if we can see the "Sign in" button
    expect(page.get_by_role("button", name="Sign in").first).to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_design(page)
            print("Verification complete!")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()
