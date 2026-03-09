"""
Test the sidebar navigation and labels.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL


class TestSidebar:
    @pytest.fixture(autouse=True)
    def _login(self, ensure_logged_in):
        pass

    def test_sidebar_visible(self, driver):
        """Sidebar should be visible on desktop."""
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav"))
        )
        nav = driver.find_element(By.CSS_SELECTOR, "nav")
        assert nav.is_displayed()

    def test_sidebar_has_quan_ly_lenh(self, driver):
        """Sidebar should show 'Quản lý lệnh'."""
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav"))
        )
        page_source = driver.page_source
        assert "Quản lý lệnh" in page_source, "Sidebar should show 'Quản lý lệnh'"
        assert "Review lệnh" not in page_source, "Sidebar should NOT show 'Review lệnh'"

    def test_navigate_to_trades(self, driver):
        """Clicking 'Quản lý lệnh' navigates to /trades."""
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav"))
        )
        link = driver.find_element(By.XPATH, "//nav//a[contains(., 'Quản lý lệnh')]")
        link.click()
        WebDriverWait(driver, 10).until(EC.url_contains("/trades"))
        assert "/trades" in driver.current_url

    def test_review_redirects_to_trades(self, driver):
        """Going to /review should redirect to /trades?view=detail."""
        driver.get(f"{BASE_URL}/review")
        WebDriverWait(driver, 10).until(EC.url_contains("/trades"))
        assert "/trades" in driver.current_url

    def test_navigate_to_statistics(self, driver):
        """Clicking 'Thống kê' navigates to /statistics."""
        driver.get(BASE_URL)
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "nav"))
        )
        link = driver.find_element(By.XPATH, "//nav//a[contains(., 'Thống kê')]")
        link.click()
        WebDriverWait(driver, 10).until(EC.url_contains("/statistics"))
        assert "/statistics" in driver.current_url
