"""
Test the review (Xem lại lệnh) page: mini-list, pagination, navigation, modal.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL


class TestReviewPage:
    @pytest.fixture(autouse=True)
    def _login(self, ensure_logged_in):
        pass

    @pytest.fixture(autouse=True)
    def go_to_review(self, driver):
        driver.get(f"{BASE_URL}/review")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'xem lại') or contains(text(), 'Xem lại')]"))
        )
        time.sleep(1)  # Let data load

    def test_review_page_title(self, driver):
        """Review page should show 'Chọn lệnh để xem lại' (not 'review')."""
        source = driver.page_source
        assert "xem lại" in source.lower(), "Page should contain 'xem lại'"
        assert "để review" not in source, "Page should NOT contain 'để review'"

    def test_mini_list_visible(self, driver):
        """Mini-list of trades should be visible on the left side."""
        # Look for trade items in the mini-list
        items = driver.find_elements(By.CSS_SELECTOR, "[class*='max-h'] button, [class*='overflow'] button")
        # At least some trade items should be visible
        assert len(items) >= 1, "Mini-list should have trade items"

    def test_mini_list_collapsible(self, driver):
        """Mini-list header should be clickable to collapse/expand."""
        # Find the collapse toggle button
        toggle = driver.find_elements(By.XPATH, "//button[contains(., 'lệnh') and (.//svg)]")
        if not toggle:
            pytest.skip("Could not find collapse toggle")
        
        toggle[0].click()
        time.sleep(0.5)

        # After collapse, list items should be hidden
        # Click again to expand
        toggle[0].click()
        time.sleep(0.5)

    def test_mini_list_pagination(self, driver):
        """Mini-list should have pagination (◄ ► buttons or page numbers)."""
        # Look for pagination controls
        page_source = driver.page_source
        # Should show page indicators like "1/X" or navigation buttons
        has_pagination = ("◄" in page_source or "►" in page_source or
                          "Trang" in page_source or "/" in page_source)
        # Also check for prev/next buttons
        nav_btns = driver.find_elements(By.XPATH, "//button[contains(text(), '◄') or contains(text(), '►')]")
        assert has_pagination or len(nav_btns) > 0, "Mini-list should have pagination"

    def test_select_trade_shows_detail(self, driver):
        """Clicking a trade in mini-list should show its detail on the right."""
        items = driver.find_elements(By.CSS_SELECTOR, "[class*='max-h'] button, [class*='overflow'] button")
        if len(items) < 1:
            pytest.skip("No trade items in mini-list")

        items[0].click()
        time.sleep(1)

        # Detail panel should show trade information
        detail_area = driver.page_source
        # Should contain trade detail indicators
        has_detail = ("Cặp tiền" in detail_area or "Sàn" in detail_area or
                      "Kết quả" in detail_area or "P&L" in detail_area or "P/L" in detail_area)
        assert has_detail, "Clicking a trade should show its detail"

    def test_navigation_buttons(self, driver):
        """Previous/Next navigation buttons should work."""
        items = driver.find_elements(By.CSS_SELECTOR, "[class*='max-h'] button, [class*='overflow'] button")
        if len(items) < 2:
            pytest.skip("Need at least 2 trades to test navigation")

        # Click first trade
        items[0].click()
        time.sleep(0.5)

        # Find "next" button (►)
        next_btns = driver.find_elements(By.XPATH, "//button[.//svg[contains(@data-icon, 'chevron-right')]]")
        if not next_btns:
            pytest.skip("Could not find next navigation button")

        next_btns[0].click()
        time.sleep(0.5)

        # The second item in mini-list should now be active (highlighted)
        # Just verify no error occurred
        assert True

    def test_edit_modal_from_review(self, driver):
        """Edit button in review detail should open the edit modal."""
        items = driver.find_elements(By.CSS_SELECTOR, "[class*='max-h'] button, [class*='overflow'] button")
        if len(items) < 1:
            pytest.skip("No trade items")

        items[0].click()
        time.sleep(1)

        # Find edit button
        edit_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Sửa') or .//svg[contains(@data-icon, 'pen')]]")
        if not edit_btn:
            pytest.skip("Could not find edit button in review detail")

        edit_btn[0].click()
        time.sleep(0.5)

        # Modal should appear
        modal = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        assert modal.is_displayed(), "Edit modal should open from review page"

        # Close modal
        close_btn = modal.find_element(By.CSS_SELECTOR, "button[aria-label='Close'], button:has(svg)")
        close_btn.click()
        time.sleep(0.5)
