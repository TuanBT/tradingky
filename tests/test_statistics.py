"""
Test the statistics page: filter dropdown labels.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from conftest import BASE_URL


class TestStatisticsPage:
    @pytest.fixture(autouse=True)
    def _login(self, ensure_logged_in):
        pass

    @pytest.fixture(autouse=True)
    def go_to_statistics(self, driver):
        driver.get(f"{BASE_URL}/statistics")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Thống kê')]"))
        )
        time.sleep(1)

    def test_page_title(self, driver):
        """Statistics page should show 'Thống kê'."""
        assert "Thống kê" in driver.page_source

    def test_period_filter_shows_vietnamese(self, driver):
        """Period filter trigger should show Vietnamese label, not raw value like 'month'."""
        trigger = driver.find_element(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        trigger_text = trigger.text.strip()
        
        # Should show Vietnamese label like "Tháng này" (default is month)
        raw_values = ["month", "week", "today", "3months", "all", "custom"]
        for val in raw_values:
            # The raw value should not be the displayed text (unless it's also a valid Vietnamese word)
            if trigger_text == val:
                pytest.fail(f"Filter trigger shows raw value '{val}' instead of Vietnamese label")

        # Should be one of the Vietnamese labels
        vietnamese_labels = ["Hôm nay", "Tuần này", "Tháng này", "3 tháng", "Tất cả", "Tuỳ chọn..."]
        assert trigger_text in vietnamese_labels, \
            f"Trigger should show Vietnamese label, got '{trigger_text}'"

    def test_period_filter_dropdown_options(self, driver):
        """All filter dropdown options should be in Vietnamese."""
        trigger = driver.find_element(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        trigger.click()
        time.sleep(0.5)

        options = driver.find_elements(By.CSS_SELECTOR, "[data-slot='select-item'], [role='option']")
        option_texts = [o.text.strip() for o in options]

        expected = ["Hôm nay", "Tuần này", "Tháng này", "3 tháng", "Tất cả", "Tuỳ chọn..."]
        for exp in expected:
            assert any(exp in t for t in option_texts), \
                f"Should have option '{exp}', got {option_texts}"

        # Close dropdown
        driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.3)

    def test_change_filter_updates_display(self, driver):
        """Changing period filter should update the trigger label."""
        trigger = driver.find_element(By.CSS_SELECTOR, "[data-slot='select-trigger']")
        trigger.click()
        time.sleep(0.5)

        # Select "Tất cả"
        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@data-slot='select-item' or @role='option'][contains(., 'Tất cả')]"))
        )
        option.click()
        time.sleep(0.5)

        # Trigger should now show "Tất cả"
        trigger_text = trigger.text.strip()
        assert "Tất cả" in trigger_text, f"Trigger should show 'Tất cả', got '{trigger_text}'"

        # Now select "Tuần này"
        trigger.click()
        time.sleep(0.5)
        option = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.XPATH, "//div[@data-slot='select-item' or @role='option'][contains(., 'Tuần này')]"))
        )
        option.click()
        time.sleep(0.5)

        trigger_text = trigger.text.strip()
        assert "Tuần này" in trigger_text, f"Trigger should show 'Tuần này', got '{trigger_text}'"

    def test_stats_cards_visible(self, driver):
        """Statistics cards should be visible with data."""
        cards = driver.find_elements(By.CSS_SELECTOR, "[data-slot='card']")
        assert len(cards) >= 1, "Should have at least one statistics card"
