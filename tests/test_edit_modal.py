"""
Test the edit modal functionality across pages.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from conftest import BASE_URL


class TestEditModal:
    @pytest.fixture(autouse=True)
    def _login(self, ensure_logged_in):
        pass

    def test_modal_width_reasonable(self, driver):
        """Edit modal should be between 500px and 95% of viewport (not too narrow, not too wide)."""
        driver.get(f"{BASE_URL}/trades")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )

        # Find and click edit button
        edit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//table//button[contains(@title, 'Sửa') or .//svg[contains(@data-icon, 'pen')]]"))
        )
        edit_btn.click()

        modal = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        time.sleep(0.5)

        modal_width = modal.size['width']
        viewport_width = driver.execute_script("return window.innerWidth")
        max_expected = viewport_width * 0.95

        assert modal_width >= 500, f"Modal too narrow: {modal_width}px"
        assert modal_width <= max_expected, f"Modal too wide: {modal_width}px (viewport: {viewport_width}px)"

        # Close
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.5)

    def test_modal_has_form_fields(self, driver):
        """Edit modal should contain form fields for trade editing."""
        driver.get(f"{BASE_URL}/trades")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )

        edit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//table//button[contains(@title, 'Sửa') or .//svg[contains(@data-icon, 'pen')]]"))
        )
        edit_btn.click()

        modal = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        time.sleep(1)

        modal_text = modal.text
        # Should have basic form sections
        form_indicators = ["Ngày", "Cặp tiền", "Sàn", "Loại"]
        found = [ind for ind in form_indicators if ind in modal_text]
        assert len(found) >= 2, f"Modal should have form fields, found: {found}"

        # Close
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.5)

    def test_modal_scrollable(self, driver):
        """Edit modal should be scrollable for long content."""
        driver.get(f"{BASE_URL}/trades")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )

        edit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//table//button[contains(@title, 'Sửa') or .//svg[contains(@data-icon, 'pen')]]"))
        )
        edit_btn.click()

        modal = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        time.sleep(0.5)

        # Check modal has overflow-y-auto style (scrollable)
        overflow = modal.value_of_css_property("overflow-y")
        assert overflow in ["auto", "scroll"], f"Modal should be scrollable, overflow-y: {overflow}"

        # Close
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.5)

    def test_modal_close_on_escape(self, driver):
        """Pressing Escape should close the edit modal."""
        driver.get(f"{BASE_URL}/trades")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table"))
        )

        edit_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//table//button[contains(@title, 'Sửa') or .//svg[contains(@data-icon, 'pen')]]"))
        )
        edit_btn.click()

        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[role='dialog']"))
        )
        time.sleep(0.5)

        # Press Escape
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(1)

        # Modal should be gone
        modals = driver.find_elements(By.CSS_SELECTOR, "[role='dialog']")
        assert len(modals) == 0, "Modal should close on Escape"
