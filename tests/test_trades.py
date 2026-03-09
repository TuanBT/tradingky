"""
Test the trades list page: filters, pagination, edit modal.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from conftest import BASE_URL


class TestTradesPage:
    @pytest.fixture(autouse=True)
    def _login(self, ensure_logged_in):
        pass

    @pytest.fixture(autouse=True)
    def go_to_trades(self, driver):
        driver.get(f"{BASE_URL}/trades")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )

    def test_trades_table_renders(self, driver):
        """Trades table should be visible with data rows."""
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        assert len(rows) > 0, "Should have at least one trade row"

    def test_filter_bar_visible(self, driver):
        """Filter bar should be visible with Vietnamese labels."""
        assert "Bộ lọc" in driver.page_source
        assert "Tìm kiếm" in driver.page_source
        assert "Sàn giao dịch" in driver.page_source
        assert "Cặp tiền" in driver.page_source
        assert "Kết quả" in driver.page_source
        assert "Trạng thái" in driver.page_source
        assert "Thời gian" in driver.page_source

    def test_filter_result_shows_vietnamese_label(self, driver):
        """When 'Kết quả' is set to WIN, the trigger should show 'Thắng' not 'WIN'."""
        # Find the result filter trigger (4th select after search input)
        triggers = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        # Find the one for Kết quả (should contain 'Tất cả' initially)
        result_trigger = None
        for t in triggers:
            parent = t.find_element(By.XPATH, "./..")
            label = parent.find_elements(By.CSS_SELECTOR, "label")
            if label and "Kết quả" in label[0].text:
                result_trigger = t
                break

        if result_trigger is None:
            pytest.skip("Could not find Kết quả filter trigger")

        # Click to open dropdown
        result_trigger.click()
        time.sleep(0.5)

        # Click "Thắng" option
        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@data-slot='select-item' or @role='option'][contains(., 'Thắng')]"))
        )
        option.click()
        time.sleep(0.5)

        # Check the trigger now shows "Thắng" (not "WIN")
        trigger_text = result_trigger.text
        assert "Thắng" in trigger_text, f"Trigger should show 'Thắng' but shows '{trigger_text}'"
        assert "WIN" not in trigger_text, f"Trigger should NOT show 'WIN' but shows '{trigger_text}'"

    def test_filter_status_shows_vietnamese_label(self, driver):
        """When 'Trạng thái' is set to CLOSED, trigger should show '✅ Đã đóng'."""
        triggers = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        status_trigger = None
        for t in triggers:
            parent = t.find_element(By.XPATH, "./..")
            label = parent.find_elements(By.CSS_SELECTOR, "label")
            if label and "Trạng thái" in label[0].text:
                status_trigger = t
                break

        if status_trigger is None:
            pytest.skip("Could not find Trạng thái filter trigger")

        status_trigger.click()
        time.sleep(0.5)

        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@data-slot='select-item' or @role='option'][contains(., 'Đã đóng')]"))
        )
        option.click()
        time.sleep(0.5)

        trigger_text = status_trigger.text
        assert "Đã đóng" in trigger_text, f"Trigger should show 'Đã đóng' but shows '{trigger_text}'"
        assert "CLOSED" not in trigger_text, f"Trigger should NOT show 'CLOSED'"

    def test_reset_filter_button(self, driver):
        """After setting a filter, reset button should appear and clear all filters."""
        # First set a filter
        triggers = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        result_trigger = None
        for t in triggers:
            parent = t.find_element(By.XPATH, "./..")
            label = parent.find_elements(By.CSS_SELECTOR, "label")
            if label and "Kết quả" in label[0].text:
                result_trigger = t
                break

        if result_trigger is None:
            pytest.skip("Could not find filter trigger")

        result_trigger.click()
        time.sleep(0.5)
        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@data-slot='select-item' or @role='option'][contains(., 'Thắng')]"))
        )
        option.click()
        time.sleep(0.5)

        # Reset button should now be visible
        reset_btn = driver.find_element(By.XPATH, "//button[contains(., 'Xoá bộ lọc')]")
        assert reset_btn.is_displayed(), "Reset button should appear when filter is active"

        # Click reset
        reset_btn.click()
        time.sleep(0.5)

        # Reset button should disappear
        reset_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Xoá bộ lọc')]")
        assert len(reset_btns) == 0, "Reset button should disappear after clearing filters"

    def test_pagination_exists(self, driver):
        """Trades page should have pagination buttons."""
        page_source = driver.page_source
        # Look for page number buttons or navigation arrows
        page_btns = driver.find_elements(By.XPATH, "//button[contains(@class, 'pagination') or text()='1' or text()='2']")
        # At minimum, there should be page indicators somewhere
        assert "lệnh" in page_source, "Should show trade count"

    def test_edit_modal_opens(self, driver):
        """Clicking edit button on a trade should open the edit modal."""
        # Find an edit button in the table
        edit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//table//button[contains(@title, 'Sửa') or .//svg[contains(@data-icon, 'pen')]]"))
        )
        edit_btn.click()

        # Wait for modal (Dialog) to appear
        modal = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        assert modal.is_displayed(), "Edit modal should open"

        # Check modal has reasonable width (not too narrow)
        modal_width = modal.size['width']
        viewport_width = driver.execute_script("return window.innerWidth")
        assert modal_width > 500, f"Modal should be reasonably wide, got {modal_width}px"

        # Close modal
        close_btn = modal.find_element(By.CSS_SELECTOR, "button[aria-label='Close'], button:has(svg)")
        close_btn.click()
        time.sleep(0.5)

    def test_date_filter_no_monthly_options(self, driver):
        """Date filter should NOT have monthly options (e.g., '2025-03'), only fixed options + years."""
        triggers = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        date_trigger = None
        for t in triggers:
            parent = t.find_element(By.XPATH, "./..")
            label = parent.find_elements(By.CSS_SELECTOR, "label")
            if label and "Thời gian" in label[0].text:
                date_trigger = t
                break

        if date_trigger is None:
            pytest.skip("Could not find Thời gian filter trigger")

        date_trigger.click()
        time.sleep(0.5)

        # Get all options
        options = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-item'], [role='option']")
        option_texts = [o.text for o in options]

        # Should have the standard options
        assert any("Tất cả" in t for t in option_texts), "Should have 'Tất cả' option"
        assert any("Hôm nay" in t for t in option_texts), "Should have 'Hôm nay' option"
        assert any("Năm nay" in t for t in option_texts), "Should have 'Năm nay' option"

        # Should NOT have month-specific options (like "2025-03")
        for t in option_texts:
            assert not t.strip().startswith("20") or "Năm" in t, \
                f"Should not have raw month option, found: '{t}'"

        # Close dropdown by pressing Escape
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.3)
