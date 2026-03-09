"""
Code-level verification tests for TradingKý.
Tests source code patterns, class names, and text to verify changes are correct.
No browser or login needed — just reads the source files.

Usage:
  cd tests && python -m pytest test_code_verify.py -v
"""
import os
import re
import pytest

SRC = os.path.join(os.path.dirname(__file__), "..", "src")


def read_file(rel_path: str) -> str:
    """Read a source file relative to src/."""
    path = os.path.join(SRC, rel_path)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ============================================================
# 1. SIDEBAR: "Xem lại lệnh" label
# ============================================================
class TestSidebarLabel:
    def test_sidebar_has_xem_lai_lenh(self):
        """Sidebar should use 'Xem lại lệnh', not 'Review lệnh'."""
        content = read_file("components/Sidebar.tsx")
        assert "Xem lại lệnh" in content, "Sidebar should have 'Xem lại lệnh'"
        assert "Review lệnh" not in content, "Sidebar should NOT have 'Review lệnh'"

    def test_review_page_no_review_text(self):
        """Review page should use 'xem lại' instead of 'review' in Vietnamese text."""
        content = read_file("app/review/page.tsx")
        assert "để xem lại" in content, "Review page should say 'để xem lại'"
        assert "để review" not in content, "Review page should NOT say 'để review'"


# ============================================================
# 2. FILTER LABELS: Vietnamese consistency
# ============================================================
class TestFilterLabels:
    def test_filter_bar_uses_label_mapping(self):
        """TradeFilterBar should use label mappings instead of SelectValue."""
        content = read_file("components/TradeFilterBar.tsx")
        # Should NOT use <SelectValue /> (which shows raw value)
        assert "<SelectValue" not in content, \
            "TradeFilterBar should NOT use <SelectValue> (shows raw values)"
        # Should have label mappings
        assert "resultLabels" in content, "Should have result label mapping"
        assert "statusLabels" in content, "Should have status label mapping"
        assert "dateRangeLabels" in content, "Should have dateRange label mapping"

    def test_filter_bar_result_labels_vietnamese(self):
        """Result filter labels should be in Vietnamese."""
        content = read_file("components/TradeFilterBar.tsx")
        assert 'WIN: "Thắng"' in content or "WIN: 'Thắng'" in content, \
            "WIN should map to 'Thắng'"
        assert 'LOSS: "Thua"' in content or "LOSS: 'Thua'" in content, \
            "LOSS should map to 'Thua'"
        assert 'BREAKEVEN: "Hoà"' in content or "BREAKEVEN: 'Hoà'" in content, \
            "BREAKEVEN should map to 'Hoà'"

    def test_filter_bar_status_labels_vietnamese(self):
        """Status filter labels should be in Vietnamese."""
        content = read_file("components/TradeFilterBar.tsx")
        assert "Đang chạy" in content, "OPEN should show 'Đang chạy'"
        assert "Đã đóng" in content, "CLOSED should show 'Đã đóng'"

    def test_statistics_page_no_select_value(self):
        """Statistics page filter should NOT use SelectValue (shows raw values)."""
        content = read_file("app/statistics/page.tsx")
        assert "<SelectValue" not in content, \
            "Statistics page should NOT use <SelectValue>"

    def test_statistics_page_has_vietnamese_labels(self):
        """Statistics page period filter should have inline Vietnamese labels."""
        content = read_file("app/statistics/page.tsx")
        assert "Hôm nay" in content
        assert "Tuần này" in content
        assert "Tháng này" in content
        assert "3 tháng" in content
        assert "Tất cả" in content

    def test_reset_filter_button(self):
        """TradeFilterBar should have a reset filter button."""
        content = read_file("components/TradeFilterBar.tsx")
        assert "resetFilters" in content, "Should use resetFilters function"
        assert "Xoá bộ lọc" in content, "Should have 'Xoá bộ lọc' button text"
        assert "hasActiveFilters" in content, "Should track active filter state"


# ============================================================
# 3. DATE FILTER: Simplified (no individual months)
# ============================================================
class TestDateFilter:
    def test_no_month_options(self):
        """Date filter should NOT generate monthly options."""
        content = read_file("components/TradeFilterBar.tsx")
        assert "monthOptions" not in content, "Should NOT have monthOptions"
        assert 'month-' not in content, "Should NOT use 'month-' prefix"

    def test_year_options(self):
        """Date filter should generate yearly options instead."""
        content = read_file("components/TradeFilterBar.tsx")
        assert "yearOptions" in content, "Should have yearOptions"
        assert "year-" in content, "Should use 'year-' prefix"
        assert "Năm " in content, "Should display 'Năm YYYY'"

    def test_date_filter_standard_options(self):
        """Date filter should have standard quick options."""
        content = read_file("components/TradeFilterBar.tsx")
        assert "Hôm nay" in content
        assert "Tuần này" in content
        assert "Tháng này" in content
        assert "Năm nay" in content

    def test_trades_page_year_filter_logic(self):
        """Trades page should filter by year, not month."""
        content = read_file("app/trades/page.tsx")
        assert 'year-' in content, "Should filter by year prefix"
        assert 'month-' not in content, "Should NOT filter by month prefix"

    def test_review_page_year_filter_logic(self):
        """Review page should filter by year, not month."""
        content = read_file("app/review/page.tsx")
        assert 'year-' in content, "Should filter by year prefix"
        assert 'month-' not in content, "Should NOT filter by month prefix"


# ============================================================
# 4. EDIT MODAL: Width and structure
# ============================================================
class TestEditModal:
    def test_modal_width_not_too_narrow(self):
        """Edit modal should NOT use sm:max-w-sm (too narrow)."""
        content = read_file("components/TradeEditModal.tsx")
        assert "sm:max-w-sm" not in content, \
            "Modal should NOT use sm:max-w-sm (too narrow)"

    def test_modal_width_reasonable(self):
        """Edit modal should use max-w-4xl (reasonable width)."""
        content = read_file("components/TradeEditModal.tsx")
        assert "sm:max-w-4xl" in content, \
            "Modal should use sm:max-w-4xl for reasonable width"

    def test_modal_scrollable(self):
        """Edit modal should be scrollable."""
        content = read_file("components/TradeEditModal.tsx")
        assert "overflow-y-auto" in content, "Modal should have overflow-y-auto"
        assert "max-h-[90vh]" in content, "Modal should have max height"

    def test_modal_has_save_button(self):
        """Edit modal should have a save/submit button."""
        content = read_file("components/TradeEditModal.tsx")
        assert "Lưu" in content or "Save" in content or "updateTrade" in content, \
            "Modal should have save functionality"

    def test_dialog_base_has_sm_max_w(self):
        """Dialog base component still has sm:max-w-sm (but modal overrides it)."""
        content = read_file("components/ui/dialog.tsx")
        assert "sm:max-w-sm" in content, \
            "Dialog base should still have sm:max-w-sm for other dialogs"


# ============================================================
# 5. REVIEW PAGE: Mini-list features
# ============================================================
class TestReviewMiniList:
    def test_mini_list_collapsible(self):
        """Review page mini-list should be collapsible."""
        content = read_file("app/review/page.tsx")
        assert "listCollapsed" in content, "Should have listCollapsed state"
        assert "setListCollapsed" in content or "Collapsed" in content

    def test_mini_list_paginated(self):
        """Review page mini-list should be paginated."""
        content = read_file("app/review/page.tsx")
        assert "listPage" in content, "Should have listPage state"
        assert "listPageSize" in content, "Should have listPageSize constant"

    def test_mini_list_page_size_10(self):
        """Mini-list page size should be 10."""
        content = read_file("app/review/page.tsx")
        match = re.search(r'listPageSize\s*=\s*(\d+)', content)
        assert match, "Should define listPageSize"
        assert match.group(1) == "10", f"listPageSize should be 10, got {match.group(1)}"

    def test_mini_list_auto_sync(self):
        """Mini-list should auto-sync page when navigating."""
        content = read_file("app/review/page.tsx")
        assert "Math.floor" in content and "listPageSize" in content, \
            "Should auto-calculate page from currentIndex"

    def test_mini_list_scroll_to_active(self):
        """Mini-list should scroll active item into view."""
        content = read_file("app/review/page.tsx")
        assert "scrollIntoView" in content, "Should scroll to active item"
        assert "activeItemRef" in content, "Should have ref for active item"


# ============================================================
# 6. SHARED FILTER CONTEXT
# ============================================================
class TestFilterContext:
    def test_filter_context_has_date_range(self):
        """TradeFilterContext should include dateRange field."""
        content = read_file("components/TradeFilterContext.tsx")
        assert "dateRange" in content, "Should have dateRange in filter type"

    def test_filter_context_has_reset(self):
        """TradeFilterContext should have resetFilters function."""
        content = read_file("components/TradeFilterContext.tsx")
        assert "resetFilters" in content, "Should have resetFilters"

    def test_default_date_range_is_all(self):
        """Default dateRange should be 'all'."""
        content = read_file("components/TradeFilterContext.tsx")
        assert 'dateRange: "all"' in content or "dateRange: 'all'" in content, \
            "Default dateRange should be 'all'"
