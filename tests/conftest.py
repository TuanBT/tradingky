"""
Shared fixtures for Selenium tests.
Requires: pip install selenium
Usage:
  cd tests && python -m pytest -v --tb=short

The browser will open and navigate to the app.
If you're not logged in, you have 120 seconds to log in manually via Google.
After that, all tests will run automatically.
"""
import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

BASE_URL = os.environ.get("BASE_URL", "http://localhost:3001")

# Use a persistent Chrome profile so login is remembered across runs
CHROME_PROFILE_DIR = os.path.join(os.path.dirname(__file__), ".chrome-profile")

@pytest.fixture(scope="session")
def driver(request):
    """Create a Chrome WebDriver instance that persists across all tests.
    Only created if a test actually requests the 'driver' fixture."""
    options = Options()
    # Use a persistent profile directory to keep login state across runs
    options.add_argument(f"--user-data-dir={CHROME_PROFILE_DIR}")
    if os.environ.get("HEADLESS"):
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,900")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    d = webdriver.Chrome(options=options)
    d.implicitly_wait(5)
    yield d
    d.quit()


@pytest.fixture(scope="session")
def ensure_logged_in(driver):
    """
    Navigate to the app and wait for login.
    Uses a persistent Chrome profile, so after the first manual login,
    subsequent runs will be automatic (Firebase persists auth in IndexedDB).
    If on LOGIN page, the user has 120s to log in manually via Google.
    """
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(BASE_URL)
    time.sleep(3)  # Give the page time to load and check auth

    # Check if already logged in (sidebar visible)
    navs = driver.find_elements(By.CSS_SELECTOR, "nav")
    if navs:
        print("\n✅ Already logged in!")
        return

    # Not logged in — wait for user to log in manually
    print("\n⏳ Waiting for manual login (120s)... Please click 'Đăng nhập bằng Google' in the browser.")
    try:
        WebDriverWait(driver, 120).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav"))
        )
        print("✅ Logged in successfully!")
    except Exception:
        pytest.exit("❌ Login timeout — please run tests again (login will be remembered)")
